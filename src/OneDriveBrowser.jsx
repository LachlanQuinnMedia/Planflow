import { useState, useEffect } from 'react'
import { connectFirmDrive } from './microsoft'

const SUPABASE_URL = 'https://sltaaiumviyzgdsdkkbe.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdGFhaXVtdml5emdkc2Rra2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTYyNTMsImV4cCI6MjA5MDQ5MjI1M30.xqWqvx8vdofj119nXDpasQ8xVD67YJU0RrjTrxycTGo'

// Microsoft scopes requested at connect time. Sites.Read.All lets QPlan list SharePoint
// document libraries as well as OneDrive. Must match SCOPES in supabase/functions/ms-graph.
// Scopes live in src/microsoft.js (MS_FILE_SCOPES)

export async function callGraph(action, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ms-graph?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

// Drive list is the same for everyone in the company, so fetch it once per page load
let drivesCache = { companyId: null, drives: null, sharepointError: null }

async function loadDrives(companyId) {
  if (drivesCache.companyId === companyId && drivesCache.drives) return drivesCache
  const data = await callGraph('drives', { company_id: companyId })
  if (data.success) {
    drivesCache = { companyId, drives: data.drives || [], sharepointError: data.sharepointError || null }
  }
  return drivesCache.companyId === companyId ? drivesCache : { companyId, drives: [], sharepointError: data.error || null }
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(name, isFolder) {
  if (isFolder) return { label: '📁', color: 'bg-amber-50 text-amber-600' }
  const ext = (name.split('.').pop() || '').toLowerCase()
  if (['doc', 'docx'].includes(ext)) return { label: 'W', color: 'bg-blue-100 text-blue-700' }
  if (['xls', 'xlsx'].includes(ext)) return { label: 'X', color: 'bg-green-100 text-green-700' }
  if (['ppt', 'pptx'].includes(ext)) return { label: 'P', color: 'bg-orange-100 text-orange-700' }
  if (ext === 'pdf') return { label: 'PDF', color: 'bg-red-100 text-red-700' }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { label: 'IMG', color: 'bg-purple-100 text-purple-700' }
  return { label: ext.toUpperCase() || 'FILE', color: 'bg-gray-100 text-gray-600' }
}

function isOfficeFile(name) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)
}

function appName(name) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  if (['xls', 'xlsx'].includes(ext)) return 'Excel'
  if (['ppt', 'pptx'].includes(ext)) return 'PowerPoint'
  return 'Word'
}

// Shows a read-only preview of the document inside QPlan, with an Edit button
// that opens the full Word/Excel/PowerPoint Online editor (live co-authoring).
function DocumentModal({ file, companyId, onClose }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | failed

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const data = await callGraph('preview', { company_id: companyId, item_id: file.id, drive_id: file.driveId || null })
      if (cancelled) return
      if (data.success && data.url) { setPreviewUrl(data.url); setState('ready') }
      else setState('failed')
    }
    load()
    return () => { cancelled = true }
  }, [file, companyId])

  const openEditor = () => window.open(file.webUrl, '_blank', 'noopener')
  const icon = fileIcon(file.name, false)
  const app = appName(file.name)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full h-full max-w-6xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 ${icon.color}`}>{icon.label}</div>
            <div className="text-sm font-semibold truncate">{file.name}</div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">Preview</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={openEditor}
              className="px-3 py-1.5 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium"
              title={`Open the full ${app} Online editor with live co-authoring`}>
              ✎ Edit in {app} · live co-authoring
            </button>
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" title="Close">✕ Close</button>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 relative">
          {state === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">Loading preview...</div>
          )}
          {state === 'ready' && (
            <iframe src={previewUrl} title={file.name} className="w-full h-full border-0 bg-white" />
          )}
          {state === 'failed' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold mb-3 ${icon.color}`}>{icon.label}</div>
              <div className="text-sm font-semibold mb-1">Preview not available for this file</div>
              <div className="text-xs text-gray-400 max-w-sm mb-4">You can still open it in {app} Online. Editing and co-authoring work as normal.</div>
              <button onClick={openEditor} className="px-4 py-2 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">
                Open in {app}
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex-shrink-0">
          This is a read-only preview. Click <span className="font-medium">Edit in {app}</span> to open the live document. Multiple planners can edit it at the same time, and changes save straight back to Microsoft 365.
        </div>
      </div>
    </div>
  )
}

