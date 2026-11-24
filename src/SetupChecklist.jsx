// src/SetupChecklist.jsx
// A new firm's first week: the handful of things a director sets up once. It sits at the top of
// the director's Dashboard, ticks each step off by itself, and goes away when it is all done
// (or when a director hides it).
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useFirm, saveFirm } from './firm'
import { callGraph } from './OneDriveBrowser'
import { isXeroConnected } from './xero'

export default function SetupChecklist({ currentUser, onNavigate }) {
  const firm = useFirm()
  const [facts, setFacts] = useState(null)
  const [hiding, setHiding] = useState(false)
  const hidden = !!firm.setup.hidden
  const companyId = currentUser?.company_id

  useEffect(() => {
    if (hidden || !companyId) return
    let cancelled = false
    Promise.all([
      supabase.from('app_users').select('id', { count: 'exact', head: true }).eq('is_approved', true).not('is_platform_admin', 'is', true),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      callGraph('status', { company_id: companyId }).catch(() => ({})),
      isXeroConnected().catch(() => false),
    ]).then(([staff, jobs, ms, xero]) => {
      if (cancelled) return
      setFacts({ staff: staff.count || 0, jobs: jobs.count || 0, ms: !!ms?.connected, folder: !!ms?.jobsFolder, xero: !!xero })
    })
    return () => { cancelled = true }
  }, [hidden, companyId])

  if (hidden || !facts) return null

  const steps = [
    { id: 'team', done: facts.staff >= 2, title: 'Get your team in', page: 'planners',
      body: <>Staff click Create account and enter company code <span className="font-mono font-medium text-gray-700">{currentUser.company_code}</span>. You approve each one from Notifications.</> },
    { id: 'ms', done: facts.ms, title: 'Connect Microsoft 365', page: 'microsoft', body: 'Your firm\'s OneDrive or SharePoint, so every job opens onto its own folder.' },
    { id: 'folder', done: facts.folder, title: 'Choose where job folders go', page: 'newjob', body: 'On New Job, pick the folder that holds all your job folders. QPlan makes one for each new job.' },
    { id: 'stages', done: firm.ownStages, title: 'Set your stages and fees', page: 'firm', body: 'Your service stages, usual fees and scope of works. New jobs start from them.' },
    { id: 'templates', done: firm.templates.length > 0, title: 'Add your templates', page: 'templates', body: 'The Word documents you send again and again. QPlan fills in the client, the site and the planner.' },
    { id: 'xero', done: facts.xero, title: 'Connect Xero', page: 'xero', body: 'Push invoices from a job straight into your books.' },
    { id: 'jobs', done: facts.jobs > 0, title: 'Bring in your jobs', page: 'import', body: 'Import your old jobs in one go, from your job folders or a file. Or skip this and create your first job.' },
  ]
  const done = steps.filter(s => s.done).length
  if (done === steps.length) return null

  const hide = async () => {
    setHiding(true)
    try { await saveFirm(companyId, { setup: { ...firm.setup, hidden: true } }, currentUser.username); await firm.reload() } catch { /* stays as it was */ }
    setHiding(false)
  }

  return (
    <div data-testid="setup-checklist" className="bg-white rounded-xl border border-emerald-200 p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div className="text-sm font-semibold">Set up {currentUser.companyName || 'your firm'}</div>
        <button onClick={hide} disabled={hiding} className="text-xs text-gray-500 hover:text-gray-700 hover:underline">{hiding ? 'Hiding...' : 'Hide this'}</button>
      </div>
      <div className="text-xs text-gray-500 mb-3">{done} of {steps.length} done. Each one ticks itself off.</div>
      <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {steps.map(step => (
          <div key={step.id} data-testid={`setup-${step.id}`} data-done={step.done} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${step.done ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${step.done ? 'bg-emerald-600 text-white' : 'border border-gray-300 text-transparent'}`}>✓</div>
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-medium ${step.done ? 'text-gray-500 line-through' : ''}`}>{step.title}</div>
              {!step.done && <div className="text-xs text-gray-500 mt-0.5">{step.body}</div>}
            </div>
            {!step.done && <button onClick={() => onNavigate(step.page)} className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 flex-shrink-0">Open</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
