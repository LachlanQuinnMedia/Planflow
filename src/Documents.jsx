import { useState } from 'react'

const allDocs = [
  { id: 1, name: 'Planning Report — Ridgeline MCU', job: '2025-031', type: 'W', typeLabel: 'Report', meta: '14 Mar · Sarah B.', version: 'Rev C', size: '42 pages', status: 'current', color: 'bg-blue-100 text-blue-700' },
  { id: 2, name: 'IR Response — TRC IR #1', job: '2025-031', type: 'W', typeLabel: 'IR Response', meta: '10 Mar · Sarah B.', version: 'Rev A', size: '8 pages', status: 'urgent', color: 'bg-blue-100 text-blue-700' },
  { id: 3, name: 'Planning Report — Stonewood ROL', job: '2025-028', type: 'W', typeLabel: 'Report', meta: '8 Mar · Priya M.', version: 'Rev B', size: '36 pages', status: 'current', color: 'bg-blue-100 text-blue-700' },
  { id: 4, name: 'Invoice #INV-2025-031-01', job: '2025-031', type: '$', typeLabel: 'Invoice', meta: '15 Feb · $5,550', version: 'Final', size: '1 page', status: 'paid', color: 'bg-emerald-100 text-emerald-700' },
  { id: 5, name: 'Architectural Plans — Ridgeline', job: '2025-031', type: 'P', typeLabel: 'Plans', meta: '5 Mar · Architect', version: 'Rev B', size: '12 sheets', status: 'current', color: 'bg-amber-100 text-amber-700' },
  { id: 6, name: 'RAA Response — Apex Logistics', job: '2025-033', type: 'W', typeLabel: 'RAA Response', meta: '12 Mar · Sarah B.', version: 'Rev A', size: '14 pages', status: 'current', color: 'bg-blue-100 text-blue-700' },
  { id: 7, name: 'IR Response — DTMR Referral', job: '2025-031', type: 'W', typeLabel: 'IR Response', meta: 'Not started', version: null, size: null, status: 'pending', color: 'bg-blue-100 text-blue-700' },
  { id: 8, name: 'Planning Report — Hillcrest SPS', job: '2025-029', type: 'W', typeLabel: 'Report', meta: '1 Mar · Amy C.', version: 'Rev A', size: '28 pages', status: 'current', color: 'bg-blue-100 text-blue-700' },
  { id: 9, name: 'Invoice #INV-2025-028-01', job: '2025-028', type: '$', typeLabel: 'Invoice', meta: '10 Feb · $4,200', version: 'Final', size: '1 page', status: 'paid', color: 'bg-emerald-100 text-emerald-700' },
  { id: 10, name: 'OW Compliance Report — Creek Rd', job: '2025-034', type: 'W', typeLabel: 'Report', meta: '15 Mar · Luke R.', version: 'Rev A', size: '18 pages', status: 'current', color: 'bg-blue-100 text-blue-700' },
]

const versions = {
  1: [
    { version: 'Rev C', date: '14 Mar 2025', author: 'Sarah B.', pages: '42 pages', current: true },
    { version: 'Rev B', date: '7 Mar 2025', author: 'Sarah B.', pages: '40 pages', current: false },
    { version: 'Rev A', date: '28 Feb 2025', author: 'Sarah B.', pages: '36 pages', current: false },
  ]
}

export default function Documents() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [jobFilter, setJobFilter] = useState('All')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [showVersions, setShowVersions] = useState(false)

  const filtered = allDocs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.job.includes(search)
    const matchType = typeFilter === 'All' || d.typeLabel === typeFilter
    const matchJob = jobFilter === 'All' || d.job === jobFilter
    return matchSearch && matchType && matchJob
  })

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option>All</option>
          <option>Report</option>
          <option>IR Response</option>
          <option>RAA Response</option>
          <option>Invoice</option>
          <option>Plans</option>
        </select>
        <select value={jobFilter} onChange={e => setJobFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option>All</option>
          <option>2025-031</option>
          <option>2025-028</option>
          <option>2025-033</option>
          <option>2025-034</option>
          <option>2025-029</option>
        </select>
        <button className="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
          ↑ Upload new
        </button>
      </div>

      <div className={`grid gap-4 ${selectedDoc ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Document list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">All documents</div>
            <div className="text-xs text-gray-400">{filtered.length} of {allDocs.length}</div>
          </div>
          {filtered.map(doc => (
            <div
              key={doc.id}
              onClick={() => { setSelectedDoc(doc); setShowVersions(false) }}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${selectedDoc?.id === doc.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${doc.color}`}>
                {doc.type}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{doc.name}</div>
                <div className="text-xs text-gray-400">{doc.job} · {doc.meta}</div>
              </div>
              {doc.version && (
                <span className={`text-xs font-medium flex-shrink-0 ${doc.status === 'urgent' ? 'text-red-500' : doc.status === 'paid' ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {doc.version}
                </span>
              )}
              {doc.status === 'pending' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>
              )}
              {doc.status === 'urgent' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Due soon</span>
              )}
            </div>
          ))}
        </div>

        {/* Document detail panel */}
        {selectedDoc && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 ${selectedDoc.color}`}>
                  {selectedDoc.type}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{selectedDoc.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{selectedDoc.job} · {selectedDoc.meta}</div>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {[
                ['Type', selectedDoc.typeLabel],
                ['Job', selectedDoc.job],
                ['Version', selectedDoc.version || 'Not created'],
                ['Size', selectedDoc.size || '—'],
                ['Last updated', selectedDoc.meta],
              ].map(([k, v]) => (
                <div key={k} className="flex py-1.5 border-b border-gray-50 last:border-0">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">{k}</div>
                  <div className="text-xs font-medium">{v}</div>
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                {selectedDoc.status === 'pending' ? (
                  <button className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                    ⬡ Auto-generate
                  </button>
                ) : (
                  <button className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                    Edit live
                  </button>
                )}
                <button className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                  Download
                </button>
              </div>
            </div>

            {/* Version history */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowVersions(!showVersions)}
              >
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Version history</div>
                <div className="text-xs text-gray-400">{showVersions ? '▲ Hide' : '▼ Show'}</div>
              </div>
              {showVersions && (
                <div className="mt-3">
                  {(versions[selectedDoc.id] || [
                    { version: selectedDoc.version || 'Rev A', date: selectedDoc.meta, author: 'Planner', pages: selectedDoc.size, current: true }
                  ]).map((v, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 ${v.current ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        W
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium">{v.version} {v.current && <span className="text-emerald-600">(Current)</span>}</div>
                        <div className="text-xs text-gray-400">{v.date} · {v.author} · {v.pages}</div>
                      </div>
                      {!v.current && (
                        <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Restore</button>
                      )}
                      <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Download</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}