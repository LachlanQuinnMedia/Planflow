// src/GlobalSearch.jsx
// Find a job from anywhere: a button in the top bar (or Ctrl+K, or the "/" key) opens a box.
// Type a job number, client or address and press Enter. It looks through the firm's working
// jobs straight away, and through its imported past jobs a moment later.
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { jobListName, jobSearchText } from './jobMeta'
import { searchArchive } from './jobsQuery'
import { IconSearch } from './icons'

const typingSomewhere = () => {
  const el = document.activeElement
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export default function GlobalSearch({ jobs, onOpenJob }) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [archive, setArchive] = useState([])
  const [at, setAt] = useState(0)
  const inputRef = useRef(null)

  const close = () => { setOpen(false); setTerm(''); setArchive([]); setAt(0) }

  // Ctrl+K (or Cmd+K) anywhere, or "/" when not typing in a box
  useEffect(() => {
    const onKey = (e) => {
      if (document.getElementById('root')?.hasAttribute('inert')) return // the tutorial is running
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true) }
      else if (e.key === '/' && !typingSomewhere() && !document.querySelector('.fixed.inset-0')) { e.preventDefault(); setOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Past jobs from an import are looked up as you type
  useEffect(() => {
    const t = term.trim()
    if (!open || t.length < 2) { const clear = setTimeout(() => setArchive([]), 0); return () => clearTimeout(clear) }
    let cancelled = false
    const wait = setTimeout(async () => { const { data } = await searchArchive(t, 20); if (!cancelled) setArchive(data) }, 250)
    return () => { cancelled = true; clearTimeout(wait) }
  }, [term, open])

  const t = term.trim().toLowerCase()
  const working = t ? jobs.filter(j => jobSearchText(j).includes(t)) : []
  const past = archive.filter(a => !working.some(j => j.id === a.id))
  const results = [...working.slice(0, 8).map(j => ({ job: j, past: false })), ...past.slice(0, 8).map(j => ({ job: j, past: true }))]
  const pick = (r) => { if (!r) return; close(); onOpenJob(r.job.id) }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setAt(i => Math.min(results.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAt(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[Math.min(at, results.length - 1)]) }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="search-open" data-tour="search" title="Find a job (Ctrl+K)" aria-label="Find a job"
        className="qp-topbar-btn flex items-center gap-2 h-8 px-2 md:px-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 flex-shrink-0 text-xs">
        <IconSearch size={15} />
        <span className="hidden md:inline">Find a job</span>
        <span className="hidden lg:inline opacity-60">Ctrl K</span>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-[12vh] px-4" data-testid="search-box" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg shadow-xl overflow-hidden" role="dialog" aria-label="Find a job">
            <div className="flex items-center gap-2 px-3 border-b border-gray-100">
              <IconSearch size={16} className="text-gray-500 flex-shrink-0" />
              <input ref={inputRef} autoFocus value={term} onChange={e => { setTerm(e.target.value); setAt(0) }} onKeyDown={onKeyDown}
                placeholder="Job number, client or address" data-testid="search-input"
                className="flex-1 py-3 text-sm bg-transparent focus:outline-none" />
              <button onClick={close} className="text-xs text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">Esc</button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {!t && <div className="px-4 py-6 text-center text-xs text-gray-500">Start typing. Past jobs from an import are included.</div>}
              {t && results.length === 0 && <div className="px-4 py-6 text-center text-xs text-gray-500">No job matches "{term.trim()}".</div>}
              {results.map((r, i) => (
                <button key={r.job.id} data-testid="search-result" onMouseEnter={() => setAt(i)} onClick={() => pick(r)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-gray-50 last:border-0 ${i === at ? 'bg-emerald-50' : ''}`}>
                  <span className="text-xs font-medium text-emerald-600 w-20 flex-shrink-0 font-mono">{r.job.code}</span>
                  <span className="flex-1 min-w-0 text-xs truncate">{jobListName(r.job)}</span>
                  {r.past && <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 flex-shrink-0">Past job</span>}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
