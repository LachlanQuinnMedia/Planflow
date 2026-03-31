import { useState } from 'react'
import { sendIRDeadlineAlert } from './notifications'

const allJobs = [
  {
    code: '2025-031', name: 'Ridgeline Mixed-Use MCU', address: '44 Ridge St, Toowoomba',
    client: 'Jonas Hartmann', type: 'MCU', planner: 'Sarah Barnes', status: 'Active', budget: 82,
    dates: { confirmation: '25 Jan 2025', irResponse: '19 Mar 2025', referral: '26 Mar 2025', publicNoticeStart: null, publicNoticeEnd: null, decision: '10 Apr 2025' }
  },
  {
    code: '2025-028', name: 'Stonewood Estate ROL', address: 'Lot 12 Stonewood Rd, Warwick',
    client: 'Greenfield Dev.', type: 'ROL', planner: 'Priya Mehta', status: 'Active', budget: 55,
    dates: { confirmation: '15 Jan 2025', irResponse: '28 Mar 2025', referral: null, publicNoticeStart: '1 Apr 2025', publicNoticeEnd: '22 Apr 2025', decision: '15 May 2025' }
  },
  {
    code: '2025-033', name: 'Apex Logistics RAA', address: '22 Commerce Dr, Toowoomba',
    client: 'Apex P/L', type: 'RAA', planner: 'Sarah Barnes', status: 'Review', budget: 112,
    dates: { confirmation: '1 Feb 2025', irResponse: '21 Mar 2025', referral: '28 Mar 2025', publicNoticeStart: null, publicNoticeEnd: null, decision: '1 Apr 2025' }
  },
  {
    code: '2025-034', name: 'Creek Rd OW Stage 2', address: '5 Creek Rd, Gatton',
    client: 'P. & L. Burke', type: 'OW', planner: 'Luke Rawlings', status: 'Draft', budget: 18,
    dates: { confirmation: '10 Mar 2025', irResponse: null, referral: null, publicNoticeStart: null, publicNoticeEnd: null, decision: '10 Jun 2025' }
  },
  {
    code: '2025-029', name: 'Hillcrest SPS Request', address: '17 Hillcrest Ave, Ipswich',
    client: 'T. & M. Hill', type: 'SPS', planner: 'Amy Chen', status: 'Active', budget: 70,
    dates: { confirmation: '20 Feb 2025', irResponse: '5 Apr 2025', referral: null, publicNoticeStart: null, publicNoticeEnd: null, decision: '20 May 2025' }
  },
  {
    code: '2025-027', name: 'Park St Mixed-Use MCU', address: '5 Park St, Toowoomba',
    client: 'R. Okafor', type: 'MCU', planner: 'Sarah Barnes', status: 'Active', budget: 62,
    dates: { confirmation: '10 Feb 2025', irResponse: '1 Apr 2025', referral: '8 Apr 2025', publicNoticeStart: '15 Apr 2025', publicNoticeEnd: '6 May 2025', decision: '1 Jun 2025' }
  },
  {
    code: '2024-089', name: 'Riverfront Apartments MCU', address: '12 River Rd, Ipswich',
    client: 'J. & K. Patel', type: 'MCU', planner: 'James Thompson', status: 'Complete', budget: 100,
    dates: { confirmation: '1 Jun 2024', irResponse: '15 Jul 2024', referral: '22 Jul 2024', publicNoticeStart: '1 Aug 2024', publicNoticeEnd: '22 Aug 2024', decision: '15 Sep 2024' }
  },
  {
    code: '2024-076', name: 'Lockyer Valley ROL', address: 'Lot 4 Valley Rd, Gatton',
    client: 'T. Morrison', type: 'ROL', planner: 'Luke Rawlings', status: 'Complete', budget: 100,
    dates: { confirmation: '1 Apr 2024', irResponse: '1 May 2024', referral: null, publicNoticeStart: null, publicNoticeEnd: null, decision: '1 Jun 2024' }
  },
  {
    code: '2024-055', name: 'Toowoomba Industrial OW', address: '8 Industry Ave, Toowoomba',
    client: 'Apex P/L', type: 'OW', planner: 'Sarah Barnes', status: 'Complete', budget: 100,
    dates: { confirmation: '1 Jan 2024', irResponse: null, referral: null, publicNoticeStart: null, publicNoticeEnd: null, decision: '1 Mar 2024' }
  },
  {
    code: '2024-041', name: 'Greenview Childcare MCU', address: '9 Park Ave, Gatton',
    client: 'T. Nakamura', type: 'MCU', planner: 'Priya Mehta', status: 'Complete', budget: 100,
    dates: { confirmation: '1 Nov 2023', irResponse: '1 Dec 2023', referral: null, publicNoticeStart: null, publicNoticeEnd: null, decision: '15 Jan 2024' }
  },
]

