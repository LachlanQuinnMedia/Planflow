import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import {
  generateLodgementCoverLetter,
  generateWithdrawApplication,
  generateNoticeToRevive,
  generateNoticeToStop,
  generateQuoteRequest,
} from './docGenerator'
import { generateFromTemplate } from './templateFiller'

// Code-built HPC docs (existing).
const HPC_TEMPLATES = [
  { id: 'cover', label: 'Lodgement cover letter', fn: generateLodgementCoverLetter },
  { id: 'withdraw', label: 'Withdraw application', fn: generateWithdrawApplication },
  { id: 'revive', label: 'Notice to revive', fn: generateNoticeToRevive },
  { id: 'stop', label: 'Notice to stop clock', fn: generateNoticeToStop },
  { id: 'quote', label: 'Quote request', fn: generateQuoteRequest },
]

// Stage 1 .docx templates (Supabase Storage, filled via templateFiller).
const STAGE1_TEMPLATES = [
  {
    group: 'Fee Proposals',
    items: [
      { file: 'Fee_Proposal_Code.docx',         label: 'Fee Proposal — Code Assessable' },
      { file: 'Fee_Proposal_Impact.docx',       label: 'Fee Proposal — Impact Assessable' },
      { file: 'Fee_Proposal_Minor_Change.docx', label: 'Fee Proposal — Minor Change' },
      { file: 'Fee_Proposal_RAA.docx',          label: 'Fee Proposal — Referral Agency Assessment' },
    ],
  },
  {
    group: "Owner's Consent",
    items: [
      { file: 'Consent_Individual.docx', label: "Owner's Consent — Individual" },
      { file: 'Consent_Company.docx',    label: "Owner's Consent — Company" },
    ],
  },
]

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

const COMPLEXITY_OPTIONS = [
  { value: 'C1', label: 'C1 — Simple', description: 'Straightforward application, minimal issues expected', color: 'border-gray-300 bg-gray-50 text-gray-700', activeColor: 'border-gray-500 bg-gray-100 text-gray-800' },
  { value: 'C2', label: 'C2 — Moderate', description: 'Standard application with some complexity', color: 'border-blue-200 bg-blue-50 text-blue-700', activeColor: 'border-blue-500 bg-blue-100 text-blue-800' },
  { value: 'C3', label: 'C3 — Complex', description: 'Complex application, multiple issues or referrals', color: 'border-amber-200 bg-amber-50 text-amber-700', activeColor: 'border-amber-500 bg-amber-100 text-amber-800' },
  { value: 'C4', label: 'C4 — High complexity', description: 'Impact assessable or highly contentious application', color: 'border-red-200 bg-red-50 text-red-700', activeColor: 'border-red-500 bg-red-100 text-red-800' },
]

