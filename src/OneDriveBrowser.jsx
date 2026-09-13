import { useState, useEffect } from 'react'

const SUPABASE_URL = 'https://sltaaiumviyzgdsdkkbe.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdGFhaXVtdml5emdkc2Rra2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTYyNTMsImV4cCI6MjA5MDQ5MjI1M30.xqWqvx8vdofj119nXDpasQ8xVD67YJU0RrjTrxycTGo'

async function callGraph(action, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ms-graph?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
    body: JSON.stringify(payload),
  })
  return res.json()
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
      const data = await callGraph('preview', { company_id: companyId, item_id: file.id })
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
              <div className="text-xs text-gray-400 max-w-sm mb-4">You can still open it in {app} Online — editing and co-authoring work as normal.</div>
              <button onClick={openEditor} className="px-4 py-2 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">
                Open in {app}
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex-shrink-0">
          This is a read-only preview. Click <span className="font-medium">Edit in {app}</span> to open the live document — multiple planners can edit it at the same time, and changes save straight back to OneDrive.
        </div>
      </div>
    </div>
  )
}

export default function OneDriveBrowser({ currentUser }) {
  const [connected, setConnected] = useState(null)
  const [connectedEmail, setConnectedEmail] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [breadcrumb, setBreadcrumb] = useState([{ id: null, name: 'OneDrive' }])
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [openFile, setOpenFile] = useState(null)
  const isDirector = currentUser?.role === 'director'

  useEffect(() => { checkStatus() }, [currentUser])

  const checkStatus = async () => {
    if (!currentUser?.company_id) return
    const data = await callGraph('status', { company_id: currentUser.company_id })
    setConnected(!!data.connected)
    setConnectedEmail(data.email || '')
    if (data.connected) loadFolder(null, [{ id: null, name: 'OneDrive' }])
  }

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID
    if (!clientId) { alert('Microsoft 365 not configured yet.'); return }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'https://planflow-beige.vercel.app',
      response_type: 'code',
      scope: 'Files.ReadWrite.All offline_access User.Read',
      prompt: 'select_account',
      state: btoa(JSON.stringify({ provider: 'msgraph', company_id: currentUser.company_id, username: currentUser.username })),
    })
    window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Microsoft 365? Planners will lose access to OneDrive files in QPlan.')) return
    await callGraph('disconnect', { company_id: currentUser.company_id })
    setConnected(false)
    setItems([])
  }

  const loadFolder = async (folderId, newBreadcrumb) => {
    setLoading(true)
    setError('')
    setSearching(false)
    setSearch('')
    const data = await callGraph('list', { company_id: currentUser.company_id, folder_id: folderId })
    if (data.success) {
      setItems(data.items)
      if (newBreadcrumb) setBreadcrumb(newBreadcrumb)
    } else {
      setError(data.error || 'Could not load files.')
    }
    setLoading(false)
  }

  const enterFolder = (item) => loadFolder(item.id, [...breadcrumb, { id: item.id, name: item.name }])
  const jumpToCrumb = (index) => loadFolder(breadcrumb[index].id, breadcrumb.slice(0, index + 1))

  const handleSearch = async (e) => {
    if (e.key !== 'Enter' || !search.trim()) return
    setLoading(true)
    setError('')
    setSearching(true)
    const data = await callGraph('search', { company_id: currentUser.company_id, query: search.trim() })
    if (data.success) setItems(data.items)
    else setError(data.error || 'Search failed.')
    setLoading(false)
  }

  const clearSearch = () => {
    setSearching(false)
    setSearch('')
    loadFolder(breadcrumb[breadcrumb.length - 1].id)
  }

  const handleOpen = (item) => {
    if (item.isFolder) { enterFolder(item); return }
    if (!item.webUrl) return
    if (isOfficeFile(item.name) || item.name.toLowerCase().endsWith('.pdf')) setOpenFile(item)
    else window.open(item.webUrl, '_blank', 'noopener')
  }

  if (connected === null) {
    return <div className="bg-white rounded-xl border border-gray-200 px-4 py-8 text-center text-xs text-gray-400">Checking Microsoft 365 connection...</div>
  }

  if (!connected) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center text-white text-lg font-bold mx-auto mb-3">M</div>
        <div className="text-sm font-semibold mb-1">Connect Microsoft 365</div>
        <div className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
          Link your firm's OneDrive so planners can browse, search and co-edit your existing documents directly from QPlan. Files stay in OneDrive — nothing is moved or copied.
        </div>
        {isDirector ? (
          <button onClick={handleConnect} className="px-4 py-2 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">
            Connect Microsoft 365
          </button>
        ) : (
          <div className="text-xs text-gray-400">Ask a director to connect Microsoft 365 from this page.</div>
        )}
      </div>
    )
  }

  return (
    <div>
      {openFile && <DocumentModal file={openFile} companyId={currentUser.company_id} onClose={() => setOpenFile(null)} />}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input
          type="text"
          placeholder="Search OneDrive... (press Enter)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400"
        />
        {searching && (
          <button onClick={clearSearch} className="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">✕ Clear search</button>
        )}
        {isDirector && (
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{searching ? 'Search results' : 'OneDrive'}</div>
          <div className="text-xs text-gray-400">{connectedEmail && `Connected — ${connectedEmail}`}</div>
        </div>

        {error && <div className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}

        {loading ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">{searching ? 'No files match your search.' : 'This folder is empty.'}</div>
        ) : (
          items.map(item => {
            const icon = fileIcon(item.name, item.isFolder)
            return (
              <div key={item.id} onClick={() => handleOpen(item)}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${icon.color}`}>{icon.label}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{item.name}</div>
                  <div className="text-xs text-gray-400">
                    {item.isFolder
                      ? `${item.childCount ?? 0} item${item.childCount === 1 ? '' : 's'}`
                      : `${item.lastModifiedBy || 'Unknown'}${item.lastModified ? ` · ${new Date(item.lastModified).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`}
                  </div>
                </div>
                {!item.isFolder && isOfficeFile(item.name) && (
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