function ConnectPrompt({ currentUser, compact }) {
  const isDirector = currentUser?.role === 'director'
  const handleConnect = () => connectFirmDrive(currentUser, 'microsoft')
  return (
    <div className={`bg-white rounded-xl border border-gray-200 text-center ${compact ? 'p-4' : 'p-6'}`}>
      <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center text-white text-lg font-bold mx-auto mb-3">M</div>
      <div className="text-sm font-semibold mb-1">Connect Microsoft 365</div>
      <div className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
        Link your firm's OneDrive or SharePoint so planners can browse, search and co-edit existing documents directly from QPlan. Files stay where they are. Nothing is moved or copied.
      </div>
      {isDirector ? (
        <button onClick={handleConnect} className="px-4 py-2 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">
          Connect Microsoft 365
        </button>
      ) : (
        <div className="text-xs text-gray-400">Ask a director to connect Microsoft 365 from Settings &gt; Microsoft 365.</div>
      )}
    </div>
  )
}

/**
 * OneDriveBrowser
 *
 * Props:
 *  currentUser   required
 *  mode          'browse' (default) or 'pick' (choose a folder, files greyed out)
 *  onPick        pick mode: called with { driveId, driveName, folderId, name, path, webUrl }
 *  root          optional starting folder { driveId, folderId, name, path, webUrl }.
 *                The browser starts inside it and the breadcrumb stops there (used on a job).
 *  compact       smaller chrome for embedding in a tab
 *  title         header label (default "OneDrive")
 */
