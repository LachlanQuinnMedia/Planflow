// src/JobSummary.jsx
// Read-only summary of one job, opened from a share link: /summary/<token>
// No login. The data comes from the get_job_summary database function, which only
// returns a job when the link's token matches.

import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { DA_STAGES } from './daStages'
import { normaliseFirm } from './firm'
import { appTypeFull, buildJobName, clientName, contactName, isCompanyClient } from './jobMeta'
import { deadlineStatus, stageDayRules } from './businessDays'

const statusColors = {
  Draft: 'bg-gray-200 text-gray-700',
  Active: 'bg-emerald-100 text-emerald-700',
  Review: 'bg-amber-100 text-amber-700',
  'On Hold': 'bg-red-100 text-red-700',
  Complete: 'bg-green-100 text-green-700',
}

const stageTone = {
  complete: { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Complete' },
  active: { dot: 'bg-amber-400', text: 'text-amber-700', label: 'In progress' },
  pending: { dot: 'bg-gray-300', text: 'text-gray-500', label: 'Not started' },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return String(dateStr)
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-AU', {
    timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`bg-white rounded-xl border border-gray-200 p-5 break-inside-avoid ${className}`}>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value, href }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <div className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</div>
      <div className="text-xs text-gray-800 min-w-0 break-words">
        {href ? <a href={href} className="text-emerald-700 hover:underline">{value}</a> : value}
      </div>
    </div>
  )
}

function Shell({ company, children }) {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-800">{company || 'Job summary'}</div>
          <div className="text-xs text-gray-500">Job summary</div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  )
}

