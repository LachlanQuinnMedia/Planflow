import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import OneDriveBrowser from './OneDriveBrowser'

const DOCS_PER_PAGE = 100

function RenameModal({ doc, onClose, onRename }) {
  const [name, setName] = useState(doc.name)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('documents').update({ name: name.trim() }).eq('id', doc.id)
    setSaving(false)
    onRename(name.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">Rename document</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-5 py-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">Document name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
          />
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ doc, onConfirm, onCancel }) {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">Delete document</div>
        </div>
        <div className="px-5 py-4">
          <div className="text-xs text-gray-600 mb-2">Are you sure you want to delete this document?</div>
          <div className="text-xs font-medium text-gray-800 bg-gray-50 rounded-lg px-3 py-2 mb-3 break-all">{doc.name}</div>
          <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">This will permanently delete the file. This cannot be undone.</div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onCancel} disabled={deleting} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={deleting}
            className="flex-1 py-2 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const range = 2

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - range && i <= currentPage + range)
    ) {
      pages.push(i)
    }
  }

  const withEllipsis = []
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) {
      withEllipsis.push('...')
    }
    withEllipsis.push(pages[i])
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      {currentPage > 1 && (
        <button onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
          ‹
        </button>
      )}
      {withEllipsis.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`w-8 h-8 text-xs rounded-lg transition-colors ${
              p === currentPage
                ? 'bg-emerald-600 text-white font-bold'
                : 'border border-gray-200 hover:bg-gray-50 text-gray-500'
            }`}>
            {p}
          </button>
        )
      )}
      {currentPage < totalPages && (
        <button onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
          ›
        </button>
      )}
    </div>
  )
}

