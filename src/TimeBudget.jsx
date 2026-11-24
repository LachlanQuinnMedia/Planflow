import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { fetchWorkingJobs } from './jobsQuery'
import { jobListName, timerLabel } from './jobMeta'

// Today's date as YYYY-MM-DD in Brisbane time (not UTC)
function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export default function TimeBudget({ currentUser }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [jobs, setJobs] = useState([])
  const [logs, setLogs] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [logJob, setLogJob] = useState('')
  const [logPlanner, setLogPlanner] = useState(currentUser?.username || '')
  const [logTask, setLogTask] = useState('Research & analysis')
  const [logHrs, setLogHrs] = useState('')
  const [logNote, setLogNote] = useState('')
  const [logDate, setLogDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }

  useEffect(() => {
    fetchData()
  }, [currentUser])

  const fetchData = async () => {
    setLoading(true)
    const [jobsRes, logsRes, staffRes] = await Promise.all([
      fetchWorkingJobs('*'),
      supabase.from('time_logs').select('*').order('created_at', { ascending: false }),
      currentUser?.company_id
        ? supabase.from('app_users').select('id, username, role').eq('company_id', currentUser.company_id).eq('is_approved', true).not('is_platform_admin', 'is', true).order('username', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ])
    if (!jobsRes.error) setJobs(jobsRes.data || [])
    if (!logsRes.error) setLogs(logsRes.data || [])
    if (!staffRes.error) setStaff(staffRes.data || [])
    if (!logPlanner && currentUser?.username) setLogPlanner(currentUser.username)
    setLoading(false)
  }

  const handleLog = async () => {
    setMessage(null)
    const hours = parseFloat(logHrs)
    if (!logJob || !hours || hours <= 0) {
      setMessage({ type: 'error', text: 'Please select a job and enter the hours worked.' })
      return
    }
    const selectedJob = jobs.find(j => j.code === logJob)
    if (!selectedJob) {
      setMessage({ type: 'error', text: 'That job could not be found. Please refresh and try again.' })
      return
    }
    setSaving(true)
    const rate = selectedJob.planner_rate || 0
    const { error } = await supabase.from('time_logs').insert({
      job_id: selectedJob.id,
      job_code: selectedJob.code,
      planner: logPlanner || currentUser?.username || 'Unknown',
      task: logTask,
      hours,
      duration_seconds: Math.round(hours * 3600),
      notes: logNote || null,
      log_date: logDate || todayLocal(),
      rate,
    })
    setSaving(false)
    if (error) {
      setMessage({ type: 'error', text: 'Could not save: ' + error.message })
      return
    }
    setLogHrs('')
    setLogNote('')
    setMessage({ type: 'success', text: `Logged ${hours}h on ${selectedJob.code}.` })
    fetchData()
  }

  const totalHrs = logs.reduce((a, b) => a + (b.hours || 0), 0)
  const totalCost = logs.reduce((a, b) => a + ((b.hours || 0) * (b.rate || 0)), 0)
  const activeJobs = jobs.filter(j => j.status !== 'Complete').length
  const overBudget = jobs.filter(j => {
    const jobLogs = logs.filter(l => l.job_code === j.code)
    const used = jobLogs.reduce((a, b) => a + (b.hours || 0), 0)
    return j.budget_hours > 0 && used > j.budget_hours
  }).length

  const tabs = ['overview', 'time log', 'log time']

  return (
    <div>
      <div data-tour="time-tabs" className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-600 font-medium' : 'border-transparent text-gray-600 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Total hrs logged</div><div className="text-xl font-semibold">{totalHrs.toFixed(1)}</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Total billable</div><div className="text-xl font-semibold">${Math.round(totalCost).toLocaleString()}</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Active jobs</div><div className="text-xl font-semibold">{activeJobs}</div></div>
            <div className="bg-red-50 rounded-lg p-3"><div className="text-xs text-red-400 mb-1">Over budget</div><div className="text-xl font-semibold text-red-600">{overBudget}</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Time entries</div><div className="text-xl font-semibold">{logs.length}</div></div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">No jobs yet. Create a job first.</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Budget status, all jobs</div>
              <div className="qp-row min-w-[560px] grid grid-cols-[70px_1fr_70px_60px_60px_60px] gap-3 pb-2 mb-1 border-b border-gray-200">
                {['Job', 'Name', 'Planner', 'Budget', 'Used', '%'].map(h => (
                  <div key={h} className="text-xs text-gray-500">{h}</div>
                ))}
              </div>
              {jobs.map(j => {
                const jobLogs = logs.filter(l => l.job_code === j.code)
                const used = jobLogs.reduce((a, b) => a + (b.hours || 0), 0)
                const pct = j.budget_hours > 0 ? Math.round((used / j.budget_hours) * 100) : 0
                const over = pct > 100
                const warn = pct > 75
                return (
                  <div key={j.id} className="qp-row min-w-[560px] grid grid-cols-[70px_1fr_70px_60px_60px_60px] gap-3 items-center py-2 border-b border-gray-100 last:border-0">
                    <div className="text-xs font-medium text-emerald-600">{j.code}</div>
                    <div>
                      <div className="text-xs font-medium truncate">{jobListName(j)}</div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 truncate">{j.planner || '-'}</div>
                    <div className="text-xs text-gray-600">{j.budget_hours || 0}h</div>
                    <div className="text-xs text-gray-600">{used.toFixed(1)}h</div>
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
          <div className="qp-row min-w-[650px] grid grid-cols-[80px_90px_80px_1fr_60px_70px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
            {['Date', 'Planner', 'Job', 'Task', 'Hours', 'Cost'].map(h => (
              <div key={h} className="text-xs text-gray-500">{h}</div>
            ))}
          </div>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No time logged yet. Use the Log Time tab or the timer in the sidebar.</div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="qp-row min-w-[650px] grid grid-cols-[80px_90px_80px_1fr_60px_70px] gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div className="text-xs text-gray-500">{l.log_date}</div>
                <div className="text-xs font-medium truncate">{l.planner || '-'}</div>
                <div className="text-xs text-emerald-600 font-medium">{l.job_code}</div>
                <div className="text-xs truncate">{l.task}{l.notes ? <span className="text-gray-500"> · {l.notes}</span> : null}</div>
                <div className="text-xs font-medium">{Number(l.hours || 0).toFixed(2)}h</div>
                <div className="text-xs text-gray-600">${((l.hours || 0) * (l.rate || 0)).toFixed(0)}</div>
              </div>
            ))
          )}
          {logs.length > 0 && (
            <div className="qp-row min-w-[650px] grid grid-cols-[80px_90px_80px_1fr_60px_70px] gap-3 px-4 py-2.5 bg-gray-50 border-t border-gray-200">
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
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Log time entry</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Job</label>
                <select value={logJob} onChange={e => setLogJob(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option value="">Select a job...</option>
                  {jobs.filter(j => j.status !== 'Complete').map(j => (
                    <option key={j.id} value={j.code}>{timerLabel(j)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Planner</label>
                <select value={logPlanner} onChange={e => setLogPlanner(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  {currentUser?.username && !staff.some(s => s.username === currentUser.username) && <option value={currentUser.username}>{currentUser.username} (you)</option>}
                  {staff.map(s => (
                    <option key={s.id} value={s.username}>{s.username}{s.role === 'director' ? ' (Director)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Task category</label>
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
                <label className="text-xs text-gray-600 mb-1 block">Hours</label>
                <input type="number" min="0" step="0.25" value={logHrs} onChange={e => setLogHrs(e.target.value)} placeholder="2.5" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Notes (optional)</label>
                <input value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="e.g. IR #1 response, car parking" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Date</label>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
            {message && (
              <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                {message.text}
              </div>
            )}
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
