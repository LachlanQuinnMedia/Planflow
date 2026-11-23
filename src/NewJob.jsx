import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { generateFromTemplate } from './templateFiller'
import { APP_TYPES, buildJobName, jobTitle, oneDriveFolderName } from './jobMeta'
import { callGraph, OneDriveFolderPicker } from './OneDriveBrowser'

const STAGE1_TEMPLATES = [
  { group: 'Fee Proposals', items: [
    { file: 'Fee_Proposal_Code.docx',         label: 'Fee Proposal - Code Assessable' },
    { file: 'Fee_Proposal_Impact.docx',       label: 'Fee Proposal - Impact Assessable' },
    { file: 'Fee_Proposal_Minor_Change.docx', label: 'Fee Proposal - Minor Change' },
    { file: 'Fee_Proposal_RAA.docx',          label: 'Fee Proposal - Referral Agency Assessment' },
  ]},
  { group: "Owner's Consent", items: [
    { file: 'Consent_Individual.docx', label: "Owner's Consent - Individual" },
    { file: 'Consent_Company.docx',    label: "Owner's Consent - Company" },
  ]},
]

const STAGE2_TEMPLATES = [
  { group: 'Action Notice', items: [
    { file: 'Action_Notice_Response.docx', label: 'Action Notice Response' },
  ]},
  { group: 'Planning Reports', items: [
    { file: 'Town_Planning_Assessment.docx',         label: 'Town Planning Assessment (generic)' },
    { file: 'DA_Report_Brisbane.docx',               label: 'DA Report - Brisbane' },
    { file: 'DA_Report_Brisbane_RiskSmart.docx',     label: 'DA Report - Brisbane RiskSmart' },
    { file: 'DA_Report_Express_Code.docx',           label: 'DA Report - Express DA (Code)' },
    { file: 'DA_Report_Express_Accepted.docx',       label: 'DA Report - Express DA (Accepted to Code)' },
    { file: 'DA_Report_Gold_Coast.docx',             label: 'DA Report - Gold Coast' },
    { file: 'DA_Report_Gold_Coast_RAA.docx',         label: 'DA Report - Gold Coast RAA' },
    { file: 'DA_Report_Gold_Coast_Sch6_RAA.docx',    label: 'DA Report - Gold Coast Sch6 RAA' },
    { file: 'DA_Report_OPW.docx',                    label: 'DA Report - Operational Works' },
  ]},
  { group: 'Referrals', items: [
    { file: 'Referral_Cover_Letter.docx',      label: 'Referral Cover Letter' },
    { file: 'Missed_Referral_Letter.docx',     label: 'Missed Referral Letter' },
    { file: 'Referral_Compliance_Letter.docx', label: 'Referral Compliance Letter' },
    { file: 'Early_Concurrence_Request.docx',  label: 'Early Concurrence Request' },
    { file: 'RAA_Application.docx',            label: 'RAA Application' },
  ]},
  { group: 'Change Applications', items: [
    { file: 'Minor_Change_Application.docx',                 label: 'Minor Change Application' },
    { file: 'Minor_Change_Application_Affected_Entity.docx', label: 'Minor Change - Affected Entity Notice' },
    { file: 'Other_Change_Application.docx',                 label: 'Other Change Application' },
  ]},
]

const STAGE3_TEMPLATES = [
  { group: 'Information Request', items: [
    { file: 'IR_Response.docx',                    label: 'IR Response' },
    { file: 'Extend_Response_Period.docx',         label: 'Extend Response Period' },
    { file: 'Initial_Response_and_Direction.docx', label: 'Initial Response & Direction' },
  ]},
  { group: 'Public Notification', items: [
    { file: 'Notice_of_Commencement.docx',         label: 'Notice of Commencement' },
    { file: 'Notice_of_Compliance_to_Council.docx',label: 'Notice of Compliance to Council' },
    { file: 'Notify_Adjoining_Owner_Letter.docx',  label: 'Notify Adjoining Owner Letter' },
    { file: 'Newspaper_Template.docx',             label: 'Newspaper Notice Template' },
  ]},
  { group: 'Waive Appeal Rights', items: [
    { file: 'Waive_Appeal_Rights.docx',            label: 'Waive Appeal Rights' },
    { file: 'Waive_ICN_Appeal_Rights.docx',        label: 'Waive ICN Appeal Rights' },
    { file: 'Suspend_Applicant_Appeal_Period.docx',label: 'Suspend Applicant Appeal Period' },
  ]},
  { group: 'Tools & Forms', items: [
    { file: 'Adjoining_Owners_Contact_List.xlsx',   label: 'Adjoining Owners Contact List (Excel)' },
    { file: 'Advertising_Register.xlsx',            label: 'Advertising Register (Excel)' },
    { file: 'Calendar_2023.xlsx',                   label: 'Calendar (Excel)' },
    { file: 'DA_Sign_Template.ai',                  label: 'DA Sign Template (Illustrator)' },
    { file: 'Change_Application_Sign_Template.ai',  label: 'Change Application Sign Template (Illustrator)' },
  ]},
]

