import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { generateFromTemplate } from './templateFiller'

const STAGE_CATEGORIES = [
  {
    stage: 'Stage 1',
    color: 'bg-blue-100 text-blue-700',
    groups: [
      { name: 'Fee Proposals', items: [
        { file: 'Fee_Proposal_Code.docx',         label: 'Fee Proposal — Code Assessable' },
        { file: 'Fee_Proposal_Impact.docx',       label: 'Fee Proposal — Impact Assessable' },
        { file: 'Fee_Proposal_Minor_Change.docx', label: 'Fee Proposal — Minor Change' },
        { file: 'Fee_Proposal_RAA.docx',          label: 'Fee Proposal — Referral Agency Assessment' },
      ]},
      { name: "Owner's Consent", items: [
        { file: 'Consent_Individual.docx', label: "Owner's Consent — Individual" },
        { file: 'Consent_Company.docx',    label: "Owner's Consent — Company" },
      ]},
    ],
  },
  {
    stage: 'Stage 2',
    color: 'bg-purple-100 text-purple-700',
    groups: [
      { name: 'Action Notice', items: [
        { file: 'Action_Notice_Response.docx', label: 'Action Notice Response' },
      ]},
      { name: 'Planning Reports', items: [
        { file: 'Town_Planning_Assessment.docx',         label: 'Town Planning Assessment (generic)' },
        { file: 'DA_Report_Brisbane.docx',               label: 'DA Report — Brisbane' },
        { file: 'DA_Report_Brisbane_RiskSmart.docx',     label: 'DA Report — Brisbane RiskSmart' },
        { file: 'DA_Report_Express_Code.docx',           label: 'DA Report — Express DA (Code)' },
        { file: 'DA_Report_Express_Accepted.docx',       label: 'DA Report — Express DA (Accepted to Code)' },
        { file: 'DA_Report_Gold_Coast.docx',             label: 'DA Report — Gold Coast' },
        { file: 'DA_Report_Gold_Coast_RAA.docx',         label: 'DA Report — Gold Coast RAA' },
        { file: 'DA_Report_Gold_Coast_Sch6_RAA.docx',    label: 'DA Report — Gold Coast Sch6 RAA' },
        { file: 'DA_Report_OPW.docx',                    label: 'DA Report — Operational Works' },
      ]},
      { name: 'Referrals', items: [
        { file: 'Referral_Cover_Letter.docx',      label: 'Referral Cover Letter' },
        { file: 'Missed_Referral_Letter.docx',     label: 'Missed Referral Letter' },
        { file: 'Referral_Compliance_Letter.docx', label: 'Referral Compliance Letter' },
        { file: 'Early_Concurrence_Request.docx',  label: 'Early Concurrence Request' },
        { file: 'RAA_Application.docx',            label: 'RAA Application' },
      ]},
      { name: 'Change Applications', items: [
        { file: 'Minor_Change_Application.docx',                 label: 'Minor Change Application' },
        { file: 'Minor_Change_Application_Affected_Entity.docx', label: 'Minor Change — Affected Entity Notice' },
        { file: 'Other_Change_Application.docx',                 label: 'Other Change Application' },
      ]},
    ],
  },
  {
    stage: 'Stage 3',
    color: 'bg-emerald-100 text-emerald-700',
    groups: [
      { name: 'Information Request', items: [
        { file: 'IR_Response.docx',                    label: 'IR Response' },
        { file: 'Extend_Response_Period.docx',         label: 'Extend Response Period' },
        { file: 'Initial_Response_and_Direction.docx', label: 'Initial Response & Direction' },
      ]},
      { name: 'Public Notification', items: [
        { file: 'Notice_of_Commencement.docx',         label: 'Notice of Commencement' },
        { file: 'Notice_of_Compliance_to_Council.docx',label: 'Notice of Compliance to Council' },
        { file: 'Notify_Adjoining_Owner_Letter.docx',  label: 'Notify Adjoining Owner Letter' },
        { file: 'Newspaper_Template.docx',             label: 'Newspaper Notice Template' },
      ]},
      { name: 'Waive Appeal Rights', items: [
        { file: 'Waive_Appeal_Rights.docx',            label: 'Waive Appeal Rights' },
        { file: 'Waive_ICN_Appeal_Rights.docx',        label: 'Waive ICN Appeal Rights' },
        { file: 'Suspend_Applicant_Appeal_Period.docx',label: 'Suspend Applicant Appeal Period' },
      ]},
      { name: 'Tools & Forms', items: [
        { file: 'Adjoining_Owners_Contact_List.xlsx',   label: 'Adjoining Owners Contact List (Excel)' },
        { file: 'Advertising_Register.xlsx',            label: 'Advertising Register (Excel)' },
        { file: 'Calendar_2023.xlsx',                   label: 'Calendar (Excel)' },
        { file: 'DA_Sign_Template.ai',                  label: 'DA Sign Template (Illustrator)' },
        { file: 'Change_Application_Sign_Template.ai',  label: 'Change Application Sign Template (Illustrator)' },
      ]},
    ],
  },
  {
    stage: 'Miscellaneous',
    color: 'bg-gray-100 text-gray-700',
    groups: [
      { name: 'Other', items: [
        { file: 'Lodgement_Cover_Letter.docx',         label: 'Lodgement Cover Letter' },
        { file: 'Withdraw_Application.docx',           label: 'Withdraw Application' },
        { file: 'Notice_to_Revive_Application.docx',   label: 'Notice to Revive Application' },
        { file: 'Notice_to_Stop_Current_Period.docx',  label: 'Notice to Stop Current Period' },
        { file: 'Quote_Request.docx',                  label: 'Quote Request' },
      ]},
    ],
  },
]

