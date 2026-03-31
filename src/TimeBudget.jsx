import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function TimeBudget() {
  const [activeTab, setActiveTab] = useState('overview')
  const [jobs, setJobs] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [logJob, setLogJob] = useState('')
  const [logPlanner, setLogPlanner] = useState('Sarah Barnes')
  const [logTask, setLogTask] = useState('Research & analysis')
  const [logHrs, setLogHrs] = useState('')
  const [logNote, setLogNote] = useState('')
  const [logDate, setLogDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [jobsRes, logsRes] = await Promise.all([
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
      supabase.from('time_logs').select('*').order('created_at', { ascending: false })
    ])
    if (!jobsRes.error) setJobs(jobsRes.data || [])
    if (!logsRes.error) setLogs(logsRes.data || [])
    setLoading(false)
  }

  const handleLog = async () => {
    if (!logHrs || !logJob) {
      alert('Please select a job and enter hours.')
      return
    }
    setSaving(true)
    const selectedJob = jobs.find(j => j.code === logJob)
    const rate = selectedJob?.planner_rate || 150
    const { error } = await supabase.from('time_logs').insert({
      job_code: logJob,
      planner: logPlanner,
      task: logTask,
      hours: parseFloat(logHrs),
      notes: logNote,
      log_date: logDate || new Date().toISOString().split('T')[0],
      rate,
    })
    setSaving(false)
    if (error) {
      alert('Error saving: ' + error.message)
      return
    }
    setLogHrs('')
    setLogNote('')
    alert('Time logged successfully!')
    fetchData()
  }

  const totalHrs = logs.reduce((a, b) => a + (b.hours || 0), 0)
  const totalCost = logs.reduce((a, b) => a + ((b.hours || 0) * (b.rate || 0)), 0)
  const overBudget = jobs.filter(j => {
    const jobLogs = logs.filter(l => l.job_code === j.code)
    const used = jobLogs.reduce((a, b) => a + (b.hours || 0), 0)
    return j.budget_hours > 0 && used > j.budget_hours
  }).length

  const tabs = ['overview', 'time log', 'log time']

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-400 mb-1">Total hrs logged</div><div className="text-xl font-semibold">{totalHrs.toFixed(1)}</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-400 mb-1">Total billable</div><div className="text-xl font-semibold">${totalCost.toLocaleString()}</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-400 mb-1">Active jobs</div><div className="text-xl font-semibold">{jobs.length}</div></div>
            <div className="bg-red-50 rounded-lg p-3"><div className="text-xs text-red-400 mb-1">Over budget</div><div className="text-xl font-semibold text-red-600">{overBudget}</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-400 mb-1">Time entries</div><div className="text-xl font-semibold">{logs.length}</div></div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">No jobs yet — create a job first!</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Budget status — all jobs</div>
              <div className="grid grid-cols-[70px_1fr_70px_60px_60px_60px] gap-3 pb-2 mb-1 border-b border-gray-200">
                {['Job', 'Name', 'Planner', 'Budget', 'Used', '%'].map(h => (
                  <div key={h} className="text-xs text-gray-400">{h}</div>
                ))}
              </div>
              {jobs.map(j => {
                const jobLogs = logs.filter(l => l.job_code === j.code)
                const used = jobLogs.reduce((a, b) => a + (b.hours || 0), 0)
                const pct = j.budget_hours > 0 ? Math.round((used / j.budget_hours) * 100) : 0
                const over = pct > 100
                const warn = pct > 75
                return (
                  <div key={j.id} className="grid grid-cols-[70px_1fr_70px_60px_60px_60px] gap-3 items-center py-2 border-b border-gray-100 last:border-0">
                    <div className="text-xs font-medium text-emerald-600">{j.code}</div>
                    <div>
                      <div className="text-xs font-medium truncate">{j.name}</div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 truncate">{j.planner?.split(' ')[0]}</div>
                    <div className="text-xs text-gray-500">{j.budget_hours || 0}h</div>
                    <div className="text-xs text-gray-500">{used.toFixed(1)}h</div>
                    <div className={`text-xs font-semibold ${over ? 'text-red-500' : warn ? 'text-amber-500' : 'text-gray-600'}`}>{pct}%</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'time log' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[70px_80px_90px_1fr_60px_70px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
            {['Date', 'Planner', 'Job', 'Task', 'Hours', 'Cost'].map(h => (
              <div key={h} className="text-xs text-gray-400">{h}</div>
            ))}
          </div>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No time logged yet — use the Log Time tab!</div>
          ) : (
            logs.map((l, i) => (
              <div key={i} className="grid grid-cols-[70px_80px_90px_1fr_60px_70px] gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div className="text-xs text-gray-400">{l.log_date}</div>
                <div className="text-xs font-medium">{l.planner?.split(' ')[0]} {l.planner?.split(' ')[1]?.[0]}.</div>
                <div className="text-xs text-emerald-600 font-medium">{l.job_code}</div>
                <div className="text-xs">{l.task}</div>
                <div className="text-xs font-medium">{l.hours}h</div>
                <div className="text-xs text-gray-500">${((l.hours || 0) * (l.rate || 0)).toFixed(0)}</div>
              </div>
            ))
          )}
          {logs.length > 0 && (
            <div className="grid grid-cols-[70px_80px_90px_1fr_60px_70px] gap-3 px-4 py-2.5 bg-gray-50 border-t border-gray-200">
              <div className="text-xs font-semibold col-span-4">Total</div>
              <div className="text-xs font-semibold">{totalHrs.toFixed(1)}h</div>
              <div className="text-xs font-semibold text-emerald-600">${totalCost.toFixed(0)}</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'log time' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Log time entry</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Job</label>
                <select value={logJob} onChange={e => setLogJob(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option value="">Select a job...</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.code}>{j.code} — {j.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Planner</label>
                <select value={logPlanner} onChange={e => setLogPlanner(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option>Sarah Barnes</option>
                  <option>James Thompson</option>
                  <option>Priya Mehta</option>
                  <option>Luke Rawlings</option>
                  <option>Amy Chen</option>
                  <option>Ben Okafor</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Task category</label>
                <select value={logTask} onChange={e => setLogTask(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option>Research & analysis</option>
                  <option>Report writing</option>
                  <option>IR response</option>
                  <option>Client meeting</option>
                  <option>Council liaison</option>
                  <option>Referral agency</option>
                  <option>Administration</option>
                  <option>Site visit</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hours</label>
                <input type="number" value={logHrs} onChange={e => setLogHrs(e.target.value)} placeholder="2.5" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
                <input value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="e.g. IR #1 TRC — car parking" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleLog} disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Log time'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}