export default function OneDriveBrowser({ currentUser, mode = 'browse', onPick, root = null, compact = false, title }) {
  const [connected, setConnected] = useState(null)
  const [connectedEmail, setConnectedEmail] = useState('')
  const [drives, setDrives] = useState([])
  const [sharepointError, setSharepointError] = useState(null)
  const [driveId, setDriveId] = useState(root?.driveId || null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [breadcrumb, setBreadcrumb] = useState([])
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [openFile, setOpenFile] = useState(null)
  const isDirector = currentUser?.role === 'director'
  const pickMode = mode === 'pick'
  const companyId = currentUser?.company_id

  useEffect(() => { checkStatus() }, [currentUser, root?.folderId, root?.driveId])

  const rootCrumb = () => {
    if (root) return { id: root.folderId || null, name: root.name || 'Job folder', path: root.path || '', webUrl: root.webUrl || null }
    const d = drives.find(x => x.id === driveId)
    return { id: null, name: d?.name || 'OneDrive', path: '', webUrl: d?.webUrl || null }
  }

  const checkStatus = async () => {
    if (!companyId) return
    const data = await callGraph('status', { company_id: companyId })
    setConnected(!!data.connected)
    setConnectedEmail(data.email || '')
    if (!data.connected) return
    if (!root) {
      const cache = await loadDrives(companyId)
      setDrives(cache.drives || [])
      setSharepointError(cache.sharepointError || null)
    }
    const startDrive = root?.driveId || null
    const startFolder = root?.folderId || null
    setDriveId(startDrive)
    loadFolder(startFolder, [root
      ? { id: startFolder, name: root.name || 'Job folder', path: root.path || '', webUrl: root.webUrl || null }
      : { id: null, name: 'OneDrive', path: '', webUrl: null }], startDrive)
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Microsoft 365? Planners will lose access to OneDrive and SharePoint files in QPlan.')) return
    await callGraph('disconnect', { company_id: companyId })
    drivesCache = { companyId: null, drives: null, sharepointError: null }
    setConnected(false)
    setItems([])
  }

  const loadFolder = async (folderId, newBreadcrumb, overrideDriveId) => {
    setLoading(true)
    setError('')
    setSearching(false)
    setSearch('')
    const useDrive = overrideDriveId !== undefined ? overrideDriveId : driveId
    const data = await callGraph('list', { company_id: companyId, folder_id: folderId, drive_id: useDrive })
    if (data.success) {
      setItems(data.items)
      if (newBreadcrumb) setBreadcrumb(newBreadcrumb)
    } else {
      setError(data.error || 'Could not load files.')
    }
    setLoading(false)
  }

  const switchDrive = (id) => {
    const d = drives.find(x => x.id === id)
    setDriveId(id)
    loadFolder(null, [{ id: null, name: d?.name || 'OneDrive', path: '', webUrl: d?.webUrl || null }], id)
  }

  const enterFolder = (item) => loadFolder(item.id, [...breadcrumb, { id: item.id, name: item.name, path: item.path, webUrl: item.webUrl }])
  const jumpToCrumb = (index) => loadFolder(breadcrumb[index].id, breadcrumb.slice(0, index + 1))

  const handleSearch = async (e) => {
    if (e.key !== 'Enter' || !search.trim()) return
    setLoading(true)
    setError('')
    setSearching(true)
    // On a job, search only inside the linked folder
    const data = await callGraph('search', { company_id: companyId, query: search.trim(), drive_id: driveId, folder_id: root?.folderId || null })
    if (data.success) setItems(data.items)
    else setError(data.error || 'Search failed.')
    setLoading(false)
  }

  const clearSearch = () => {
    setSearching(false)
    setSearch('')
    loadFolder(breadcrumb[breadcrumb.length - 1]?.id ?? null)
  }

  const handleOpen = (item) => {
    if (item.isFolder) { enterFolder(item); return }
    if (pickMode) return
    if (!item.webUrl) return
    if (isOfficeFile(item.name) || item.name.toLowerCase().endsWith('.pdf')) setOpenFile(item)
    else window.open(item.webUrl, '_blank', 'noopener')
  }

  const current = breadcrumb[breadcrumb.length - 1] || rootCrumb()
  const currentDrive = drives.find(x => x.id === driveId)

  const pickCurrent = () => {
    if (!onPick) return
    const defaultDrive = drives.find(x => x.kind === 'onedrive') || drives[0]
    onPick({
      driveId: driveId || currentDrive?.id || defaultDrive?.id || null,
      driveName: currentDrive?.name || defaultDrive?.name || 'OneDrive',
      folderId: current.id || null,
      name: current.name,
      path: current.path || breadcrumb.slice(1).map(c => c.name).join('/'),
      webUrl: current.webUrl || currentDrive?.webUrl || null,
    })
  }

  if (connected === null) {
    return <div className="bg-white rounded-xl border border-gray-200 px-4 py-8 text-center text-xs text-gray-400">Checking Microsoft 365 connection...</div>
  }

  if (!connected) return <ConnectPrompt currentUser={currentUser} compact={compact} />

  return (
    <div>
      {openFile && <DocumentModal file={openFile} companyId={companyId} onClose={() => setOpenFile(null)} />}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {!root && drives.length > 1 && (
          <select value={driveId || drives[0]?.id || ''} onChange={e => switchDrive(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400 max-w-[260px]"
            title="Choose where to look: your OneDrive or a SharePoint document library">
            {drives.map(d => <option key={d.id} value={d.id}>{d.kind === 'sharepoint' ? '🏢 ' : '☁️ '}{d.name}</option>)}
          </select>
        )}
        <input
          type="text"
          placeholder={root ? 'Search this job folder... (press Enter)' : 'Search files... (press Enter)'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400"
        />
        {searching && (
          <button onClick={clearSearch} className="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">✕ Clear search</button>
        )}
        {pickMode && !searching && (
          <button onClick={pickCurrent} className="px-3 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
            ✓ Use this folder
          </button>
        )}
        {isDirector && !compact && !pickMode && (
          <button onClick={handleDisconnect} className="px-3 py-2 text-xs text-red-400 border border-red-100 rounded-lg hover:bg-red-50" title={`Connected as ${connectedEmail}`}>
            Disconnect
          </button>
        )}
      </div>

      {!searching && (
        <div className="flex items-center gap-1 mb-3 text-xs flex-wrap">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300">/</span>}
              <button onClick={() => jumpToCrumb(i)}
                className={`px-1.5 py-0.5 rounded hover:bg-gray-100 ${i === breadcrumb.length - 1 ? 'font-semibold text-gray-700' : 'text-emerald-600 hover:underline'}`}>
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 gap-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
            {searching ? 'Search results' : (title || currentDrive?.name || 'OneDrive')}
          </div>
          <div className="text-xs text-gray-400 truncate">{connectedEmail && `Connected: ${connectedEmail}`}</div>
        </div>

        {error && <div className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
        {!root && sharepointError && !compact && (
          <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
            SharePoint libraries are not available for this Microsoft account ({sharepointError}). OneDrive still works.
          </div>
        )}

        {loading ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">{searching ? 'No files match your search.' : 'This folder is empty.'}</div>
        ) : (
          items.map(item => {
            const icon = fileIcon(item.name, item.isFolder)
            const disabled = pickMode && !item.isFolder
            return (
              <div key={item.id} onClick={() => handleOpen(item)}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${disabled ? 'opacity-40 cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${icon.color}`}>{icon.label}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{item.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {searching && item.path ? item.path : item.isFolder
                      ? `${item.childCount ?? 0} item${item.childCount === 1 ? '' : 's'}`
                      : `${item.lastModifiedBy || 'Unknown'}${item.lastModified ? ` · ${new Date(item.lastModified).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`}
                  </div>
                </div>
                {!item.isFolder && !pickMode && isOfficeFile(item.name) && (
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">Co-edit</span>
                )}
                <span className="text-xs text-gray-400 flex-shrink-0">{item.isFolder ? '' : formatSize(item.size)}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// Modal wrapper: pick a OneDrive / SharePoint folder. onPick receives the folder, onClose dismisses.
export function OneDriveFolderPicker({ currentUser, onPick, onClose, jobLabel, title, subtitle }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-3xl mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold">{title || 'Link a OneDrive or SharePoint folder'}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {subtitle || `${jobLabel ? `${jobLabel}: ` : ''}browse to the job's folder, then click "Use this folder".`}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 px-2">✕</button>
        </div>
        <div className="p-5">
          <OneDriveBrowser currentUser={currentUser} mode="pick" onPick={onPick} compact />
        </div>
      </div>
    </div>
  )
}