export default function JobSummary({ token }) {
  const [state, setState] = useState('loading') // loading | ready | missing | error
  const [job, setJob] = useState(null)
  const [stageDefs, setStageDefs] = useState(null) // the firm's own stage names, when it has set them

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [{ data, error }, stagesRes] = await Promise.all([
        supabase.rpc('get_job_summary', { p_token: token }),
        supabase.rpc('get_job_summary_stages', { p_token: token }),
      ])
      if (cancelled) return
      if (error) { setState('error'); return }
      if (!data) { setState('missing'); return }
      if (Array.isArray(stagesRes?.data?.stage_defs)) setStageDefs(stagesRes.data.stage_defs)
      setJob(data)
      setState('ready')
      document.title = `${buildJobName(data) || data.code} · Job summary`
    }
    load()
    return () => { cancelled = true }
  }, [token])

  if (state === 'loading') {
    return <Shell><div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">Loading job summary...</div></Shell>
  }

  if (state === 'missing' || state === 'error') {
    return (
      <Shell>
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="text-sm font-semibold text-gray-800 mb-1">
            {state === 'missing' ? 'This summary link is not active' : 'The summary could not be loaded'}
          </div>
          <div className="text-xs text-gray-500 max-w-sm mx-auto">
            {state === 'missing'
              ? 'The link may have been turned off or replaced. Ask the person who sent it for a new one.'
              : 'Check your connection and reload the page. If it keeps happening, ask the person who sent the link.'}
          </div>
        </div>
      </Shell>
    )
  }

  const serviceStages = normaliseFirm({ stages: stageDefs }).stages
  const council = job.council
  const company = isCompanyClient(job)
  const daStages = job.da_stages || {}
  const hpcStages = job.hpc_stages || {}
  const hasDa = DA_STAGES.some(s => daStages[s.id] && (daStages[s.id].status !== 'pending' || daStages[s.id].startDate || daStages[s.id].endDate))
  const hasHpc = serviceStages.some(s => hpcStages[s.id])
  const keyDates = [
    ['Lodged', job.lodgement_date],
    ['Confirmation notice', job.key_dates?.confirmation],
    ['IR response due', job.key_dates?.ir_response],
    ['Referral agency response', job.key_dates?.referral],
    ['Public notice start', job.key_dates?.public_notice_start],
    ['Public notice end', job.key_dates?.public_notice_end],
    ['Statutory decision date', job.key_dates?.decision],
    ['Decision due', job.decision_due_date],
  ].filter(([, v]) => v)

  const budget = Number(job.budget_hours) || 0
  const logged = Number(job.hours_logged) || 0
  const pct = budget > 0 ? Math.round((logged / budget) * 100) : null

  return (
    <Shell company={job.company}>
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 leading-snug break-words">{buildJobName(job) || job.code}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {job.status && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-600'}`}>{job.status}</span>}
            {job.app_type && <span className="text-xs text-gray-600">{appTypeFull(job.app_type)}</span>}
            {job.assessment_level && <span className="text-xs text-gray-500">· {job.assessment_level}</span>}
          </div>
        </div>
        <button onClick={() => window.print()} className="print:hidden px-3 py-1.5 text-xs border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-600 flex-shrink-0">
          Print or save as PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Client">
          <Row label={company ? 'Company' : 'Client'} value={clientName(job)} />
          {company && <Row label="Contact" value={contactName(job)} />}
          <Row label="Email" value={job.client_email} href={job.client_email ? `mailto:${job.client_email}` : undefined} />
          <Row label="Phone" value={job.client_phone} href={job.client_phone ? `tel:${String(job.client_phone).replace(/\s+/g, '')}` : undefined} />
        </Card>

        <Card title="Site">
          <Row label="Address" value={job.address} />
          <Row label="Lot / RP" value={job.lot_reference} />
          <Row label="Council" value={job.council} />
          <Row label="Zone" value={job.zone} />
        </Card>

        <Card title="Application">
          <Row label="Job number" value={job.code} />
          <Row label="Type" value={appTypeFull(job.app_type)} />
          <Row label="Assessment" value={job.assessment_level} />
          <Row label="Proposed use" value={job.proposed_use} />
          <Row label="Referral agencies" value={job.referral_agencies} />
        </Card>

        <Card title="Project team">
          {(job.team || []).length === 0 ? (
            <div className="text-xs text-gray-500">No planners assigned yet.</div>
          ) : (job.team || []).map((p, i) => (
            <div key={`${p.username}-${i}`} className="py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-800">{p.name}</span>
                {p.lead && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">Lead</span>}
              </div>
              {p.position && <div className="text-xs text-gray-600">{p.position}</div>}
              <div className="text-xs text-gray-600 flex gap-x-3 flex-wrap">
                {p.email && <a href={`mailto:${p.email}`} className="text-emerald-700 hover:underline">{p.email}</a>}
                {p.phone && <a href={`tel:${String(p.phone).replace(/\s+/g, '')}`} className="text-emerald-700 hover:underline">{p.phone}</a>}
              </div>
            </div>
          ))}
        </Card>

        {keyDates.length > 0 && (
          <Card title="Key dates">
            {keyDates.map(([label, value]) => <Row key={label} label={label} value={formatDate(value)} />)}
          </Card>
        )}

        {hasHpc && (
          <Card title="Service stages">
            {serviceStages.map(stage => {
              const data = hpcStages[stage.id] || {}
              const tone = stageTone[data.status] || stageTone.pending
              const total = stage.items?.length || 0
              const done = data.status === 'complete' ? total : Math.min((data.checkedItems || []).length, total)
              return (
                <div key={stage.id} className="py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${tone.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-800">{stage.label}</div>
                      <div className={`text-xs ${tone.text}`}>
                        {tone.label}
                        {total > 0 && <span className="text-gray-500"> · {done} of {total} tasks done</span>}
                        {data.completedDate && <span className="text-gray-500"> · {formatDate(data.completedDate)}</span>}
                      </div>
                    </div>
                    {job.include_budget && data.fee !== undefined && data.fee !== null && data.fee !== '' && (
                      <div className="text-xs text-gray-600 flex-shrink-0">${Number(data.fee).toLocaleString('en-AU')}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </Card>
        )}

        {job.include_budget && (
          <Card title="Time and budget">
            <Row label="Budget" value={budget > 0 ? `${budget} hours` : 'Not set'} />
            <Row label="Hours logged" value={`${logged.toFixed(1)} hours`} />
            {pct !== null && (
              <div className="mt-3">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : pct > 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{pct}% of budget used</div>
              </div>
            )}
          </Card>
        )}

        {hasDa && (
          <Card title="Development application stages" className="md:col-span-2">
            <div className="flex items-center gap-1 mb-4">
              {DA_STAGES.map(stage => {
                const status = daStages[stage.id]?.status || 'pending'
                return <div key={stage.id} className={`flex-1 h-2 rounded-full ${status === 'complete' ? 'bg-emerald-500' : status === 'active' ? 'bg-amber-400' : 'bg-gray-200'}`} />
              })}
            </div>
            {DA_STAGES.map(stage => {
              const data = daStages[stage.id] || {}
              const tone = stageTone[data.status] || stageTone.pending
              const left = data.status === 'active' && data.endDate && !data.isStopped ? deadlineStatus(data.endDate, council, stageDayRules(stage.id)) : null
              return (
                <div key={stage.id} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${tone.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-800">{stage.label}</div>
                    <div className="text-xs text-gray-500">{stage.description}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-medium ${tone.text}`}>
                      {data.isStopped ? 'Clock stopped' : tone.label}
                    </div>
                    {(data.startDate || data.endDate) && (
                      <div className="text-xs text-gray-500">
                        {[data.startDate && formatDate(data.startDate), data.endDate && formatDate(data.endDate)].filter(Boolean).join(' to ')}
                      </div>
                    )}
                    {left && <div className={`text-xs ${left.overdue ? 'text-red-600' : 'text-gray-600'}`}>{left.label}</div>}
                  </div>
                </div>
              )
            })}
          </Card>
        )}

        {job.include_notes && job.notes && (
          <Card title="Notes" className="md:col-span-2">
            <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{job.notes}</div>
          </Card>
        )}
      </div>

      <footer className="text-xs text-gray-500 mt-6 text-center leading-relaxed">
        Live summary from QPlan{job.company ? ` for ${job.company}` : ''}. Shows the job as at {formatDateTime(job.generated_at)} (Brisbane time). Reload the page for the latest.
      </footer>
    </Shell>
  )
}
