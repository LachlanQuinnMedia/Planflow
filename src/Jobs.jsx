import { useState, useEffect } from 'react'
import { supabase } from './supabase'

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

export default function Jobs({ onNavigate }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [plannerFilter, setPlannerFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => { fetchJobs() }, [])

  const fetchJobs = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false })
    if (!error) setJobs(data || [])
    setLoading(false)
  }

  const filtered = jobs.filter(j => {
    const matchSearch = !search ||
      j.name?.toLowerCase().includes(search.toLowerCase()) ||
      j.client_first_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.client_last_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.address?.toLowerCase().includes(search.toLowerCase()) ||
      j.code?.includes(search)
    const matchType = typeFilter === 'All' || j.app_type === typeFilter
    const matchPlanner = plannerFilter === 'All' || j.planner === plannerFilter
    const matchStatus = statusFilter === 'All' || j.status === statusFilter
    return matchSearch && matchType && matchPlanner && matchStatus
  })

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="Search jobs, clients, addresses..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option>All</option><option>MCU</option><option>ROL</option><option>RAA</option><option>OW</option><option>SPS</option><option>PE</option>
        </select>
        <select value={plannerFilter} onChange={e => setPlannerFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option>All</option><option>Sarah Barnes</option><option>James Thompson</option><option>Priya Mehta</option><option>Luke Rawlings</option><option>Amy Chen</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option>All</option><option>Active</option><option>Review</option><option>Draft</option><option>Complete</option><option>On Hold</option>
        </select>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[70px_1fr_90px_55px_65px_70px] gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-400">Job #</div>
          <div className="text-xs text-gray-400">Name / address</div>
          <div className="text-xs text-gray-400">Client</div>
          <div className="text-xs text-gray-400">Type</div>
          <div className="text-xs text-gray-400">Planner</div>
          <div className="text-xs text-gray-400">Status</div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Loading jobs...</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            {jobs.length === 0 ? 'No jobs yet — create your first job!' : 'No jobs match your search.'}
          </div>
        ) : (
          filtered.map(job => (
            <div key={job.id} onClick={() => onNavigate('jobdetail')} className="grid grid-cols-[70px_1fr_90px_55px_65px_70px] gap-3 px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 items-center">
              <div className="text-xs font-medium text-emerald-600">{job.code}</div>
              <div>
                <div className="text-xs font-medium">{job.name}</div>
                <div className="text-xs text-gray-400">{job.address}</div>
              </div>
              <div className="text-xs text-gray-500 truncate">{job.client_first_name} {job.client_last_name}</div>
              <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[job.app_type] || 'bg-gray-100 text-gray-500'}`}>{job.app_type}</span></div>
              <div className="text-xs text-gray-500">{job.planner?.split(' ')[0]} {job.planner?.split(' ')[1]?.[0]}.</div>
              <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[job.status] || 'bg-gray-100 text-gray-500'}`}>{job.status}</span></div>
            </div>
          ))
        )}
        <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
          {loading ? 'Loading...' : `Showing ${filtered.length} of ${jobs.length} jobs`}
        </div>
      </div>
    </div>
  )
}