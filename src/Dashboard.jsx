import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { sendIRDeadlineAlert } from './notifications'

const typeBadge = {
  MCU: 'bg-blue-100 text-blue-700',
  ROL: 'bg-amber-100 text-amber-700',
  RAA: 'bg-pink-100 text-pink-700',
  OW: 'bg-green-100 text-green-700',
  SPS: 'bg-purple-100 text-purple-700',
}

const statusBadge = {
  Active: 'bg-emerald-100 text-emerald-700',
  Review: 'bg-amber-100 text-amber-700',
  Draft: 'bg-gray-100 text-gray-500',
  Complete: 'bg-green-100 text-green-700',
}

function isUrgent(dateStr) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const now = new Date()
  const diff = (date - now) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 7
}

function isPast(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Extract all upcoming due dates from a job (within 30 days)
function extractDueDates(job, withinDays = 30) {
  const dates = []
  const now = new Date()

  const checkDate = (label, dateStr) => {
    if (!dateStr) return
    const date = new Date(dateStr)
    const diff = (date - now) / (1000 * 60 * 60 * 24)
    if (diff >= -1 && diff <= withinDays) {
      dates.push({
        label,
        date: dateStr,
        daysUntil: Math.ceil(diff),
        jobCode: job.code,
        jobName: job.name,
        planner: job.planner,
        planners: job.planners || (job.planner ? [job.planner] : []),
      })
    }
  }

  // Key dates from job fields
  checkDate('Lodgement', job.lodgement_date)
  checkDate('Decision due', job.decision_due_date)
  checkDate('Confirmation', job.date_confirmation)
  checkDate('IR response', job.date_ir_response)
  checkDate('Referral', job.date_referral)
  checkDate('Public notice start', job.date_public_notice_start)
  checkDate('Public notice end', job.date_public_notice_end)
  checkDate('Decision', job.date_decision)

  // DA stage end dates
  if (job.da_stages) {
    const stageLabels = {
      application: 'Application stage',
      referral: 'Referral stage',
      information: 'Information request',
      notification: 'Public notification',
      decision: 'Decision stage',
    }
    for (const [key, label] of Object.entries(stageLabels)) {
      const stage = job.da_stages[key]
      if (stage?.status === 'active' && stage?.endDate) {
        checkDate(label, stage.endDate)
      }
    }
  }

  return dates.sort((a, b) => a.daysUntil - b.daysUntil)
}

function DueDateBadge({ daysUntil }) {
  if (daysUntil < 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Overdue</span>
  if (daysUntil <= 3) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{daysUntil}d</span>
  if (daysUntil <= 7) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{daysUntil}d</span>
  if (daysUntil <= 14) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">{daysUntil}d</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{daysUntil}d</span>
}

function KeyDatesPanel({ myJobs, allJobs, viewingAs }) {
  // My jobs due dates — only jobs assigned to this user
  const myDueDates = myJobs.flatMap(job => extractDueDates(job, 30))
    .sort((a, b) => a.daysUntil - b.daysUntil)

  // All firm due dates — every active job within 30 days
  const allDueDates = allJobs.flatMap(job => extractDueDates(job, 30))
    .sort((a, b) => a.daysUntil - b.daysUntil)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {/* Left — my jobs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My upcoming deadlines</div>
          <div className="text-xs text-gray-400 mt-0.5">Dates due within 30 days — {viewingAs}</div>
        </div>
        {myDueDates.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">No deadlines in the next 30 days.</div>
        ) : myDueDates.map((d, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${d.daysUntil <= 7 ? 'bg-amber-50/40' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-emerald-600">{d.jobCode}</span>
                <span className="text-xs text-gray-500 truncate">{d.label}</span>
              </div>
              <div className="text-xs text-gray-400 truncate">{d.jobName}</div>
              <div className="text-xs text-gray-400">{formatDateShort(d.date)}</div>
            </div>
            <DueDateBadge daysUntil={d.daysUntil} />
          </div>
        ))}
      </div>

      {/* Right — all firm jobs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Firm-wide upcoming deadlines</div>
          <div className="text-xs text-gray-400 mt-0.5">All active jobs due within 30 days</div>
        </div>
        {allDueDates.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">No firm-wide deadlines in the next 30 days.</div>
        ) : allDueDates.map((d, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${d.daysUntil <= 7 ? 'bg-amber-50/40' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-emerald-600">{d.jobCode}</span>
                <span className="text-xs text-gray-500 truncate">{d.label}</span>
              </div>
              <div className="text-xs text-gray-400 truncate">{d.jobName}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{formatDateShort(d.date)}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">{d.planner}</span>
              </div>
            </div>
            <DueDateBadge daysUntil={d.daysUntil} />
          </div>
        ))}
      </div>
    </div>
  )
}

function JobSearchPanel({ onNavigate, isDirector, jobs }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [plannerFilter, setPlannerFilter] = useState('All')

  const uniquePlanners = [...new Set(jobs.map(j => j.planner).filter(Boolean))].sort()

  const filtered = jobs.filter(j => {
    const matchSearch = search === '' ||
      j.name?.toLowerCase().includes(search.toLowerCase()) ||
      (j.client_first_name + ' ' + j.client_last_name).toLowerCase().includes(search.toLowerCase()) ||
      j.address?.toLowerCase().includes(search.toLowerCase()) ||
      j.code?.toLowerCase().includes(search.toLowerCase()) ||
      j.planner?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All' || j.app_type === typeFilter
    const matchStatus = statusFilter === 'All' || j.status === statusFilter
    const matchPlanner = plannerFilter === 'All' || j.planner === plannerFilter
    return matchSearch && matchType && matchStatus && matchPlanner
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Search all jobs — active & past</div>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          placeholder="Search by job code, client, address, planner..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
        />
        <div className="flex gap-2">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="flex-1 px-2 py-2 text-xs border border-gray-200 rounded-lg">
            <option>All</option><option>MCU</option><option>ROL</option><option>RAA</option><option>OW</option><option>SPS</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1 px-2 py-2 text-xs border border-gray-200 rounded-lg">
            <option>All</option><option>Active</option><option>Review</option><option>Draft</option><option>Complete</option>
          </select>
          {isDirector && (
            <select value={plannerFilter} onChange={e => setPlannerFilter(e.target.value)} className="flex-1 px-2 py-2 text-xs border border-gray-200 rounded-lg">
              <option>All</option>
              {uniquePlanners.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>
      </div>
      {search || typeFilter !== 'All' || statusFilter !== 'All' || plannerFilter !== 'All' ? (
        <div>
          <div className="text-xs text-gray-400 mb-2">{filtered.length} result{filtered.length !== 1 ? 's' : ''} found</div>
          {filtered.length === 0 ? (
            <div className="text-xs text-gray-400 py-4 text-center">No jobs match your search.</div>
          ) : filtered.map(job => (
            <div key={job.id || job.code} onClick={() => onNavigate('jobdetail', job)} className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2">
              <div className="text-xs font-medium text-emerald-600 w-16 flex-shrink-0">{job.code}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{job.name}</div>
                <div className="text-xs text-gray-400 truncate">{job.client_first_name} {job.client_last_name} · {job.address}</div>
              </div>
              <div className="hidden sm:block text-xs text-gray-400 w-20 text-right flex-shrink-0">{job.planner?.split(' ')[0]} {job.planner?.split(' ')[1]?.[0]}.</div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${typeBadge[job.app_type] || 'bg-gray-100 text-gray-500'}`}>{job.app_type}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${statusBadge[job.status] || 'bg-gray-100 text-gray-500'}`}>{job.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-2">Type to search across all jobs including past completed jobs</div>
      )}
    </div>
  )
}

function PlannerView({ planner, onNavigate, allJobs }) {
  // My jobs — jobs where this planner is assigned
  const myJobs = allJobs.filter(j =>
    j.status !== 'Complete' &&
    (j.planner === planner || j.planners?.includes(planner))
  )

  const urgentDates = myJobs.flatMap(j => {
    const dates = []
    const checkDate = (label, dateStr) => {
      if (dateStr && isUrgent(dateStr)) dates.push({ job: j.code, label, date: dateStr, name: j.name })
    }
    checkDate('IR response', j.date_ir_response)
    checkDate('Decision', j.date_decision)
    checkDate('Referral', j.date_referral)
    checkDate('Public notice', j.date_public_notice_start)
    if (j.da_stages) {
      const stageLabels = { application: 'Application stage', referral: 'Referral stage', information: 'Information request', notification: 'Public notification', decision: 'Decision stage' }
      for (const [key, label] of Object.entries(stageLabels)) {
        const stage = j.da_stages[key]
        if (stage?.status === 'active' && stage?.endDate && isUrgent(stage.endDate)) {
          dates.push({ job: j.code, label, date: stage.endDate, name: j.name })
        }
      }
    }
    return dates
  })

  // Active jobs excluding complete
  const activeAllJobs = allJobs.filter(j => j.status !== 'Complete')

  return (
    <div>
      <div className="mb-4">
        <div className="text-base font-semibold">Good morning, {planner.split(' ')[0]} 👋</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {myJobs.length} active jobs · {urgentDates.length} dates due this week
        </div>
      </div>

      {urgentDates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <div className="text-xs font-semibold text-amber-700 mb-2">⚑ Dates due this week</div>
          {urgentDates.map((d, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs py-1 border-b border-amber-100 last:border-0 gap-0.5">
              <span className="text-amber-800 font-medium">{d.job} — {d.name}</span>
              <span className="text-amber-600">{d.label} · {formatDateShort(d.date)}</span>
            </div>
          ))}
        </div>
      )}

      <JobSearchPanel onNavigate={onNavigate} isDirector={false} jobs={allJobs} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My active jobs</div>
            <button onClick={() => onNavigate('jobs')} className="text-xs text-emerald-600 hover:underline">All jobs →</button>
          </div>
          {myJobs.length === 0 ? (
            <div className="text-xs text-gray-400">No active jobs assigned.</div>
          ) : myJobs.map(job => (
            <div key={job.id} onClick={() => onNavigate('jobdetail', job)} className="cursor-pointer hover:opacity-80 py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <div className="text-xs font-medium text-emerald-600 w-16 flex-shrink-0">{job.code}</div>
                <div className="flex-1 text-xs font-medium truncate">{job.name}</div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeBadge[job.app_type] || 'bg-gray-100 text-gray-500'}`}>{job.app_type}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge[job.status] || 'bg-gray-100 text-gray-500'}`}>{job.status}</span>
              </div>
              <div className="ml-0 sm:ml-16 flex flex-wrap gap-x-4">
                {job.date_ir_response && (
                  <div className={`text-xs ${isUrgent(job.date_ir_response) ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                    IR: {formatDateShort(job.date_ir_response)}
                  </div>
                )}
                {job.decision_due_date && (
                  <div className="text-xs text-gray-400">Decision: {formatDateShort(job.decision_due_date)}</div>
                )}
              </div>
            </div>
          ))}
          <button onClick={() => onNavigate('newjob')} className="mt-3 w-full py-1.5 text-xs border border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
            + New job
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onNavigate('newjob')} className="py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">+ New job</button>
              <button onClick={() => onNavigate('time')} className="py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Log time</button>
              <button onClick={() => onNavigate('docs')} className="py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Documents</button>
              <button onClick={() => onNavigate('calendar')} className="py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Calendar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Key dates — two column panel */}
      <KeyDatesPanel myJobs={myJobs} allJobs={activeAllJobs} viewingAs={planner} />
    </div>
  )
}

function DirectorView({ onNavigate, allJobs, viewingAs }) {
  const activeJobs = allJobs.filter(j => j.status !== 'Complete')
  const allPlanners = [...new Set(allJobs.map(j => j.planner).filter(Boolean))]

  const urgentAll = activeJobs.flatMap(j => {
    const dates = []
    const checkDate = (label, dateStr) => {
      if (dateStr && isUrgent(dateStr)) dates.push({ job: j.code, planner: j.planner, label, date: dateStr, name: j.name })
    }
    checkDate('IR response', j.date_ir_response)
    checkDate('Decision', j.date_decision || j.decision_due_date)
    checkDate('Referral', j.date_referral)
    if (j.da_stages) {
      const stageLabels = { application: 'Application stage', referral: 'Referral stage', information: 'Information request', notification: 'Public notification', decision: 'Decision stage' }
      for (const [key, label] of Object.entries(stageLabels)) {
        const stage = j.da_stages[key]
        if (stage?.status === 'active' && stage?.endDate && isUrgent(stage.endDate)) {
          dates.push({ job: j.code, planner: j.planner, label, date: stage.endDate, name: j.name })
        }
      }
    }
    return dates
  })

  // My jobs as director (for left column of key dates)
  const myJobs = allJobs.filter(j =>
    j.status !== 'Complete' &&
    (j.planner === viewingAs || j.planners?.includes(viewingAs))
  )

  return (
    <div>
      <div className="mb-4">
        <div className="text-base font-semibold">Director overview 📋</div>
        <div className="text-xs text-gray-400 mt-0.5">{activeJobs.length} active jobs · {allPlanners.length} planners · {urgentAll.length} dates due this week</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-400 mb-1">Active jobs</div><div className="text-xl font-semibold">{activeJobs.length}</div></div>
        <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-400 mb-1">Total jobs</div><div className="text-xl font-semibold">{allJobs.length}</div></div>
        <div className="bg-emerald-50 rounded-lg p-3"><div className="text-xs text-emerald-600 mb-1">Planners</div><div className="text-xl font-semibold text-emerald-600">{allPlanners.length}</div></div>
        <div className="bg-amber-50 rounded-lg p-3"><div className="text-xs text-amber-600 mb-1">Due this week</div><div className="text-xl font-semibold text-amber-600">{urgentAll.length}</div></div>
        <div className="bg-red-50 rounded-lg p-3 col-span-2 sm:col-span-1"><div className="text-xs text-red-400 mb-1">Due in 30 days</div><div className="text-xl font-semibold text-red-600">{activeJobs.flatMap(j => extractDueDates(j, 30)).length}</div></div>
      </div>

      <JobSearchPanel onNavigate={onNavigate} isDirector={true} jobs={allJobs} />

      {urgentAll.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <div className="text-xs font-semibold text-amber-700 mb-2">⚑ Firm-wide dates due this week</div>
          {urgentAll.map((d, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs py-1 border-b border-amber-100 last:border-0 gap-0.5">
              <span className="text-amber-800 font-medium">{d.job} — {d.name}</span>
              <span className="text-amber-600">{d.planner} · {d.label} · {formatDateShort(d.date)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Active jobs table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All active jobs — allocated by planner</div>
        <div className="grid grid-cols-[80px_1fr_90px_55px_65px_70px_80px] gap-2 pb-2 mb-1 border-b border-gray-200">
          {['Job', 'Name', 'Planner', 'Type', 'Status', 'Budget', 'Decision'].map(h => (
            <div key={h} className="text-xs text-gray-400">{h}</div>
          ))}
        </div>
        {activeJobs.map(job => (
          <div key={job.id} onClick={() => onNavigate('jobdetail', job)} className="grid grid-cols-[80px_1fr_90px_55px_65px_70px_80px] gap-2 py-2 border-b border-gray-100 last:border-0 items-center cursor-pointer hover:bg-gray-50 rounded-lg px-1">
            <div className="text-xs font-medium text-emerald-600">{job.code}</div>
            <div className="text-xs font-medium truncate">{job.name}</div>
            <div className="text-xs text-gray-500 truncate">{job.planner?.split(' ')[0]} {job.planner?.split(' ')[1]?.[0]}.</div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeBadge[job.app_type] || 'bg-gray-100 text-gray-500'}`}>{job.app_type}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge[job.status] || 'bg-gray-100 text-gray-500'}`}>{job.status}</span>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: '50%' }} />
            </div>
            <div className="text-xs text-gray-500">{formatDateShort(job.decision_due_date || job.date_decision)}</div>
          </div>
        ))}
      </div>

      {/* Mobile active jobs */}
      <div className="md:hidden space-y-2 mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Active jobs</div>
        {activeJobs.map(job => (
          <div key={job.id} onClick={() => onNavigate('jobdetail', job)} className="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer active:bg-gray-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-emerald-600">{job.code}</span>
              <div className="flex gap-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeBadge[job.app_type] || 'bg-gray-100 text-gray-500'}`}>{job.app_type}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge[job.status] || 'bg-gray-100 text-gray-500'}`}>{job.status}</span>
              </div>
            </div>
            <div className="text-xs font-medium text-gray-800 mb-0.5">{job.name}</div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-400">{job.planner?.split(' ')[0]} {job.planner?.split(' ')[1]?.[0]}.</span>
              <span className="text-xs text-gray-400">Decision: {formatDateShort(job.decision_due_date || job.date_decision)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Key dates — two column panel */}
      <KeyDatesPanel myJobs={myJobs} allJobs={activeJobs} viewingAs={viewingAs} />

      {/* Planner cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        {allPlanners.map(planner => {
          const pJobs = activeJobs.filter(j => j.planner === planner)
          const pUrgent = pJobs.flatMap(j => extractDueDates(j, 7))
          return (
            <div key={planner} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="text-xs font-semibold mb-1">{planner}</div>
              <div className="text-xs text-gray-400 mb-2">{pJobs.length} active jobs · {pUrgent.length} dates due this week</div>
              {pJobs.map(j => (
                <div key={j.id} className="flex items-center gap-1.5 py-1 border-b border-gray-50 last:border-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeBadge[j.app_type] || 'bg-gray-100 text-gray-500'}`}>{j.app_type}</span>
                  <div className="text-xs truncate">{j.code}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard({ onNavigate, currentUser }) {
  const isDirector = currentUser?.role === 'director'
  const [view, setView] = useState('planner')
  const [viewingAs, setViewingAs] = useState(currentUser?.username || '')
  const [staffList, setStaffList] = useState([])
  const [allJobs, setAllJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
      setLoadingJobs(true)
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setAllJobs(data)
      setLoadingJobs(false)
    }
    fetchJobs()
  }, [])

  useEffect(() => {
    if (!isDirector || !currentUser?.company_id) return
    const fetchStaff = async () => {
      const { data } = await supabase
        .from('app_users')
        .select('username, role')
        .eq('company_id', currentUser.company_id)
        .eq('is_approved', true)
        .order('username', { ascending: true })
      if (data) setStaffList(data)
    }
    fetchStaff()
  }, [isDirector, currentUser])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 bg-white rounded-xl border border-gray-200 p-3">
        {isDirector ? (
          <>
            <div className="text-xs font-medium text-gray-500">View as:</div>
            <select
              value={viewingAs}
              onChange={e => setViewingAs(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
            >
              {staffList.map(s => (
                <option key={s.username} value={s.username}>
                  {s.username} {s.role === 'director' ? '(Director)' : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-1 sm:ml-auto">
              <button
                onClick={() => setView('planner')}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-lg transition-colors ${view === 'planner' ? 'bg-emerald-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
              >My view</button>
              <button
                onClick={() => setView('director')}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-lg transition-colors ${view === 'director' ? 'bg-emerald-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
              >Director view</button>
            </div>
          </>
        ) : (
          <div className="text-xs font-medium text-gray-500">
            Viewing as: <span className="font-semibold text-gray-700">{currentUser?.username}</span>
          </div>
        )}
      </div>

      {loadingJobs ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-xs text-gray-400">Loading dashboard...</div>
      ) : view === 'planner'
        ? <PlannerView planner={viewingAs} onNavigate={onNavigate} allJobs={allJobs} />
        : <DirectorView onNavigate={onNavigate} allJobs={allJobs} viewingAs={viewingAs} />
      }
    </div>
  )
}