// src/ImportJobs.jsx
// Bring a firm's old jobs into QPlan in one go. Directors only.
//
// Two ways in, and neither needs anything filled in by hand:
//   1. Job folders: read the names of the firm's job folders in Microsoft 365. Each folder
//      becomes a job, already linked to its folder, so its documents are one click away.
//   2. A file: any Excel or CSV export from the firm's old system. QPlan works out which
//      column is which.
// Either way there is a preview first, jobs already in QPlan are skipped, and an import can
// be undone as one. Old jobs come in as Complete, which keeps them out of the everyday lists
// (see jobsQuery.js). They are found by searching.
import { useState, useEffect, useRef } from 'react'
import { supabase, callFunction } from './supabase'
import { callGraph, OneDriveFolderPicker } from './OneDriveBrowser'
import { parseFolderName, looksLikeYearFolders, parseCsv, splitHeader, guessColumns, draftFromRow, jobFromDraft, IMPORT_FIELDS } from './importParse'

const CHUNK = 200          // jobs saved per request
const MAX_FOLDERS = 20000  // a stop, in case someone points it at the top of a whole drive
const PER_PAGE = 50
const fmt = (n) => Number(n || 0).toLocaleString()
const formatDate = (iso) => { try { return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Brisbane' }).format(new Date(iso)) } catch { return '' } }

// Every job number the firm already has, so nothing is brought in twice
async function existingCodes() {
  const codes = new Set()
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await supabase.from('jobs').select('code').range(from, from + 999)
    if (error || !data) break
    data.forEach(j => codes.add(String(j.code || '').toUpperCase()))
    if (data.length < 1000) break
  }
  return codes
}

// Read every folder inside one folder, a page at a time
async function scanFolder(driveId, folderId, onProgress, stopped) {
  const found = []
  let next = null
  do {
    if (stopped()) break
    const res = await callFunction('job-import', 'scan_folders', next ? { next } : { drive_id: driveId, folder_id: folderId })
    if (!res.success) throw new Error(res.error || 'Microsoft 365 did not answer.')
    found.push(...(res.folders || []))
    onProgress(found.length)
    next = res.next || null
  } while (next && found.length < MAX_FOLDERS)
  return found
}

function Tile({ label, value, tone = 'gray' }) {
  const tones = { gray: 'bg-gray-50 border-gray-200', green: 'bg-emerald-50 border-emerald-200', amber: 'bg-amber-50 border-amber-200' }
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="text-lg font-semibold">{fmt(value)}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  )
}