function DocGenerateModal({ job, planner, onClose, onNavigate }) {
  const [selected, setSelected] = useState(new Set())
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleGenerate = async () => {
    if (selected.size === 0) return
    setGenerating(true)
    setError('')
    const failures = []
    for (const sel of selected) {
      try {
        if (sel.endsWith('.docx')) {
          await generateFromTemplate(sel, job, planner || {})
        } else {
          const tmpl = HPC_TEMPLATES.find(t => t.id === sel)
          if (tmpl) await tmpl.fn(job)
        }
      } catch (e) {
        failures.push(`${sel}: ${e.message}`)
      }
    }
    setGenerating(false)
    if (failures.length) setError('Some documents failed:\n' + failures.join('\n'))
    else setDone(true)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">Job created ✓</div>
          <div className="text-xs text-gray-400 mt-0.5">{job.code} — {job.name} · Generate documents now?</div>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Stage 1</div>
          {STAGE1_TEMPLATES.map(group => (
            <div key={group.group} className="mb-3">
              <div className="text-xs font-medium text-gray-600 mb-1">{group.group}</div>
              {group.items.map(item => (
                <button key={item.file} onClick={() => toggle(item.file)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors mb-1 ${selected.has(item.file) ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.has(item.file) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                      {selected.has(item.file) && <span className="text-white text-xs leading-none">✓</span>}
                    </div>
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          ))}

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Other documents</div>
          <div className="space-y-1">
            {HPC_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => toggle(t.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${selected.has(t.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.has(t.id) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                    {selected.has(t.id) && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                  {t.label}
                </div>
              </button>
            ))}
          </div>

          {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 whitespace-pre-line">{error}</div>}
          {done && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
              ✓ {selected.size} document{selected.size !== 1 ? 's' : ''} downloaded — check your downloads folder.
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={() => { onClose(); onNavigate('jobs') }} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Skip — go to jobs</button>
          <button onClick={done ? () => { onClose(); onNavigate('jobs') } : handleGenerate}
            disabled={generating || (!done && selected.size === 0)}
            className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
            {generating ? 'Generating...' : done ? 'Done — go to jobs' : `Generate ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NewJob({ onNavigate, currentUser }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    appType: 'MCU — Material Change of Use',
    assessment: 'Code Assessable',
    address: '', lot: '', council: 'City of Gold Coast',
    zone: '', proposedUse: '', referrals: '',
    budget: '', lodgement: '', decisionDue: '',
    complexity: 'C2',
  })
  const [selectedPlanners, setSelectedPlanners] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [createdJob, setCreatedJob] = useState(null)
  const [showDocModal, setShowDocModal] = useState(false)
  const [currentPlanner, setCurrentPlanner] = useState(null)

  useEffect(() => {
    const fetchStaff = async () => {
      if (!currentUser?.company_id) return
      const { data: profiles } = await supabase.from('planner_profiles').select('full_name, user_id').eq('company_id', currentUser.company_id)
      const { data: users } = await supabase.from('app_users').select('id, username, role').eq('company_id', currentUser.company_id).eq('is_approved', true).order('username', { ascending: true })
      if (users) {
        const merged = users.map(u => {
          const profile = profiles?.find(p => p.user_id === u.id)
          return { ...u, displayName: profile?.full_name || u.username }
        })
        setStaffList(merged)
        const me = merged.find(s => s.id === currentUser.id)
        if (me) setSelectedPlanners([me.displayName])
      }
    }
    fetchStaff()
  }, [currentUser])

  // Logged-in planner's profile — fills planner_name / planner_position / planner_email in generated docs.
  useEffect(() => {
    const loadPlanner = async () => {
      if (!currentUser?.id) return
      const { data } = await supabase
        .from('planner_profiles')
        .select('full_name, position, email')
        .eq('user_id', currentUser.id)
        .maybeSingle()
      if (data) setCurrentPlanner(data)
    }
    loadPlanner()
  }, [currentUser])

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const togglePlanner = (name) => {
    setSelectedPlanners(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    )
  }

  const generateJobCode = () => {
    const year = new Date().getFullYear()
    const num = Math.floor(Math.random() * 900) + 100
    return `${year}-${num}`
  }

  const handleSubmit = async () => {
    if (!form.firstName || !form.address) { setError('Please fill in client name and address.'); return }
    if (selectedPlanners.length === 0) { setError('Please select at least one planner.'); return }
    setError(null)
    setSaving(true)
    const code = generateJobCode()
    const jobName = `${form.firstName} ${form.lastName} — ${form.appType.split('—')[0].trim()}`
    const leadPlanner = selectedPlanners[0]

    const { error: dbError } = await supabase.from('jobs').insert({
      code,
      name: jobName,
      address: form.address,
      lot_reference: form.lot,
      client_first_name: form.firstName,
      client_last_name: form.lastName,
      client_email: form.email,
      client_phone: form.phone,
      council: form.council,
      zone: form.zone,
      app_type: form.appType.split('—')[0].trim(),
      assessment_level: form.assessment,
      proposed_use: form.proposedUse,
      referral_agencies: form.referrals,
      planner: leadPlanner,
      planners: selectedPlanners,
      planner_rate: 150,
      budget_hours: parseFloat(form.budget) || 0,
      status: 'Draft',
      complexity: form.complexity,
      lodgement_date: form.lodgement || null,
      decision_due_date: form.decisionDue || null,
    })

    setSaving(false)
    if (dbError) { setError('Error saving job: ' + dbError.message); return }

    setCreatedJob({
      code, name: jobName, address: form.address, lot_reference: form.lot,
      client_first_name: form.firstName, client_last_name: form.lastName,
      client_email: form.email, client_phone: form.phone,
      council: form.council, zone: form.zone,
      app_type: form.appType.split('—')[0].trim(),
      assessment_level: form.assessment, proposed_use: form.proposedUse,
      referral_agencies: form.referrals, planner: leadPlanner,
      budget_hours: parseFloat(form.budget) || 0,
      complexity: form.complexity,
    })
    setShowDocModal(true)
  }

  return (
    <div className="max-w-3xl">
      {showDocModal && createdJob && (
        <DocGenerateModal job={createdJob} planner={currentPlanner} onClose={() => setShowDocModal(false)} onNavigate={onNavigate} />
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold mb-5">Create new job</h2>
        {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-4">{error}</div>}

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client details</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 mb-1 block">First name</label>
            <input value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="Jonas" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Last name / company</label>
            <input value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Hartmann" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div><label className="text-xs text-gray-500 mb-1 block">Email</label>
            <input value={form.email} onChange={e => update('email', e.target.value)} placeholder="client@email.com.au" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Phone</label>
            <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="04XX XXX XXX" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>

        <div className="border-t border-gray-100 mb-5" />
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Application details</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 mb-1 block">Application type</label>
            <select value={form.appType} onChange={e => update('appType', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              <option>MCU — Material Change of Use</option>
              <option>ROL — Reconfiguration of a Lot</option>
              <option>RAA — Referral Agency Assessment</option>
              <option>OW — Operational Works</option>
              <option>SPS — Superseded Planning Scheme</option>
              <option>PE — Preliminary Enquiry</option>
              <option>PDA — Priority Development Area</option>
            </select>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Assessment level</label>
            <select value={form.assessment} onChange={e => update('assessment', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              <option>Code Assessable</option><option>Impact Assessable</option><option>Accepted Development</option><option>Exempt</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 mb-1 block">Site address</label>
            <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="44 Ridge St, Toowoomba QLD 4350" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Lot / RP reference</label>
            <input value={form.lot} onChange={e => update('lot', e.target.value)} placeholder="Lot 7 SP123456" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 mb-1 block">Council / LGA</label>
            <select value={form.council} onChange={e => update('council', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              {COUNCILS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Planning zone</label>
            <input value={form.zone} onChange={e => update('zone', e.target.value)} placeholder="Medium Density Residential" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 mb-1 block">Proposed use</label>
            <input value={form.proposedUse} onChange={e => update('proposedUse', e.target.value)} placeholder="Mixed-use — retail GF + 12 units" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Referral agencies</label>
            <input value={form.referrals} onChange={e => update('referrals', e.target.value)} placeholder="DTMR, TRC Engineering..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>

        <div className="mb-5">
          <label className="text-xs text-gray-500 mb-2 block">Job complexity</label>
          <div className="grid grid-cols-4 gap-2">
            {COMPLEXITY_OPTIONS.map(opt => {
              const isSelected = form.complexity === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('complexity', opt.value)}
                  className={`px-3 py-2.5 rounded-lg border text-left transition-all ${isSelected ? opt.activeColor + ' border-2' : opt.color + ' hover:opacity-80'}`}
                >
                  <div className="text-xs font-semibold">{opt.value}</div>
                  <div className="text-xs opacity-75 mt-0.5 leading-tight">{opt.label.split('—')[1].trim()}</div>
                </button>
              )
            })}
          </div>
          {form.complexity && (
            <div className="text-xs text-gray-400 mt-1.5">
              {COMPLEXITY_OPTIONS.find(o => o.value === form.complexity)?.description}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 mb-5" />
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Assign & budget</div>

        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-2 block">
            Assigned planners <span className="text-gray-400 font-normal">(select all who will work on this job — first selected is lead)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {staffList.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => togglePlanner(s.displayName)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  selectedPlanners.includes(s.displayName)
                    ? 'bg-emerald-600 text-white border-emerald-600 font-medium'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {selectedPlanners.includes(s.displayName) && selectedPlanners[0] === s.displayName && '★ '}
                {s.displayName}
                {s.role === 'director' ? ' (Director)' : ''}
              </button>
            ))}
          </div>
          {selectedPlanners.length > 0 && (
            <div className="text-xs text-gray-400 mt-1.5">
              Lead: <span className="font-medium text-gray-600">{selectedPlanners[0]}</span>
              {selectedPlanners.length > 1 && ` · Also assigned: ${selectedPlanners.slice(1).join(', ')}`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div><label className="text-xs text-gray-500 mb-1 block">Budget (hours)</label>
            <input type="number" value={form.budget} onChange={e => update('budget', e.target.value)} placeholder="60" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Lodgement date</label>
            <input type="date" value={form.lodgement} onChange={e => update('lodgement', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Decision due date</label>
            <input type="date" value={form.decisionDue} onChange={e => update('decisionDue', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>

        <div className="border-t border-gray-100 mb-5" />
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Documents available to generate</div>
        <div className="text-xs text-gray-400 mb-3">After creating the job you'll be prompted to generate fee proposals, consents, and other documents — all pre-filled with job and planner details.</div>
        <div className="flex flex-wrap gap-2 mb-6">
          {STAGE1_TEMPLATES.flatMap(g => g.items).map(t => (
            <span key={t.file} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200">{t.label}</span>
          ))}
          {HPC_TEMPLATES.map(t => (
            <span key={t.id} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200">{t.label}</span>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => onNavigate('jobs')} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Create job & generate docs'}
          </button>
        </div>
      </div>
    </div>
  )
}