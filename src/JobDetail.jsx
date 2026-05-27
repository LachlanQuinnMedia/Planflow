import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { generatePlanningReport, generateIRResponse, generateEngagementLetter, generateInvoice } from './docGenerator'

const DA_STAGES = [
  { id: 'application', label: 'Application stage', description: 'Application lodged — confirmation notice issued', statutory_days: 5, hpc_stage: 'Stage 2', color: 'bg-blue-100 text-blue-700' },
  { id: 'referral', label: 'Referral stage', description: 'Referral to state government / Energex / other agencies', statutory_days: 10, hpc_stage: 'Stage 3', color: 'bg-purple-100 text-purple-700' },
  { id: 'information', label: 'Information request stage', description: 'Council information request — response window', statutory_days: 10, hpc_stage: 'Stage 3', color: 'bg-amber-100 text-amber-700' },
  { id: 'notification', label: 'Public notification stage', description: 'Public notification & submissions period', statutory_days: 15, hpc_stage: 'Stage 3', color: 'bg-pink-100 text-pink-700' },
  { id: 'decision', label: 'Decision stage', description: 'Assessment and decision by Council', statutory_days: 20, hpc_stage: 'Stage 3', color: 'bg-emerald-100 text-emerald-700' },
]

const initialStageData = {
  application: { status: 'pending', startDate: '', endDate: '', stoppedDays: 0, stopReason: '', isStopped: false },
  referral:    { status: 'pending', startDate: '', endDate: '', stoppedDays: 0, stopReason: '', isStopped: false },
  information: { status: 'pending', startDate: '', endDate: '', stoppedDays: 0, stopReason: '', isStopped: false },
  notification:{ status: 'pending', startDate: '', endDate: '', stoppedDays: 0, stopReason: '', isStopped: false },
  decision:    { status: 'pending', startDate: '', endDate: '', stoppedDays: 0, stopReason: '', isStopped: false },
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

function formatDateTimeAEST(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' AEST'
}

function formatAEST(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' AEST'
}

function formatDuration(seconds) {
  if (!seconds) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function calcAmount(seconds, rate) {
  if (!seconds || !rate) return 0
  const hours = seconds / 3600
  return parseFloat((hours * rate).toFixed(2))
}

function StopClockModal({ stage, stageData, onSave, onClose }) {
  const [reason, setReason] = useState(stageData.stopReason || '')
  const [days, setDays] = useState(0)
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 w-full max-w-md">
        <div className="text-sm font-semibold mb-1">Stop the clock — {stage.label}</div>
        <div className="text-xs text-gray-400 mb-4">Under Part 7(s32) of the DA Rules, the assessment period can be stopped by agreement with Council. The cumulative stopped period cannot exceed 130 business days.</div>
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Duration to stop (business days)</label>
          <input type="number" min={1} value={days} onChange={e => setDays(parseInt(e.target.value) || 0)} className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">Reason for stopping</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Awaiting client traffic report..." className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg resize-none h-20 focus:outline-none focus:border-emerald-400" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave({ isStopped: true, stoppedDays: (stageData.stoppedDays || 0) + days, stopReason: reason })} className="flex-1 py-2 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600">Stop clock</button>
        </div>
      </div>
    </div>
  )
}

function DAStageTracker({ job, onHistoryAdd }) {
  const [stages, setStages] = useState(initialStageData)
  const [stopClockStage, setStopClockStage] = useState(null)
  const [expandedStage, setExpandedStage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('jobs').select('da_stages').eq('id', job.id).single()
      if (data?.da_stages) setStages(data.da_stages)
    }
    load()
  }, [job.id])

  const updateStage = (id, updates) => {
    setStages(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }))
    setSaved(false)
  }

  const resumeClock = (id) => updateStage(id, { isStopped: false })

  const saveStages = async () => {
    setSaving(true)
    await supabase.from('jobs').update({ da_stages: stages }).eq('id', job.id)
    setSaving(false)
    setSaved(true)
    onHistoryAdd('DA stages updated')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">DA stage progress</div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400">
              {job.lodgement_date ? `Lodged ${formatDateShort(job.lodgement_date)}` : 'Not yet lodged'}
              {job.decision_due_date ? ` · Decision due ${formatDateShort(job.decision_due_date)}` : ''}
            </div>
            <button onClick={saveStages} disabled={saving} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save stages'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {DA_STAGES.map((stage, i) => {
            const data = stages[stage.id]
            return (
              <div key={stage.id} className="flex items-center flex-1">
                <button onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)} className={`flex-1 h-2 rounded-full transition-all ${data.status === 'complete' ? 'bg-emerald-500' : data.status === 'active' ? 'bg-amber-400 ring-2 ring-amber-300 ring-offset-1' : 'bg-gray-200'}`} />
                {i < DA_STAGES.length - 1 && <div className="w-1" />}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1">
          {DA_STAGES.map(stage => {
            const data = stages[stage.id]
            return (
              <div key={stage.id} className="flex-1 text-center">
                <div className={`text-xs mt-1 ${data.status === 'active' ? 'text-amber-600 font-medium' : data.status === 'complete' ? 'text-emerald-600' : 'text-gray-300'}`}>
                  {data.status === 'complete' ? '✓' : data.status === 'active' ? '●' : '○'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {DA_STAGES.map((stage, index) => {
        const data = stages[stage.id]
        const isActive = data.status === 'active'
        const isComplete = data.status === 'complete'
        const isPending = data.status === 'pending'
        const isExpanded = expandedStage === stage.id
        const daysLeft = daysUntil(data.endDate)
        const isUrgent = isActive && daysLeft !== null && daysLeft <= 5
        const isOverdue = isActive && daysLeft !== null && daysLeft < 0

        return (
          <div key={stage.id} className={`bg-white rounded-xl border transition-all ${isActive ? 'border-amber-300 shadow-sm' : isComplete ? 'border-gray-200' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedStage(isExpanded ? null : stage.id)}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isComplete ? 'bg-emerald-100 text-emerald-700' : isActive ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                {isComplete ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className={`text-xs font-semibold ${isPending ? 'text-gray-400' : 'text-gray-800'}`}>{stage.label}</div>
                  {data.isStopped && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Clock stopped</span>}
                  {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Overdue</span>}
                  {isUrgent && !isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Due soon</span>}
                </div>
                <div className="text-xs text-gray-400">{stage.description}</div>
              </div>
              <div className="text-right flex-shrink-0">
                {isActive && data.endDate && <div className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-600'}`}>{isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}</div>}
                {isComplete && <div className="text-xs text-emerald-600 font-medium">Complete</div>}
                {isPending && <div className="text-xs text-gray-300">Not started</div>}
                <div className="text-xs text-gray-400">{formatDateShort(data.endDate)}</div>
              </div>
              <div className="text-xs text-gray-300">{isExpanded ? '▲' : '▼'}</div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Dates</div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Start date</span>
                        <input type="date" value={data.startDate || ''} onChange={e => updateStage(stage.id, { startDate: e.target.value })} className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:border-emerald-400" />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">End date</span>
                        <input type="date" value={data.endDate || ''} onChange={e => updateStage(stage.id, { endDate: e.target.value })} className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:border-emerald-400" />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Statutory period</span>
                        <span className="text-xs font-medium">{stage.statutory_days} business days</span>
                      </div>
                      {data.stoppedDays > 0 && <div className="flex justify-between"><span className="text-xs text-gray-400">Clock stopped</span><span className="text-xs font-medium text-orange-600">{data.stoppedDays} days</span></div>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Status & actions</div>
                    <div className="space-y-2">
                      <select value={data.status} onChange={e => updateStage(stage.id, { status: e.target.value })} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400">
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="complete">Complete</option>
                      </select>
                      {data.stopReason && <div className="text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1.5">Stop reason: {data.stopReason}</div>}
                      <div className="flex gap-2 mt-1">
                        {!data.isStopped ? (
                          <button onClick={() => setStopClockStage(stage)} className="flex-1 py-1.5 text-xs border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50">⏸ Stop clock</button>
                        ) : (
                          <button onClick={() => resumeClock(stage.id)} className="flex-1 py-1.5 text-xs border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50">▶ Resume clock</button>
                        )}
                        {data.status === 'active' && <button onClick={() => updateStage(stage.id, { status: 'complete' })} className="flex-1 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Mark complete</button>}
                        {data.status === 'pending' && <button onClick={() => updateStage(stage.id, { status: 'active', startDate: new Date().toISOString().split('T')[0] })} className="flex-1 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Start stage</button>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">HPC internal stage: <span className="font-medium text-gray-600">{stage.hpc_stage}</span></span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stage.color}`}>{stage.label}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {stopClockStage && (
        <StopClockModal
          stage={stopClockStage}
          stageData={stages[stopClockStage.id]}
          onSave={(updates) => { updateStage(stopClockStage.id, updates); setStopClockStage(null) }}
          onClose={() => setStopClockStage(null)}
        />
      )}
    </div>
  )
}

function TimeBudgetTab({ job }) {
  const [timeLogs, setTimeLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('time_logs')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false })
      if (data) setTimeLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [job.id])

  const totalSeconds = timeLogs.reduce((sum, l) => sum + (l.duration_seconds || Math.round((l.hours || 0) * 3600)), 0)
  const totalAmount = timeLogs.reduce((sum, l) => sum + calcAmount(l.duration_seconds || Math.round((l.hours || 0) * 3600), l.rate), 0)
  const budgetHrs = job.budget_hours || 0
  const rate = job.planner_rate || 0
  const totalHours = totalSeconds / 3600
  const budgetPct = budgetHrs > 0 ? Math.round((totalHours / budgetHrs) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700">
        Use the <span className="font-semibold">Time Tracker</span> in the sidebar to log time against this job. Select the job, enter what you're working on, and hit Start.
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Budget</div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{formatDuration(totalSeconds)} used</span>
          <span>{budgetHrs} hrs budget</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs">
          <span className={`font-medium ${budgetPct > 90 ? 'text-red-600' : budgetPct > 75 ? 'text-amber-600' : 'text-emerald-600'}`}>{budgetPct}% used</span>
          <span className="text-gray-400">${totalAmount.toLocaleString()} of ${(budgetHrs * rate).toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Time log</div>
        {loading ? (
          <div className="text-xs text-gray-400 text-center py-4">Loading...</div>
        ) : timeLogs.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">No time logged yet — use the sidebar timer to start tracking.</div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_80px_60px_80px] gap-2 px-2 py-1 text-xs text-gray-400 font-medium border-b border-gray-100 mb-1">
              <span>Task</span><span className="text-right">Duration</span><span className="text-right">Rate</span><span className="text-right">Amount</span>
            </div>
            {timeLogs.map((log, i) => {
              const secs = log.duration_seconds || Math.round((log.hours || 0) * 3600)
              const amount = calcAmount(secs, log.rate)
              return (
                <div key={i} className="grid grid-cols-[1fr_80px_60px_80px] gap-2 px-2 py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-xs font-medium">{log.task}</div>
                    <div className="text-xs text-gray-400">{formatDateTimeAEST(log.created_at)} · {log.planner}</div>
                  </div>
                  <div className="text-xs text-right font-mono font-medium">{formatDuration(secs)}</div>
                  <div className="text-xs text-right text-gray-400">${log.rate}/hr</div>
                  <div className="text-xs text-right font-medium">${amount.toLocaleString()}</div>
                </div>
              )
            })}
            <div className="grid grid-cols-[1fr_80px_60px_80px] gap-2 px-2 py-2 border-t border-gray-200 mt-1">
              <div className="text-xs font-semibold">Total</div>
              <div className="text-xs text-right font-mono font-semibold">{formatDuration(totalSeconds)}</div>
              <div />
              <div className="text-xs text-right font-semibold text-emerald-600">${totalAmount.toLocaleString()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const templatesByType = {
  MCU: ['MCU Planning Report', 'MCU IR Response', 'MCU Client Engagement Letter', 'Tax Invoice'],
  ROL: ['ROL Planning Report', 'ROL IR Response', 'ROL Engagement Letter', 'Tax Invoice'],
  RAA: ['RAA Response Report', 'Referral Agency Submission', 'Tax Invoice'],
  OW: ['OW Planning Report', 'OW Compliance Report', 'Tax Invoice'],
  SPS: ['SPS Request Report', 'SPS Supporting Statement', 'Tax Invoice'],
}

const statusColors = {
  Draft: 'bg-gray-100 text-gray-600',
  Active: 'bg-emerald-100 text-emerald-700',
  Review: 'bg-amber-100 text-amber-700',
  'On Hold': 'bg-red-100 text-red-700',
  Complete: 'bg-green-100 text-green-700',
}

const typeBadgeColors = {
  MCU: 'bg-blue-100 text-blue-700',
  ROL: 'bg-amber-100 text-amber-700',
  RAA: 'bg-pink-100 text-pink-700',
  OW: 'bg-green-100 text-green-700',
  SPS: 'bg-purple-100 text-purple-700',
}

export default function JobDetail({ job, onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState([])
  const [generated, setGenerated] = useState([])
  const [generating, setGenerating] = useState(false)
  const [jobStatus, setJobStatus] = useState(job?.status || 'Draft')
  const [editingDates, setEditingDates] = useState(false)
  const [notes, setNotes] = useState(job?.notes || '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [history, setHistory] = useState([])
  const [dates, setDates] = useState({
    confirmation: job?.date_confirmation || '',
    irResponse: job?.date_ir_response || '',
    referral: job?.date_referral || '',
    publicNoticeStart: job?.date_public_notice_start || '',
    publicNoticeEnd: job?.date_public_notice_end || '',
    decision: job?.date_decision || '',
  })

  useEffect(() => {
    const loadHistory = async () => {
      const { data } = await supabase.from('jobs').select('job_history').eq('id', job.id).single()
      if (data?.job_history && data.job_history.length > 0) {
        setHistory(data.job_history)
      } else {
        setHistory([{ text: 'Job created', time: job.created_at }])
      }
    }
    loadHistory()
  }, [job.id])

  if (!job) return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
      <p className="text-sm text-gray-400">No job selected. <button onClick={() => onNavigate('jobs')} className="text-emerald-600 underline">Go back to jobs</button></p>
    </div>
  )

  const addHistory = async (text) => {
    const newEntry = { text, time: new Date().toISOString() }
    const updated = [newEntry, ...history]
    setHistory(updated)
    await supabase.from('jobs').update({ job_history: updated }).eq('id', job.id)
  }

  const saveNotes = async () => {
    setNotesSaving(true)
    await supabase.from('jobs').update({ notes }).eq('id', job.id)
    setNotesSaving(false)
    setNotesSaved(true)
    await addHistory('Notes updated')
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const budgetHrs = job.budget_hours || 0
  const rate = job.planner_rate || 0
  const totalBudget = budgetHrs * rate
  const tabs = ['overview', 'da stages', 'documents', 'time & budget', 'ir & notes', 'history']

  const jobForDocs = {
    code: job.code, name: job.name, address: job.address,
    lot_reference: job.lot_reference, council: job.council, zone: job.zone,
    client_first_name: job.client_first_name, client_last_name: job.client_last_name,
    client_email: job.client_email, client_phone: job.client_phone,
    app_type: job.app_type, assessment_level: job.assessment_level,
    proposed_use: job.proposed_use, referral_agencies: job.referral_agencies,
    planner: job.planner, planner_rate: job.planner_rate, budget_hours: job.budget_hours,
  }

  const toggleTemplate = (t) => setSelectedTemplates(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleGenerate = async () => {
    if (selectedTemplates.length === 0) { alert('Please select at least one template.'); return }
    setGenerating(true)
    setShowGenerate(false)
    for (const template of selectedTemplates) {
      if (template.includes('Planning Report')) await generatePlanningReport(jobForDocs)
      if (template.includes('IR Response')) await generateIRResponse(jobForDocs, 1)
      if (template.includes('Engagement Letter')) await generateEngagementLetter(jobForDocs)
      if (template.includes('Invoice')) await generateInvoice(jobForDocs)
    }
    setGenerated(selectedTemplates)
    for (const t of selectedTemplates) await addHistory(`Document generated: ${t}`)
    setSelectedTemplates([])
    setGenerating(false)
    setActiveTab('documents')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => onNavigate('jobs')} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">← Back</button>
        <div className="flex-1">
          <div className="text-base font-semibold">{job.code} — {job.name}</div>
          <div className="text-xs text-gray-400">{job.address} · {job.lot_reference} · {job.council}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeBadgeColors[job.app_type] || 'bg-gray-100 text-gray-600'}`}>{job.app_type}</span>
        <select value={jobStatus} onChange={e => setJobStatus(e.target.value)} className={`text-xs px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400 font-medium ${statusColors[jobStatus]}`}>
          <option>Draft</option><option>Active</option><option>Review</option><option>On Hold</option><option>Complete</option>
        </select>
        <button onClick={() => setShowGenerate(true)} disabled={generating} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          {generating ? 'Generating...' : '⬡ Generate docs'}
        </button>
      </div>

      {showGenerate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-5 w-96 max-h-96 overflow-y-auto">
            <div className="text-sm font-semibold mb-1">Generate documents</div>
            <div className="text-xs text-gray-400 mb-4">For {job.code} — {job.name}. All client details pre-filled.</div>
            <div className="text-xs font-medium text-gray-500 mb-2">Select templates:</div>
            {(templatesByType[job.app_type] || []).map(t => (
              <div key={t} onClick={() => toggleTemplate(t)} className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 cursor-pointer text-xs transition-colors ${selectedTemplates.includes(t) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedTemplates.includes(t) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                  {selectedTemplates.includes(t) && <span className="text-white text-xs">✓</span>}
                </div>
                {t}
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowGenerate(false)} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleGenerate} className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Generate {selectedTemplates.length > 0 ? `(${selectedTemplates.length})` : ''}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client details</div>
              {[
                ['Client', `${job.client_first_name || ''} ${job.client_last_name || ''}`],
                ['Email', job.client_email], ['Phone', job.client_phone],
                ['Address', job.address], ['Lot / RP', job.lot_reference],
                ['Council', job.council], ['Zone', job.zone],
              ].map(([k, v]) => (
                <div key={k} className="flex py-1.5 border-b border-gray-50 last:border-0">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">{k}</div>
                  <div className="text-xs">{v || '—'}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Application details</div>
              {[
                ['Type', job.app_type], ['Proposed use', job.proposed_use],
                ['Assessment', job.assessment_level], ['Planner', job.planner],
                ['Rate', job.planner_rate ? `$${job.planner_rate}/hr` : '—'],
                ['Budget', budgetHrs ? `${budgetHrs} hrs ($${totalBudget.toLocaleString()})` : '—'],
                ['Lodgement', formatDateShort(job.lodgement_date)],
                ['Decision due', formatDateShort(job.decision_due_date)],
                ['Referrals', job.referral_agencies],
              ].map(([k, v]) => (
                <div key={k} className="flex py-1.5 border-b border-gray-50 last:border-0">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">{k}</div>
                  <div className="text-xs">{v || '—'}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Key dates</div>
              <button onClick={() => setEditingDates(!editingDates)} className="text-xs text-emerald-600 hover:underline">{editingDates ? 'Done' : 'Edit dates'}</button>
            </div>
            <div className="grid grid-cols-2 gap-x-6">
              {[
                { label: 'Confirmation notice', key: 'confirmation' },
                { label: 'IR response due', key: 'irResponse' },
                { label: 'Referral agency response', key: 'referral' },
                { label: 'Public notice start', key: 'publicNoticeStart' },
                { label: 'Public notice end', key: 'publicNoticeEnd' },
                { label: 'Statutory decision date', key: 'decision' },
              ].map(d => (
                <div key={d.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="text-xs text-gray-400">{d.label}</div>
                  {editingDates ? (
                    <input type="date" value={dates[d.key] || ''} onChange={e => setDates(prev => ({ ...prev, [d.key]: e.target.value }))} className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-emerald-400" />
                  ) : (
                    <div className={`text-xs font-medium ${dates[d.key] ? 'text-gray-700' : 'text-gray-300'}`}>{dates[d.key] ? formatDateShort(dates[d.key]) : 'Not set'}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'da stages' && <DAStageTracker job={job} onHistoryAdd={addHistory} />}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documents</div>
            <button onClick={() => setShowGenerate(true)} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">⬡ Generate docs</button>
          </div>
          {generated.length > 0 ? (
            <div>
              <div className="text-xs font-medium text-emerald-600 mb-2">Recently generated — check your downloads folder</div>
              {generated.map((g, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-emerald-100 bg-emerald-50 rounded-lg px-3 mb-1">
                  <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700 flex-shrink-0">W</div>
                  <div className="flex-1 text-xs font-medium">{g}</div>
                  <span className="text-xs text-emerald-600 font-medium">Downloaded ✓</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 text-center py-6">No documents yet — generate your first doc above.</div>
          )}
        </div>
      )}

      {activeTab === 'time & budget' && <TimeBudgetTab job={job} />}

      {activeTab === 'ir & notes' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Job notes</div>
            <button onClick={saveNotes} disabled={notesSaving} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {notesSaving ? 'Saving...' : notesSaved ? '✓ Saved' : 'Save notes'}
            </button>
          </div>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setNotesSaved(false) }}
            placeholder="Add notes about this job..."
            className="w-full h-48 px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-emerald-400"
          />
          <div className="text-xs text-gray-400 mt-2">Notes are saved to the database — they persist between sessions.</div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Activity history</div>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className="flex gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  h.text.includes('generated') ? 'bg-purple-500' :
                  h.text.includes('Time logged') ? 'bg-blue-500' :
                  h.text.includes('Notes') ? 'bg-amber-500' :
                  h.text.includes('DA stages') ? 'bg-pink-500' :
                  'bg-gray-300'
                }`} />
                <div>
                  <div className="text-xs font-medium">{h.text}</div>
                  <div className="text-xs text-gray-400">{formatAEST(h.time)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}