const plannerBookings = {
  'Sarah Barnes': [
    { title: 'T. Nakamura — Initial consult', time: 'Today 9:00am', type: 'client' },
    { title: 'Principal sign-off — 2025-031', time: 'Today 3:30pm', type: 'internal' },
    { title: 'M. Patel — Site review', time: 'Wed 21 Mar 10:00am', type: 'client' },
  ],
  'Priya Mehta': [
    { title: 'Team review — 2025-028', time: 'Today 11:00am', type: 'internal' },
    { title: 'Client call — Greenfield Dev.', time: 'Thu 22 Mar 2:00pm', type: 'client' },
  ],
  'Luke Rawlings': [
    { title: 'R. Okafor — New enquiry', time: 'Today 2:00pm', type: 'client' },
  ],
  'Amy Chen': [
    { title: 'J. Singh — New enquiry', time: 'Fri 23 Mar 11:00am', type: 'client' },
  ],
}

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

function JobSearchPanel({ onNavigate, isDirector }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [plannerFilter, setPlannerFilter] = useState('All')

  const filtered = allJobs.filter(j => {
    const matchSearch = search === '' ||
      j.name.toLowerCase().includes(search.toLowerCase()) ||
      j.client.toLowerCase().includes(search.toLowerCase()) ||
      j.address.toLowerCase().includes(search.toLowerCase()) ||
      j.code.toLowerCase().includes(search.toLowerCase()) ||
      j.planner.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All' || j.type === typeFilter
    const matchStatus = statusFilter === 'All' || j.status === statusFilter
    const matchPlanner = plannerFilter === 'All' || j.planner === plannerFilter
    return matchSearch && matchType && matchStatus && matchPlanner
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Search all jobs — active & past</div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Search by job code, client, address, planner..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-2 py-2 text-xs border border-gray-200 rounded-lg">
          <option>All</option><option>MCU</option><option>ROL</option><option>RAA</option><option>OW</option><option>SPS</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2 py-2 text-xs border border-gray-200 rounded-lg">
          <option>All</option><option>Active</option><option>Review</option><option>Draft</option><option>Complete</option>
        </select>
        {isDirector && (
          <select value={plannerFilter} onChange={e => setPlannerFilter(e.target.value)} className="px-2 py-2 text-xs border border-gray-200 rounded-lg">
            <option>All</option><option>Sarah Barnes</option><option>James Thompson</option><option>Priya Mehta</option><option>Luke Rawlings</option><option>Amy Chen</option>
          </select>
        )}
      </div>
      {search || typeFilter !== 'All' || statusFilter !== 'All' || plannerFilter !== 'All' ? (
        <div>
          <div className="text-xs text-gray-400 mb-2">{filtered.length} result{filtered.length !== 1 ? 's' : ''} found</div>
          {filtered.length === 0 ? (
            <div className="text-xs text-gray-400 py-4 text-center">No jobs match your search.</div>
          ) : filtered.map(job => (
            <div key={job.code} onClick={() => onNavigate('jobdetail')} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2">
              <div className="text-xs font-medium text-emerald-600 w-16 flex-shrink-0">{job.code}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{job.name}</div>
                <div className="text-xs text-gray-400">{job.client} · {job.address}</div>
              </div>
              <div className="text-xs text-gray-400 w-20 text-right">{job.planner.split(' ')[0]} {job.planner.split(' ')[1][0]}.</div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeBadge[job.type]}`}>{job.type}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge[job.status]}`}>{job.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-2">Type to search across all jobs including past completed jobs</div>
      )}
    </div>
  )
}

function PlannerView({ planner, onNavigate }) {
  const myJobs = allJobs.filter(j => j.planner === planner && j.status !== 'Complete')
  const myBookings = plannerBookings[planner] || []
  const urgentDates = myJobs.flatMap(j =>
    Object.entries(j.dates)
      .filter(([, v]) => v && isUrgent(v))
      .map(([k, v]) => ({ job: j.code, label: k, date: v, name: j.name }))
  )

  const sendTestEmail = async () => {
    const result = await sendIRDeadlineAlert({
      plannerEmail: 'lachlanquinnmedia@outlook.com',
      plannerName: planner.split(' ')[0],
      jobCode: '2025-031',
      jobName: 'Ridgeline Mixed-Use MCU',
      irDeadline: '19 Mar 2025',
      council: 'Toowoomba Regional',
    })
    if (result.success) {
      alert('Test email sent! Check your inbox.')
    } else {
      alert('Email failed — Resend requires a verified domain for production. Works fine once deployed with your domain.')
    }
  }

  return (
    <div>
      <div className="mb-4">
        <div className="text-base font-semibold">Good morning, {planner.split(' ')[0]} 👋</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {myJobs.length} active jobs · {myBookings.length} bookings today · {urgentDates.length} dates due this week
        </div>
      </div>

      {urgentDates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <div className="text-xs font-semibold text-amber-700 mb-2">⚑ Dates due this week</div>
          {urgentDates.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-amber-100 last:border-0">
              <span className="text-amber-800 font-medium">{d.job} — {d.name}</span>
              <span className="text-amber-600">{d.label.replace(/([A-Z])/g, ' $1').toLowerCase()} · {d.date}</span>
            </div>
          ))}
        </div>
      )}

      <JobSearchPanel onNavigate={onNavigate} isDirector={false} />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My active jobs</div>
            <button onClick={() => onNavigate('jobs')} className="text-xs text-emerald-600 hover:underline">All jobs →</button>
          </div>
          {myJobs.length === 0 ? (
            <div className="text-xs text-gray-400">No active jobs assigned.</div>
          ) : myJobs.map(job => (
            <div key={job.code} onClick={() => onNavigate('jobdetail')} className="cursor-pointer hover:opacity-80 py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="text-xs font-medium text-emerald-600 w-16 flex-shrink-0">{job.code}</div>
                <div className="flex-1 text-xs font-medium truncate">{job.name}</div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeBadge[job.type]}`}>{job.type}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge[job.status]}`}>{job.status}</span>
              </div>
              <div className="ml-16 grid grid-cols-2 gap-x-4">
                {job.dates.irResponse && (
                  <div className={`text-xs ${isUrgent(job.dates.irResponse) ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                    IR: {job.dates.irResponse}
                  </div>
                )}
                {job.dates.decision && (
                  <div className="text-xs text-gray-400">Decision: {job.dates.decision}</div>
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
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My bookings</div>
              <button onClick={() => onNavigate('calendly')} className="text-xs text-emerald-600 hover:underline">All →</button>
            </div>
            {myBookings.length === 0 ? (
              <div className="text-xs text-gray-400">No bookings this week.</div>
            ) : myBookings.map((b, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${b.type === 'client' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                <div>
                  <div className="text-xs font-medium">{b.title}</div>
                  <div className="text-xs text-gray-400">{b.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onNavigate('newjob')} className="py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">+ New job</button>
              <button onClick={() => onNavigate('time')} className="py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Log time</button>
              <button onClick={() => onNavigate('docs')} className="py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Documents</button>
              <button onClick={sendTestEmail} className="py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Test email alert</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Key dates — my active jobs</div>
        <div className="grid grid-cols-[80px_1fr_110px_110px_110px_110px_110px] gap-2 pb-2 mb-1 border-b border-gray-200">
          {['Job', 'Name', 'Confirmation', 'IR Response', 'Referral', 'Public Notice', 'Decision'].map(h => (
            <div key={h} className="text-xs text-gray-400">{h}</div>
          ))}
        </div>
        {myJobs.map(job => (
          <div key={job.code} className="grid grid-cols-[80px_1fr_110px_110px_110px_110px_110px] gap-2 py-2 border-b border-gray-100 last:border-0 items-center">
            <div className="text-xs font-medium text-emerald-600">{job.code}</div>
            <div className="text-xs font-medium truncate">{job.name}</div>
            {[
              job.dates.confirmation,
              job.dates.irResponse,
              job.dates.referral,
              job.dates.publicNoticeStart,
              job.dates.decision,
            ].map((d, i) => (
              <div key={i} className={`text-xs ${d && isUrgent(d) ? 'text-amber-600 font-semibold' : d && isPast(d) ? 'text-red-400' : 'text-gray-500'}`}>
                {d || '—'}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function DirectorView({ onNavigate }) {
  const allPlanners = [...new Set(allJobs.map(j => j.planner))]
  const activeJobs = allJobs.filter(j => j.status !== 'Complete')
  const urgentAll = activeJobs.flatMap(j =>
    Object.entries(j.dates)
      .filter(([, v]) => v && isUrgent(v))
      .map(([k, v]) => ({ job: j.code, planner: j.planner, label: k, date: v, name: j.name }))
  )

  return (
    <div>
      <div className="mb-4">
        <div className="text-base font-semibold">Director overview 📋</div>
        <div className="text-xs text-gray-400 mt-0.5">{activeJobs.length} active jobs · {allPlanners.length} planners · {urgentAll.length} dates due this week</div>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-400 mb-1">Active jobs</div><div className="text-xl font-semibold">{activeJobs.length}</div></div>
        <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-400 mb-1">Total jobs</div><div className="text-xl font-semibold">{allJobs.length}</div></div>
        <div className="bg-emerald-50 rounded-lg p-3"><div className="text-xs text-emerald-600 mb-1">Revenue MTD</div><div className="text-xl font-semibold text-emerald-600">$68,400</div></div>
        <div className="bg-emerald-50 rounded-lg p-3"><div className="text-xs text-emerald-600 mb-1">Billable hrs MTD</div><div className="text-xl font-semibold text-emerald-600">412 hrs</div></div>
        <div className="bg-red-50 rounded-lg p-3"><div className="text-xs text-red-400 mb-1">Over budget</div><div className="text-xl font-semibold text-red-600">{activeJobs.filter(j => j.budget > 100).length}</div></div>
      </div>

      <JobSearchPanel onNavigate={onNavigate} isDirector={true} />

      {urgentAll.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <div className="text-xs font-semibold text-amber-700 mb-2">⚑ Firm-wide dates due this week</div>
          {urgentAll.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-amber-100 last:border-0">
              <span className="text-amber-800 font-medium">{d.job} — {d.name}</span>
              <span className="text-amber-600">{d.planner} · {d.label.replace(/([A-Z])/g, ' $1').toLowerCase()} · {d.date}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Revenue by planner — MTD</div>
        <div className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-3 pb-2 mb-1 border-b border-gray-200">
          {['Planner', 'Active jobs', 'Hrs MTD', 'Rate', 'Revenue'].map(h => (
            <div key={h} className="text-xs text-gray-400">{h}</div>
          ))}
        </div>
        {[
          { name: 'Sarah Barnes', jobs: 3, hrs: 62, rate: 185 },
          { name: 'James Thompson', jobs: 2, hrs: 48, rate: 155 },
          { name: 'Priya Mehta', jobs: 2, hrs: 40, rate: 160 },
          { name: 'Luke Rawlings', jobs: 2, hrs: 28, rate: 135 },
          { name: 'Amy Chen', jobs: 2, hrs: 36, rate: 140 },
        ].map(p => (
          <div key={p.name} className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-3 py-2 border-b border-gray-100 last:border-0 items-center">
            <div className="text-xs font-medium">{p.name}</div>
            <div className="text-xs text-gray-500">{p.jobs}</div>
            <div className="text-xs text-gray-500">{p.hrs} hrs</div>
            <div className="text-xs text-gray-500">${p.rate}/hr</div>
            <div className="text-xs font-semibold text-emerald-600">${(p.hrs * p.rate).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All active jobs — allocated by planner</div>
        <div className="grid grid-cols-[80px_1fr_90px_55px_65px_70px_80px] gap-2 pb-2 mb-1 border-b border-gray-200">
          {['Job', 'Name', 'Planner', 'Type', 'Status', 'Budget', 'Decision'].map(h => (
            <div key={h} className="text-xs text-gray-400">{h}</div>
          ))}
        </div>
        {activeJobs.map(job => (
          <div key={job.code} onClick={() => onNavigate('jobdetail')} className="grid grid-cols-[80px_1fr_90px_55px_65px_70px_80px] gap-2 py-2 border-b border-gray-100 last:border-0 items-center cursor-pointer hover:bg-gray-50 rounded-lg px-1">
            <div className="text-xs font-medium text-emerald-600">{job.code}</div>
            <div className="text-xs font-medium truncate">{job.name}</div>
            <div className="text-xs text-gray-500 truncate">{job.planner.split(' ')[0]} {job.planner.split(' ')[1][0]}.</div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeBadge[job.type]}`}>{job.type}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge[job.status]}`}>{job.status}</span>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${job.budget > 100 ? 'bg-red-500' : job.budget > 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(job.budget, 100)}%` }} />
            </div>
            <div className="text-xs text-gray-500">{job.dates.decision || '—'}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {allPlanners.map(planner => {
          const pJobs = activeJobs.filter(j => j.planner === planner)
          const pUrgent = pJobs.flatMap(j => Object.values(j.dates).filter(v => v && isUrgent(v)))
          return (
            <div key={planner} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="text-xs font-semibold mb-1">{planner}</div>
              <div className="text-xs text-gray-400 mb-2">{pJobs.length} active jobs · {pUrgent.length} dates due</div>
              {pJobs.map(j => (
                <div key={j.code} className="flex items-center gap-1.5 py-1 border-b border-gray-50 last:border-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeBadge[j.type]}`}>{j.type}</span>
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

export default function Dashboard({ onNavigate }) {
  const [view, setView] = useState('planner')
  const [planner, setPlanner] = useState('Sarah Barnes')

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border border-gray-200 p-3">
        <div className="text-xs font-medium text-gray-500">View as:</div>
        <select
          value={planner}
          onChange={e => setPlanner(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
        >
          <option>Sarah Barnes</option>
          <option>James Thompson</option>
          <option>Priya Mehta</option>
          <option>Luke Rawlings</option>
          <option>Amy Chen</option>
          <option>Ben Okafor</option>
        </select>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setView('planner')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${view === 'planner' ? 'bg-emerald-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
          >
            My view
          </button>
          <button
            onClick={() => setView('director')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${view === 'director' ? 'bg-emerald-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
          >
            Director view
          </button>
        </div>
      </div>
      {view === 'planner'
        ? <PlannerView planner={planner} onNavigate={onNavigate} />
        : <DirectorView onNavigate={onNavigate} />
      }
    </div>
  )
}