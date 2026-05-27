import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import {
  generateLodgementCoverLetter,
  generateWithdrawApplication,
  generateNoticeToRevive,
  generateNoticeToStop,
  generateQuoteRequest,
} from './docGenerator'

const HPC_TEMPLATES = [
  { id: 'cover', label: 'Lodgement cover letter', fn: generateLodgementCoverLetter },
  { id: 'withdraw', label: 'Withdraw application', fn: generateWithdrawApplication },
  { id: 'revive', label: 'Notice to revive', fn: generateNoticeToRevive },
  { id: 'stop', label: 'Notice to stop clock', fn: generateNoticeToStop },
  { id: 'quote', label: 'Quote request', fn: generateQuoteRequest },
]

function DocGenerateModal({ job, onClose, onNavigate }) {
  const [selected, setSelected] = useState(new Set())
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleGenerate = async () => {
    if (selected.size === 0) return
    setGenerating(true)
    for (const tmpl of HPC_TEMPLATES) {
      if (selected.has(tmpl.id)) {
        await tmpl.fn(job)
      }
    }
    setGenerating(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold">Job created ✓</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {job.code} — {job.name} · Would you like to generate documents now?
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Select documents to generate
          </div>
          <div className="space-y-2">
            {HPC_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                  selected.has(t.id)
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    selected.has(t.id) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                  }`}>
                    {selected.has(t.id) && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                  {t.label}
                </div>
              </button>
            ))}
          </div>

          {done && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
              ✓ {selected.size} document{selected.size !== 1 ? 's' : ''} downloaded — check your downloads folder.
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => { onClose(); onNavigate('jobs') }}
            className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Skip — go to jobs
          </button>
          <button
            onClick={done ? () => { onClose(); onNavigate('jobs') } : handleGenerate}
            disabled={generating || (!done && selected.size === 0)}
            className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
          >
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
    address: '', lot: '', council: 'Toowoomba Regional',
    zone: '', proposedUse: '', referrals: '',
    planner: '',
    budget: '',
    lodgement: '', decisionDue: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [createdJob, setCreatedJob] = useState(null)
  const [showDocModal, setShowDocModal] = useState(false)

  // Load approved staff from same company
  useEffect(() => {
    const fetchStaff = async () => {
      if (!currentUser?.company_id) return
      const { data } = await supabase
        .from('app_users')
        .select('username, role')
        .eq('company_id', currentUser.company_id)
        .eq('is_approved', true)
        .order('username', { ascending: true })
      if (data) {
        setStaffList(data)
        // Default planner to current user
        if (data.length > 0) {
          setForm(f => ({ ...f, planner: currentUser.username || data[0].username }))
        }
      }
    }
    fetchStaff()
  }, [currentUser])

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const generateJobCode = () => {
    const year = new Date().getFullYear()
    const num = Math.floor(Math.random() * 900) + 100
    return `${year}-${num}`
  }

  const handleSubmit = async () => {
    if (!form.firstName || !form.address) {
      setError('Please fill in client name and address.')
      return
    }
    setError(null)
    setSaving(true)
    const code = generateJobCode()
    const jobName = `${form.firstName} ${form.lastName} — ${form.appType.split('—')[0].trim()}`

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
      planner: form.planner,
      planner_rate: 150, // default — can be updated in job detail
      budget_hours: parseFloat(form.budget) || 0,
      status: 'Draft',
      lodgement_date: form.lodgement || null,
      decision_due_date: form.decisionDue || null,
    })

    setSaving(false)

    if (dbError) {
      setError('Error saving job: ' + dbError.message)
      return
    }

    // Store the created job data for doc generation
    setCreatedJob({
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
      planner: form.planner,
      budget_hours: parseFloat(form.budget) || 0,
    })

    setShowDocModal(true)
  }

  return (
    <div className="max-w-3xl">
      {showDocModal && createdJob && (
        <DocGenerateModal
          job={createdJob}
          onClose={() => setShowDocModal(false)}
          onNavigate={onNavigate}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold mb-5">Create new job</h2>
        {error && (
          <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-4">{error}</div>
        )}

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
              <option>Code Assessable</option>
              <option>Impact Assessable</option>
              <option>Accepted Development</option>
              <option>Exempt</option>
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
              <option>Toowoomba Regional</option><option>Brisbane City</option><option>Gold Coast City</option>
              <option>Sunshine Coast</option><option>Ipswich City</option><option>Lockyer Valley</option>
              <option>Southern Downs</option><option>Scenic Rim</option><option>Somerset</option>
              <option>Gympie</option><option>Other</option>
            </select>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Planning zone</label>
            <input value={form.zone} onChange={e => update('zone', e.target.value)} placeholder="Medium Density Residential" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div><label className="text-xs text-gray-500 mb-1 block">Proposed use</label>
            <input value={form.proposedUse} onChange={e => update('proposedUse', e.target.value)} placeholder="Mixed-use — retail GF + 12 units" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Referral agencies</label>
            <input value={form.referrals} onChange={e => update('referrals', e.target.value)} placeholder="DTMR, TRC Engineering..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>

        <div className="border-t border-gray-100 mb-5" />
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Assign & budget</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Lead planner</label>
            <select value={form.planner} onChange={e => update('planner', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              {staffList.length === 0 ? (
                <option value="">Loading staff...</option>
              ) : (
                staffList.map(s => (
                  <option key={s.username} value={s.username}>
                    {s.username}{s.role === 'director' ? ' (Director)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Budget (hours)</label>
            <input type="number" value={form.budget} onChange={e => update('budget', e.target.value)} placeholder="60" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div><label className="text-xs text-gray-500 mb-1 block">Lodgement date</label>
            <input type="date" value={form.lodgement} onChange={e => update('lodgement', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Decision due date</label>
            <input type="date" value={form.decisionDue} onChange={e => update('decisionDue', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" /></div>
        </div>

        <div className="border-t border-gray-100 mb-5" />
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Documents available to generate</div>
        <div className="text-xs text-gray-400 mb-3">After creating the job you'll be prompted to generate any of these — all pre-filled with job details.</div>
        <div className="flex flex-wrap gap-2 mb-6">
          {HPC_TEMPLATES.map(t => (
            <span key={t.id} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200">{t.label}</span>
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