const MISC_TEMPLATES = [
  { group: 'Miscellaneous', items: [
    { file: 'Lodgement_Cover_Letter.docx',         label: 'Lodgement Cover Letter' },
    { file: 'Withdraw_Application.docx',           label: 'Withdraw Application' },
    { file: 'Notice_to_Revive_Application.docx',   label: 'Notice to Revive Application' },
    { file: 'Notice_to_Stop_Current_Period.docx',  label: 'Notice to Stop Current Period' },
    { file: 'Quote_Request.docx',                  label: 'Quote Request' },
    { file: 'Generic_Letterhead.docx',             label: 'Generic Letterhead (blank)' },
  ]},
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
  { value: 'C1', label: 'C1: Simple', description: 'Straightforward application, minimal issues expected', color: 'border-gray-300 bg-gray-50 text-gray-700', activeColor: 'border-gray-500 bg-gray-100 text-gray-800' },
  { value: 'C2', label: 'C2: Moderate', description: 'Standard application with some complexity', color: 'border-blue-200 bg-blue-50 text-blue-700', activeColor: 'border-blue-500 bg-blue-100 text-blue-800' },
  { value: 'C3', label: 'C3: Complex', description: 'Complex application, multiple issues or referrals', color: 'border-amber-200 bg-amber-50 text-amber-700', activeColor: 'border-amber-500 bg-amber-100 text-amber-800' },
  { value: 'C4', label: 'C4: High complexity', description: 'Impact assessable or highly contentious application', color: 'border-red-200 bg-red-50 text-red-700', activeColor: 'border-red-500 bg-red-100 text-red-800' },
]

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

