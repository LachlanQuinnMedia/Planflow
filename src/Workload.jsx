import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const COMPLEXITY = {
  C1: { label: 'C1', description: 'Simple', weight: 1, color: 'bg-gray-100 text-gray-600' },
  C2: { label: 'C2', description: 'Moderate', weight: 2, color: 'bg-blue-100 text-blue-700' },
  C3: { label: 'C3', description: 'Complex', weight: 3, color: 'bg-amber-100 text-amber-700' },
  C4: { label: 'C4', description: 'High complexity', weight: 4, color: 'bg-red-100 text-red-700' },
}

const PLANNER_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

const WEEKLY_AVAILABLE = 40

function calcCapacity(jobs) {
  const totalHrs = jobs.reduce((sum, j) => sum + (j.hrs || 0), 0)
  const weightedLoad = jobs.reduce((sum, j) => {
    return sum + ((j.hrs || 0) * (COMPLEXITY[j.complexity]?.weight || 1))
  }, 0)
  const maxWeighted = WEEKLY_AVAILABLE * 4
  const weightedPct = Math.round((weightedLoad / maxWeighted) * 100)
  const rawPct = Math.round((totalHrs / WEEKLY_AVAILABLE) * 100)
  return { totalHrs, weightedPct, rawPct }
}

function getInitials(name) {
  if (!name) return '??'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return parts[0][0] + parts[1][0]
  return parts[0].slice(0, 2).toUpperCase()
}

