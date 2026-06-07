import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Stage-based template catalogue. As Word docs for Stage 2/3/Misc get uploaded
// to Supabase Storage, add them to the matching `items` arrays below.
const STAGE_CATEGORIES = [
  {
    stage: 'Stage 1',
    color: 'bg-blue-100 text-blue-700',
    groups: [
      {
        name: 'Fee Proposals',
        items: [
          { file: 'Fee_Proposal_Code.docx',         label: 'Fee Proposal — Code Assessable' },
          { file: 'Fee_Proposal_Impact.docx',       label: 'Fee Proposal — Impact Assessable' },
          { file: 'Fee_Proposal_Minor_Change.docx', label: 'Fee Proposal — Minor Change' },
          { file: 'Fee_Proposal_RAA.docx',          label: 'Fee Proposal — Referral Agency Assessment' },
        ],
      },
      {
        name: "Owner's Consent",
        items: [
          { file: 'Consent_Individual.docx', label: "Owner's Consent — Individual" },
          { file: 'Consent_Company.docx',    label: "Owner's Consent — Company" },
        ],
      },
    ],
  },
  {
    stage: 'Stage 2',
    color: 'bg-purple-100 text-purple-700',
    groups: [
      { name: 'Action Notice',    items: [] },
      { name: 'Planning Reports', items: [] },
      { name: 'Referrals',        items: [] },
    ],
  },
  {
    stage: 'Stage 3',
    color: 'bg-emerald-100 text-emerald-700',
    groups: [
      { name: 'Information Request', items: [] },
      { name: 'Public Notification', items: [] },
      { name: 'Waive Appeal Rights', items: [] },
    ],
  },
  {
    stage: 'Miscellaneous',
    color: 'bg-gray-100 text-gray-700',
    groups: [{ name: 'Other', items: [] }],
  },
]

function MyDetailsModal({ currentUser, onClose }) {
  const [form, setForm] = useState({ full_name: '', position: '', email: '' })
  const [existingId, setExistingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.id) { setLoading(false); return }
      const { data } = await supabase
        .from('planner_profiles')
        .select('id, full_name, position, email')
        .eq('user_id', currentUser.id)
        .maybeSingle()
      if (data) {
        setExistingId(data.id)
        setForm({ full_name: data.full_name || '', position: data.position || '', email: data.email || '' })
      }
      setLoading(false)
    }
    load()
  }, [currentUser])

  const handleSave = async () => {
    setSaving(true); setError('')
    let result
    if (existingId) {
      result = await supabase
        .from('planner_profiles')
        .update({ full_name: form.full_name, position: form.position, email: form.email })
        .eq('id', existingId)
    } else {
      result = await supabase
        .from('planner_profiles')
        .insert({ user_id: currentUser.id, company_id: currentUser.company_id, full_name: form.full_name, position: form.position, email: form.email })
        .select('id').single()
      if (result.data) setExistingId(result.data.id)
    }
    setSaving(false)
    if (result.error) { setError(result.error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold">My details</div>
            <div className="text-xs text-gray-400 mt-0.5">Fills <span className="font-mono">{'{planner_name}'}</span>, <span className="font-mono">{'{planner_position}'}</span> and <span className="font-mono">{'{planner_email}'}</span> in your generated documents.</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {!currentUser?.id && <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg">Not signed in — open this page from inside the app.</div>}
          {loading ? <div className="text-xs text-gray-400">Loading...</div> : (
            <>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Full name</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Lachlan Quinn" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Position</label>
                <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="Senior Urban Planner" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="lachlan@hpcplanning.com.au" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>}
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
          <button onClick={handleSave} disabled={saving || loading || !currentUser?.id} className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save details'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Templates({ currentUser }) {
  const [showMyDetails, setShowMyDetails] = useState(false)

  return (
    <div>
      {showMyDetails && <MyDetailsModal currentUser={currentUser} onClose={() => setShowMyDetails(false)} />}

      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex-1">
          <div className="text-xs font-medium text-emerald-700 mb-0.5">Auto-fill</div>
          <div className="text-xs text-emerald-600">Documents are generated from inside a job. Job details (client, address, lot, council, app type, dates) and your planner details fill automatically. Anything else is left as an editable placeholder in the Word file.</div>
        </div>
        <button onClick={() => setShowMyDetails(true)} className="px-4 py-3 text-xs bg-[#1B2A4A] text-white rounded-xl hover:bg-[#16223c] font-medium whitespace-nowrap">
          My details
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {STAGE_CATEGORIES.map(cat => {
          const totalItems = cat.groups.reduce((n, g) => n + g.items.length, 0)
          return (
            <div key={cat.stage} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.stage}</span>
                <span className="text-xs text-gray-400">{totalItems} template{totalItems !== 1 ? 's' : ''}</span>
              </div>

              {cat.groups.map(group => (
                <div key={group.name} className="mb-3 last:mb-0">
                  <div className="text-xs font-semibold text-gray-600 mb-1.5">{group.name}</div>
                  {group.items.length === 0 ? (
                    <div className="text-xs text-gray-400 italic px-1 py-1">No templates uploaded yet.</div>
                  ) : (
                    group.items.map(item => (
                      <div key={item.file} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
                        <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-600 flex-shrink-0">W</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{item.label}</div>
                          <div className="text-xs text-gray-400 truncate">{item.file}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="text-xs text-gray-400 mt-4 text-center">
        Generate documents from inside a job via the <span className="font-medium text-gray-600">Generate docs</span> button.
      </div>
    </div>
  )
}