function DocGenerateModal({ job, planner, folderResult, onClose, onNavigate }) {
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
        } else if (sel.endsWith('.xlsx') || sel.endsWith('.ai')) {
          await downloadRawTemplate(sel)
        }
      } catch (e) {
        failures.push(`${sel}: ${e.message}`)
      }
    }
    setGenerating(false)
    if (failures.length) setError('Some documents failed:\n' + failures.join('\n'))
    else setDone(true)
  }

  const renderRow = (item) => (
    <button key={item.file} onClick={() => toggle(item.file)}
      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors mb-1 ${selected.has(item.file) ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.has(item.file) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
          {selected.has(item.file) && <span className="text-white text-xs leading-none">✓</span>}
        </div>
        {item.label}
      </div>
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">Job created ✓</div>
          <div className="text-xs text-gray-500 mt-0.5">{jobTitle(job)} · Generate documents now?</div>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          <FolderResultNote result={folderResult} />
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stage 1</div>
          {STAGE1_TEMPLATES.map(group => (
            <div key={group.group} className="mb-3">
              <div className="text-xs font-medium text-gray-600 mb-1">{group.group}</div>
              {group.items.map(renderRow)}
            </div>
          ))}

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">Stage 2</div>
          {STAGE2_TEMPLATES.map(group => (
            <div key={group.group} className="mb-3">
              <div className="text-xs font-medium text-gray-600 mb-1">{group.group}</div>
              {group.items.map(renderRow)}
            </div>
          ))}

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">Stage 3</div>
          {STAGE3_TEMPLATES.map(group => (
            <div key={group.group} className="mb-3">
              <div className="text-xs font-medium text-gray-600 mb-1">{group.group}</div>
              {group.items.map(renderRow)}
            </div>
          ))}

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">Miscellaneous</div>
          {MISC_TEMPLATES.map(group => (
            <div key={group.group} className="mb-3">
              {group.items.map(renderRow)}
            </div>
          ))}

          {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 whitespace-pre-line">{error}</div>}
          {done && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
              ✓ {selected.size} document{selected.size !== 1 ? 's' : ''} downloaded. Check your downloads folder.
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={() => { onClose(); onNavigate('jobs') }} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Skip and go to jobs</button>
          <button onClick={done ? () => { onClose(); onNavigate('jobs') } : handleGenerate}
            disabled={generating || (!done && selected.size === 0)}
            className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
            {generating ? 'Generating...' : done ? 'Done, go to jobs' : `Generate ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// How the OneDrive folder step went, shown on the "Job created" dialog
function FolderResultNote({ result }) {
  if (!result || result.state === 'none') return null
  if (result.state === 'error') {
    return (
      <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
        The job was saved, but its OneDrive folder could not be set up: {result.message}. Link a folder from the job's Documents tab.
      </div>
    )
  }
  const lead = result.state === 'created' ? 'OneDrive folder created'
    : result.state === 'existing' ? 'A folder with this name already existed, so it was linked'
    : 'OneDrive folder linked'
  return (
    <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800">
      {lead}: <span className="font-medium">{result.path}</span>
      {result.url && <> · <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline">Open</a></>}
    </div>
  )
}

export default function NewJob({ onNavigate, currentUser }) {
  const [clientType, setClientType] = useState('individual') // 'individual' | 'company'
  const [form, setForm] = useState({
    company: '', firstName: '', lastName: '', email: '', phone: '',
    appType: 'MCU',
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
  const [folderResult, setFolderResult] = useState(null)
  const [showDocModal, setShowDocModal] = useState(false)
  const [currentPlanner, setCurrentPlanner] = useState(null)

  // Microsoft 365: is it connected, and where do new job folders go?
  const [ms, setMs] = useState({ loading: true, connected: false, jobsFolder: null })
  const [folderMode, setFolderMode] = useState('none') // 'create' | 'existing' | 'none'
  const [pickedFolder, setPickedFolder] = useState(null)
  const [picker, setPicker] = useState(null) // 'existing' | 'root' | null
  const [savingRoot, setSavingRoot] = useState(false)

  const isDirector = currentUser?.role === 'director'
  const isCompany = clientType === 'company'

  useEffect(() => {
    const fetchStaff = async () => {
      if (!currentUser?.company_id) return
      const { data: profiles } = await supabase.from('planner_profiles').select('full_name, user_id, hourly_rate').eq('company_id', currentUser.company_id)
      const { data: users } = await supabase.from('app_users').select('id, username, role').eq('company_id', currentUser.company_id).eq('is_approved', true).order('username', { ascending: true })
      if (users) {
        // Planners are always stored by username so Dashboard, Workload and time logs all match.
        const merged = users.map(u => {
          const profile = profiles?.find(p => p.user_id === u.id)
          return { ...u, displayName: u.username, hourlyRate: profile?.hourly_rate || null }
        })
        setStaffList(merged)
        const me = merged.find(s => s.id === currentUser.id)
        if (me) setSelectedPlanners([me.displayName])
      }
    }
    fetchStaff()
  }, [currentUser])

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

  useEffect(() => {
    const loadMs = async () => {
      if (!currentUser?.company_id) { setMs({ loading: false, connected: false, jobsFolder: null }); return }
      try {
        const data = await callGraph('status', { company_id: currentUser.company_id })
        setMs({ loading: false, connected: !!data.connected, jobsFolder: data.jobsFolder || null })
        // Default: create the folder automatically when the firm's jobs folder is set
        if (data.connected && data.jobsFolder) setFolderMode('create')
      } catch {
        setMs({ loading: false, connected: false, jobsFolder: null })
      }
    }
    loadMs()
  }, [currentUser])

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const togglePlanner = (name) => setSelectedPlanners(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name])

  // Sequential job code: YYYY-001, YYYY-002 ... (next number after the highest existing one this year)
  const generateJobCode = async () => {
    const year = new Date().getFullYear()
    const { data } = await supabase.from('jobs').select('code').like('code', `${year}-%`)
    let max = 0
    for (const row of data || []) {
      const n = parseInt(String(row.code).split('-')[1], 10)
      if (!isNaN(n) && n > max) max = n
    }
    return `${year}-${String(max + 1).padStart(3, '0')}`
  }

  // Director: choose the folder that new job folders are created in (saved once for the firm)
  const handlePickRoot = async (folder) => {
    setSavingRoot(true)
    try {
      const res = await callGraph('set_jobs_folder', {
        company_id: currentUser.company_id,
        drive_id: folder.driveId || null,
        folder_id: folder.folderId || null,
        name: folder.name,
        path: [folder.driveName && folder.driveName !== 'OneDrive' ? folder.driveName : '', folder.path].filter(Boolean).join(' / ') || folder.name,
        web_url: folder.webUrl || null,
        username: currentUser.username,
      })
      if (res.success) {
        setMs(prev => ({ ...prev, jobsFolder: res.jobsFolder }))
        setFolderMode('create')
        setPicker(null)
      } else {
        alert('Could not save the jobs folder: ' + (res.error || 'Unknown error'))
      }
    } catch (e) {
      alert('Could not save the jobs folder: ' + e.message)
    }
    setSavingRoot(false)
  }

  const handlePickExisting = (folder) => {
    setPickedFolder(folder)
    setFolderMode('existing')
    setPicker(null)
  }

  const buildJobRow = (code, leadPlanner, plannerRate) => {
    const row = {
      code,
      company_id: currentUser?.company_id || null,
      address: form.address.trim(), lot_reference: form.lot,
      client_type: clientType,
      client_company: isCompany ? form.company.trim() : null,
      client_first_name: form.firstName.trim(), client_last_name: form.lastName.trim() || null,
      client_email: form.email.trim() || null, client_phone: form.phone.trim() || null,
      council: form.council, zone: form.zone,
      app_type: form.appType,
      assessment_level: form.assessment,
      proposed_use: form.proposedUse, referral_agencies: form.referrals,
      planner: leadPlanner, planners: selectedPlanners,
      planner_rate: plannerRate, budget_hours: parseFloat(form.budget) || 0,
      status: 'Draft', complexity: form.complexity,
      lodgement_date: form.lodgement || null,
      decision_due_date: form.decisionDue || null,
    }
    // Naming format: [Client Name] - [Address] [Job Number]
    row.name = buildJobName(row)
    return row
  }

  // Create or link the job's OneDrive folder straight after the job is saved
  const setUpFolder = async (job) => {
    const stamp = { onedrive_linked_by: currentUser?.username || null, onedrive_linked_at: new Date().toISOString() }
    const save = async (link, state) => {
      const text = state === 'created' ? `OneDrive folder created: ${link.onedrive_folder_path}` : `OneDrive folder linked: ${link.onedrive_folder_path}`
      const history = [{ text, time: new Date().toISOString() }, { text: 'Job created', time: job.created_at || new Date().toISOString() }]
      const { error: linkError } = await supabase.from('jobs').update({ ...link, ...stamp, job_history: history }).eq('id', job.id)
      if (linkError) return { state: 'error', message: linkError.message }
      return { state, path: link.onedrive_folder_path, url: link.onedrive_folder_url }
    }

    if (folderMode === 'create' && ms.jobsFolder) {
      try {
        const res = await callGraph('create_folder', { company_id: currentUser.company_id, name: oneDriveFolderName(job) })
        if (!res.success || !res.item) return { state: 'error', message: res.error || 'Microsoft 365 did not create the folder' }
        return await save({
          onedrive_drive_id: res.item.driveId || ms.jobsFolder.driveId || null,
          onedrive_folder_id: res.item.id,
          onedrive_folder_name: res.item.name,
          onedrive_folder_path: res.item.path || [ms.jobsFolder.path, res.item.name].filter(Boolean).join('/'),
          onedrive_folder_url: res.item.webUrl || null,
        }, res.existed ? 'existing' : 'created')
      } catch (e) {
        return { state: 'error', message: e.message }
      }
    }

    if (folderMode === 'existing' && pickedFolder) {
      return await save({
        onedrive_drive_id: pickedFolder.driveId || null,
        onedrive_folder_id: pickedFolder.folderId || null,
        onedrive_folder_name: pickedFolder.name || 'Job folder',
        onedrive_folder_path: pickedFolder.path || pickedFolder.name || '',
        onedrive_folder_url: pickedFolder.webUrl || null,
      }, 'linked')
    }

    return { state: 'none' }
  }

  const handleSubmit = async () => {
    const firstName = form.firstName.trim()
    if (isCompany && !form.company.trim()) { setError('Please enter the company name.'); return }
    if (isCompany && !firstName) { setError('Please enter the contact person for this company.'); return }
    if (!isCompany && !firstName) { setError('Please enter the client name.'); return }
    if (!form.address.trim()) { setError('Please enter the site address.'); return }
    if (selectedPlanners.length === 0) { setError('Please select at least one planner.'); return }
    if (folderMode === 'existing' && !pickedFolder) { setError('Choose the existing folder to link, or pick a different folder option.'); return }
    setError(null)
    setSaving(true)
    const leadPlanner = selectedPlanners[0]
    const leadProfile = staffList.find(s => s.username === leadPlanner)
    const plannerRate = leadProfile?.hourlyRate || 150

    let code = await generateJobCode()
    let attempts = 0
    let dbError = null
    let saved = null
    // Retry if two planners create a job at the same moment and the code is taken
    while (attempts < 3) {
      const res = await supabase.from('jobs').insert(buildJobRow(code, leadPlanner, plannerRate)).select().single()
      dbError = res.error
      if (!dbError) { saved = res.data; break }
      if (dbError.code === '23505') { code = await generateJobCode(); attempts++; continue }
      break
    }

    if (dbError || !saved) {
      setSaving(false)
      setError('Error saving job: ' + (dbError?.message || 'Unknown error'))
      return
    }

    const folder = await setUpFolder(saved)
    setSaving(false)
    setFolderResult(folder)
    setCreatedJob(saved)
    setShowDocModal(true)
  }

  // Preview of the folder / job name while the form is being filled in
  const previewName = oneDriveFolderName({
    client_type: clientType, client_company: form.company,
    client_first_name: form.firstName, client_last_name: form.lastName,
    address: form.address, code: '[job number]',
  })
  const hasPreview = !!(form.address.trim() || form.firstName.trim() || form.company.trim())

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400'
  const optionClass = (active, disabled) => `w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${disabled ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' : active ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`

  return (
    <div className="max-w-3xl">
      {showDocModal && createdJob && (
        <DocGenerateModal job={createdJob} planner={currentPlanner} folderResult={folderResult} onClose={() => setShowDocModal(false)} onNavigate={onNavigate} />
      )}
      {picker === 'existing' && (
        <OneDriveFolderPicker currentUser={currentUser} onPick={handlePickExisting} onClose={() => setPicker(null)}
          title="Link an existing folder"
          subtitle={'Browse to this job\'s folder, then click "Use this folder".'} />
      )}
      {picker === 'root' && (
        <OneDriveFolderPicker currentUser={currentUser} onPick={handlePickRoot} onClose={() => setPicker(null)}
          title="Where should new job folders be created?"
          subtitle={'Browse to the folder that holds all job folders, then click "Use this folder". This is set once for the whole firm.'} />
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold mb-5">Create new job</h2>
        {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-4">{error}</div>}

        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client details</div>
          <div className="flex items-center gap-2">
            <label htmlFor="client-type" className="text-xs text-gray-600">Client is</label>
            <select id="client-type" value={clientType} onChange={e => setClientType(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400 font-medium">
              <option value="individual">An individual</option>
              <option value="company">A company</option>
            </select>
          </div>
        </div>

        {isCompany && (
          <div className="mb-3">
            <label className="text-xs text-gray-600 mb-1 block">Company name</label>
            <input value={form.company} onChange={e => update('company', e.target.value)} placeholder="Company name" className={inputClass} />
          </div>
        )}
        {isCompany && <div className="text-xs font-medium text-gray-600 mb-2">Contact person</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-600 mb-1 block">{isCompany ? 'Contact first name' : 'First name'}</label>
            <input value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="First name" className={inputClass} /></div>
          <div><label className="text-xs text-gray-600 mb-1 block">{isCompany ? 'Contact last name' : 'Last name'}</label>
            <input value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Last name" className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div><label className="text-xs text-gray-600 mb-1 block">{isCompany ? 'Contact email' : 'Email'}</label>
            <input value={form.email} onChange={e => update('email', e.target.value)} placeholder="client@email.com.au" className={inputClass} /></div>
          <div><label className="text-xs text-gray-600 mb-1 block">{isCompany ? 'Contact phone' : 'Phone'}</label>
            <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="04XX XXX XXX" className={inputClass} /></div>
        </div>

        <div className="border-t border-gray-100 mb-5" />
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Application details</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-600 mb-1 block">Application type</label>
            <select value={form.appType} onChange={e => update('appType', e.target.value)} className={inputClass}>
              {APP_TYPES.map(t => <option key={t.code} value={t.code}>{t.code} · {t.label}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-600 mb-1 block">Assessment level</label>
            <select value={form.assessment} onChange={e => update('assessment', e.target.value)} className={inputClass}>
              <option>Code Assessable</option><option>Impact Assessable</option><option>Accepted Development</option><option>Exempt</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-600 mb-1 block">Site address</label>
            <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="12 Marine Parade, Southport QLD 4215" className={inputClass} /></div>
          <div><label className="text-xs text-gray-600 mb-1 block">Lot / RP reference</label>
            <input value={form.lot} onChange={e => update('lot', e.target.value)} placeholder="Lot 7 SP123456" className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-600 mb-1 block">Council / LGA</label>
            <select value={form.council} onChange={e => update('council', e.target.value)} className={inputClass}>
              {COUNCILS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-600 mb-1 block">Planning zone</label>
            <input value={form.zone} onChange={e => update('zone', e.target.value)} placeholder="Medium Density Residential" className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-600 mb-1 block">Proposed use</label>
            <input value={form.proposedUse} onChange={e => update('proposedUse', e.target.value)} placeholder="Mixed-use: retail GF + 12 units" className={inputClass} /></div>
          <div><label className="text-xs text-gray-600 mb-1 block">Referral agencies</label>
            <input value={form.referrals} onChange={e => update('referrals', e.target.value)} placeholder="SARA, Energex..." className={inputClass} /></div>
        </div>

        <div className="mb-5">
          <label className="text-xs text-gray-600 mb-2 block">Job complexity</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMPLEXITY_OPTIONS.map(opt => {
              const isSelected = form.complexity === opt.value
              return (
                <button key={opt.value} type="button" onClick={() => update('complexity', opt.value)}
                  className={`px-3 py-2.5 rounded-lg border text-left transition-all ${isSelected ? opt.activeColor + ' border-2' : opt.color + ' hover:opacity-80'}`}>
                  <div className="text-xs font-semibold">{opt.value}</div>
                  <div className="text-xs opacity-75 mt-0.5 leading-tight">{opt.label.split(':')[1].trim()}</div>
                </button>
              )
            })}
          </div>
          {form.complexity && (
            <div className="text-xs text-gray-500 mt-1.5">
              {COMPLEXITY_OPTIONS.find(o => o.value === form.complexity)?.description}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 mb-5" />
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Assign & budget</div>

        <div className="mb-3">
          <label className="text-xs text-gray-600 mb-2 block">
            Assigned planners <span className="text-gray-500 font-normal">(select all who will work on this job. First selected is lead)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {staffList.map(s => (
              <button key={s.id} type="button" onClick={() => togglePlanner(s.displayName)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  selectedPlanners.includes(s.displayName)
                    ? 'bg-emerald-600 text-white border-emerald-600 font-medium'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {selectedPlanners.includes(s.displayName) && selectedPlanners[0] === s.displayName && '★ '}
                {s.displayName}
                {s.role === 'director' ? ' (Director)' : ''}
              </button>
            ))}
          </div>
          {selectedPlanners.length > 0 && (
            <div className="text-xs text-gray-500 mt-1.5">
              Lead: <span className="font-medium text-gray-600">{selectedPlanners[0]}</span>
              {selectedPlanners.length > 1 && ` · Also assigned: ${selectedPlanners.slice(1).join(', ')}`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div><label className="text-xs text-gray-600 mb-1 block">Budget (hours)</label>
            <input type="number" value={form.budget} onChange={e => update('budget', e.target.value)} placeholder="60" className={inputClass} /></div>
          <div><label className="text-xs text-gray-600 mb-1 block">Lodgement date</label>
            <input type="date" value={form.lodgement} onChange={e => update('lodgement', e.target.value)} className={inputClass} /></div>
          <div><label className="text-xs text-gray-600 mb-1 block">Decision due date</label>
            <input type="date" value={form.decisionDue} onChange={e => update('decisionDue', e.target.value)} className={inputClass} /></div>
        </div>

        <div className="border-t border-gray-100 mb-5" />
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Job folder · Microsoft 365</div>
        {ms.loading ? (
          <div className="text-xs text-gray-500 mb-5">Checking Microsoft 365...</div>
        ) : !ms.connected ? (
          <div className="text-xs text-gray-500 mb-5">
            Microsoft 365 is not connected, so no folder will be created. {isDirector ? 'Connect it from the Documents page.' : 'Ask a director to connect it from the Documents page.'} A folder can still be linked later from the job's Documents tab.
          </div>
        ) : (
          <div className="mb-5">
            <div className="text-xs text-gray-500 mb-3">
              The job is named <span className="font-medium text-gray-600">{hasPreview ? previewName : '[Client Name] - [Address] [job number]'}</span>. Its folder gets the same name.
            </div>
            <div className="space-y-2">
              <button type="button" disabled={!ms.jobsFolder} onClick={() => ms.jobsFolder && setFolderMode('create')} className={optionClass(folderMode === 'create', !ms.jobsFolder)}>
                <div className="text-xs font-semibold text-gray-700">{folderMode === 'create' ? '● ' : '○ '}Create a new folder for this job</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {ms.jobsFolder
                    ? <>Created automatically inside <span className="font-medium">{ms.jobsFolder.path || ms.jobsFolder.name}</span> when you save.</>
                    : isDirector
                      ? 'First tell QPlan which folder holds your job folders (one-off, below).'
                      : 'A director needs to set the firm\'s jobs folder first (one-off).'}
                </div>
              </button>
              <button type="button" onClick={() => { if (pickedFolder) setFolderMode('existing'); else setPicker('existing') }} className={optionClass(folderMode === 'existing', false)}>
                <div className="text-xs font-semibold text-gray-700">{folderMode === 'existing' ? '● ' : '○ '}Link a folder that already exists</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {pickedFolder
                    ? <>Linked to <span className="font-medium">{pickedFolder.path || pickedFolder.name}</span>.</>
                    : 'For a job whose folder is already in OneDrive or SharePoint.'}
                </div>
              </button>
              <button type="button" onClick={() => setFolderMode('none')} className={optionClass(folderMode === 'none', false)}>
                <div className="text-xs font-semibold text-gray-700">{folderMode === 'none' ? '● ' : '○ '}No folder for now</div>
                <div className="text-xs text-gray-600 mt-0.5">Link one later from the job's Documents tab.</div>
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {pickedFolder && (
                <button type="button" onClick={() => setPicker('existing')} className="text-xs text-emerald-600 hover:underline">Choose a different existing folder</button>
              )}
              {isDirector && (
                <button type="button" disabled={savingRoot} onClick={() => setPicker('root')} className="text-xs text-emerald-600 hover:underline disabled:opacity-50">
                  {savingRoot ? 'Saving...' : ms.jobsFolder ? 'Change where new job folders are created' : 'Set where new job folders are created'}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 mb-5" />
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Documents available to generate</div>
        <div className="text-xs text-gray-500 mb-3">After creating the job you'll be prompted to generate fee proposals, consents, planning reports, IR responses, public notices and more, all pre-filled with job and planner details.</div>
        <div className="flex flex-wrap gap-2 mb-6">
          {[...STAGE1_TEMPLATES, ...STAGE2_TEMPLATES, ...STAGE3_TEMPLATES, ...MISC_TEMPLATES].flatMap(g => g.items).map(t => (
            <span key={t.file} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200">{t.label}</span>
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