export default function Workload({ currentUser }) {
  const [planners, setPlanners] = useState([])
  const [jobs, setJobs] = useState([])
  const [timeLogs, setTimeLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('weighted')
  const [complexityOverrides, setComplexityOverrides] = useState({})

  useEffect(() => {
    fetchData()
  }, [currentUser])

  const fetchData = async () => {
    setLoading(true)

    // Fetch all approved users
    const { data: users } = await supabase
      .from('app_users')
      .select('id, username, role')
      .eq('company_id', currentUser?.company_id)
      .eq('is_approved', true)
      .order('username', { ascending: true })

    // Fetch all active jobs
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('id, code, name, planner, planners, planner_rate, budget_hours, app_type, status, complexity')
      .neq('status', 'Complete')
      .order('created_at', { ascending: false })

    // Fetch time logs for this week
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const { data: logs } = await supabase
      .from('time_logs')
      .select('*')
      .gte('log_date', weekStart.toISOString().split('T')[0])
      .lte('log_date', weekEnd.toISOString().split('T')[0])

    if (users) setPlanners(users)
    if (jobsData) setJobs(jobsData)
    if (logs) setTimeLogs(logs)

    setLoading(false)
  }

  const updateJobComplexity = async (jobId, complexity) => {
    setComplexityOverrides(prev => ({ ...prev, [jobId]: complexity }))
    await supabase.from('jobs').update({ complexity }).eq('id', jobId)
  }

  // Build planner data by combining users + jobs + time logs
  const plannerData = planners.map((user, idx) => {
    const name = user.username

    // Jobs assigned to this planner
    const assignedJobs = jobs.filter(j =>
      j.planner === name || j.planners?.includes(name)
    )

    // Hours logged this week per job
    const jobsWithHrs = assignedJobs.map(job => {
      const logsForJob = timeLogs.filter(l => l.job_id === job.id && l.planner === name)
      const hrsThisWeek = logsForJob.reduce((sum, l) => sum + (l.hours || 0), 0)
      const complexity = complexityOverrides[job.id] || job.complexity || 'C2'
      return {
        id: job.id,
        code: job.code,
        name: job.name,
        complexity,
        hrs: parseFloat(hrsThisWeek.toFixed(2)),
        rate: job.planner_rate || 0,
        budgetHrs: job.budget_hours || 0,
        type: job.app_type,
      }
    })

    // Total hours logged this week across all jobs
    const allLogsThisWeek = timeLogs.filter(l => l.planner === name)
    const totalHrsThisWeek = allLogsThisWeek.reduce((sum, l) => sum + (l.hours || 0), 0)

    const { weightedPct, rawPct } = calcCapacity(jobsWithHrs)

    // Revenue MTD
    const allLogs = timeLogs.filter(l => l.planner === name)
    const revenueMTD = allLogs.reduce((sum, l) => sum + ((l.hours || 0) * (l.rate || 0)), 0)

    return {
      id: user.id,
      name,
      role: user.role === 'director' ? 'Director' : 'Planner',
      initials: getInitials(name),
      color: PLANNER_COLORS[idx % PLANNER_COLORS.length],
      available: WEEKLY_AVAILABLE,
      jobs: jobsWithHrs,
      totalHrs: parseFloat(totalHrsThisWeek.toFixed(2)),
      weightedPct,
      rawPct,
      revenueMTD: parseFloat(revenueMTD.toFixed(2)),
    }
  })

  const selectedPlanner = plannerData.find(p => p.name === selected?.username) || plannerData[0]

  const nearCapacity = plannerData.filter(p =>
    (view === 'weighted' ? p.weightedPct : p.rawPct) >= 75
  )

  const totalAvailableHrs = plannerData.reduce((sum, p) => sum + (WEEKLY_AVAILABLE - p.totalHrs), 0)

  const avgCapacity = plannerData.length > 0
    ? Math.round(plannerData.reduce((sum, p) => sum + (view === 'weighted' ? p.weightedPct : p.rawPct), 0) / plannerData.length)
    : 0

  const weekLabel = (() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `Week of ${start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
  })()

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-xs text-gray-400">
        Loading workload data...
      </div>
    )
  }

  if (plannerData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-xs text-gray-400">
        No planners found.
      </div>
    )
  }

  const pct = view === 'weighted' ? selectedPlanner?.weightedPct : selectedPlanner?.rawPct

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Total planners</div>
          <div className="text-xl font-semibold">{plannerData.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Active this week</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Avg capacity</div>
          <div className="text-xl font-semibold">{avgCapacity}%</div>
          <div className="text-xs text-gray-400 mt-0.5">{view === 'weighted' ? 'Complexity weighted' : 'Raw hours'}</div>
        </div>
        <div className={`rounded-lg p-3 ${nearCapacity.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className={`text-xs mb-1 ${nearCapacity.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>Near capacity</div>
          <div className={`text-xl font-semibold ${nearCapacity.length > 0 ? 'text-red-600' : 'text-gray-800'}`}>{nearCapacity.length}</div>
          <div className={`text-xs mt-0.5 ${nearCapacity.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {nearCapacity.length > 0
              ? nearCapacity.map(p => p.initials).join(' · ')
              : 'All within capacity'}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Available hrs</div>
          <div className="text-xl font-semibold text-emerald-600">{totalAvailableHrs.toFixed(0)} hrs</div>
          <div className="text-xs text-gray-400 mt-0.5">Across team this week</div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="text-xs text-gray-400">Capacity view:</div>
        <button
          onClick={() => setView('weighted')}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${view === 'weighted' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          Complexity weighted (C1–C4)
        </button>
        <button
          onClick={() => setView('raw')}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${view === 'raw' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          Raw hours
        </button>
        <div className="flex items-center gap-3 ml-4">
          {Object.entries(COMPLEXITY).map(([key, c]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.color}`}>{c.label}</span>
              <span className="text-xs text-gray-400">{c.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Team list */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Team — {weekLabel}</div>
          {plannerData.map(p => {
            const capacityPct = view === 'weighted' ? p.weightedPct : p.rawPct
            return (
              <div
                key={p.name}
                onClick={() => setSelected(planners.find(u => u.username === p.name))}
                className={`flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer rounded-lg px-2 transition-colors ${selectedPlanner?.name === p.name ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${p.color}`}>
                  {p.initials}
                </div>
                <div className="w-20 text-xs font-medium truncate">{p.name.split(' ')[0]} {p.name.split(' ')[1]?.[0] || ''}.</div>
                <div className="flex gap-1 flex-shrink-0">
                  {p.jobs.slice(0, 4).map(j => (
                    <span key={j.id} className={`text-xs px-1 py-0.5 rounded font-medium ${COMPLEXITY[j.complexity]?.color || 'bg-gray-100 text-gray-600'}`} style={{ fontSize: '9px' }}>
                      {j.complexity}
                    </span>
                  ))}
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${capacityPct >= 90 ? 'bg-red-500' : capacityPct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(capacityPct, 100)}%` }}
                  />
                </div>
                <div className={`text-xs font-medium w-8 text-right ${capacityPct >= 90 ? 'text-red-500' : capacityPct >= 75 ? 'text-amber-500' : 'text-gray-500'}`}>
                  {capacityPct}%
                </div>
              </div>
            )
          })}
          {nearCapacity.length > 0 && (
            <div className="mt-3 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">
              {nearCapacity.map(p => p.name.split(' ')[0]).join(' & ')} near capacity.{' '}
              {plannerData.filter(p => (view === 'weighted' ? p.weightedPct : p.rawPct) < 50).length > 0 && (
                <>Consider reassigning to {plannerData.filter(p => (view === 'weighted' ? p.weightedPct : p.rawPct) < 50).map(p => p.name.split(' ')[0]).slice(0, 2).join(' or ')}.</>
              )}
            </div>
          )}
        </div>

        {/* Planner detail */}
        {selectedPlanner && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Planner profile</div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${selectedPlanner.color}`}>
                  {selectedPlanner.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold">{selectedPlanner.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{selectedPlanner.role}</div>
                </div>
              </div>
              {[
                ['Active jobs', selectedPlanner.jobs.length],
                ['Hours this week', `${selectedPlanner.totalHrs} / ${selectedPlanner.available} hrs`],
                ['Raw capacity', `${selectedPlanner.rawPct}%`],
                ['Weighted capacity', `${selectedPlanner.weightedPct}% (C1–C4 weighted)`],
                ['Revenue MTD', `$${selectedPlanner.revenueMTD.toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k} className="flex py-1.5 border-b border-gray-50 last:border-0">
                  <div className="text-xs text-gray-400 w-32 flex-shrink-0">{k}</div>
                  <div className="text-xs font-medium">{v}</div>
                </div>
              ))}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{view === 'weighted' ? 'Weighted' : 'Raw'} capacity</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Active jobs with complexity editor */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Active jobs — set complexity
              </div>
              {selectedPlanner.jobs.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-4">No active jobs assigned.</div>
              ) : selectedPlanner.jobs.map(job => (
                <div key={job.id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{job.code}</div>
                    <div className="text-xs text-gray-400 truncate">{job.name}</div>
                    <div className="text-xs text-gray-400">{job.hrs} hrs this week</div>
                  </div>
                  <select
                    value={job.complexity}
                    onChange={e => updateJobComplexity(job.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-lg border border-gray-200 font-medium focus:outline-none focus:border-emerald-400 ${COMPLEXITY[job.complexity]?.color || 'bg-gray-100 text-gray-600'}`}
                  >
                    <option value="C1">C1 — Simple</option>
                    <option value="C2">C2 — Moderate</option>
                    <option value="C3">C3 — Complex</option>
                    <option value="C4">C4 — High</option>
                  </select>
                </div>
              ))}
              {selectedPlanner.jobs.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between">
                  <span className="text-xs text-gray-400">Total this week</span>
                  <span className="text-xs font-semibold">{selectedPlanner.totalHrs} hrs · weighted {selectedPlanner.weightedPct}%</span>
                </div>
              )}
            </div>

            {/* All planners grid */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All planners</div>
              <div className="grid grid-cols-3 gap-2">
                {plannerData.map(p => {
                  const capacityPct = view === 'weighted' ? p.weightedPct : p.rawPct
                  return (
                    <div
                      key={p.name}
                      onClick={() => setSelected(planners.find(u => u.username === p.name))}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors ${selectedPlanner?.name === p.name ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-medium flex-shrink-0 ${p.color}`} style={{ fontSize: '9px' }}>
                          {p.initials}
                        </div>
                        <div className="text-xs font-medium truncate">{p.name.split(' ')[0]}</div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${capacityPct >= 90 ? 'bg-red-500' : capacityPct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(capacityPct, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-gray-400">{capacityPct}%</div>
                        <div className="flex gap-0.5">
                          {p.jobs.slice(0, 3).map(j => (
                            <span key={j.id} className={`rounded font-medium ${COMPLEXITY[j.complexity]?.color || 'bg-gray-100 text-gray-600'}`} style={{ fontSize: '8px', padding: '0px 3px' }}>
                              {j.complexity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}