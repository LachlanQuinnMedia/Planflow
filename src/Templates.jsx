import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { generateFromTemplate } from './templateFiller'
import { jobTitle } from './jobMeta'
import { useFirm, saveFirm, newTemplatePath, templateFileName } from './firm'

// The tags a Word template can use. QPlan swaps each one for the job's or the planner's details.
// A tag QPlan has nothing for is left in the document, so it can be typed over.
const TEMPLATE_TAGS = [
  ['{date}', "Today's date"], ['{month_year}', 'Month and year'], ['{year}', 'Year'],
  ['{job_ref}', 'Job number'], ['{site_address}', 'Site address'], ['{lot_reference}', 'Lot / RP'],
  ['{council}', 'Council'], ['{app_type}', 'Application type (short)'], ['{app_type_name}', 'Application type (full)'],
  ['{proposed_use}', 'Proposed use'], ['{client_name}', 'Client (the company, for a company client)'],
  ['{client_company}', 'Client company'], ['{contact_name}', 'Contact person'], ['{client_first_name}', 'Contact first name'],
  ['{client_email}', 'Client email'], ['{client_phone}', 'Client phone'],
  ['{planner_name}', 'Your name'], ['{planner_position}', 'Your position'], ['{planner_email}', 'Your email'],
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
  link.download = templateFileName(filename)
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
        .select('id, code, name, client_type, client_company, client_first_name, client_last_name, app_type, address, status')
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
          <div className="text-xs text-gray-500 mt-0.5">
            {docxCount > 0 && `${docxCount} Word doc${docxCount !== 1 ? 's' : ''}`}
            {docxCount > 0 && rawCount > 0 && ' + '}
            {rawCount > 0 && `${rawCount} raw file${rawCount !== 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">
            Job to fill from <span className="text-gray-500 font-normal">(optional)</span>
          </label>

          {loadingJobs ? (
            <div className="text-xs text-gray-500 py-2">Loading jobs...</div>
          ) : (
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
            >
              <option value="">No job (planner details only)</option>
              {jobs.map(j => {
                return <option key={j.id} value={j.id}>{jobTitle(j) || 'Untitled'}</option>
              })}
            </select>
          )}

          <div className="text-xs text-gray-500 mt-2 mb-4">
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
              ✓ {items.length} document{items.length !== 1 ? 's' : ''} downloaded. Check your downloads folder.
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
            <div className="text-xs text-gray-500 mt-0.5">Fills <span className="font-mono">{'{planner_name}'}</span>, <span className="font-mono">{'{planner_position}'}</span> and <span className="font-mono">{'{planner_email}'}</span> in your generated documents.</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {!currentUser?.id && <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg">Not signed in. Open this page from inside the app.</div>}
          {loading ? <div className="text-xs text-gray-500">Loading...</div> : (
            <>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Full name</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Position</label>
                <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="Senior Urban Planner" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Email</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@yourfirm.com.au" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
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

// Directors add their firm's own templates here. The file is kept in the firm's own folder.
function AddTemplateModal({ currentUser, firm, onClose }) {
  const stageNames = [...firm.stages.map(s => s.shortLabel), 'Miscellaneous']
  const [file, setFile] = useState(null)
  const [label, setLabel] = useState('')
  const [stage, setStage] = useState(stageNames[0])
  const [group, setGroup] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showTags, setShowTags] = useState(false)
  const groupsHere = (firm.templates.find(c => c.stage === stage)?.groups || []).map(g => g.name)

  const pick = (f) => {
    setFile(f || null); setError('')
    if (f && !label.trim()) setLabel(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim())
  }

  const save = async () => {
    if (!file) { setError('Choose a file first.'); return }
    if (!label.trim()) { setError('Give the template a name.'); return }
    if (file.size > 15 * 1024 * 1024) { setError('That file is over 15 MB. Templates should be much smaller.'); return }
    setSaving(true); setError('')
    const path = newTemplatePath(currentUser.company_id, file.name)
    const { error: uploadError } = await supabase.storage.from('templates').upload(path, file, { upsert: false })
    if (uploadError) { setSaving(false); setError('Could not upload the file: ' + uploadError.message); return }
    // Add it to the firm's list, under the stage and group chosen
    const list = (firm.raw?.templates || []).map(c => ({ ...c, groups: (c.groups || []).map(g => ({ ...g, items: [...(g.items || [])] })) }))
    const groupName = group.trim() || 'General'
    let cat = list.find(c => c.stage === stage)
    if (!cat) {
      cat = { stage, groups: [] }
      // keep stages in the firm's order, with Miscellaneous last
      const order = (name) => { const i = stageNames.indexOf(name); return i < 0 ? stageNames.length : i }
      list.push(cat); list.sort((a, b) => order(a.stage) - order(b.stage))
    }
    let grp = cat.groups.find(g => g.name === groupName)
    if (!grp) { grp = { name: groupName, items: [] }; cat.groups.push(grp) }
    grp.items.push({ file: path, label: label.trim() })
    try {
      await saveFirm(currentUser.company_id, { templates: list }, currentUser.username)
      await firm.reload()
      onClose(true)
    } catch (e) {
      await supabase.storage.from('templates').remove([path])
      setSaving(false); setError('Could not save the template: ' + e.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">Add a template</div>
          <div className="text-xs text-gray-500 mt-0.5">A Word document your firm uses again and again. Only your firm can see it.</div>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">File</label>
            <input type="file" data-testid="template-file" accept=".docx,.xlsx,.xls,.pdf,.ai,.doc" onChange={e => pick(e.target.files?.[0])}
              className="block w-full text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:text-xs file:rounded-lg file:border file:border-gray-200 file:bg-white file:text-gray-700 hover:file:bg-gray-50" />
            <div className="text-xs text-gray-500 mt-1">Word files (.docx) are filled in from the job. Other files download as they are.</div>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Name</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Fee proposal" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Stage</label>
              <select value={stage} onChange={e => setStage(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white">
                {stageNames.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Group <span className="text-gray-500">(optional)</span></label>
              <input value={group} onChange={e => setGroup(e.target.value)} list="qp-template-groups" placeholder="Letters" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <datalist id="qp-template-groups">{groupsHere.map(g => <option key={g} value={g} />)}</datalist>
            </div>
          </div>
          <button type="button" onClick={() => setShowTags(v => !v)} className="text-xs text-emerald-600 hover:underline">{showTags ? 'Hide' : 'Show'} the tags QPlan can fill in</button>
          {showTags && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-2">Type a tag anywhere in the Word document, curly brackets included. QPlan swaps it for the real thing when the document is generated.</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                {TEMPLATE_TAGS.map(([tag, what]) => (
                  <div key={tag} className="text-xs flex gap-2"><span className="font-mono text-gray-800">{tag}</span><span className="text-gray-500 truncate">{what}</span></div>
                ))}
              </div>
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={() => onClose(false)} disabled={saving} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">{saving ? 'Adding...' : 'Add template'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Templates({ currentUser }) {
  const firm = useFirm()
  const isDirector = currentUser?.role === 'director'
  const [showAdd, setShowAdd] = useState(false)
  const [managing, setManaging] = useState(false)
  const [removing, setRemoving] = useState('')
  const [notice, setNotice] = useState('')
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

  // Take a template off the firm's list. A file the firm uploaded itself is deleted too.
  const removeTemplate = async (item) => {
    if (!window.confirm(`Remove "${item.label}" from your templates?`)) return
    setRemoving(item.file); setNotice('')
    const list = (firm.raw?.templates || [])
      .map(c => ({ ...c, groups: (c.groups || []).map(g => ({ ...g, items: (g.items || []).filter(i => i.file !== item.file) })).filter(g => g.items.length > 0) }))
      .filter(c => c.groups.length > 0)
    try {
      await saveFirm(currentUser.company_id, { templates: list }, currentUser.username)
      if (item.file.includes('/')) await supabase.storage.from('templates').remove([item.file])
      setSelected(prev => { const next = new Set(prev); next.delete(item.file); return next })
      await firm.reload()
    } catch (e) {
      setNotice('Could not remove it: ' + e.message)
    }
    setRemoving('')
  }

  const selectedItems = []
  for (const cat of firm.templates) {
    for (const group of cat.groups) {
      for (const item of group.items) {
        if (selected.has(item.file)) selectedItems.push(item)
      }
    }
  }

  return (
    <div>
      {showAdd && <AddTemplateModal currentUser={currentUser} firm={firm} onClose={(added) => { setShowAdd(false); if (added) setNotice('Template added.') }} />}
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

      <div data-tour="templates-top" className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between mb-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex-1">
          <div className="text-xs font-medium text-emerald-700 mb-0.5">Generate documents</div>
          <div className="text-xs text-emerald-600">Tick the templates you want, then click <span className="font-medium">Generate</span> at the top. A modal lets you pick a job to auto-fill, or skip the job and just fill your planner details. Excel and Illustrator files download blank.</div>
        </div>
        <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0 [&>button]:flex-1">
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

      {isDirector && (
        <div data-testid="templates-manage" className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 text-xs border border-gray-200 bg-white rounded-lg hover:bg-gray-50 font-medium">+ Add a template</button>
          {firm.templates.length > 0 && (
            <button onClick={() => setManaging(m => !m)} className="px-3 py-1.5 text-xs border border-gray-200 bg-white rounded-lg hover:bg-gray-50">{managing ? 'Done removing' : 'Remove templates'}</button>
          )}
          <span className="text-xs text-gray-500">Templates belong to your firm. Only your firm sees them.</span>
        </div>
      )}
      {notice && <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">{notice}</div>}
      {firm.templates.length === 0 && (
        <div data-testid="templates-empty" className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="text-sm font-medium mb-1">No templates yet</div>
          <div className="text-xs text-gray-500">
            {isDirector
              ? 'Add the Word documents your firm sends again and again. QPlan fills in the client, the site and the planner for you.'
              : 'A director can add your firm\'s templates here.'}
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-3">
          <div className="text-xs font-medium text-emerald-700 flex-1">
            <span className="font-semibold">{selected.size}</span> template{selected.size !== 1 ? 's' : ''} selected
          </div>
          <button onClick={clearSelection} className="text-xs text-gray-600 hover:text-gray-800 hover:underline">Clear selection</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {firm.templates.map(cat => {
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
                <span className="text-xs text-gray-500">{totalItems} template{totalItems !== 1 ? 's' : ''}</span>
              </div>

              {cat.groups.map(group => (
                <div key={group.name} className="mb-3 last:mb-0">
                  <div className="text-xs font-semibold text-gray-600 mb-1.5">{group.name}</div>
                  {group.items.length === 0 ? (
                    <div className="text-xs text-gray-500 italic px-1 py-1">No templates uploaded yet.</div>
                  ) : (
                    group.items.map(item => {
                      const ext = fileExt(item.file)
                      const icon = fileIcon(ext)
                      const isSelected = selected.has(item.file)
                      if (managing) return (
                        <div key={item.file} className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg">
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 ${icon.bg}`}>{icon.label}</div>
                          <div className="flex-1 min-w-0 text-xs font-medium truncate">{item.label}</div>
                          <button onClick={() => removeTemplate(item)} disabled={removing === item.file}
                            className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 flex-shrink-0">{removing === item.file ? 'Removing...' : 'Remove'}</button>
                        </div>
                      )
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
                            <div className="text-xs text-gray-500 truncate">{templateFileName(item.file)}</div>
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