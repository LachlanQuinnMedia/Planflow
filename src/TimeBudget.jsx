import { useState } from 'react'

const jobBudgets = [
  { code: '2025-031', name: 'Ridgeline MCU', planner: 'Sarah B.', budgetHrs: 60, usedHrs: 49.2, rate: 185 },
  { code: '2025-033', name: 'Apex RAA', planner: 'Sarah B.', budgetHrs: 20, usedHrs: 21.6, rate: 185 },
  { code: '2025-028', name: 'Stonewood ROL', planner: 'Priya M.', budgetHrs: 60, usedHrs: 33.0, rate: 160 },
  { code: '2025-034', name: 'Creek Rd OW', planner: 'Luke R.', budgetHrs: 40, usedHrs: 7.2, rate: 135 },
  { code: '2025-029', name: 'Hillcrest SPS', planner: 'Amy C.', budgetHrs: 35, usedHrs: 24.5, rate: 140 },
  { code: '2025-027', name: 'Park St MCU', planner: 'Sarah B.', budgetHrs: 45, usedHrs: 28.0, rate: 185 },
]

const timeLogs = [
  { date: '19 Mar', planner: 'Sarah B.', job: '2025-031', task: 'IR response drafting', hrs: 2.5, rate: 185 },
  { date: '19 Mar', planner: 'Priya M.', job: '2025-028', task: 'Planning report revisions', hrs: 3.0, rate: 160 },
  { date: '18 Mar', planner: 'Sarah B.', job: '2025-033', task: 'Council liaison', hrs: 1.5, rate: 185 },
  { date: '18 Mar', planner: 'Luke R.', job: '2025-034', task: 'Research & analysis', hrs: 4.0, rate: 135 },
  { date: '18 Mar', planner: 'Amy C.', job: '2025-029', task: 'Report writing', hrs: 2.0, rate: 140 },
  { date: '17 Mar', planner: 'James T.', job: '2025-028', task: 'Client meeting', hrs: 1.0, rate: 155 },
  { date: '17 Mar', planner: 'Sarah B.', job: '2025-031', task: 'Planning report revisions', hrs: 3.5, rate: 185 },
]

export default function TimeBudget() {
  const [activeTab, setActiveTab] = useState('overview')
  const [logJob, setLogJob] = useState('2025-031 — Ridgeline MCU')
  const [logPlanner, setLogPlanner] = useState('Sarah Barnes')
  const [logTask, setLogTask] = useState('Report writing')
  const [logHrs, setLogHrs] = useState('')
  const [logNote, setLogNote] = useState('')
  const [logDate, setLogDate] = useState('')
  const [logs, setLogs] = useState(timeLogs)

  const totalHrs = logs.reduce((a, b) => a + b.hrs, 0)
  const billableHrs = totalHrs
  const overBudget = jobBudgets.filter(j => j.usedHrs > j.budgetHrs).length

  const handleLog = () => {
    if (!logHrs) { alert('Please enter hours'); return }
    setLogs([{ date: 'Today', planner: logPlanner.split(' ')[0] + ' ' + logPlanner.split(' ')[1][0] + '.', job: logJob.split(' ')[0], task: logTask, hrs: parseFloat(logHrs), rate: 185 }, ...logs])
    setLogHrs('')
    setLogNote('')
    alert('Time logged successfully!')
  }

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

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Total hrs MTD</div>
              <div className="text-xl font-semibold">412</div>
              <div className="text-xs text-gray-400 mt-0.5">All planners</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Billable hrs</div>
              <div className="text-xl font-semibold">378</div>
              <div className="text-xs text-gray-400 mt-0.5">$57,240 billed</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Non-billable</div>
              <div className="text-xl font-semibold">34</div>
              <div className="text-xs text-gray-400 mt-0.5">Admin, BD, training</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs text-red-400 mb-1">Over budget</div>
              <div className="text-xl font-semibold text-red-600">{overBudget}</div>
              <div className="text-xs text-red-400 mt-0.5">Jobs need attention</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Avg utilisation</div>
              <div className="text-xl font-semibold">71%</div>
              <div className="text-xs text-gray-400 mt-0.5">Across active jobs</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Budget status — active jobs</div>
            <div className="grid grid-cols-[70px_1fr_70px_60px_60px] gap-3 pb-2 mb-2 border-b border-gray-100">
              <div className="text-xs text-gray-400">Job</div>
              <div className="text-xs text-gray-400">Name</div>
              <div className="text-xs text-gray-400">Planner</div>
              <div className="text-xs text-gray-400">Budget</div>
              <div className="text-xs text-gray-400">Used</div>
            </div>
            {jobBudgets.map(j => {
              const pct = Math.round((j.usedHrs / j.budgetHrs) * 100)
              const over = pct > 100
              const warn = pct > 75
              return (
                <div key={j.code} className="grid grid-cols-[70px_1fr_70px_60px_60px] gap-3 items-center py-2 border-b border-gray-100 last:border-0">
                  <div className="text-xs font-medium text-emerald-600">{j.code}</div>
                  <div>
                    <div className="text-xs font-medium mb-1">{j.name}</div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{j.planner}</div>
                  <div className="text-xs text-gray-500">{j.budgetHrs}h</div>
                  <div className={`text-xs font-semibold ${over ? 'text-red-500' : warn ? 'text-amber-500' : 'text-gray-600'}`}>{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TIME LOG */}
      {activeTab === 'time log' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[70px_80px_90px_1fr_60px_60px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="text-xs text-gray-400">Date</div>
            <div className="text-xs text-gray-400">Planner</div>
            <div className="text-xs text-gray-400">Job</div>
            <div className="text-xs text-gray-400">Task</div>
            <div className="text-xs text-gray-400">Hours</div>
            <div className="text-xs text-gray-400">Cost</div>
          </div>
          {logs.map((l, i) => (
            <div key={i} className="grid grid-cols-[70px_80px_90px_1fr_60px_60px] gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="text-xs text-gray-400">{l.date}</div>
              <div className="text-xs font-medium">{l.planner}</div>
              <div className="text-xs text-emerald-600 font-medium">{l.job}</div>
              <div className="text-xs">{l.task}</div>
              <div className="text-xs font-medium">{l.hrs}h</div>
              <div className="text-xs text-gray-500">${(l.hrs * l.rate).toFixed(0)}</div>
            </div>
          ))}
          <div className="grid grid-cols-[70px_80px_90px_1fr_60px_60px] gap-3 px-4 py-2.5 bg-gray-50 border-t border-gray-200">
            <div className="text-xs font-semibold col-span-4">Total</div>
            <div className="text-xs font-semibold">{logs.reduce((a, b) => a + b.hrs, 0).toFixed(1)}h</div>
            <div className="text-xs font-semibold text-emerald-600">${logs.reduce((a, b) => a + (b.hrs * b.rate), 0).toFixed(0)}</div>
          </div>
        </div>
      )}

      {/* LOG TIME */}
      {activeTab === 'log time' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Log time entry</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="fg">
                <label className="text-xs text-gray-500 mb-1 block">Job</label>
                <select value={logJob} onChange={e => setLogJob(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option>2025-031 — Ridgeline MCU</option>
                  <option>2025-028 — Stonewood ROL</option>
                  <option>2025-033 — Apex RAA</option>
                  <option>2025-034 — Creek Rd OW</option>
                  <option>2025-029 — Hillcrest SPS</option>
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
            <div className="grid grid-cols-2 gap-3 mb-3">
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
              <button onClick={handleLog} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                Log time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}