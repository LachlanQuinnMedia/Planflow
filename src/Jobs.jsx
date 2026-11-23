// Jobs.jsx
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { loadSession } from './auth'
import { isXeroConnected, pushInvoiceToXero } from './xero'
import { APP_TYPES, appTypeBadge, appTypeFull, clientName, contactName, isCompanyClient, jobListName, jobSearchText, jobTitle } from './jobMeta'
const statusBadge = {
  Active: 'bg-emerald-100 text-emerald-700',
  Review: 'bg-amber-100 text-amber-700',
  Draft: 'bg-gray-100 text-gray-600',
  Complete: 'bg-green-100 text-green-700',
  'On Hold': 'bg-red-100 text-red-700',
}
// Today's date as YYYY-MM-DD in Brisbane time (not UTC)
function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
// Whole days between today (Brisbane) and a YYYY-MM-DD date. Negative = in the past.
function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(String(dateStr).split('T')[0] + 'T00:00:00Z')
  const today = new Date(todayLocal() + 'T00:00:00Z')
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}
function isOverdue(job) {
  if (!job.decision_due_date) return false
  if (job.status === 'Complete') return false
  return daysUntil(job.decision_due_date) < 0
}
function isDueSoon(job) {
  if (!job.decision_due_date) return false
  if (job.status === 'Complete') return false
  const days = daysUntil(job.decision_due_date)
  return days >= 0 && days <= 7
}
function formatDateShort(dateStr) {
  if (!dateStr) return null
  return new Date(String(dateStr).split('T')[0] + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function DeleteConfirmModal({ job, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm">
        <div className="text-sm font-semibold mb-1">Delete job</div>
        <div className="text-xs text-gray-600 mb-1">Are you sure you want to delete this job?</div>
        <div className="text-xs font-medium text-gray-800 mb-4">{jobTitle(job)}</div>
        <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">
          This will permanently delete the job, its time logs and its uploaded documents. This cannot be undone.
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">No, keep it</button>
          <button onClick={onConfirm} className="flex-1 py-2 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">Yes, delete</button>
        </div>
      </div>
    </div>
  )
}

// Push-to-Xero modal: handles not-connected, confirm, pushing, success, error
function XeroPushModal({ job, companyId, onClose, onGoToXero, onPushed }) {
  const [stage, setStage] = useState('checking') // checking | notconnected | confirm | pushing | done | error
  const [tenantName, setTenantName] = useState('')
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const status = await isXeroConnected(companyId)
      if (!status.connected) { setStage('notconnected'); return }
      setTenantName(status.tenantName || '')
      const { data } = await supabase
        .from('time_logs')
        .select('*')
        .eq('job_id', job.id)
        .order('log_date', { ascending: true })
      setLogs(data || [])
      // Guard against creating a second invoice for the same job
      if (job.xero_invoice_id) { setStage('alreadypushed'); return }
      setStage('confirm')
    }
    init()
  }, [job, companyId])

  const totalHours = logs.reduce((s, l) => s + ((l.duration_seconds || 0) / 3600), 0)
  const totalAmount = logs.reduce((s, l) => s + ((l.duration_seconds || 0) / 3600) * (l.rate || job.planner_rate || 0), 0)

  const handlePush = async () => {
    setStage('pushing')
    try {
      const invoice = await pushInvoiceToXero(companyId, job, logs)
      if (!invoice) throw new Error('Xero did not return an invoice. Check the connection and try again.')
      // Remember the invoice on the job so it cannot be pushed twice
      await supabase.from('jobs').update({
        xero_invoice_id: invoice.InvoiceID || null,
        xero_invoice_number: invoice.InvoiceNumber || null,
        xero_pushed_at: new Date().toISOString(),
      }).eq('id', job.id)
      onPushed?.(job.id, invoice)
      setResult(invoice)
      setStage('done')
    } catch (e) {
      setError(e.message || 'Push failed.')
      setStage('error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold">Push to Xero</div>
            <div className="text-xs text-gray-500 mt-0.5">{jobTitle(job)}</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600">✕</button>
        </div>

        <div className="px-5 py-4">
          {stage === 'checking' && (
            <div className="text-xs text-gray-500 text-center py-4">Checking Xero connection...</div>
          )}

          {stage === 'notconnected' && (
            <div className="text-center py-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3 text-sm font-bold">X</div>
              <div className="text-sm font-semibold mb-1">Xero isn't connected yet</div>
              <div className="text-xs text-gray-500 max-w-xs mx-auto">
                Connect your firm's Xero account once, and every job gets a one-click draft invoice built from its logged time.
              </div>
            </div>
          )}

          {stage === 'confirm' && (
            <div>
              <div className="text-xs text-gray-600 mb-3">
                This creates a <span className="font-medium">draft</span> invoice in Xero{tenantName ? ` (${tenantName})` : ''} for <span className="font-medium">{clientName(job)}</span>. You can review it in Xero before sending.
              </div>
              {logs.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No time has been logged against this job yet, so the invoice would be empty. Log time first, then push.
                </div>
              ) : (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="max-h-40 overflow-y-auto">
                    {logs.map(l => (
                      <div key={l.id} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 text-xs">
                        <div className="truncate flex-1 pr-2">{l.task || 'General work'}</div>
                        <div className="text-gray-500 flex-shrink-0">{((l.duration_seconds || 0) / 3600).toFixed(2)}h</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 text-xs font-medium">
                    <div>{logs.length} line item{logs.length !== 1 ? 's' : ''} · {totalHours.toFixed(2)}h</div>
                    <div>${totalAmount.toFixed(2)} ex GST</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {stage === 'alreadypushed' && (
            <div className="text-center py-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3 text-sm font-bold">X</div>
              <div className="text-sm font-semibold mb-1">Already invoiced</div>
              <div className="text-xs text-gray-500 max-w-xs mx-auto">
                {job.xero_invoice_number ? `Invoice ${job.xero_invoice_number}` : 'A draft invoice'} was already created in Xero for this job
                {job.xero_pushed_at ? ` on ${new Date(job.xero_pushed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.
                Open it in Xero to edit it rather than creating a duplicate.
              </div>
              <a href={`https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${job.xero_invoice_id}`} target="_blank" rel="noreferrer"
                className="inline-block mt-3 px-3 py-1.5 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">Open in Xero</a>
            </div>
          )}

          {stage === 'pushing' && (
            <div className="text-xs text-gray-500 text-center py-4">Creating draft invoice in Xero...</div>
          )}

          {stage === 'done' && (
            <div className="text-center py-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 text-lg">✓</div>
              <div className="text-sm font-semibold mb-1">Draft invoice created</div>
              <div className="text-xs text-gray-500">
                {result?.InvoiceNumber ? `Invoice ${result.InvoiceNumber}` : 'Invoice'} is now in Xero as a draft, ready for review.
              </div>
            </div>
          )}

          {stage === 'error' && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          {stage === 'notconnected' && (
            <>
              <button onClick={onClose} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Not now</button>
              <button onClick={onGoToXero} className="flex-1 py-2 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">Go to Xero setup</button>
            </>
          )}
          {stage === 'confirm' && (
            <>
              <button onClick={onClose} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={handlePush} disabled={logs.length === 0}
                className="flex-1 py-2 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                Create draft invoice
              </button>
            </>
          )}
          {(stage === 'done' || stage === 'error' || stage === 'checking' || stage === 'pushing' || stage === 'alreadypushed') && (
            <button onClick={onClose} disabled={stage === 'pushing'}
              className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50">
              {stage === 'done' ? 'Done' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Jobs({ onNavigate, onJobCountChange, currentUser }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [plannerFilter, setPlannerFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [jobToDelete, setJobToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [xeroJob, setXeroJob] = useState(null)

  // Works whether or not App passes currentUser down
  const companyId = currentUser?.company_id || loadSession()?.company_id

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
    // Remove the job's uploaded files and document records first (no DB cascade for documents)
    const { data: docs } = await supabase.from('documents').select('id, file_path').eq('job_id', jobToDelete.id)
    if (docs && docs.length > 0) {
      const paths = docs.map(d => d.file_path).filter(Boolean)
      if (paths.length) await supabase.storage.from('documents').remove(paths)
      await supabase.from('documents').delete().eq('job_id', jobToDelete.id)
    }
    await supabase.from('active_timers').delete().eq('job_id', jobToDelete.id)
    await supabase.from('time_logs').delete().eq('job_id', jobToDelete.id)
    const { error } = await supabase.from('jobs').delete().eq('id', jobToDelete.id)
    if (error) alert('Could not delete job: ' + error.message)
    setJobToDelete(null)
    setDeleting(false)
    fetchJobs()
  }
  const filtered = jobs.filter(j => {
    const matchSearch = !search || jobSearchText(j).includes(search.toLowerCase().trim())
    const matchType = typeFilter === 'All' || j.app_type === typeFilter
    const matchPlanner = plannerFilter === 'All' || j.planner === plannerFilter
    const matchStatus = statusFilter === 'All' || j.status === statusFilter
    return matchSearch && matchType && matchPlanner && matchStatus
  })
  const sorted = [...filtered].sort((a, b) => {
    const aOverdue = isOverdue(a) ? 0 : isDueSoon(a) ? 1 : 2
    const bOverdue = isOverdue(b) ? 0 : isDueSoon(b) ? 1 : 2
    return aOverdue - bOverdue
  })
  const uniquePlanners = [...new Set(jobs.map(j => j.planner).filter(Boolean))].sort()
  const overdueCount = jobs.filter(j => isOverdue(j)).length

  const XeroButton = ({ job, compact }) => (
    <button
      onClick={e => { e.stopPropagation(); setXeroJob(job) }}
      className={`flex items-center justify-center gap-1 rounded-lg font-medium transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 ${compact ? 'px-2 py-1 text-xs' : 'px-2 py-1 text-xs w-full'}`}
      title="Create a draft invoice in Xero from this job's logged time"
    >
      <span className="font-bold">X</span> {job.xero_invoice_id ? 'Invoiced' : 'Push to Xero'}
    </button>
  )

  return (
    <div>
      {jobToDelete && (
        <DeleteConfirmModal
          job={jobToDelete}
          onConfirm={handleDelete}
          onCancel={() => setJobToDelete(null)}
        />
      )}
      {xeroJob && (
        <XeroPushModal
          job={xeroJob}
          companyId={companyId}
          onClose={() => setXeroJob(null)}
          onGoToXero={() => { setXeroJob(null); onNavigate('xero') }}
          onPushed={(jobId, invoice) => setJobs(prev => prev.map(j => j.id === jobId
            ? { ...j, xero_invoice_id: invoice.InvoiceID || null, xero_invoice_number: invoice.InvoiceNumber || null, xero_pushed_at: new Date().toISOString() }
            : j))}
        />
      )}

      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-xs font-bold">!</span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-red-700">{overdueCount} job{overdueCount !== 1 ? 's' : ''} overdue</div>
            <div className="text-xs text-red-500">Decision due dates have passed. Review and update these jobs.</div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:items-end">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search jobs, clients, addresses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex flex-col gap-1 flex-1 sm:flex-none">
            <label className="text-xs text-gray-500 font-medium px-1">Type</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="All">All</option>
              {APP_TYPES.map(t => <option key={t.code} value={t.code}>{t.code} · {t.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 sm:flex-none">
            <label className="text-xs text-gray-500 font-medium px-1">Planner</label>
            <select value={plannerFilter} onChange={e => setPlannerFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="All">All</option>
              {uniquePlanners.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 sm:flex-none">
            <label className="text-xs text-gray-500 font-medium px-1">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="All">All</option>
              <option>Active</option><option>Review</option><option>Draft</option>
              <option>Complete</option><option>On Hold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="lg:hidden space-y-2">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">Loading jobs...</div>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            {jobs.length === 0 ? 'No jobs yet. Create your first job.' : 'No jobs match your search.'}
          </div>
        ) : sorted.map(job => {
          const overdue = isOverdue(job)
          const dueSoon = !overdue && isDueSoon(job)
          const days = daysUntil(job.decision_due_date)
          return (
            <div
              key={job.id}
              onClick={() => onNavigate('jobdetail', job)}
              className={`bg-white rounded-xl border px-4 py-3 cursor-pointer active:bg-gray-50 ${
                overdue ? 'border-red-300 bg-red-50' : dueSoon ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-600">{job.code}</span>
                  {overdue && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Overdue</span>}
                  {dueSoon && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Due soon</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span title={appTypeFull(job.app_type)} className={`text-xs px-2 py-0.5 rounded-full font-medium ${appTypeBadge(job.app_type)}`}>{job.app_type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[job.status] || 'bg-gray-100 text-gray-600'}`}>{job.status}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setJobToDelete(job) }}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >✕</button>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-800 mb-0.5">{jobListName(job)}</div>
              <div className="text-xs text-gray-500 mb-1">{[job.lot_reference, job.council].filter(Boolean).join(' · ')}</div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">{isCompanyClient(job) ? `Contact: ${contactName(job)}` : clientName(job)}</span>
                <div className="flex items-center gap-2">
                  {job.decision_due_date && job.status !== 'Complete' && (
                    <span className={`text-xs font-medium ${overdue ? 'text-red-600' : dueSoon ? 'text-amber-600' : 'text-gray-500'}`}>
                      {overdue ? `${Math.abs(days)}d overdue` : `Due ${formatDateShort(job.decision_due_date)}`}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{job.planner || '-'}</span>
                </div>
              </div>
              <XeroButton job={job} />
            </div>
          )
        })}
        {!loading && (
          <div className="text-xs text-gray-500 text-center py-2">
            Showing {sorted.length} of {jobs.length} jobs
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <div className="qp-row min-w-[960px] grid grid-cols-[70px_1fr_90px_55px_65px_70px_100px_110px_50px] gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-500">Job #</div>
          <div className="text-xs text-gray-500">Name / address</div>
          <div className="text-xs text-gray-500">Client</div>
          <div className="text-xs text-gray-500">Type</div>
          <div className="text-xs text-gray-500">Planner</div>
          <div className="text-xs text-gray-500">Status</div>
          <div className="text-xs text-gray-500">Decision due</div>
          <div className="text-xs text-gray-500">Invoice</div>
          <div className="text-xs text-gray-500">Delete</div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading jobs...</div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            {jobs.length === 0 ? 'No jobs yet. Create your first job.' : 'No jobs match your search.'}
          </div>
        ) : (
          sorted.map(job => {
            const overdue = isOverdue(job)
            const dueSoon = !overdue && isDueSoon(job)
            const days = daysUntil(job.decision_due_date)
            return (
              <div
                key={job.id}
                className={`qp-row min-w-[960px] grid grid-cols-[70px_1fr_90px_55px_65px_70px_100px_110px_50px] gap-3 px-4 py-3 border-b border-gray-100 last:border-0 items-center ${
                  overdue ? 'bg-red-50 border-l-4 border-l-red-400' : dueSoon ? 'bg-amber-50 border-l-4 border-l-amber-400' : 'hover:bg-gray-50'
                }`}
              >
                <div className="text-xs font-medium text-emerald-600 cursor-pointer" onClick={() => onNavigate('jobdetail', job)}>{job.code}</div>
                <div className="cursor-pointer min-w-0" onClick={() => onNavigate('jobdetail', job)}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="text-xs font-medium">{jobListName(job)}</div>
                    {overdue && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex-shrink-0">Overdue</span>}
                    {dueSoon && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0">Due soon</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{[job.lot_reference, job.council].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="text-xs text-gray-600 truncate cursor-pointer" onClick={() => onNavigate('jobdetail', job)} title={isCompanyClient(job) ? `Contact: ${contactName(job)}` : undefined}>
                  {clientName(job)}
                </div>
                <div className="cursor-pointer" onClick={() => onNavigate('jobdetail', job)}>
                  <span title={appTypeFull(job.app_type)} className={`text-xs px-2 py-0.5 rounded-full font-medium ${appTypeBadge(job.app_type)}`}>{job.app_type}</span>
                </div>
                <div className="text-xs text-gray-600 cursor-pointer truncate" onClick={() => onNavigate('jobdetail', job)}>
                  {job.planner || '-'}
                </div>
                <div className="cursor-pointer" onClick={() => onNavigate('jobdetail', job)}>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[job.status] || 'bg-gray-100 text-gray-600'}`}>{job.status}</span>
                </div>
                <div className="cursor-pointer" onClick={() => onNavigate('jobdetail', job)}>
                  {job.decision_due_date && job.status !== 'Complete' ? (
                    <div>
                      <div className={`text-xs font-medium ${overdue ? 'text-red-600' : dueSoon ? 'text-amber-600' : 'text-gray-600'}`}>
                        {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                      </div>
                      <div className="text-xs text-gray-500">{formatDateShort(job.decision_due_date)}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </div>
                <div>
                  <XeroButton job={job} compact />
                </div>
                <div className="flex items-center justify-center">
                  <button
                    onClick={e => { e.stopPropagation(); setJobToDelete(job) }}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors text-base"
                    title="Delete job"
                  >✕</button>
                </div>
              </div>
            )
          })
        )}
        <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
          {loading ? 'Loading...' : `Showing ${sorted.length} of ${jobs.length} jobs · ${overdueCount} overdue`}
        </div>
      </div>
    </div>
  )
}