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

function DeleteConfirmModal({ job, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm">
        <div className="text-sm font-semibold mb-1">Delete job</div>
        <div className="text-xs text-gray-500 mb-1">Are you sure you want to delete this job?</div>
        <div className="text-xs font-medium text-gray-800 mb-4">
          {job.code} — {job.name}
        </div>
        <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">
          This will permanently delete the job and all associated time logs. This cannot be undone.
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
          >
            No, keep it
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
          >
            Yes, delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Jobs({ onNavigate, onJobCountChange }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [plannerFilter, setPlannerFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [jobToDelete, setJobToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchJobs() }, [])

  const fetchJobs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      setJobs(data)
      onJobCountChange?.(data.length)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!jobToDelete) return
    setDeleting(true)
    await supabase.from('time_logs').delete().eq('job_id', jobToDelete.id)
    await supabase.from('jobs').delete().eq('id', jobToDelete.id)
    setJobToDelete(null)
    setDeleting(false)
    fetchJobs()
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

  const uniquePlanners = [...new Set(jobs.map(j => j.planner).filter(Boolean))].sort()

  return (
    <div>
      {jobToDelete && (
        <DeleteConfirmModal
          job={jobToDelete}
          onConfirm={handleDelete}
          onCancel={() => setJobToDelete(null)}
        />
      )}

      <div className="flex gap-2 mb-4 items-end">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search jobs, clients, addresses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium px-1">Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
            <option value="All">All</option>
            <option>MCU</option><option>ROL</option><option>RAA</option>
            <option>OW</option><option>SPS</option><option>PE</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium px-1">Planner</label>
          <select value={plannerFilter} onChange={e => setPlannerFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
            <option value="All">All</option>
            {uniquePlanners.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium px-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
            <option value="All">All</option>
            <option>Active</option><option>Review</option><option>Draft</option>
            <option>Complete</option><option>On Hold</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[70px_1fr_90px_55px_65px_70px_50px] gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-400">Job #</div>
          <div className="text-xs text-gray-400">Name / address</div>
          <div className="text-xs text-gray-400">Client</div>
          <div className="text-xs text-gray-400">Type</div>
          <div className="text-xs text-gray-400">Planner</div>
          <div className="text-xs text-gray-400">Status</div>
          <div className="text-xs text-gray-400">Delete</div>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Loading jobs...</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            {jobs.length === 0 ? 'No jobs yet — create your first job!' : 'No jobs match your search.'}
          </div>
        ) : (
          filtered.map(job => (
            <div
              key={job.id}
              className="grid grid-cols-[70px_1fr_90px_55px_65px_70px_50px] gap-3 px-4 py-3 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50"
            >
              <div className="text-xs font-medium text-emerald-600 cursor-pointer" onClick={() => onNavigate('jobdetail', job)}>
                {job.code}
              </div>
              <div className="cursor-pointer" onClick={() => onNavigate('jobdetail', job)}>
                <div className="text-xs font-medium">{job.name}</div>
                <div className="text-xs text-gray-400">{job.address}</div>
              </div>
              <div className="text-xs text-gray-500 truncate cursor-pointer" onClick={() => onNavigate('jobdetail', job)}>
                {job.client_first_name} {job.client_last_name}
              </div>
              <div className="cursor-pointer" onClick={() => onNavigate('jobdetail', job)}>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[job.app_type] || 'bg-gray-100 text-gray-500'}`}>{job.app_type}</span>
              </div>
              <div className="text-xs text-gray-500 cursor-pointer" onClick={() => onNavigate('jobdetail', job)}>
                {job.planner?.split(' ')[0]} {job.planner?.split(' ')[1]?.[0]}.
              </div>
              <div className="cursor-pointer" onClick={() => onNavigate('jobdetail', job)}>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[job.status] || 'bg-gray-100 text-gray-500'}`}>{job.status}</span>
              </div>
              <div className="flex items-center justify-center">
                <button
                  onClick={e => { e.stopPropagation(); setJobToDelete(job) }}
                  className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors text-base"
                  title="Delete job"
                >
                  ✕
                </button>
              </div>
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