export default function ImportJobs({ currentUser, onNavigate }) {
  const [step, setStep] = useState('choose')   // choose | scanning | columns | preview | importing | done
  const [source, setSource] = useState(null)   // folders | file
  const [label, setLabel] = useState('')       // the folder or file the jobs came from
  const [ms, setMs] = useState(null)           // the firm's Microsoft 365 connection
  const [picker, setPicker] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState([])     // one per folder or row: { code, client, address, ... }
  const [known, setKnown] = useState(new Set())
  const [sheet, setSheet] = useState(null)     // a file waiting for its columns to be confirmed: { headers, body, map }
  const [status, setStatus] = useState('Complete')
  const [includeUnnumbered, setIncludeUnnumbered] = useState(false)
  const [filter, setFilter] = useState('ready')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [batches, setBatches] = useState([])
  const [undoing, setUndoing] = useState(null)
  const [reloads, setReloads] = useState(0)
  const stopRef = useRef(false)
  const isDirector = currentUser?.role === 'director'
  const companyId = currentUser?.company_id

  useEffect(() => {
    if (!isDirector || !companyId) return
    let cancelled = false
    callGraph('status', { company_id: companyId }).catch(() => ({})).then(res => { if (!cancelled) setMs({ connected: !!res?.connected, jobsFolder: res?.jobsFolder || null }) })
    supabase.from('import_batches').select('*').order('created_at', { ascending: false }).limit(20).then(({ data }) => { if (!cancelled) setBatches(data || []) })
    return () => { cancelled = true }
  }, [isDirector, companyId, reloads])

  if (!isDirector) return <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">Importing jobs is for directors.</div>

  const reset = () => { setStep('choose'); setSource(null); setDrafts([]); setSheet(null); setError(''); setProgress(''); setResult(null); setPage(0); setFilter('ready'); setReloads(n => n + 1) }

  const toPreview = async (list, from, what) => {
    setProgress('Checking which jobs are already in QPlan...')
    setKnown(await existingCodes())
    setDrafts(list.map((d, i) => ({ ...d, key: i })))
    setSource(from); setLabel(what); setPage(0); setFilter('ready'); setStep('preview'); setProgress('')
  }

  // ---------- 1. job folders ----------
  const scan = async (folder) => {
    setPicker(false); setError(''); setStep('scanning'); stopRef.current = false
    const stopped = () => stopRef.current
    try {
      setProgress('Reading your job folders...')
      let folders = await scanFolder(folder.driveId, folder.folderId, n => setProgress(`Reading your job folders... ${fmt(n)} found`), stopped)
      // Grouped by year? Then the jobs are one level down.
      if (!stopped() && looksLikeYearFolders(folders.map(f => f.name))) {
        const years = folders; folders = []
        for (const year of years) {
          if (stopped() || folders.length >= MAX_FOLDERS) break
          const inside = await scanFolder(year.driveId || folder.driveId, year.id, n => setProgress(`Your folders are grouped by year. Reading ${year.name}... ${fmt(folders.length + n)} found`), stopped)
          folders.push(...inside)
        }
      }
      if (stopped()) { reset(); return }
      if (folders.length === 0) { setStep('choose'); setError(`No folders were found inside "${folder.name}". Choose the folder that holds your job folders.`); return }
      await toPreview(folders.map(f => ({ ...parseFolderName(f.name), folder: f, created: f.created, from: f.name })), 'folders', folder.path || folder.name)
    } catch (e) {
      setStep('choose'); setError('Could not read the folders: ' + e.message)
    }
  }

  // ---------- 2. a file ----------
  const readFile = async (file) => {
    if (!file) return
    setError(''); setStep('scanning'); setProgress(`Reading ${file.name}...`)
    try {
      let rows
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser')
        rows = (await readSheet(file)).map(r => r.map(c => (c === null || c === undefined ? '' : c)))
      } else if (/\.xls$/i.test(file.name)) {
        throw new Error('That is an older Excel file (.xls). Open it in Excel and save it as .xlsx or .csv, then choose it again.')
      } else {
        rows = parseCsv(await file.text())
      }
      const { headers, body } = splitHeader(rows)
      if (!headers.length || !body.length) throw new Error('No rows of jobs were found in that file.')
      setSheet({ headers, body, map: guessColumns(headers), name: file.name })
      setStep('columns'); setProgress('')
    } catch (e) {
      setStep('choose'); setProgress(''); setError(e.message || 'That file could not be read.')
    }
  }
  const confirmColumns = async () => {
    if (sheet.map.code === undefined || sheet.map.code === '') { setError('Choose the column that holds the job number.'); return }
    setError(''); setStep('scanning')
    await toPreview(sheet.body.map((row, i) => ({ ...draftFromRow(row, sheet.map), from: `Row ${i + 2}` })).filter(d => d.code || d.client || d.address), 'file', sheet.name)
  }

  // ---------- preview ----------
  const seen = new Set()
  const rows = drafts.map(d => {
    const code = String(d.code || '').toUpperCase()
    let state = 'ready'
    if (!code) state = 'unnumbered'
    else if (known.has(code)) state = 'exists'
    else if (seen.has(code)) state = 'twice'
    if (code) seen.add(code)
    return { ...d, state }
  })
  const counts = { ready: 0, unnumbered: 0, exists: 0, twice: 0 }
  rows.forEach(r => { counts[r.state]++ })
  const willImport = counts.ready + (includeUnnumbered ? counts.unnumbered : 0)
  const shown = rows.filter(r => filter === 'all' || r.state === filter || (filter === 'skipped' && (r.state === 'exists' || r.state === 'twice')))
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE))
  const pageRows = shown.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
  const edit = (key, patch) => setDrafts(prev => prev.map(d => (d.key === key ? { ...d, ...patch } : d)))

  // ---------- import ----------
  const runImport = async () => {
    setError(''); setStep('importing'); setProgress('Starting...')
    const { data: batch, error: batchError } = await supabase.from('import_batches')
      .insert({ company_id: companyId, source, label, created_by: currentUser.username }).select('*').single()
    if (batchError || !batch) { setStep('preview'); setError('Could not start the import: ' + (batchError?.message || 'unknown error')); return }

    // Folders with no job number get one of their own: OLD-0001, OLD-0002 ...
    let made = 0
    const taken = new Set([...known, ...rows.map(r => String(r.code || '').toUpperCase())])
    const nextCode = () => { let c; do { made++; c = `OLD-${String(made).padStart(4, '0')}` } while (taken.has(c)); taken.add(c); return c }
    const now = new Date()
    const jobs = rows.filter(r => r.state === 'ready' || (includeUnnumbered && r.state === 'unnumbered'))
      .map(r => jobFromDraft({ ...r, code: r.code || nextCode() }, { companyId, batchId: batch.id, status, source, username: currentUser.username, now }))

    let saved = 0; const failed = []
    for (let i = 0; i < jobs.length; i += CHUNK) {
      const chunk = jobs.slice(i, i + CHUNK)
      const { error: chunkError } = await supabase.from('jobs').insert(chunk)
      if (!chunkError) saved += chunk.length
      else {
        // One bad row should not sink the other 199: save this lot one at a time
        for (const job of chunk) {
          const { error: rowError } = await supabase.from('jobs').insert(job)
          if (rowError) failed.push({ code: job.code, why: rowError.code === '23505' ? 'That job number is already in QPlan' : rowError.message })
          else saved++
        }
      }
      setProgress(`${fmt(saved)} of ${fmt(jobs.length)} jobs saved`)
    }
    await supabase.from('import_batches').update({ job_count: saved }).eq('id', batch.id)
    setResult({ saved, failed, skipped: rows.length - jobs.length, batchId: batch.id })
    setStep('done'); setProgress('')
  }

  // Take an import back out. A job that has had time or documents put on it since is kept.
  const undo = async (batch) => {
    if (!window.confirm(`Undo this import?\n\n${fmt(batch.job_count)} jobs from "${batch.label || 'the import'}" will be removed from QPlan. Nothing in Microsoft 365 is touched. Any of them with time or documents added since are kept.`)) return
    setUndoing(batch.id); setError('')
    try {
      const ids = []
      for (let from = 0; from < 100000; from += 1000) {
        const { data } = await supabase.from('jobs').select('id').eq('import_batch_id', batch.id).range(from, from + 999)
        if (!data || !data.length) break
        ids.push(...data.map(j => j.id)); if (data.length < 1000) break
      }
      let removed = 0, kept = 0
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100)
        const [{ data: logs }, { data: docs }] = await Promise.all([
          supabase.from('time_logs').select('job_id').in('job_id', chunk),
          supabase.from('documents').select('job_id').in('job_id', chunk),
        ])
        const used = new Set([...(logs || []), ...(docs || [])].map(x => x.job_id))
        const free = chunk.filter(id => !used.has(id)); kept += chunk.length - free.length
        if (free.length) { const { error: delError } = await supabase.from('jobs').delete().in('id', free); if (delError) throw new Error(delError.message); removed += free.length }
      }
      await supabase.from('import_batches').update({ undone_at: new Date().toISOString(), job_count: kept }).eq('id', batch.id)
      setError(''); setResult(null); setStep('choose'); setReloads(n => n + 1)
      setProgress(`${fmt(removed)} jobs removed.${kept ? ` ${fmt(kept)} kept because they have time or documents on them.` : ''}`)
    } catch (e) {
      setError('Could not undo the import: ' + e.message)
    }
    setUndoing(null)
  }

  const card = 'bg-white rounded-xl border border-gray-200 p-4'
  const input = 'w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-emerald-400 bg-white'

  return (
    <div data-testid="import-page" className="max-w-5xl">
      {picker && (
        <OneDriveFolderPicker currentUser={currentUser} onPick={scan} onClose={() => setPicker(false)}
          title="Which folder holds your job folders?" subtitle={'Browse to the folder with one folder per job inside it, then click "Use this folder".'} />
      )}
      {error && <div data-testid="import-error" className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>}
      {progress && step === 'choose' && <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">{progress}</div>}

      {step === 'choose' && (
        <>
          <div className="mb-4">
            <div className="text-sm font-semibold">Bring in your old jobs</div>
            <div className="text-xs text-gray-500">Nothing to fill in. QPlan reads what you already have, shows you what it found, and imports it when you say so.</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className={card} data-testid="import-folders">
              <div className="text-sm font-semibold mb-1">From your job folders</div>
              <div className="text-xs text-gray-500 mb-3">Best if you keep a folder for each job in OneDrive or SharePoint. Each folder becomes a job, linked to its folder. QPlan reads the job number, client and address from the folder name. Year folders are handled.</div>
              {ms === null ? <div className="text-xs text-gray-500">Checking Microsoft 365...</div> : !ms.connected ? (
                <>
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">Microsoft 365 is not connected yet.</div>
                  <button onClick={() => onNavigate('microsoft')} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Connect Microsoft 365</button>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ms.jobsFolder?.folderId && (
                    <button onClick={() => scan({ driveId: ms.jobsFolder.driveId, folderId: ms.jobsFolder.folderId, name: ms.jobsFolder.name, path: ms.jobsFolder.path })}
                      className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Read "{ms.jobsFolder.name}"</button>
                  )}
                  <button onClick={() => setPicker(true)} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${ms.jobsFolder?.folderId ? 'border border-gray-200 hover:bg-gray-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                    {ms.jobsFolder?.folderId ? 'Choose another folder' : 'Choose the folder'}
                  </button>
                </div>
              )}
            </div>
            <div className={card} data-testid="import-file">
              <div className="text-sm font-semibold mb-1">From a file</div>
              <div className="text-xs text-gray-500 mb-3">Any Excel or CSV list of jobs, such as an export from your old system. The columns can be in any order with any headings. QPlan matches them up and you check the match.</div>
              <label className="inline-block px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium cursor-pointer">
                Choose a file
                <input type="file" data-testid="import-file-input" accept=".csv,.xlsx,.xls,.txt,.tsv" className="hidden" onChange={e => { readFile(e.target.files?.[0]); e.target.value = '' }} />
              </label>
            </div>
          </div>
          {batches.length > 0 && (
            <div className={card} data-testid="import-history">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Past imports</div>
              {batches.map(b => (
                <div key={b.id} className="flex flex-wrap items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{fmt(b.job_count)} job{b.job_count === 1 ? '' : 's'} from {b.source === 'folders' ? 'job folders' : 'a file'}{b.label ? `: ${b.label}` : ''}</div>
                    <div className="text-xs text-gray-500">{formatDate(b.created_at)} · {b.created_by || 'Unknown'}{b.undone_at ? ' · undone' : ''}</div>
                  </div>
                  {!b.undone_at && <button onClick={() => undo(b)} disabled={!!undoing} className="px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">{undoing === b.id ? 'Undoing...' : 'Undo'}</button>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {(step === 'scanning' || step === 'importing') && (
        <div className={`${card} text-center py-10`} data-testid="import-working">
          <div className="text-sm font-medium mb-1">{step === 'importing' ? 'Importing...' : 'Working...'}</div>
          <div className="text-xs text-gray-500 mb-4">{progress}</div>
          {step === 'scanning' && <button onClick={() => { stopRef.current = true }} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Stop</button>}
          {step === 'importing' && <div className="text-xs text-gray-500">Keep this page open until it finishes.</div>}
        </div>
      )}

      {step === 'columns' && sheet && (
        <div className={card} data-testid="import-columns">
          <div className="text-sm font-semibold mb-1">Check the columns</div>
          <div className="text-xs text-gray-500 mb-3">{sheet.name}: {fmt(sheet.body.length)} rows. QPlan has matched your columns to its own. Change any that are wrong. Leave the rest as "Not in this file".</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {IMPORT_FIELDS.map(f => {
              const at = sheet.map[f.key]
              const sample = at === undefined || at === '' ? '' : String(sheet.body.find(r => String(r[at] ?? '').trim())?.[at] ?? '')
              return (
                <div key={f.key}>
                  <label className="text-xs text-gray-600 mb-1 block">{f.label}{f.need ? ' (needed)' : ''}</label>
                  <select value={at === undefined ? '' : at} data-testid={`col-${f.key}`}
                    onChange={e => setSheet(s => { const map = { ...s.map }; if (e.target.value === '') delete map[f.key]; else map[f.key] = Number(e.target.value); return { ...s, map } })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
                    <option value="">Not in this file</option>
                    {sheet.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                  <div className="text-xs text-gray-500 mt-0.5 truncate h-4">{sample && `e.g. ${sample instanceof Date ? sample.toLocaleDateString('en-AU') : sample}`}</div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Back</button>
            <button onClick={confirmColumns} className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Looks right, show me the jobs</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div data-testid="import-preview">
          <div className="mb-3">
            <div className="text-sm font-semibold">Here is what QPlan found</div>
            <div className="text-xs text-gray-500">From {source === 'folders' ? 'the job folders in' : 'the file'} "{label}". Nothing is saved until you click Import.</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <Tile label="Ready to import" value={counts.ready} tone="green" />
            <Tile label="Already in QPlan (skipped)" value={counts.exists + counts.twice} />
            <Tile label="No job number found" value={counts.unnumbered} tone={counts.unnumbered ? 'amber' : 'gray'} />
            <Tile label={source === 'folders' ? 'Folders read' : 'Rows read'} value={rows.length} />
          </div>
          <div className={`${card} mb-3`}>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Bring them in as</label>
                <select value={status} onChange={e => setStatus(e.target.value)} data-testid="import-status" className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
                  <option value="Complete">Complete (past jobs)</option><option value="Active">Active (current jobs)</option><option value="Draft">Draft</option>
                </select>
              </div>
              <div className="text-xs text-gray-500 flex-1 min-w-[220px]">
                {status === 'Complete' ? 'Past jobs stay out of the everyday lists and the time tracker. Find one by searching, and reopen it by changing its status.' : 'These will show in the everyday lists straight away.'}
                {source === 'file' && ' A row with its own status keeps it.'}
              </div>
              {counts.unnumbered > 0 && (
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={includeUnnumbered} onChange={e => setIncludeUnnumbered(e.target.checked)} data-testid="import-unnumbered" />
                  Also import the {fmt(counts.unnumbered)} with no job number (they get OLD-0001, OLD-0002...)
                </label>
              )}
            </div>
          </div>
          <div className={`${card} mb-3 !p-0 overflow-hidden`}>
            <div className="flex flex-wrap gap-1 px-3 pt-3">
              {[['ready', `Ready (${fmt(counts.ready)})`], ['unnumbered', `No job number (${fmt(counts.unnumbered)})`], ['skipped', `Skipped (${fmt(counts.exists + counts.twice)})`], ['all', `All (${fmt(rows.length)})`]].map(([id, text]) => (
                <button key={id} onClick={() => { setFilter(id); setPage(0) }} className={`px-2.5 py-1 text-xs rounded-lg ${filter === id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>{text}</button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[130px_1fr_1.3fr_1.2fr] gap-2 px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                  <div>Job number</div><div>Client</div><div>Address</div><div>{source === 'folders' ? 'Folder' : 'From'}</div>
                </div>
                {pageRows.length === 0 && <div className="px-3 py-6 text-center text-xs text-gray-500">Nothing here.</div>}
                {pageRows.map(r => (
                  <div key={r.key} data-testid="import-row" data-state={r.state} className="grid grid-cols-[130px_1fr_1.3fr_1.2fr] gap-2 px-3 py-1.5 border-b border-gray-50 items-center">
                    <input value={r.code || ''} onChange={e => edit(r.key, { code: e.target.value.toUpperCase() })} placeholder="None found" className={`${input} font-mono ${r.state === 'exists' || r.state === 'twice' ? 'text-gray-400' : ''}`} />
                    <input value={r.client || ''} onChange={e => edit(r.key, { client: e.target.value })} className={input} />
                    <input value={r.address || ''} onChange={e => edit(r.key, { address: e.target.value })} className={input} />
                    <div className="text-xs text-gray-500 truncate" title={r.from}>
                      {r.state === 'exists' ? <span className="text-gray-600">Already in QPlan · </span> : r.state === 'twice' ? <span className="text-gray-600">Same number as another row · </span> : null}{r.from}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
                <span>Showing {fmt(page * PER_PAGE + 1)} to {fmt(Math.min(shown.length, (page + 1) * PER_PAGE))} of {fmt(shown.length)}</span>
                <span className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 border border-gray-200 rounded-lg disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="px-2 py-1 border border-gray-200 rounded-lg disabled:opacity-40">Next</button>
                </span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mb-3">You can fix a job number, client or address in the list before importing. The rest can be tidied on each job later.</div>
          <div className="flex gap-2">
            <button onClick={reset} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={runImport} disabled={willImport === 0} data-testid="import-go" className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">Import {fmt(willImport)} job{willImport === 1 ? '' : 's'}</button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className={`${card} text-center py-8`} data-testid="import-done">
          <div className="text-base font-semibold mb-1">{fmt(result.saved)} job{result.saved === 1 ? '' : 's'} imported</div>
          <div className="text-xs text-gray-500 mb-4">
            {result.skipped > 0 && `${fmt(result.skipped)} skipped. `}
            {status === 'Complete' ? 'They are kept as past jobs. Search for one on the Jobs page or the Dashboard.' : 'They are on the Jobs page now.'}
          </div>
          {result.failed.length > 0 && (
            <div className="text-left bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mb-4 max-h-40 overflow-y-auto">
              <div className="font-medium mb-1">{fmt(result.failed.length)} could not be saved:</div>
              {result.failed.slice(0, 50).map(f => <div key={f.code}>{f.code}: {f.why}</div>)}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => onNavigate('jobs')} className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Go to Jobs</button>
            <button onClick={reset} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Import more</button>
          </div>
        </div>
      )}
    </div>
  )
}