function fileExt(filename) {
  const m = filename.match(/\.([^.]+)$/)
  return m ? m[1].toLowerCase() : 'file'
}

function fileIcon(ext) {
  if (ext === 'docx' || ext === 'doc') return { label: 'W',   bg: 'bg-blue-50 text-blue-600' }
  if (ext === 'xlsx' || ext === 'xls') return { label: 'X',   bg: 'bg-green-50 text-green-600' }
  if (ext === 'ai')                    return { label: 'Ai',  bg: 'bg-orange-50 text-orange-600' }
  if (ext === 'pdf')                   return { label: 'PDF', bg: 'bg-red-50 text-red-600' }
  return { label: ext.toUpperCase(), bg: 'bg-gray-50 text-gray-600' }
}

async function downloadRawTemplate(filename) {
  const { data, error } = await supabase.storage.from('templates').download(filename)
  if (error) throw new Error(`Could not download ${filename}: ${error.message}`)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(data)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

function GenerateModal({ items, currentUser, planner, onClose, onDone }) {
  const [jobs, setJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, code, name, client_first_name, client_last_name, app_type, address, status')
        .order('created_at', { ascending: false })
        .limit(500)
      if (data) setJobs(data)
      setLoadingJobs(false)
    }
    load()
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')

    let jobForDocs = {}
    if (selectedJobId) {
      const { data } = await supabase.from('jobs').select('*').eq('id', selectedJobId).single()
      if (data) jobForDocs = data
    }

    const failures = []
    for (const item of items) {
      try {
        if (item.file.endsWith('.docx')) {
          await generateFromTemplate(item.file, jobForDocs, planner || {})
        } else if (item.file.endsWith('.xlsx') || item.file.endsWith('.ai')) {
          await downloadRawTemplate(item.file)
        }
      } catch (e) {
        failures.push(`${item.label}: ${e.message}`)
      }
    }

    setGenerating(false)
    if (failures.length) setError('Some documents failed:\n' + failures.join('\n'))
    else setDone(true)
  }

  const docxCount = items.filter(i => i.file.endsWith('.docx')).length
  const rawCount = items.length - docxCount

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">Generate {items.length} document{items.length !== 1 ? 's' : ''}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {docxCount > 0 && `${docxCount} Word doc${docxCount !== 1 ? 's' : ''}`}
            {docxCount > 0 && rawCount > 0 && ' + '}
            {rawCount > 0 && `${rawCount} raw file${rawCount !== 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">
            Job to fill from <span className="text-gray-400 font-normal">(optional)</span>
          </label>

          {loadingJobs ? (
            <div className="text-xs text-gray-400 py-2">Loading jobs...</div>
          ) : (
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
            >
              <option value="">No job — planner details only</option>
              {jobs.map(j => {
                const client = `${j.client_first_name || ''} ${j.client_last_name || ''}`.trim()
                const parts = [j.code, client || j.name || 'Untitled']
                if (j.app_type) parts.push(`(${j.app_type})`)
                return <option key={j.id} value={j.id}>{parts.join(' — ')}</option>
              })}
            </select>
          )}

          <div className="text-xs text-gray-400 mt-2 mb-4">
            {selectedJobId
              ? 'Job details + your planner details will fill the Word docs. Excel and Illustrator files download blank.'
              : 'Only your planner details will fill the Word docs. Other placeholders stay as editable text. Excel and Illustrator files download blank.'}
          </div>

          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-medium text-gray-600 mb-2">Selected templates ({items.length})</div>
            <div className="space-y-1 max-h-[30vh] overflow-y-auto">
              {items.map(item => {
                const ext = fileExt(item.file)
                const icon = fileIcon(ext)
                return (
                  <div key={item.file} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold flex-shrink-0 ${icon.bg}`}>{icon.label}</div>
                    <div className="text-xs flex-1 truncate">{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 whitespace-pre-line">{error}</div>}
          {done && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
              ✓ {items.length} document{items.length !== 1 ? 's' : ''} downloaded — check your downloads folder.
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
            {done ? 'Close' : 'Cancel'}
          </button>
          <button onClick={done ? onDone : handleGenerate} disabled={generating}
            className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
            {generating ? 'Generating...' : done ? 'Done' : `Generate ${items.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function MyDetailsModal({ currentUser, onClose, onSaved }) {
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
    if (onSaved) onSaved(form)
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
  const [showGenerate, setShowGenerate] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [planner, setPlanner] = useState(null)

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.id) return
      const { data } = await supabase
        .from('planner_profiles')
        .select('full_name, position, email')
        .eq('user_id', currentUser.id)
        .maybeSingle()
      if (data) setPlanner(data)
    }
    load()
  }, [currentUser])

  const toggle = (file) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(file) ? next.delete(file) : next.add(file)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const selectedItems = []
  for (const cat of STAGE_CATEGORIES) {
    for (const group of cat.groups) {
      for (const item of group.items) {
        if (selected.has(item.file)) selectedItems.push(item)
      }
    }
  }

  return (
    <div>
      {showMyDetails && <MyDetailsModal currentUser={currentUser} onClose={() => setShowMyDetails(false)} onSaved={setPlanner} />}
      {showGenerate && (
        <GenerateModal
          items={selectedItems}
          currentUser={currentUser}
          planner={planner}
          onClose={() => setShowGenerate(false)}
          onDone={() => { setShowGenerate(false); clearSelection() }}
        />
      )}

      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex-1">
          <div className="text-xs font-medium text-emerald-700 mb-0.5">Generate documents</div>
          <div className="text-xs text-emerald-600">Tick the templates you want, then click <span className="font-medium">Generate</span> at the top. A modal lets you pick a job to auto-fill — or skip the job and just fill your planner details. Excel and Illustrator files download blank.</div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => setShowGenerate(true)}
            disabled={selected.size === 0}
            className="px-4 py-2.5 text-xs bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed font-medium whitespace-nowrap min-w-[140px]"
          >
            {selected.size === 0 ? 'Generate' : `Generate (${selected.size}) →`}
          </button>
          <button onClick={() => setShowMyDetails(true)} className="px-4 py-2.5 text-xs bg-[#1B2A4A] text-white rounded-xl hover:bg-[#16223c] font-medium whitespace-nowrap min-w-[140px]">
            My details
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-3">
          <div className="text-xs font-medium text-emerald-700 flex-1">
            <span className="font-semibold">{selected.size}</span> template{selected.size !== 1 ? 's' : ''} selected
          </div>
          <button onClick={clearSelection} className="text-xs text-gray-600 hover:text-gray-800 hover:underline">Clear selection</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {STAGE_CATEGORIES.map(cat => {
          const totalItems = cat.groups.reduce((n, g) => n + g.items.length, 0)
          const selectedCount = cat.groups.reduce(
            (n, g) => n + g.items.filter(i => selected.has(i.file)).length, 0
          )
          return (
            <div key={cat.stage} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.stage}</span>
                  {selectedCount > 0 && (
                    <span className="text-xs text-emerald-600 font-medium">{selectedCount} selected</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{totalItems} template{totalItems !== 1 ? 's' : ''}</span>
              </div>

              {cat.groups.map(group => (
                <div key={group.name} className="mb-3 last:mb-0">
                  <div className="text-xs font-semibold text-gray-600 mb-1.5">{group.name}</div>
                  {group.items.length === 0 ? (
                    <div className="text-xs text-gray-400 italic px-1 py-1">No templates uploaded yet.</div>
                  ) : (
                    group.items.map(item => {
                      const ext = fileExt(item.file)
                      const icon = fileIcon(ext)
                      const isSelected = selected.has(item.file)
                      return (
                        <button
                          key={item.file}
                          onClick={() => toggle(item.file)}
                          className={`w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg transition-colors text-left ${isSelected ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-gray-50'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 bg-white'}`}>
                            {isSelected && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 ${icon.bg}`}>{icon.label}</div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium truncate ${isSelected ? 'text-emerald-700' : ''}`}>{item.label}</div>
                            <div className="text-xs text-gray-400 truncate">{item.file}</div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}