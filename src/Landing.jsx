// src/Landing.jsx
// The public front page: what QPlan does, a way to ask for access, and Log in in the top right.
// Everything said here is something the app does today.
import { useState } from 'react'
import Logo from './Logo'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'

const FEATURES = [
  ['Business-day deadlines', 'Each DA stage counts business days and skips weekends, Queensland public holidays, show days and the Christmas period.'],
  ['A folder for every job', 'Creating a job creates its OneDrive or SharePoint folder. Open and co-edit Word files straight from the job.'],
  ['Time against budget', 'A timer that follows the job you have open. See hours logged against the fee budget as you go.'],
  ['Invoices to Xero', 'Push an invoice for a job to Xero as a draft, for an individual or a company client.'],
  ['Documents from templates', 'Fee proposals, consents, reports and letters filled in from the job and the planner\'s details.'],
  ['A summary link for clients', 'Send one read-only link that shows where the job is up to. No login needed.'],
]

const TEAM_SIZES = ['Just me', '2 to 5', '6 to 15', '16 to 40', 'More than 40']

function RequestForm() {
  const [form, setForm] = useState({ contactName: '', firmName: '', email: '', phone: '', teamSize: '', message: '', website: '' })
  const [state, setState] = useState('idle') // idle | sending | sent
  const [error, setError] = useState('')
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const input = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400'

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
      if (!data.success) { setError(data.error || 'Could not send your request. Please try again.'); setState('idle'); return }
      setState('sent')
    } catch {
      setError('Could not send your request. Check your internet connection and try again.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 text-lg font-semibold">✓</div>
        <div className="text-base font-semibold text-gray-800 mb-1">Thanks. We have your details.</div>
        <div className="text-sm text-gray-600">We will be in touch to set up a time.</div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-3 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="lead-name" className="block text-xs font-medium text-gray-600 mb-1">Your name</label>
          <input id="lead-name" className={input} value={form.contactName} onChange={e => set('contactName', e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="lead-firm" className="block text-xs font-medium text-gray-600 mb-1">Firm</label>
          <input id="lead-firm" className={input} value={form.firmName} onChange={e => set('firmName', e.target.value)} autoComplete="organization" />
        </div>
        <div>
          <label htmlFor="lead-email" className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input id="lead-email" type="email" className={input} value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="lead-phone" className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
          <input id="lead-phone" type="tel" className={input} value={form.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" />
        </div>
      </div>
      <div>
        <label htmlFor="lead-size" className="block text-xs font-medium text-gray-600 mb-1">How many people would use QPlan? (optional)</label>
        <select id="lead-size" className={input} value={form.teamSize} onChange={e => set('teamSize', e.target.value)}>
          <option value="">Choose...</option>
          {TEAM_SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="lead-message" className="block text-xs font-medium text-gray-600 mb-1">Anything we should know? (optional)</label>
        <textarea id="lead-message" rows={3} className={input} value={form.message} onChange={e => set('message', e.target.value)} />
      </div>
      {/* Hidden from people. Automated form-fillers complete it, and those requests are dropped. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => set('website', e.target.value)}
        className="hidden" aria-hidden="true" />
      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>}
      <button type="submit" disabled={state === 'sending'}
        className="w-full py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
        {state === 'sending' ? 'Sending...' : 'Book a demo'}
      </button>
    </form>
  )
}

export default function Landing({ onLogin }) {
  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 mr-auto">
            <Logo className="h-8 w-auto" />
          </div>
          <button onClick={() => goTo('features')} className="hidden sm:block text-sm text-gray-600 hover:text-gray-900">Features</button>
          <button onClick={() => goTo('demo')} className="hidden sm:block text-sm text-gray-600 hover:text-gray-900">Contact</button>
          <button onClick={onLogin} className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">Log in</button>
          <button onClick={() => goTo('demo')} className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Book a demo</button>
        </div>
      </header>

      {/* Hero: brand colours, the same in light and dark */}
      <section className="bg-[#0E5A43] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-[#F6B73C] mb-4">Practice management for town planners</div>
            <h1 className="text-4xl sm:text-6xl font-semibold leading-[1.05] tracking-tight mb-5">
              Less Process<br /><span className="text-[#F6B73C]">More Progress</span>
            </h1>
            <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-xl mb-7">
              Every job, deadline and document in one place. QPlan runs your development applications from fee proposal to final invoice, and counts statutory deadlines in business days for you.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => goTo('demo')} className="px-5 py-3 text-sm font-semibold bg-[#E9A21B] text-[#0B2A20] rounded-lg hover:bg-[#F6B73C]">Book a demo</button>
              <button onClick={() => goTo('features')} className="px-5 py-3 text-sm font-semibold border border-white/40 rounded-lg hover:bg-white/10">See how it works</button>
            </div>
          </div>

          {/* A real screen from the app, drawn small */}
          <div className="bg-white text-gray-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
            <div className="text-sm font-semibold">Example Client - 12 Example Street 2026-012</div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-gray-600">Public notification · 15 business days</div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Active</span>
            </div>
            <div className="flex gap-1.5 mt-3">
              <div className="flex-1 h-2 rounded-full bg-emerald-500" />
              <div className="flex-1 h-2 rounded-full bg-emerald-500" />
              <div className="flex-1 h-2 rounded-full bg-emerald-500" />
              <div className="flex-1 h-2 rounded-full bg-amber-400" />
              <div className="flex-1 h-2 rounded-full bg-gray-200" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg px-3 py-2"><div className="text-xs text-gray-500">Start</div><div className="text-sm font-medium">10 Dec 2026</div></div>
              <div className="bg-gray-50 rounded-lg px-3 py-2"><div className="text-xs text-gray-500">End</div><div className="text-sm font-medium">18 Jan 2027</div></div>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold text-emerald-600 mt-4">12 business days remaining</div>
            <div className="text-xs text-gray-600 mt-1">Skipped: weekends and the Christmas break for public notification, 20 Dec to 5 Jan.</div>
          </div>
        </div>
      </section>

      {/* Works with */}
      <section className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-gray-600">
          <span className="font-medium text-gray-800">Built in Queensland around the Planning Act 2016</span>
          <span className="sm:ml-auto">Works with</span>
          <span className="font-semibold text-gray-800">Microsoft 365</span>
          <span className="font-semibold text-gray-800">OneDrive</span>
          <span className="font-semibold text-gray-800">Outlook</span>
          <span className="font-semibold text-gray-800">Xero</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight mb-8 sm:mb-10">Built around how planning firms work.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(([title, text]) => (
              <div key={title} className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <div className="text-base font-semibold mb-1.5">{title}</div>
                <div className="text-sm text-gray-600 leading-relaxed">{text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request access */}
      <section id="demo" className="bg-gray-50 border-t border-gray-200 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight mb-3">See QPlan with your own jobs.</h2>
            <p className="text-base text-gray-600 leading-relaxed max-w-md">
              Tell us a little about your firm. We will set up a time, walk you through it, and get your team in.
            </p>
            <p className="text-sm text-gray-600 mt-6">
              Already use QPlan? <button onClick={onLogin} className="text-emerald-600 font-medium hover:underline">Log in</button>
            </p>
          </div>
          <RequestForm />
        </div>
      </section>

      <footer className="bg-[#0B2A20] text-white/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Logo className="h-6 w-auto" tone="on-dark" />
          <span>Less Process More Progress</span>
          <button onClick={onLogin} className="ml-auto hover:text-white underline underline-offset-2">Log in</button>
        </div>
      </footer>
    </div>
  )
}
