// src/site/DemoForm.jsx
// The "Book a demo" form. It sends the details to QPlan's public demo-request function.
import { useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../publicKeys'

const TEAM_SIZES = ['Just me', '2 to 5', '6 to 15', '16 to 40', 'More than 40']

export default function DemoForm() {
  const [form, setForm] = useState({ contactName: '', firmName: '', email: '', phone: '', teamSize: '', message: '', website: '' })
  const [state, setState] = useState('idle') // idle | sending | sent
  const [error, setError] = useState('')
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.contactName.trim() || !form.firmName.trim() || !form.email.trim()) { setError('Please enter your name, your firm and your email.'); return }
    setState('sending'); setError('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.success) { setError(data.error || 'Your request was not sent. Please try again.'); setState('idle'); return }
      setState('sent')
    } catch {
      setError('Your request was not sent. Check your internet connection and try again.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <div className="qs-panel" role="status" data-testid="demo-sent">
        <div className="qs-h3 qs-wide">Thanks. We have your details.</div>
        <p className="mt-2 qs-soft">We will be in touch to set up a time.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="qs-panel grid gap-4" noValidate data-testid="demo-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-name" className="qs-label">Your name</label>
          <input id="lead-name" className="qs-field" value={form.contactName} onChange={e => set('contactName', e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="lead-firm" className="qs-label">Firm</label>
          <input id="lead-firm" className="qs-field" value={form.firmName} onChange={e => set('firmName', e.target.value)} autoComplete="organization" />
        </div>
        <div>
          <label htmlFor="lead-email" className="qs-label">Email</label>
          <input id="lead-email" type="email" className="qs-field" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="lead-phone" className="qs-label">Phone (optional)</label>
          <input id="lead-phone" type="tel" className="qs-field" value={form.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" />
        </div>
      </div>
      <div>
        <label htmlFor="lead-size" className="qs-label">How many people would use QPlan? (optional)</label>
        <select id="lead-size" className="qs-field" value={form.teamSize} onChange={e => set('teamSize', e.target.value)}>
          <option value="">Choose...</option>
          {TEAM_SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="lead-message" className="qs-label">Anything we should know? (optional)</label>
        <textarea id="lead-message" rows={3} className="qs-field" value={form.message} onChange={e => set('message', e.target.value)} />
      </div>
      {/* Hidden from people. Automated form-fillers complete it, and those requests are dropped. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => set('website', e.target.value)} className="hidden" aria-hidden="true" />
      {error && <div role="alert" className="qs-small" style={{ color: '#B42318', fontWeight: 600 }}>{error}</div>}
      <button type="submit" disabled={state === 'sending'} className="qs-btn qs-btn-green w-full disabled:opacity-60">
        {state === 'sending' ? 'Sending...' : 'Book a demo'}
      </button>
    </form>
  )
}
