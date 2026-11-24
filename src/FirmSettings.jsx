// src/FirmSettings.jsx
// Directors only. What makes QPlan this firm's own: what it calls its service stages, and the
// stages themselves, each with a default fee and a checklist. New jobs start from these.
import { useState, useEffect } from 'react'
import { useFirm, saveFirm, DEFAULT_STAGES } from './firm'
import { callFunction } from './supabase'
import { notify } from './notify'

const MAX_STAGES = 8
const newId = () => `s${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
const toForm = (stages) => stages.map(s => ({
  id: s.id, label: s.label, shortLabel: s.shortLabel, defaultFee: String(s.defaultFee ?? ''), description: s.description || '', items: (s.items || []).join('\n'),
}))

export default function FirmSettings({ currentUser, onNavigate }) {
  const firm = useFirm()
  const [label, setLabel] = useState(firm.stageLabel)
  const [stages, setStages] = useState(() => toForm(firm.stages))
  const [open, setOpen] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  // The Monday email: what it would say this week and who would get it
  const [digest, setDigest] = useState(null)
  const [digestBusy, setDigestBusy] = useState('')
  const [weeklyPending, setWeeklyPending] = useState(null)
  const isDirector = currentUser?.role === 'director'
  useEffect(() => {
    if (!isDirector) return
    let cancelled = false
    callFunction('weekly-digest', 'preview').then(res => { if (!cancelled) setDigest(res?.success ? res : { items: [], recipients: [], failed: true }) }, () => { if (!cancelled) setDigest({ items: [], recipients: [], failed: true }) })
    return () => { cancelled = true }
  }, [isDirector])

  if (!isDirector) {
    return <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">Firm settings are for directors.</div>
  }

  const touch = () => { setDirty(true); setSaved(false) }
  const setStage = (id, patch) => { setStages(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s))); touch() }
  const move = (index, by) => {
    setStages(prev => { const next = [...prev]; const [s] = next.splice(index, 1); next.splice(index + by, 0, s); return next }); touch()
  }
  const addStage = () => {
    const n = stages.length + 1
    const s = { id: newId(), label: `Stage ${n}: `, shortLabel: `Stage ${n}`, defaultFee: '', description: '', items: '' }
    setStages(prev => [...prev, s]); setOpen(s.id); touch()
  }
  const removeStage = (stage) => {
    if (!window.confirm(`Remove "${stage.label || stage.shortLabel}"?\n\nJobs keep what was recorded against it, but the stage will no longer show on them.`)) return
    setStages(prev => prev.filter(s => s.id !== stage.id)); touch()
  }
  const useStandard = () => {
    if (!window.confirm('Replace your stages with QPlan\'s standard three?')) return
    setStages(toForm(DEFAULT_STAGES.map(s => ({ ...s })))); touch()
  }

  const save = async () => {
    setError('')
    const cleaned = stages.map(s => ({
      id: s.id, label: s.label.trim(), shortLabel: s.shortLabel.trim() || s.label.trim().split(':')[0].trim(),
      defaultFee: Math.max(0, Number(String(s.defaultFee).replace(/[^0-9.]/g, '')) || 0),
      description: s.description.trim(), items: s.items.split('\n').map(i => i.trim()).filter(Boolean),
    }))
    if (cleaned.length === 0) { setError('Keep at least one stage.'); return }
    const unnamed = cleaned.findIndex(s => !s.label)
    if (unnamed >= 0) { setError(`Stage ${unnamed + 1} needs a name.`); setOpen(cleaned[unnamed].id); return }
    const shorts = cleaned.map(s => s.shortLabel.toLowerCase())
    if (new Set(shorts).size !== shorts.length) { setError('Two stages have the same short name. Give each its own.'); return }
    setSaving(true)
    try {
      await saveFirm(currentUser.company_id, { stage_label: label.trim() || null, stages: cleaned }, currentUser.username)
      await firm.reload()
      setDirty(false); setSaved(true)
    } catch (e) {
      setError('Could not save: ' + e.message)
    }
    setSaving(false)
  }

  const weeklyOn = firm.setup.weekly_email === true
  const setWeekly = async (on) => {
    setWeeklyPending(on) // the tick shows at once, and is put back if the save fails
    try { await saveFirm(currentUser.company_id, { setup: { ...firm.setup, weekly_email: on } }, currentUser.username); await firm.reload() }
    catch (e) { notify.error('Could not save: ' + e.message) }
    setWeeklyPending(null)
  }
  const sendTest = async () => {
    setDigestBusy('test')
    const res = await callFunction('weekly-digest', 'send_test').catch(() => ({ error: 'Could not reach QPlan. Check your internet connection and try again.' }))
    setDigestBusy('')
    if (res.success) notify.success(`Sent to ${res.to}. It can take a minute to arrive.`)
    else notify.error(`The test email was not sent${res.to ? ` to ${res.to}` : ''}: ${res.error || 'unknown error'}`)
  }

  const tabName = label.trim() ? `${label.trim()} Stages` : 'Service Stages'
  const field = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400'

  return (
    <div data-testid="firm-settings" data-tour="firm-main" className="max-w-3xl">
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Your firm</div>
        <div className="text-sm font-semibold">{currentUser.companyName || 'Your firm'}</div>
        <div className="text-xs text-gray-500 mt-1">Staff join with company code <span className="font-mono font-medium text-gray-700">{currentUser.company_code}</span>. You approve each new account from Notifications.</div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => onNavigate('import')} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Bring in old jobs</button>
          <button onClick={() => onNavigate('templates')} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Templates</button>
          <button onClick={() => onNavigate('microsoft')} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Microsoft 365</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Service stages and fees</div>
        <label className="text-xs text-gray-600 mb-1 block">What do you call them? <span className="text-gray-500">(optional, usually the firm's initials)</span></label>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input value={label} maxLength={20} onChange={e => { setLabel(e.target.value); touch() }} placeholder="e.g. ABC" data-testid="stage-label" className={`${field} max-w-[180px]`} />
          <div className="text-xs text-gray-500">The tab on every job will read <span className="font-medium text-gray-700">{tabName}</span>.</div>
        </div>

        <div className="space-y-2">
          {stages.map((s, index) => {
            const isOpen = open === s.id
            return (
              <div key={s.id} data-testid="stage-row" className="border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">{index + 1}</div>
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="min-w-0 flex-1 text-left">
                    <div className="text-xs font-medium truncate">{s.label || 'Unnamed stage'}</div>
                    <div className="text-xs text-gray-500">${(Number(String(s.defaultFee).replace(/[^0-9.]/g, '')) || 0).toLocaleString()} + GST · {s.items.split('\n').filter(i => i.trim()).length} checklist items</div>
                  </button>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up" className="w-7 h-7 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === stages.length - 1} aria-label="Move down" className="w-7 h-7 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">{isOpen ? 'Close' : 'Edit'}</button>
                </div>
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px] gap-3">
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Name</label>
                        <input value={s.label} onChange={e => setStage(s.id, { label: e.target.value })} placeholder="Stage 1: Preliminary advice" className={field} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Short name</label>
                        <input value={s.shortLabel} onChange={e => setStage(s.id, { shortLabel: e.target.value })} placeholder="Stage 1" className={field} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Usual fee (ex GST)</label>
                        <input value={s.defaultFee} inputMode="decimal" onChange={e => setStage(s.id, { defaultFee: e.target.value })} placeholder="0" className={field} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">One-line description</label>
                      <input value={s.description} onChange={e => setStage(s.id, { description: e.target.value })} className={field} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Checklist: the scope of works, one item per line</label>
                      <textarea value={s.items} rows={6} onChange={e => setStage(s.id, { items: e.target.value })} className={`${field} font-sans`} />
                    </div>
                    <button type="button" onClick={() => removeStage(s)} disabled={stages.length <= 1} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40">Remove this stage</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button type="button" onClick={addStage} disabled={stages.length >= MAX_STAGES} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">+ Add a stage</button>
          <button type="button" onClick={useStandard} className="px-3 py-1.5 text-xs text-gray-600 hover:underline">Use QPlan's standard three</button>
        </div>
        <div className="text-xs text-gray-500 mt-3">Fees here are where a new job starts. Each job's fees can still be changed on the job.</div>

        {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>}
        <div className="flex items-center gap-3 mt-4">
          <button onClick={save} disabled={saving || !dirty} data-testid="firm-save" className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">{saving ? 'Saving...' : 'Save changes'}</button>
          {saved && !dirty && <span className="text-xs text-emerald-700">✓ Saved. Everyone at the firm sees it the next time they open a job.</span>}
          {dirty && <span className="text-xs text-amber-600">Not saved yet</span>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4" data-testid="digest-card">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Monday email</div>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={weeklyPending ?? weeklyOn} disabled={weeklyPending !== null} onChange={e => setWeekly(e.target.checked)} data-testid="digest-switch" />
          <span>
            <span className="font-medium">Email the directors every Monday at 7am with the week's deadlines</span>
            <span className="block text-xs text-gray-500 mt-0.5">Decision dates, IR responses, public notice dates and DA stages ending in the next seven days. A week with nothing due sends nothing.</span>
          </span>
        </label>
        {digest && (
          <div className="mt-3 pl-6">
            <div className="text-xs text-gray-600 mb-2">
              {digest.recipients?.length
                ? <>Goes to: <span className="font-medium text-gray-800">{digest.recipients.join(', ')}</span></>
                : 'No director email addresses yet. Each director adds theirs under Planners > Edit my profile.'}
            </div>
            {/resend\.dev/.test(digest.from || '') && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                Not delivering to firms yet: QPlan's own email address is still being set up. You can switch this on now and it will start by itself.
              </div>
            )}
            <div className="text-xs font-medium text-gray-600 mb-1">This week's email would list {digest.items?.length || 0} date{digest.items?.length === 1 ? '' : 's'}{digest.items?.length ? ':' : '.'}</div>
            {(digest.items || []).slice(0, 8).map((d, n) => (
              <div key={n} data-testid="digest-item" className="flex gap-3 text-xs py-1 border-b border-gray-50 last:border-0">
                <span className={`w-24 flex-shrink-0 font-medium ${d.days < 0 ? 'text-red-600' : ''}`}>{d.when}</span>
                <span className="w-44 flex-shrink-0 text-gray-600 truncate">{d.what}</span>
                <span className="min-w-0 flex-1 truncate"><span className="font-medium">{d.code}</span> {d.job}</span>
              </div>
            ))}
            {(digest.items?.length || 0) > 8 && <div className="text-xs text-gray-500 mt-1">and {digest.items.length - 8} more.</div>}
            <button onClick={sendTest} disabled={digestBusy === 'test'} className="mt-3 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">{digestBusy === 'test' ? 'Sending...' : 'Send me a test now'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