export default function Documents({ currentUser }) {
  const [source, setSource] = useState('qplan')
  const [docs, setDocs] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [jobFilter, setJobFilter] = useState('All')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [renamingDoc, setRenamingDoc] = useState(null)
  const [deletingDoc, setDeletingDoc] = useState(null)
  const [assigningJob, setAssigningJob] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const fileRef = useRef(null)

  useEffect(() => { fetchDocs() }, [currentUser])
  useEffect(() => { fetchJobs() }, [])

  const fetchDocs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', currentUser?.company_id)
      .order('created_at', { ascending: false })
    if (data) setDocs(data)
    setLoading(false)
  }

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('id, code, name, client_first_name, client_last_name, app_type')
      .order('created_at', { ascending: false })
      .limit(500)
    if (data) setJobs(data)
  }

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    const total = fileArray.length
    let completed = 0
    setUploadProgress(0)

    for (const file of fileArray) {
      const path = `general/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        console.error(uploadError)
        completed++
        setUploadProgress(Math.round((completed / total) * 100))
        continue
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      await supabase.from('documents').insert({
        company_id: currentUser?.company_id,
        job_id: null,
        job_code: null,
        name: file.name,
        file_path: path,
        file_url: urlData.publicUrl,
        file_type: file.name.split('.').pop().toLowerCase(),
        file_size: file.size,
        uploaded_by: currentUser?.username || 'Unknown',
      })

      completed++
      setUploadProgress(Math.round((completed / total) * 100))
    }

    setTimeout(() => setUploadProgress(null), 1000)
    fetchDocs()
  }

  const performDelete = async (doc) => {
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    if (selectedDoc?.id === doc.id) setSelectedDoc(null)
    setDeletingDoc(null)
    fetchDocs()
  }

  const handleRename = (docId, newName) => {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, name: newName } : d))
    if (selectedDoc?.id === docId) setSelectedDoc(prev => ({ ...prev, name: newName }))
  }

  const handleAssignJob = async (doc, jobId) => {
    setAssigningJob(true)
    const job = jobs.find(j => j.id === jobId)
    const updates = {
      job_id: jobId || null,
      job_code: job?.code || null,
    }
    await supabase.from('documents').update(updates).eq('id', doc.id)
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, ...updates } : d))
    if (selectedDoc?.id === doc.id) setSelectedDoc(prev => ({ ...prev, ...updates }))
    setAssigningJob(false)
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

  const uniqueJobCodes = [...new Set(docs.filter(d => d.job_code).map(d => d.job_code))]
  const uniqueTypes = [...new Set(docs.filter(d => d.file_type).map(d => d.file_type.toUpperCase()))]

  const filtered = docs.filter(d => {
    const matchSearch = !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.job_code || '').includes(search) ||
      (d.uploaded_by || '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All' || d.file_type?.toUpperCase() === typeFilter
    const matchJob = jobFilter === 'All' || d.job_code === jobFilter
    return matchSearch && matchType && matchJob
  })

  const totalPages = Math.ceil(filtered.length / DOCS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * DOCS_PER_PAGE, currentPage * DOCS_PER_PAGE)

  useEffect(() => { setCurrentPage(1) }, [search, typeFilter, jobFilter])

  return (
    <div>
      {/* Source tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSource('qplan')}
          className={`px-4 py-2 text-xs rounded-lg font-medium transition-colors ${source === 'qplan' ? 'bg-emerald-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50 bg-white'}`}>
          QPlan storage
        </button>
        <button onClick={() => setSource('onedrive')}
          className={`px-4 py-2 text-xs rounded-lg font-medium transition-colors ${source === 'onedrive' ? 'bg-blue-700 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50 bg-white'}`}>
          OneDrive · Microsoft 365
        </button>
      </div>

      {source === 'onedrive' ? (
        <OneDriveBrowser currentUser={currentUser} />
      ) : (
        <>
          {renamingDoc && (
            <RenameModal
              doc={renamingDoc}
              onClose={() => setRenamingDoc(null)}
              onRename={(newName) => handleRename(renamingDoc.id, newName)}
            />
          )}
          {deletingDoc && (
            <DeleteConfirmModal
              doc={deletingDoc}
              onConfirm={() => performDelete(deletingDoc)}
              onCancel={() => setDeletingDoc(null)}
            />
          )}

          {/* Upload zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
            onClick={() => uploadProgress === null && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors mb-4 ${dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'}`}
          >
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />

            {uploadProgress !== null ? (
              <div className="py-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-emerald-600 font-medium">Uploading...</span>
                  <span className="text-xs text-emerald-600 font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadProgress === 100 && (
                  <div className="text-xs text-emerald-600 mt-1.5">✓ Upload complete</div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 py-1">☁️ Drop files here or click to upload — any file type</div>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Search by name, job code, uploader..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="All">All types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="All">All jobs</option>
              {uniqueJobCodes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className={`grid gap-4 ${selectedDoc ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">All documents</div>
                <div className="text-xs text-gray-400">
                  {filtered.length} of {docs.length}
                  {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
                </div>
              </div>

              {loading ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">
                  {docs.length === 0 ? 'No documents yet — upload files above or from any job.' : 'No documents match your search.'}
                </div>
              ) : (
                <>
                  {paginated.map(doc => {
                    const icon = getFileIcon(doc.file_type)
                    return (
                      <div key={doc.id}
                        onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${selectedDoc?.id === doc.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${icon.color}`}>
                          {icon.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{doc.name}</div>
                          <div className="text-xs text-gray-400">
                            {doc.job_code ? `${doc.job_code} · ` : 'General · '}
                            {doc.uploaded_by} · {new Date(doc.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setRenamingDoc(doc) }}
                          className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded hover:bg-gray-100 flex-shrink-0"
                          title="Rename">
                          ✎
                        </button>
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(doc.file_size)}</span>
                      </div>
                    )
                  })}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>

            {selectedDoc && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 ${getFileIcon(selectedDoc.file_type).color}`}>
                    {getFileIcon(selectedDoc.file_type).label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{selectedDoc.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{selectedDoc.job_code || 'General'} · {selectedDoc.uploaded_by}</div>
                  </div>
                  <button onClick={() => setSelectedDoc(null)} className="text-xs text-gray-400 hover:text-gray-600" title="Close">✕</button>
                </div>

                <div className="flex py-1.5 border-b border-gray-50">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">File type</div>
                  <div className="text-xs font-medium">{selectedDoc.file_type?.toUpperCase() || '—'}</div>
                </div>

                {/* Job — editable dropdown */}
                <div className="flex items-center py-1.5 border-b border-gray-50 gap-2">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">Job</div>
                  <select
                    value={selectedDoc.job_id || ''}
                    onChange={e => handleAssignJob(selectedDoc, e.target.value)}
                    disabled={assigningJob}
                    className="flex-1 min-w-0 text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                  >
                    <option value="">Not linked to a job</option>
                    {jobs.map(j => {
                      const client = `${j.client_first_name || ''} ${j.client_last_name || ''}`.trim()
                      const label = `${j.code} — ${client || j.name || 'Untitled'}${j.app_type ? ` (${j.app_type})` : ''}`
                      return <option key={j.id} value={j.id}>{label}</option>
                    })}
                  </select>
                  {assigningJob && <span className="text-xs text-gray-400">Saving...</span>}
                </div>

                <div className="flex py-1.5 border-b border-gray-50">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">Size</div>
                  <div className="text-xs font-medium">{formatSize(selectedDoc.file_size)}</div>
                </div>
                <div className="flex py-1.5 border-b border-gray-50">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">Uploaded by</div>
                  <div className="text-xs font-medium">{selectedDoc.uploaded_by}</div>
                </div>
                <div className="flex py-1.5">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">Date</div>
                  <div className="text-xs font-medium">{new Date(selectedDoc.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>

                <div className="flex gap-2 mt-4">
                  <a href={selectedDoc.file_url} download={selectedDoc.name}
                    className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-center"
                    title="Download document">
                    ↓ Download
                  </a>
                  <button
                    onClick={e => { e.stopPropagation(); setRenamingDoc(selectedDoc) }}
                    className="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                    title="Rename document">
                    ✎ Rename
                  </button>
                  <button onClick={() => setDeletingDoc(selectedDoc)}
                    className="px-3 py-2 text-xs text-red-400 border border-red-100 rounded-lg hover:bg-red-50"
                    title="Delete document">
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}