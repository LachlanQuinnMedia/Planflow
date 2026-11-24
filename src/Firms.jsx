// src/Firms.jsx
// Master account only. Every firm on QPlan, with a button to add one and a button to open one.
// Opening a firm shows it exactly as that firm's directors see it. Nothing is shared between firms.
import { useState, useEffect } from 'react'
import { supabase, callFunction } from './supabase'

const APP_URL = 'https://planflow-beige.vercel.app'

const formatDate = (iso) => {
  try { return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Brisbane' }).format(new Date(iso)) } catch { return '' }
}

// What to send a new firm's director so they can get in
const welcomeText = (firm) => [
  `Welcome to QPlan. Here is how to set up ${firm.name}.`,
  '',
  `1. Go to ${APP_URL} and click Create account.`,
  `2. Company code: ${firm.company_code}`,
  `3. Director code: ${firm.director_code}`,
  '   The director code makes you a director straight away. Keep it to the directors.',
  '4. Log in. A short checklist on the Dashboard walks you through the rest.',
  '',
  `Your staff create their own accounts with the company code only (${firm.company_code}). You approve each one from Notifications.`,
].join('\n')

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* the text is on screen to copy by hand */ }
  }
  return <button type="button" onClick={copy} className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 flex-shrink-0">{copied ? '✓ Copied' : label}</button>
}

function FirmCodes({ firm }) {
  return (
    <div data-testid="firm-codes" className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-gray-500">Company code (everyone)</div>
          <div className="text-base font-semibold font-mono tracking-wider" data-testid="firm-company-code">{firm.company_code}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Director code (directors only)</div>
          <div className="text-base font-semibold font-mono tracking-wider" data-testid="firm-director-code">{firm.director_code || 'Not set'}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mb-1">Message for the firm's director</div>
      <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap font-sans mb-2">{welcomeText(firm)}</pre>
      <CopyButton text={welcomeText(firm)} label="Copy message" />
    </div>
  )
}

function AddFirmModal({ onClose, onAdded }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [firm, setFirm] = useState(null)

  const create = async () => {
    if (name.trim().length < 2) { setError('Enter the firm\'s name.'); return }
    setSaving(true); setError('')
    const res = await callFunction('platform', 'create_firm', { name })
    setSaving(false)
    if (res.error || !res.firm) { setError(res.error || 'Could not create the firm.'); return }
    setFirm(res.firm); onAdded(res.firm)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">{firm ? `${firm.name} is ready` : 'Add a firm'}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {firm ? 'Send the message below to the firm\'s director. The codes are also kept on this page.' : 'The firm starts empty: no jobs, no staff, QPlan\'s standard stages and no templates.'}
          </div>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          {firm ? <FirmCodes firm={firm} /> : (
            <>
              <label className="text-xs text-gray-600 mb-1 block">Firm name</label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create() }}
                placeholder="Example Planning Pty Ltd" data-testid="firm-name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <div className="text-xs text-gray-500 mt-2">QPlan makes the company code and the director code for you.</div>
              {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>}
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">{firm ? 'Done' : 'Cancel'}</button>
          {!firm && <button onClick={create} disabled={saving} className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">{saving ? 'Creating...' : 'Create firm'}</button>}
        </div>
      </div>
    </div>
  )
}

export default function Firms({ currentUser, timerRunning, onSwitched }) {
  const [firms, setFirms] = useState(null)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [openCodes, setOpenCodes] = useState(null)
  const [switching, setSwitching] = useState(null)

  const [problems, setProblems] = useState([])
  const [reloads, setReloads] = useState(0)
  const load = () => setReloads(n => n + 1)
  // What the app has reported about itself, across every firm. Only the master account can read these.
  useEffect(() => {
    let cancelled = false
    supabase.from('client_errors').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => { if (!cancelled) setProblems(data || []) })
    return () => { cancelled = true }
  }, [reloads])
  const clearProblems = async () => {
    if (!window.confirm('Clear every reported problem?')) return
    await supabase.from('client_errors').delete().gt('id', 0)
    load()
  }
  useEffect(() => {
    let cancelled = false
    callFunction('platform', 'list_firms').then((res) => {
      if (cancelled) return
      if (res.error || !res.firms) { setError(res.error || 'Could not load the firms.'); setFirms([]); return }
      setError(''); setFirms(res.firms)
    })
    return () => { cancelled = true }
  }, [reloads])

  const open = async (firm) => {
    if (timerRunning) { setError('Stop the time tracker first. A running timer belongs to a job at this firm.'); return }
    setSwitching(firm.id); setError('')
    const res = await callFunction('platform', 'switch_firm', { company_id: firm.id })
    if (res.error || !res.user) { setSwitching(null); setError(res.error || 'Could not open that firm.'); return }
    onSwitched(res.user)
  }

  return (
    <div data-testid="firms-page">
      {showAdd && <AddFirmModal onClose={() => setShowAdd(false)} onAdded={() => load()} />}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold">Firms on QPlan</div>
          <div className="text-xs text-gray-500">Only your master account sees this page. You are looking at <span className="font-medium text-gray-700">{currentUser.companyName || 'a firm'}</span>.</div>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">+ Add a firm</button>
      </div>
      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>}
      {firms === null ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">Loading firms...</div>
      ) : (
        <div className="space-y-3">
          {firms.map(firm => (
            <div key={firm.id} data-testid="firm-row" className={`bg-white rounded-xl border p-4 ${firm.current ? 'border-emerald-300' : 'border-gray-200'}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold truncate">{firm.name}</div>
                    {firm.current && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">You are here</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {firm.staff} staff{firm.pending > 0 ? ` · ${firm.pending} awaiting approval` : ''} · {firm.jobs} job{firm.jobs === 1 ? '' : 's'} · added {formatDate(firm.created_at)}
                  </div>
                </div>
                <button onClick={() => setOpenCodes(openCodes === firm.id ? null : firm.id)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">{openCodes === firm.id ? 'Hide codes' : 'Codes and invite'}</button>
                {!firm.current && (
                  <button onClick={() => open(firm)} disabled={!!switching} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">{switching === firm.id ? 'Opening...' : 'Open this firm'}</button>
                )}
              </div>
              {openCodes === firm.id && <div className="mt-3"><FirmCodes firm={firm} /></div>}
            </div>
          ))}
          {firms.length === 0 && !error && <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">No firms yet.</div>}
        </div>
      )}

      <div data-testid="problems" className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Problems the app reported</div>
            <div className="text-xs text-gray-500">When a screen breaks for someone, QPlan records it here. The latest 50, from every firm.</div>
          </div>
          {problems.length > 0 && <button onClick={clearProblems} className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 flex-shrink-0">Clear</button>}
        </div>
        {problems.length === 0 ? <div className="text-xs text-gray-500 py-2">Nothing reported. Good.</div> : problems.map(p => (
          <div key={p.id} data-testid="problem-row" className="py-2 border-t border-gray-100">
            <div className="text-xs font-medium text-red-700 break-words">{p.message}</div>
            <div className="text-xs text-gray-500">
              {(firms || []).find(f => f.id === p.company_id)?.name || 'Unknown firm'} · {p.username || 'Unknown'} · {p.page || 'unknown page'} · {formatDate(p.created_at)}
            </div>
            {p.detail && <details className="mt-1"><summary className="text-xs text-gray-500 cursor-pointer">Details</summary><pre className="text-[11px] text-gray-600 whitespace-pre-wrap break-words mt-1">{p.detail}</pre></details>}
          </div>
        ))}
      </div>
    </div>
  )
}
