import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { generatePlanningReport, generateIRResponse, generateEngagementLetter, generateInvoice, generateFeeProposal } from './docGenerator'

const COUNCILS = [
  'Balina Shire Council', 'Banana Shire Council', 'Brisbane City Council',
  'Bundaberg Regional Council', 'Cairns Regional Council', 'Cassowary Coast Regional Council',
  'Charters Towers Regional Council', 'City of Gold Coast', 'City of Moreton Bay',
  'Cloncurry Shire Council', 'Fraser Coast Regional Council', 'Gladstone Regional Council',
  'Gympie Regional Council', 'Ipswich City Council', 'Issac Regional Council',
  'Laidley Shire Council', 'Livingstone Shire Council', 'Lockyer Valley Regional Council',
  'Logan City Council', 'Mackay Regional Council', 'Maranoa Regional Council',
  'Noosa Shire Council', 'Port of Brisbane', 'QDC Codes', 'Redland City Council',
  'Rockhampton Regional Council', 'Scenic Rim Regional Council', 'Somerset Regional Council',
  'South Burnett Regional Council', 'South Pine Sports Complex Development Code',
  'Southern Downs Regional Council', 'Sunshine Coast Regional Council',
  'Tablelands Regional Council', 'The Mill at Moreton Bay', 'Toowoomba Regional Council',
  'Townsville City Council', 'Western Downs Regional Council', 'Whitsunday Regional Council', 'Other',
]

const DA_STAGES = [
  { id: 'application', label: 'Application stage', description: 'Application lodged — confirmation notice issued', statutory_days: 5, hpc_stage: 'Stage 2', color: 'bg-blue-100 text-blue-700' },
  { id: 'referral', label: 'Referral stage', description: 'Referral to state government / Energex / other agencies', statutory_days: 10, hpc_stage: 'Stage 3', color: 'bg-purple-100 text-purple-700' },
  { id: 'information', label: 'Information request stage', description: 'Council information request — response window', statutory_days: 10, hpc_stage: 'Stage 3', color: 'bg-amber-100 text-amber-700' },
  { id: 'notification', label: 'Public notification stage', description: 'Public notification & submissions period', statutory_days: 15, hpc_stage: 'Stage 3', color: 'bg-pink-100 text-pink-700' },
  { id: 'decision', label: 'Decision stage', description: 'Assessment and decision by Council', statutory_days: 20, hpc_stage: 'Stage 3', color: 'bg-emerald-100 text-emerald-700' },
]

const HPC_STAGES = [
  {
    id: 'stage1',
    label: 'Stage 1 — Preliminary Planning Investigations',
    shortLabel: 'Stage 1',
    color: 'bg-blue-100 text-blue-700',
    defaultFee: 500,
    description: 'Pre-start meeting, desktop analysis, legislative assessment, development potential advice.',
    items: [
      'Attend one (1) pre-start meeting with client and any other relevant consultants',
      'Desktop analysis of site and surrounding uses',
      'Assess proposed development against local and state government legislation',
      'Identify zone, overlays and local plan requirements',
      'Advise on the site\'s development potential and constraints',
      'Identify and review relevant adjoining / nearby development approvals',
      'Advise client of necessary external consultants for supporting information',
      'Determine application type/s and council lodgement fees',
      'Provide advice to client on development potential and progressing with a development application',
    ],
  },
  {
    id: 'stage2',
    label: 'Stage 2 — Prepare and Lodge Development Application',
    shortLabel: 'Stage 2',
    color: 'bg-purple-100 text-purple-700',
    defaultFee: 3000,
    description: 'Prepare design brief, engage consultants, prepare planning report, lodge with council.',
    items: [
      'Prepare design brief for the architect/draftsman',
      'Obtain quote/s, engage and co-ordinate external consultants (if required)',
      'Review draft architectural plans and provide advice on any changes required',
      'Review external consultant\'s reports and coordinate information',
      'Prepare land owner\'s consent form for signing',
      'Prepare Town Planning Report and Code Compliance Statements',
      'Complete statutory application forms',
      'Collate and lodge application with Council in compliance with the Planning Act 2016',
      'Ensure application has been \'properly made\' in accordance with the Planning Act 2016',
    ],
  },
  {
    id: 'stage3',
    label: 'Stage 3 — Manage and Coordinate Post Lodgement Services',
    shortLabel: 'Stage 3',
    color: 'bg-emerald-100 text-emerald-700',
    defaultFee: 2000,
    description: 'Project manage application through to decision notice.',
    items: [
      'Project manage the development application with regards to the confirmation notice and information requests',
      'Obtain quotes, engage and co-ordinate external consultants for amended or additional supporting information',
      'Review and provide written responses to Council information request',
      'Review and provide written responses to Council\'s further advice notice(s)',
      'Ensure application is managed in accordance with the Planning Act 2016 and Development Assessment Rules',
      'Attend one (1) meeting with consultants (if required) and one (1) meeting with council (if required)',
      'Respond to Assessment Manager queries',
      'Review and negotiate draft conditions',
      'Provide client with digital copy of the Decision Notice',
      'Advise client on approval conditions and/or appeal rights',
    ],
  },
]

