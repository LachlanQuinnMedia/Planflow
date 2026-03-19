const jobs = [
  { code: '2025-031', name: 'Ridgeline Mixed-Use MCU', address: '44 Ridge St, Toowoomba', client: 'J. Hartmann', type: 'MCU', planner: 'Sarah B.', status: 'Active', budget: 82, over: false },
  { code: '2025-028', name: 'Stonewood Estate ROL', address: 'Lot 12 Stonewood Rd, Warwick', client: 'Greenfield Dev.', type: 'ROL', planner: 'Priya M.', status: 'Active', budget: 55, over: false },
  { code: '2025-033', name: 'Apex Logistics RAA', address: '22 Commerce Dr, Toowoomba', client: 'Apex P/L', type: 'RAA', planner: 'Sarah B.', status: 'Review', budget: 112, over: true },
  { code: '2025-034', name: 'Creek Rd OW Stage 2', address: '5 Creek Rd, Gatton', client: 'P. & L. Burke', type: 'OW', planner: 'Luke R.', status: 'Draft', budget: 18, over: false },
  { code: '2025-029', name: 'Hillcrest SPS Request', address: '17 Hillcrest Ave, Ipswich', client: 'T. & M. Hill', type: 'SPS', planner: 'Amy C.', status: 'Active', budget: 70, over: false },
  { code: '2025-026', name: 'Greenview Units MCU', address: '88 River St, Ipswich', client: 'T. Nguyen', type: 'MCU', planner: 'James T.', status: 'Complete', budget: 100, over: false },
  { code: '2025-025', name: 'Burke St Subdivision ROL', address: '12 Burke St, Toowoomba', client: 'R. Okafor', type: 'ROL', planner: 'Luke R.', status: 'Active', budget: 45, over: false },
  { code: '2025-024', name: 'Nakamura Childcare MCU', address: '9 Park Ave, Gatton', client: 'T. Nakamura', type: 'MCU', planner: 'Priya M.', status: 'On Hold', budget: 60, over: false },
]

const typeBadge = {
  MCU: 'bg-blue-100 text-blue-700',
  ROL: 'bg-amber-100 text-amber-700',
  RAA: 'bg-pink-100 text-pink-700',
  OW: 'bg-green-100 text-green-700',
  SPS: 'bg-purple-100 text-purple-700',
  PE: 'bg-orange-100 text-orange-700',
}

const statusBadge = {
  Active: 'bg-emerald-100 text-emerald-700',
  Review: 'bg-amber-100 text-amber-700',
  Draft: 'bg-gray-100 text-gray-600',
  Complete: 'bg-green-100 text-green-700',
  'On Hold': 'bg-red-100 text-red-700',
}

import { useState } from 'react'

export default function Jobs({ onNavigate }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [plannerFilter, setPlannerFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = jobs.filter(j => {
    const matchSearch = j.name.toLowerCase().includes(search.toLowerCase()) ||
      j.client.toLowerCase().includes(search.toLowerCase()) ||
      j.address.toLowerCase().includes(search.toLowerCase()) ||
      j.code.includes(search)
    const matchType = typeFilter === 'All' || j.type === typeFilter
    const matchPlanner = plannerFilter === 'All' || j.planner === plannerFilter
    const matchStatus = statusFilter === 'All' || j.status === statusFilter
    return matchSearch && matchType && matchPlanner && matchStatus
  })

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search jobs, clients, addresses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option>All</option>
          <option>MCU</option>
          <option>ROL</option>
          <option>RAA</option>
          <option>OW</option>
          <option>SPS</option>
          <option>PE</option>
        </select>
        <select value={plannerFilter} onChange={e => setPlannerFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option>All</option>
          <option>Sarah B.</option>
          <option>James T.</option>
          <option>Priya M.</option>
          <option>Luke R.</option>
          <option>Amy C.</option>
          <option>Ben O.</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option>All</option>
          <option>Active</option>
          <option>Review</option>
          <option>Draft</option>
          <option>Complete</option>
          <option>On Hold</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[70px_1fr_90px_55px_65px_70px_70px] gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-400">Job #</div>
          <div className="text-xs text-gray-400">Name / address</div>
          <div className="text-xs text-gray-400">Client</div>
          <div className="text-xs text-gray-400">Type</div>
          <div className="text-xs text-gray-400">Planner</div>
          <div className="text-xs text-gray-400">Status</div>
          <div className="text-xs text-gray-400">Budget</div>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No jobs match your search.</div>
        ) : (
          filtered.map(job => (
            <div
              key={job.code}
              onClick={() => onNavigate('jobdetail')}
              className="grid grid-cols-[70px_1fr_90px_55px_65px_70px_70px] gap-3 px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 items-center"
            >
              <div className="text-xs font-medium text-emerald-600">{job.code}</div>
              <div>
                <div className="text-xs font-medium">{job.name}</div>
                <div className="text-xs text-gray-400">{job.address}</div>
              </div>
              <div className="text-xs text-gray-500 truncate">{job.client}</div>
              <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[job.type]}`}>{job.type}</span></div>
              <div className="text-xs text-gray-500">{job.planner}</div>
              <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[job.status]}`}>{job.status}</span></div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${job.over ? 'bg-red-500' : job.budget > 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(job.budget, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}

        <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
          Showing {filtered.length} of {jobs.length} jobs
        </div>
      </div>
    </div>
  )
}