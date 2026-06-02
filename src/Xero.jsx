import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import {
  getXeroAuthUrl,
  isXeroConnected,
  disconnectXero,
  getXeroInvoices,
  pushInvoiceToXero,
  getXeroContacts,
} from './xero'

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  AUTHORISED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  VOIDED: 'bg-red-100 text-red-600',
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const match = dateStr.match(/\/Date\((\d+)/)
  if (match) {
    return new Date(parseInt(match[1])).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Xero({ currentUser }) {
  const [connected, setConnected] = useState(false)
  const [tenantName, setTenantName] = useState('')
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState('')
  const [timeLogs, setTimeLogs] = useState([])
  const [pushing, setPushing] = useState(false)
  const [pushSuccess, setPushSuccess] = useState(null)
  const [contacts, setContacts] = useState([])
  const [activeTab, setActiveTab] = useState('invoices')

  useEffect(() => {
    checkConnection()
    fetchJobs()
  }, [])

  const checkConnection = async () => {
    setLoading(true)
    const result = await isXeroConnected(currentUser.company_id)
    setConnected(result.connected)
    setTenantName(result.tenantName || '')
    if (result.connected) {
      fetchInvoices()
      fetchContacts()
    }
    setLoading(false)
  }

  const fetchJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false })
    if (data) setJobs(data)
  }

  const fetchInvoices = async () => {
    setInvoicesLoading(true)
    try {
      const data = await getXeroInvoices(currentUser.company_id)
      setInvoices(data)
    } catch (e) { console.error(e) }
    setInvoicesLoading(false)
  }

  const fetchContacts = async () => {
    try {
      const data = await getXeroContacts(currentUser.company_id)
      setContacts(data)
    } catch (e) { console.error(e) }
  }

  const fetchTimeLogsForJob = async (jobId) => {
    const { data } = await supabase.from('time_logs').select('*').eq('job_id', jobId)
    if (data) setTimeLogs(data)
  }

  const handleJobSelect = (jobId) => {
    setSelectedJob(jobId)
    setPushSuccess(null)
    if (jobId) fetchTimeLogsForJob(jobId)
    else setTimeLogs([])
  }

  const handleConnect = () => {
    window.location.href = getXeroAuthUrl(currentUser.company_id)
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Xero? You can reconnect at any time.')) return
    await disconnectXero(currentUser.company_id)
    setConnected(false)
    setTenantName('')
    setInvoices([])
    setContacts([])
  }

  const handlePushInvoice = async () => {
    if (!selectedJob) { alert('Please select a job.'); return }
    if (timeLogs.length === 0) { alert('No time logs found for this job.'); return }
    const job = jobs.find(j => j.id === selectedJob)
    if (!job) return
    setPushing(true)
    try {
      const invoice = await pushInvoiceToXero(currentUser.company_id, job, timeLogs)
      setPushSuccess(invoice)
      fetchInvoices()
    } catch (e) {
      alert('Failed to push invoice: ' + e.message)
    }
    setPushing(false)
  }

  const totalHours = timeLogs.reduce((sum, l) => sum + (l.duration_seconds || 0) / 3600, 0)
  const totalAmount = timeLogs.reduce((sum, l) => {
    const hrs = (l.duration_seconds || 0) / 3600
    return sum + hrs * (l.rate || 0)
  }, 0)
  const selectedJobData = jobs.find(j => j.id === selectedJob)

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-sm text-gray-400">Loading Xero connection...</div>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="text-3xl font-bold text-blue-500">x</div>
          </div>
          <div className="text-lg font-semibold mb-2">Connect Xero</div>
          <div className="text-sm text-gray-400 mb-6">
            Connect your Xero account to push invoices directly from QPlan, sync contacts, and track payment status.
          </div>
          <div className="space-y-3 text-left mb-6">
            {[
              'Push invoices from time logs with one click',
              'Auto-fill client details from Xero contacts',
              'See invoice status (Draft, Sent, Paid) in QPlan',
              'GST calculated automatically',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-emerald-500">✓</span> {f}
              </div>
            ))}
          </div>
          <button onClick={handleConnect} className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
            Connect to Xero
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">x</span>
          </div>
          <div>
            <div className="text-sm font-semibold">Connected to Xero</div>
            <div className="text-xs text-gray-400">{tenantName}</div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">● Live</span>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchInvoices} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">↻ Sync</button>
          <button onClick={handleDisconnect} className="px-3 py-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50">Disconnect</button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {[{ id: 'invoices', label: 'Invoices' }, { id: 'push', label: 'Push Invoice' }, { id: 'contacts', label: 'Contacts' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs border-b-2 transition-colors ${activeTab === tab.id ? 'border-emerald-500 text-emerald-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Xero Invoices</div>
            <div className="text-xs text-gray-400">{invoices.length} invoices</div>
          </div>
          {invoicesLoading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No invoices found in Xero.</div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_120px_100px_100px_80px] gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
                {['Contact', 'Date', 'Due', 'Amount', 'Status'].map(h => (
                  <div key={h} className="text-xs text-gray-400">{h}</div>
                ))}
              </div>
              {invoices.map(inv => (
                <div key={inv.InvoiceID} className="grid grid-cols-[1fr_120px_100px_100px_80px] gap-3 px-4 py-3 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50">
                  <div>
                    <div className="text-xs font-medium">{inv.Contact?.Name}</div>
                    <div className="text-xs text-gray-400">{inv.Reference || inv.InvoiceNumber}</div>
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(inv.Date)}</div>
                  <div className="text-xs text-gray-500">{formatDate(inv.DueDate)}</div>
                  <div className="text-xs font-medium">{formatCurrency(inv.Total)}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[inv.Status] || 'bg-gray-100 text-gray-500'}`}>{inv.Status}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'push' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Select job to invoice</div>
            <select value={selectedJob} onChange={e => handleJobSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 mb-4">
              <option value="">Select a job...</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.code} — {j.name}</option>)}
            </select>
            {selectedJobData && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Client</span>
                  <span className="font-medium">{selectedJobData.client_first_name} {selectedJobData.client_last_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Email</span>
                  <span className="font-medium">{selectedJobData.client_email || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Rate</span>
                  <span className="font-medium">${selectedJobData.planner_rate}/hr</span>
                </div>
              </div>
            )}
            {timeLogs.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Time logs to invoice</div>
                {timeLogs.map((log, i) => {
                  const hrs = ((log.duration_seconds || 0) / 3600).toFixed(2)
                  const amt = (parseFloat(hrs) * (log.rate || 0)).toFixed(2)
                  return (
                    <div key={i} className="flex justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-600 truncate flex-1 mr-2">{log.task}</span>
                      <span className="text-gray-400 mr-2">{hrs}h</span>
                      <span className="font-medium">${amt}</span>
                    </div>
                  )
                })}
                <div className="flex justify-between text-xs pt-2 font-semibold border-t border-gray-200 mt-1">
                  <span>Total</span>
                  <span className="text-emerald-600">{totalHours.toFixed(2)}h · {formatCurrency(totalAmount)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Invoice preview</div>
            {!selectedJob ? (
              <div className="text-xs text-gray-400 text-center py-8">Select a job to preview the invoice</div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Will be created in Xero as</div>
                  <div className="text-sm font-semibold">{selectedJobData?.client_first_name} {selectedJobData?.client_last_name}</div>
                  <div className="text-xs text-gray-400">{selectedJobData?.code} · Due in 14 days</div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Line items</span>
                  <span className="font-medium">{timeLogs.length} time entries</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Subtotal (ex GST)</span>
                  <span className="font-medium">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">GST (10%)</span>
                  <span className="font-medium">{formatCurrency(totalAmount * 0.1)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                  <span>Total (inc GST)</span>
                  <span className="text-emerald-600">{formatCurrency(totalAmount * 1.1)}</span>
                </div>
                <div className="text-xs text-gray-400 bg-blue-50 rounded-lg px-3 py-2">
                  Invoice will be created as a <strong>Draft</strong> in Xero — you can review before sending.
                </div>
                {pushSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
                    ✓ Invoice pushed to Xero! Invoice #{pushSuccess.InvoiceNumber} created as Draft.
                  </div>
                )}
                <button onClick={handlePushInvoice} disabled={pushing || timeLogs.length === 0}
                  className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 text-sm transition-colors">
                  {pushing ? 'Pushing to Xero...' : '→ Push to Xero'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Xero Contacts</div>
            <div className="text-xs text-gray-400">{contacts.length} contacts</div>
          </div>
          {contacts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No contacts found in Xero.</div>
          ) : contacts.map(c => (
            <div key={c.ContactID} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
                {c.Name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{c.Name}</div>
                <div className="text-xs text-gray-400">{c.EmailAddress || '—'}</div>
              </div>
              <div className="text-xs text-gray-400">{c.Phones?.[0]?.PhoneNumber || ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}