const initialHPCStages = {
  stage1: { status: 'pending', fee: 500, notes: '', completedDate: '' },
  stage2: { status: 'pending', fee: 3000, notes: '', completedDate: '' },
  stage3: { status: 'pending', fee: 2000, notes: '', completedDate: '' },
}

const initialStageData = {
  application: { status: 'pending', startDate: '', endDate: '', stoppedDays: 0, stopReason: '', isStopped: false },
  referral:    { status: 'pending', startDate: '', endDate: '', stoppedDays: 0, stopReason: '', isStopped: false },
  information: { status: 'pending', startDate: '', endDate: '', stoppedDays: 0, stopReason: '', isStopped: false },
  notification:{ status: 'pending', startDate: '', endDate: '', stoppedDays: 0, stopReason: '', isStopped: false },
  decision:    { status: 'pending', startDate: '', endDate: '', stoppedDays: 0, stopReason: '', isStopped: false },
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'hpc stages', label: 'HPC Stages' },
  { id: 'da stages', label: 'DA Stages' },
  { id: 'documents', label: 'Documents' },
  { id: 'time & budget', label: 'Time & Budget' },
  { id: 'ir & notes', label: 'IR & Notes' },
  { id: 'history', label: 'History' },
]

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
  return parseFloat(((seconds / 3600) * rate).toFixed(2))
}

function parseHHMMSS(str) {
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60
  return 0
}

async function sendStageNotifications(job, stageId, stageLabel, daysLeft, companyId) {
  try {
    const notifType = daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'due_soon_3' : 'due_soon_7'
    const message = daysLeft < 0
      ? `⚠️ OVERDUE: ${job.code} — ${stageLabel} is ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} overdue.`
      : `⏰ ${job.code} — ${stageLabel} is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`
    const { data: existing } = await supabase.from('stage_notifications').select('id').eq('job_id', job.id).eq('stage_id', stageId).eq('notification_type', notifType).single()
    if (existing) return
    await supabase.from('stage_notifications').insert({ job_id: job.id, stage_id: stageId, notification_type: notifType })
    await supabase.from('notifications').insert({ company_id: companyId, type: 'da_stage_deadline', message, is_read: false })
  } catch (e) {}
}

// ── HPC STAGES TAB ─────────────────────────────────────────────────────────────
function HPCStagesTab({ job, onHistoryAdd }) {
  const [stages, setStages] = useState(initialHPCStages)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedStage, setExpandedStage] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('jobs').select('hpc_stages').eq('id', job.id).single()
      if (data?.hpc_stages && Object.keys(data.hpc_stages).length > 0) {
        setStages({ ...initialHPCStages, ...data.hpc_stages })
      }
    }
    load()
  }, [job.id])

  const updateStage = (id, updates) => {
    setStages(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }))
    setSaved(false)
  }

  const saveStages = async () => {
    setSaving(true)
    await supabase.from('jobs').update({ hpc_stages: stages }).eq('id', job.id)
    setSaving(false)
    setSaved(true)
    onHistoryAdd('HPC stages updated')
    setTimeout(() => setSaved(false), 2000)
  }

  const totalFees = Object.values(stages).reduce((sum, s) => sum + (parseFloat(s.fee) || 0), 0)
  const completedFees = HPC_STAGES.filter(s => stages[s.id]?.status === 'complete')
    .reduce((sum, s) => sum + (parseFloat(stages[s.id]?.fee) || 0), 0)
  const gst = totalFees * 0.1
  const totalWithGST = totalFees + gst

  const statusColors = {
    pending: 'bg-gray-100 text-gray-500',
    active: 'bg-amber-100 text-amber-700',
    complete: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Total fees (ex GST)</div>
          <div className="text-xl font-semibold">${totalFees.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-0.5">+ GST ${gst.toLocaleString()} = ${totalWithGST.toLocaleString()}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <div className="text-xs text-emerald-600 mb-1">Invoiced / complete</div>
          <div className="text-xl font-semibold text-emerald-700">${completedFees.toLocaleString()}</div>
          <div className="text-xs text-emerald-500 mt-0.5">{HPC_STAGES.filter(s => stages[s.id]?.status === 'complete').length} of 3 stages complete</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Remaining</div>
          <div className="text-xl font-semibold text-amber-600">${(totalFees - completedFees).toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-0.5">Pending stages</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">HPC stage progress</div>
          <button onClick={saveStages} disabled={saving} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save stages'}
          </button>
        </div>
        <div className="flex gap-2">
          {HPC_STAGES.map(stage => {
            const data = stages[stage.id]
            return (
              <div key={stage.id} className="flex-1">
                <div className={`h-2 rounded-full ${data.status === 'complete' ? 'bg-emerald-500' : data.status === 'active' ? 'bg-amber-400' : 'bg-gray-200'}`} />
                <div className="text-center mt-1">
                  <span className="text-xs text-gray-400">{stage.shortLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stage cards */}
      {HPC_STAGES.map((stage, index) => {
        const data = stages[stage.id]
        const isExpanded = expandedStage === stage.id
        const isComplete = data.status === 'complete'
        const isActive = data.status === 'active'

        return (
          <div key={stage.id} className={`bg-white rounded-xl border transition-all ${isActive ? 'border-amber-300 shadow-sm' : isComplete ? 'border-emerald-200' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedStage(isExpanded ? null : stage.id)}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isComplete ? 'bg-emerald-100 text-emerald-700' : isActive ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                {isComplete ? '✓' : index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800">{stage.label}</div>
                <div className="text-xs text-gray-400 truncate">{stage.description}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-semibold">${parseFloat(data.fee || 0).toLocaleString()} + GST</div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[data.status]}`}>
                  {data.status === 'pending' ? 'Not started' : data.status === 'active' ? 'In progress' : 'Complete'}
                </span>
              </div>
              <div className="text-xs text-gray-300">{isExpanded ? '▲' : '▼'}</div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Scope of works</div>
                    <div className="space-y-1.5">
                      {stage.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                          <div className="text-xs text-gray-600">{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Stage fee (ex GST)</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">$</span>
                        <input
                          type="number"
                          value={data.fee}
                          onChange={e => updateStage(stage.id, { fee: e.target.value })}
                          className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                        />
                        <span className="text-xs text-gray-400">+ GST</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Status</label>
                      <select
                        value={data.status}
                        onChange={e => updateStage(stage.id, { status: e.target.value, completedDate: e.target.value === 'complete' ? new Date().toISOString().split('T')[0] : data.completedDate })}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                      >
                        <option value="pending">Not started</option>
                        <option value="active">In progress</option>
                        <option value="complete">Complete</option>
                      </select>
                    </div>
                    {data.completedDate && (
                      <div className="text-xs text-emerald-600">✓ Completed {formatDateShort(data.completedDate)}</div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notes</label>
                      <textarea
                        value={data.notes}
                        onChange={e => updateStage(stage.id, { notes: e.target.value })}
                        placeholder="Add notes for this stage..."
                        rows={3}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      {data.status === 'pending' && (
                        <button onClick={() => updateStage(stage.id, { status: 'active' })}
                          className="flex-1 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600">
                          Start stage
                        </button>
                      )}
                      {data.status === 'active' && (
                        <button onClick={() => updateStage(stage.id, { status: 'complete', completedDate: new Date().toISOString().split('T')[0] })}
                          className="flex-1 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                          Mark complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Fee summary table */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fee summary</div>
        {HPC_STAGES.map(stage => (
          <div key={stage.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div className="text-xs text-gray-600">{stage.shortLabel} — {stage.label.split(' — ')[1]}</div>
            <div className="text-xs font-medium">${parseFloat(stages[stage.id]?.fee || 0).toLocaleString()} + GST</div>
          </div>
        ))}
        <div className="flex items-center justify-between py-2 border-t border-gray-200 mt-1">
          <div className="text-xs font-semibold">Subtotal</div>
          <div className="text-xs font-semibold">${totalFees.toLocaleString()}</div>
        </div>
        <div className="flex items-center justify-between py-1">
          <div className="text-xs text-gray-400">GST (10%)</div>
          <div className="text-xs text-gray-400">${gst.toLocaleString()}</div>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-gray-200 mt-1">
          <div className="text-xs font-semibold text-emerald-700">Total (inc GST)</div>
          <div className="text-sm font-bold text-emerald-700">${totalWithGST.toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}

function EditJobModal({ job, currentUser, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: job.client_first_name || '',
    lastName: job.client_last_name || '',
    email: job.client_email || '',
    phone: job.client_phone || '',
    address: job.address || '',
    lot: job.lot_reference || '',
    council: job.council || 'City of Gold Coast',
    zone: job.zone || '',
    appType: job.app_type || 'MCU',
    assessment: job.assessment_level || 'Code Assessable',
    proposedUse: job.proposed_use || '',
    referrals: job.referral_agencies || '',
    plannerRate: job.planner_rate || 150,
    budget: job.budget_hours || '',
    lodgement: job.lodgement_date ? job.lodgement_date.split('T')[0] : '',
    decisionDue: job.decision_due_date ? job.decision_due_date.split('T')[0] : '',
  })
  const [selectedPlanners, setSelectedPlanners] = useState(job.planners || (job.planner ? [job.planner] : []))
  const [staffList, setStaffList] = useState([])
  const [saving, setSaving] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const togglePlanner = (name) => setSelectedPlanners(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name])

  useEffect(() => {
    const fetchStaff = async () => {
      if (!currentUser?.company_id) return
      const { data: profiles } = await supabase.from('planner_profiles').select('full_name, user_id').eq('company_id', currentUser.company_id)
      const { data: users } = await supabase.from('app_users').select('id, username, role').eq('company_id', currentUser.company_id).eq('is_approved', true).order('username', { ascending: true })
      if (users) {
        setStaffList(users.map(u => {
          const profile = profiles?.find(p => p.user_id === u.id)
          return { ...u, displayName: profile?.full_name || u.username }
        }))
      }
    }
    fetchStaff()
  }, [currentUser])

  const handleSave = async () => {
    if (selectedPlanners.length === 0) { alert('Please select at least one planner.'); return }
    setSaving(true)
    const leadPlanner = selectedPlanners[0]
    await supabase.from('jobs').update({
      client_first_name: form.firstName, client_last_name: form.lastName,
      client_email: form.email, client_phone: form.phone,
      address: form.address, lot_reference: form.lot,
      council: form.council, zone: form.zone,
      app_type: form.appType, assessment_level: form.assessment,
      proposed_use: form.proposedUse, referral_agencies: form.referrals,
      planner: leadPlanner, planners: selectedPlanners,
      planner_rate: parseFloat(form.plannerRate) || 150,
      budget_hours: parseFloat(form.budget) || 0,
      lodgement_date: form.lodgement || null,
      decision_due_date: form.decisionDue || null,
      name: `${form.firstName} ${form.lastName} — ${form.appType}`,
    }).eq('id', job.id)
    setSaving(false)
    onSaved('Job details updated')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-6 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold">Edit job details</div>
            <div className="text-xs text-gray-400 mt-0.5">{job.code} — changes are saved to the database and recorded in history.</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client details</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">First name</label>
                <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Last name / company</label>
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input value={form.email} onChange={e => set('email', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Application details</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Application type</label>
                <select value={form.appType} onChange={e => set('appType', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option>MCU</option><option>ROL</option><option>RAA</option><option>OW</option><option>SPS</option><option>PE</option><option>PDA</option>
                </select></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Assessment level</label>
                <select value={form.assessment} onChange={e => set('assessment', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option>Code Assessable</option><option>Impact Assessable</option><option>Accepted Development</option><option>Exempt</option>
                </select></div>
              <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Site address</label>
                <input value={form.address} onChange={e => set('address', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Lot / RP reference</label>
                <input value={form.lot} onChange={e => set('lot', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Council / LGA</label>
                <select value={form.council} onChange={e => set('council', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  {COUNCILS.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Planning zone</label>
                <input value={form.zone} onChange={e => set('zone', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Proposed use</label>
                <input value={form.proposedUse} onChange={e => set('proposedUse', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
              <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Referral agencies</label>
                <input value={form.referrals} onChange={e => set('referrals', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Assign & budget</div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-2 block">Assigned planners <span className="text-gray-400 font-normal">(first selected is lead)</span></label>
              <div className="flex flex-wrap gap-2">
                {staffList.map(s => (
                  <button key={s.id} type="button" onClick={() => togglePlanner(s.displayName)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${selectedPlanners.includes(s.displayName) ? 'bg-emerald-600 text-white border-emerald-600 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {selectedPlanners.includes(s.displayName) && selectedPlanners[0] === s.displayName && '★ '}
                    {s.displayName}{s.role === 'director' ? ' (Director)' : ''}
                  </button>
                ))}
              </div>
              {selectedPlanners.length > 0 && (
                <div className="text-xs text-gray-400 mt-1.5">Lead: <span className="font-medium text-gray-600">{selectedPlanners[0]}</span>{selectedPlanners.length > 1 && ` · Also: ${selectedPlanners.slice(1).join(', ')}`}</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Planner rate ($/hr)</label>
                <input type="number" value={form.plannerRate} onChange={e => set('plannerRate', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Budget (hours)</label>
                <input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Lodgement date</label>
                <input type="date" value={form.lodgement} onChange={e => set('lodgement', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Decision due date</label>
                <input type="date" value={form.decisionDue} onChange={e => set('decisionDue', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteTimeLogModal({ log, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm">
        <div className="text-sm font-semibold mb-1">Delete time entry</div>
        <div className="text-xs text-gray-500 mb-1">Are you sure you want to delete this time entry?</div>
        <div className="text-xs font-medium text-gray-800 mb-4">"{log.task}" — {formatDuration(log.duration_seconds || 0)}</div>
        <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">This will permanently delete this time log entry. This cannot be undone.</div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">No, keep it</button>
          <button onClick={onConfirm} className="flex-1 py-2 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">Yes, delete</button>
        </div>
      </div>
    </div>
  )
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

function DAStageTracker({ job, currentUser, onHistoryAdd }) {
  const [stages, setStages] = useState(initialStageData)
  const [stopClockStage, setStopClockStage] = useState(null)
  const [expandedStage, setExpandedStage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('jobs').select('da_stages').eq('id', job.id).single()
      if (data?.da_stages) { setStages(data.da_stages); checkDeadlines(data.da_stages) }
    }
    load()
  }, [job.id])

  const checkDeadlines = async (stageData) => {
    if (!currentUser?.company_id) return
    for (const stage of DA_STAGES) {
      const data = stageData[stage.id]
      if (data.status !== 'active' || !data.endDate || data.isStopped) continue
      const days = Math.ceil((new Date(data.endDate) - new Date()) / (1000 * 60 * 60 * 24))
      if (days <= 7) await sendStageNotifications(job, stage.id, stage.label, days, currentUser.company_id)
    }
  }

  const updateStage = (id, updates) => { setStages(prev => ({ ...prev, [id]: { ...prev[id], ...updates } })); setSaved(false) }
  const resumeClock = (id) => updateStage(id, { isStopped: false })

  const saveStages = async () => {
    setSaving(true)
    await supabase.from('jobs').update({ da_stages: stages }).eq('id', job.id)
    await checkDeadlines(stages)
    setSaving(false); setSaved(true)
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
                <button onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                  className={`flex-1 h-2 rounded-full transition-all ${data.status === 'complete' ? 'bg-emerald-500' : data.status === 'active' ? 'bg-amber-400 ring-2 ring-amber-300 ring-offset-1' : 'bg-gray-200'}`} />
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
                      {data.stoppedDays > 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Clock stopped</span>
                          <span className="text-xs font-medium text-orange-600">{data.stoppedDays} days</span>
                        </div>
                      )}
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

function AddTimeLogModal({ job, currentUser, onClose, onSaved }) {
  const [task, setTask] = useState('')
  const [duration, setDuration] = useState('')
  const [rate, setRate] = useState(job.planner_rate || 150)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!task.trim()) { setError('Please enter a task description.'); return }
    if (!duration.trim()) { setError('Please enter a duration (e.g. 01:30:00).'); return }
    const seconds = parseHHMMSS(duration)
    if (seconds <= 0) { setError('Please enter a valid duration.'); return }
    setSaving(true)
    await supabase.from('time_logs').insert({
      job_id: job.id, job_code: job.code,
      planner: currentUser?.username || 'Unknown',
      task, hours: parseFloat((seconds / 3600).toFixed(4)),
      duration_seconds: seconds, rate: parseFloat(rate) || 0,
      log_date: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    onSaved(`Time log added manually: ${task}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 w-full max-w-md">
        <div className="text-sm font-semibold mb-1">Add time log manually</div>
        <div className="text-xs text-gray-400 mb-4">Use this to add a time entry that wasn't captured by the timer.</div>
        {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}
        <div className="space-y-3">
          <div><label className="block text-xs text-gray-500 mb-1">Task description</label>
            <input type="text" value={task} onChange={e => setTask(e.target.value)} placeholder="e.g. Planning report drafting" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Duration (HH:MM:SS)</label>
            <input type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="01:30:00" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Rate ($/hr)</label>
            <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="185" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
            {saving ? 'Saving...' : 'Add entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditTimeLogModal({ log, onClose, onSaved }) {
  const [task, setTask] = useState(log.task || '')
  const [duration, setDuration] = useState(formatDuration(log.duration_seconds || Math.round((log.hours || 0) * 3600)))
  const [rate, setRate] = useState(log.rate || 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!task.trim()) { setError('Please enter a task description.'); return }
    const seconds = parseHHMMSS(duration)
    if (seconds <= 0) { setError('Please enter a valid duration.'); return }
    setSaving(true)
    await supabase.from('time_logs').update({
      task, duration_seconds: seconds,
      hours: parseFloat((seconds / 3600).toFixed(4)),
      rate: parseFloat(rate) || 0,
    }).eq('id', log.id)
    setSaving(false)
    onSaved(`Time log edited: ${task}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 w-full max-w-md">
        <div className="text-sm font-semibold mb-1">Edit time log</div>
        <div className="text-xs text-gray-400 mb-4">Changes will be recorded in the job history.</div>
        {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}
        <div className="space-y-3">
          <div><label className="block text-xs text-gray-500 mb-1">Task description</label>
            <input type="text" value={task} onChange={e => setTask(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Duration (HH:MM:SS)</label>
            <input type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Rate ($/hr)</label>
            <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TimeBudgetTab({ job, currentUser, onHistoryAdd }) {
  const [timeLogs, setTimeLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [deletingLog, setDeletingLog] = useState(null)

  useEffect(() => { fetchLogs() }, [job.id])

  const fetchLogs = async () => {
    setLoading(true)
    const { data } = await supabase.from('time_logs').select('*').eq('job_id', job.id).order('created_at', { ascending: false })
    if (data) setTimeLogs(data)
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!deletingLog) return
    await supabase.from('time_logs').delete().eq('id', deletingLog.id)
    await onHistoryAdd(`Time log deleted: ${deletingLog.task}`)
    setDeletingLog(null)
    fetchLogs()
  }

  const handleSaved = async (historyText) => { await onHistoryAdd(historyText); fetchLogs() }

  const totalSeconds = timeLogs.reduce((sum, l) => sum + (l.duration_seconds || Math.round((l.hours || 0) * 3600)), 0)
  const totalAmount = timeLogs.reduce((sum, l) => sum + calcAmount(l.duration_seconds || Math.round((l.hours || 0) * 3600), l.rate), 0)
  const budgetHrs = job.budget_hours || 0
  const rate = job.planner_rate || 0
  const budgetPct = budgetHrs > 0 ? Math.round(((totalSeconds / 3600) / budgetHrs) * 100) : 0

  return (
    <div className="space-y-4">
      {showAddModal && <AddTimeLogModal job={job} currentUser={currentUser} onClose={() => setShowAddModal(false)} onSaved={handleSaved} />}
      {editingLog && <EditTimeLogModal log={editingLog} onClose={() => setEditingLog(null)} onSaved={handleSaved} />}
      {deletingLog && <DeleteTimeLogModal log={deletingLog} onConfirm={handleDelete} onCancel={() => setDeletingLog(null)} />}

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700">
        Use the <span className="font-semibold">Time Tracker</span> in the sidebar to log time against this job.
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
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Time log</div>
          <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">+ Add entry</button>
        </div>
        {loading ? (
          <div className="text-xs text-gray-400 text-center py-4">Loading...</div>
        ) : timeLogs.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">No time logged yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_80px_60px_80px_64px] gap-2 px-2 py-1 text-xs text-gray-400 font-medium border-b border-gray-100 mb-1">
              <span>Task</span><span className="text-right">Duration</span><span className="text-right">Rate</span><span className="text-right">Amount</span><span></span>
            </div>
            {timeLogs.map((log, i) => {
              const secs = log.duration_seconds || Math.round((log.hours || 0) * 3600)
              return (
                <div key={i} className="grid grid-cols-[1fr_80px_60px_80px_64px] gap-2 px-2 py-2 border-b border-gray-50 last:border-0 items-start">
                  <div>
                    <div className="text-xs font-medium">{log.task}</div>
                    <div className="text-xs text-gray-400">{formatDateTimeAEST(log.created_at)} · {log.planner}</div>
                  </div>
                  <div className="text-xs text-right font-mono font-medium">{formatDuration(secs)}</div>
                  <div className="text-xs text-right text-gray-400">${log.rate}/hr</div>
                  <div className="text-xs text-right font-medium">${calcAmount(secs, log.rate).toLocaleString()}</div>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => setEditingLog(log)} className="px-1.5 py-1 text-xs text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Edit">✎</button>
                    <button onClick={() => setDeletingLog(log)} className="px-1.5 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">✕</button>
                  </div>
                </div>
              )
            })}
            <div className="grid grid-cols-[1fr_80px_60px_80px_64px] gap-2 px-2 py-2 border-t border-gray-200 mt-1">
              <div className="text-xs font-semibold">Total</div>
              <div className="text-xs text-right font-mono font-semibold">{formatDuration(totalSeconds)}</div>
              <div /><div className="text-xs text-right font-semibold text-emerald-600">${totalAmount.toLocaleString()}</div><div />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DocumentsTab({ job, currentUser, onHistoryAdd }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { fetchDocs() }, [job.id])

  const fetchDocs = async () => {
    setLoading(true)
    const { data } = await supabase.from('documents').select('*').eq('job_id', job.id).order('created_at', { ascending: false })
    if (data) setDocs(data)
    setLoading(false)
  }

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const path = `${job.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
      if (uploadError) { console.error(uploadError); continue }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      await supabase.from('documents').insert({
        company_id: currentUser?.company_id, job_id: job.id, job_code: job.code,
        name: file.name, file_path: path, file_url: urlData.publicUrl,
        file_type: file.name.split('.').pop().toLowerCase(),
        file_size: file.size, uploaded_by: currentUser?.username || 'Unknown',
      })
      await onHistoryAdd(`Document uploaded: ${file.name}`)
    }
    setUploading(false)
    fetchDocs()
  }

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    fetchDocs()
  }

  const getFileIcon = (type) => {
    if (type === 'pdf') return { label: 'PDF', color: 'bg-red-100 text-red-700' }
    if (['doc', 'docx'].includes(type)) return { label: 'DOC', color: 'bg-blue-100 text-blue-700' }
    if (['xls', 'xlsx'].includes(type)) return { label: 'XLS', color: 'bg-green-100 text-green-700' }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return { label: 'IMG', color: 'bg-purple-100 text-purple-700' }
    return { label: type?.toUpperCase() || 'FILE', color: 'bg-gray-100 text-gray-600' }
  }

  const formatSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'}`}>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
        {uploading ? <div className="text-xs text-emerald-600 font-medium">Uploading...</div> : (
          <><div className="text-2xl mb-2">☁️</div>
            <div className="text-xs font-medium text-gray-600">Drop files here or click to upload</div>
            <div className="text-xs text-gray-400 mt-1">PDF, Word, Excel, images — any file type</div></>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documents</div>
          <div className="text-xs text-gray-400">{docs.length} file{docs.length !== 1 ? 's' : ''}</div>
        </div>
        {loading ? <div className="px-4 py-6 text-xs text-gray-400 text-center">Loading...</div>
          : docs.length === 0 ? <div className="px-4 py-8 text-xs text-gray-400 text-center">No documents yet — drag and drop files above.</div>
          : docs.map(doc => {
            const icon = getFileIcon(doc.file_type)
            return (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${icon.color}`}>{icon.label}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{doc.name}</div>
                  <div className="text-xs text-gray-400">{formatSize(doc.file_size)} · {doc.uploaded_by} · {new Date(doc.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Open</a>
                  <a href={doc.file_url} download={doc.name} className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">↓</a>
                  <button onClick={() => handleDelete(doc)} className="px-2 py-1 text-xs text-red-400 border border-red-100 rounded-lg hover:bg-red-50">✕</button>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

const templatesByType = {
  MCU: ['Fee Proposal', 'MCU Planning Report', 'MCU IR Response', 'MCU Client Engagement Letter', 'Tax Invoice'],
  ROL: ['Fee Proposal', 'ROL Planning Report', 'ROL IR Response', 'ROL Engagement Letter', 'Tax Invoice'],
  RAA: ['Fee Proposal', 'RAA Response Report', 'Referral Agency Submission', 'Tax Invoice'],
  OW: ['Fee Proposal', 'OW Planning Report', 'OW Compliance Report', 'Tax Invoice'],
  SPS: ['Fee Proposal', 'SPS Request Report', 'SPS Supporting Statement', 'Tax Invoice'],
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

export default function JobDetail({ job, onNavigate, currentUser }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showGenerate, setShowGenerate] = useState(false)
  const [showEditJob, setShowEditJob] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState([])
  const [generating, setGenerating] = useState(false)
  const [jobStatus, setJobStatus] = useState(job?.status || 'Draft')
  const [editingDates, setEditingDates] = useState(false)
  const [notes, setNotes] = useState(job?.notes || '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [history, setHistory] = useState([])
  const [jobData, setJobData] = useState(job)
  const [hpcStages, setHpcStages] = useState(initialHPCStages)
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
      const { data } = await supabase.from('jobs').select('job_history, hpc_stages').eq('id', job.id).single()
      if (data?.job_history && data.job_history.length > 0) setHistory(data.job_history)
      else setHistory([{ text: 'Job created', time: job.created_at }])
      if (data?.hpc_stages && Object.keys(data.hpc_stages).length > 0) setHpcStages({ ...initialHPCStages, ...data.hpc_stages })
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

  const handleJobSaved = async (historyText) => {
    await addHistory(historyText)
    const { data } = await supabase.from('jobs').select('*').eq('id', job.id).single()
    if (data) setJobData(data)
  }

  const saveNotes = async () => {
    setNotesSaving(true)
    await supabase.from('jobs').update({ notes }).eq('id', job.id)
    setNotesSaving(false); setNotesSaved(true)
    await addHistory('Notes updated')
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const budgetHrs = jobData.budget_hours || 0
  const rate = jobData.planner_rate || 0
  const totalBudget = budgetHrs * rate

  const jobForDocs = {
    code: jobData.code, name: jobData.name, address: jobData.address,
    lot_reference: jobData.lot_reference, council: jobData.council, zone: jobData.zone,
    client_first_name: jobData.client_first_name, client_last_name: jobData.client_last_name,
    client_email: jobData.client_email, client_phone: jobData.client_phone,
    app_type: jobData.app_type, assessment_level: jobData.assessment_level,
    proposed_use: jobData.proposed_use, referral_agencies: jobData.referral_agencies,
    planner: jobData.planner, planner_rate: jobData.planner_rate, budget_hours: jobData.budget_hours,
    hpc_stages: hpcStages,
  }

  const toggleTemplate = (t) => setSelectedTemplates(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleGenerate = async () => {
    if (selectedTemplates.length === 0) { alert('Please select at least one template.'); return }
    setGenerating(true)
    setShowGenerate(false)
    for (const template of selectedTemplates) {
      if (template === 'Fee Proposal') await generateFeeProposal(jobForDocs)
      else if (template.includes('Planning Report')) await generatePlanningReport(jobForDocs)
      else if (template.includes('IR Response')) await generateIRResponse(jobForDocs, 1)
      else if (template.includes('Engagement Letter')) await generateEngagementLetter(jobForDocs)
      else if (template.includes('Invoice')) await generateInvoice(jobForDocs)
    }
    for (const t of selectedTemplates) await addHistory(`Document generated: ${t}`)
    setSelectedTemplates([])
    setGenerating(false)
  }

  const plannersList = jobData.planners?.length > 0 ? jobData.planners : (jobData.planner ? [jobData.planner] : [])

  return (
    <div>
      {showEditJob && (
        <EditJobModal job={jobData} currentUser={currentUser} onClose={() => setShowEditJob(false)} onSaved={handleJobSaved} />
      )}

      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => onNavigate('jobs')} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">← Back</button>
        <div className="flex-1">
          <div className="text-base font-semibold">{jobData.code} — {jobData.name}</div>
          <div className="text-xs text-gray-400">{jobData.address} · {jobData.lot_reference} · {jobData.council}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeBadgeColors[jobData.app_type] || 'bg-gray-100 text-gray-600'}`}>{jobData.app_type}</span>
        <select value={jobStatus} onChange={e => setJobStatus(e.target.value)} className={`text-xs px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400 font-medium ${statusColors[jobStatus]}`}>
          <option>Draft</option><option>Active</option><option>Review</option><option>On Hold</option><option>Complete</option>
        </select>
        <button onClick={() => setShowEditJob(true)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">✎ Edit</button>
        <button onClick={() => setShowGenerate(true)} disabled={generating} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          {generating ? 'Generating...' : '⬡ Generate docs'}
        </button>
      </div>

      {showGenerate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-5 w-96 max-h-96 overflow-y-auto">
            <div className="text-sm font-semibold mb-1">Generate documents</div>
            <div className="text-xs text-gray-400 mb-4">For {jobData.code} — {jobData.name}. All client details pre-filled.</div>
            <div className="text-xs font-medium text-gray-500 mb-2">Select templates:</div>
            {(templatesByType[jobData.app_type] || []).map(t => (
              <div key={t} onClick={() => toggleTemplate(t)} className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 cursor-pointer text-xs transition-colors ${selectedTemplates.includes(t) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedTemplates.includes(t) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                  {selectedTemplates.includes(t) && <span className="text-white text-xs">✓</span>}
                </div>
                {t === 'Fee Proposal' && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium ml-1">HPC</span>}
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

      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-emerald-500 text-emerald-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client details</div>
              {[
                ['Client', `${jobData.client_first_name || ''} ${jobData.client_last_name || ''}`],
                ['Email', jobData.client_email], ['Phone', jobData.client_phone],
                ['Address', jobData.address], ['Lot / RP', jobData.lot_reference],
                ['Council', jobData.council], ['Zone', jobData.zone],
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
                ['Type', jobData.app_type],
                ['Proposed use', jobData.proposed_use],
                ['Assessment', jobData.assessment_level],
                ['Planners', plannersList.join(', ') || '—'],
                ['Rate', jobData.planner_rate ? `$${jobData.planner_rate}/hr` : '—'],
                ['Budget', budgetHrs ? `${budgetHrs} hrs ($${totalBudget.toLocaleString()})` : '—'],
                ['Lodgement', formatDateShort(jobData.lodgement_date)],
                ['Decision due', formatDateShort(jobData.decision_due_date)],
                ['Referrals', jobData.referral_agencies],
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

      {activeTab === 'hpc stages' && <HPCStagesTab job={jobData} onHistoryAdd={addHistory} />}
      {activeTab === 'da stages' && <DAStageTracker job={jobData} currentUser={currentUser} onHistoryAdd={addHistory} />}
      {activeTab === 'documents' && <DocumentsTab job={jobData} currentUser={currentUser} onHistoryAdd={addHistory} />}
      {activeTab === 'time & budget' && <TimeBudgetTab job={jobData} currentUser={currentUser} onHistoryAdd={addHistory} />}

      {activeTab === 'ir & notes' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Job notes</div>
            <button onClick={saveNotes} disabled={notesSaving} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {notesSaving ? 'Saving...' : notesSaved ? '✓ Saved' : 'Save notes'}
            </button>
          </div>
          <textarea value={notes} onChange={e => { setNotes(e.target.value); setNotesSaved(false) }}
            placeholder="Add notes about this job..."
            className="w-full h-48 px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-emerald-400" />
          <div className="text-xs text-gray-400 mt-2">Notes are saved to the database and persist between sessions.</div>
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
                  h.text.includes('uploaded') ? 'bg-blue-500' :
                  h.text.includes('Notes') ? 'bg-amber-500' :
                  h.text.includes('HPC stages') ? 'bg-blue-500' :
                  h.text.includes('DA stages') ? 'bg-pink-500' :
                  h.text.includes('Time log') ? 'bg-teal-500' :
                  h.text.includes('details updated') ? 'bg-emerald-500' : 'bg-gray-300'
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