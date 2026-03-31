import { useState } from 'react'
import { generatePlanningReport, generateIRResponse, generateEngagementLetter, generateInvoice } from './docGenerator'

const job = {
  code: '2025-031',
  name: 'Ridgeline Mixed-Use MCU',
  address: '44 Ridge St, Toowoomba QLD 4350',
  lot: 'Lot 7 SP123456',
  council: 'Toowoomba Regional',
  zone: 'Medium Density Residential',
  client: 'Jonas Hartmann',
  email: 'j.hartmann@hdev.com.au',
  phone: '0421 987 654',
  type: 'MCU',
  use: 'Mixed-use — retail GF + 12 units',
  assessment: 'Impact Assessable',
  planner: 'Sarah Barnes',
  rate: 185,
  budgetHrs: 60,
  usedHrs: 49.2,
  lodgement: '10 Jan 2025',
  decisionDue: '10 Apr 2025',
  referrals: 'DTMR, TRC Engineering',
  status: 'Active',
  dates: {
    confirmation: '25 Jan 2025',
    irResponse: '19 Mar 2025',
    referral: '26 Mar 2025',
    publicNoticeStart: null,
    publicNoticeEnd: null,
    decision: '10 Apr 2025',
  }
}

const typeBadge = {
  MCU: 'bg-blue-100 text-blue-700',
  ROL: 'bg-amber-100 text-amber-700',
  RAA: 'bg-pink-100 text-pink-700',
  OW: 'bg-green-100 text-green-700',
  SPS: 'bg-purple-100 text-purple-700',
}

const docs = [
  { icon: 'W', name: 'Planning Report — Ridgeline MCU', meta: '14 Mar · Sarah B.', version: 'Rev C', color: 'bg-blue-100 text-blue-700' },
  { icon: 'W', name: 'IR Response — TRC IR #1', meta: '10 Mar · Sarah B. · Due tomorrow', version: 'Rev A', color: 'bg-blue-100 text-blue-700', urgent: true },
  { icon: 'W', name: 'IR Response — DTMR Referral Agency', meta: 'Not started · Due 26 Mar', version: null, color: 'bg-blue-100 text-blue-700' },
  { icon: '$', name: 'Invoice #INV-2025-031-01', meta: 'Issued 15 Feb · $5,550 · Paid', version: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  { icon: 'P', name: 'Architectural Plans Rev B', meta: 'Uploaded 5 Mar · Architect', version: 'Rev B', color: 'bg-amber-100 text-amber-700' },
]

const timelog = [
  { task: 'Pre-lodgement & research', hrs: 6.0 },
  { task: 'Planning report — draft', hrs: 12.0 },
  { task: 'Planning report — revisions', hrs: 4.5 },
  { task: 'IR #1 drafting (TRC)', hrs: 8.0 },
  { task: 'Client meetings & calls', hrs: 5.5 },
  { task: 'Council liaison', hrs: 7.2 },
  { task: 'Administration', hrs: 6.0 },
]

const history = [
  { title: 'Planning Report Rev C uploaded', sub: '14 Mar 2025 · Sarah B.', type: 'doc' },
  { title: 'IR #2 (DTMR) received & logged', sub: '12 Mar 2025 · System', type: 'system' },
  { title: 'Client call — J. Hartmann re: car parking', sub: '10 Mar 2025 · Sarah B. · 0.5 hrs logged', type: 'call' },
  { title: 'IR #1 response draft saved (Rev A)', sub: '10 Mar 2025 · Sarah B.', type: 'doc' },
  { title: 'Invoice #INV-2025-031-01 — Paid', sub: '2 Mar 2025 · $5,550', type: 'paid' },
  { title: 'Application lodged with TRC', sub: '10 Jan 2025 · Sarah B.', type: 'system' },
  { title: 'Job created · docs auto-generated', sub: '5 Jan 2025 · System', type: 'system' },
]

const templatesByType = {
  MCU: ['MCU Planning Report', 'MCU IR Response', 'MCU Client Engagement Letter', 'Tax Invoice'],
  ROL: ['ROL Planning Report', 'ROL IR Response', 'ROL Engagement Letter', 'Tax Invoice'],
  RAA: ['RAA Response Report', 'Referral Agency Submission', 'Tax Invoice'],
  OW: ['OW Planning Report', 'OW Compliance Report', 'Tax Invoice'],
  SPS: ['SPS Request Report', 'SPS Supporting Statement', 'Tax Invoice'],
}

const jobForDocs = {
  code: job.code,
  name: job.name,
  address: job.address,
  lot_reference: job.lot,
  council: job.council,
  zone: job.zone,
  client_first_name: 'Jonas',
  client_last_name: 'Hartmann',
  client_email: job.email,
  client_phone: job.phone,
  app_type: job.type,
  assessment_level: job.assessment,
  proposed_use: job.use,
  referral_agencies: job.referrals,
  planner: job.planner,
  planner_rate: job.rate,
  budget_hours: job.budgetHrs,
}

export default function JobDetail({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState([])
  const [generated, setGenerated] = useState([])
  const [generating, setGenerating] = useState(false)
  const [jobStatus, setJobStatus] = useState(job.status)
  const [editingDates, setEditingDates] = useState(false)
  const [dates, setDates] = useState(job.dates)

  const budgetPct = Math.round((job.usedHrs / job.budgetHrs) * 100)
  const budgetCost = job.usedHrs * job.rate
  const totalBudget = job.budgetHrs * job.rate
  const tabs = ['overview', 'documents', 'time & budget', 'ir & notes', 'history']

  const toggleTemplate = (t) => {
    setSelectedTemplates(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  const handleGenerate = async () => {
    if (selectedTemplates.length === 0) { alert('Please select at least one template.'); return }
    setGenerating(true)
    setShowGenerate(false)
    for (const template of selectedTemplates) {
      if (template.includes('Planning Report') || template.includes('planning report')) await generatePlanningReport(jobForDocs)
      if (template.includes('IR Response') || template.includes('IR response')) await generateIRResponse(jobForDocs, 1)
      if (template.includes('Engagement Letter') || template.includes('Engagement letter')) await generateEngagementLetter(jobForDocs)
      if (template.includes('Invoice')) await generateInvoice(jobForDocs)
    }
    setGenerated(selectedTemplates)
    setSelectedTemplates([])
    setGenerating(false)
    setActiveTab('documents')
  }

  const statusColors = {
    Draft: 'bg-gray-100 text-gray-600',
    Active: 'bg-emerald-100 text-emerald-700',
    Review: 'bg-amber-100 text-amber-700',
    'On Hold': 'bg-red-100 text-red-700',
    Complete: 'bg-green-100 text-green-700',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => onNavigate('jobs')} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">← Back</button>
        <div className="flex-1">
          <div className="text-base font-semibold">{job.code} — {job.name}</div>
          <div className="text-xs text-gray-400">{job.address} · {job.lot} · {job.council}</div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">{job.type}</span>
        <select
          value={jobStatus}
          onChange={e => { setJobStatus(e.target.value); alert('Status updated to: ' + e.target.value) }}
          className={`text-xs px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400 font-medium ${statusColors[jobStatus]}`}
        >
          <option>Draft</option>
          <option>Active</option>
          <option>Review</option>
          <option>On Hold</option>
          <option>Complete</option>
        </select>
        <button onClick={() => setShowGenerate(true)} disabled={generating} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          {generating ? 'Generating...' : '⬡ Generate docs'}
        </button>
      </div>

      {/* Generate docs modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-5 w-96 max-h-96 overflow-y-auto">
            <div className="text-sm font-semibold mb-1">Generate documents</div>
            <div className="text-xs text-gray-400 mb-4">For {job.code} — {job.name}. All client details pre-filled. Files download to your computer.</div>
            <div className="text-xs font-medium text-gray-500 mb-2">Select templates:</div>
            {(templatesByType[job.type] || []).map(t => (
              <div key={t} onClick={() => toggleTemplate(t)} className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 cursor-pointer text-xs transition-colors ${selectedTemplates.includes(t) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedTemplates.includes(t) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                  {selectedTemplates.includes(t) && <span className="text-white text-xs">✓</span>}
                </div>
                {t}
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowGenerate(false)} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleGenerate} className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                Generate {selectedTemplates.length > 0 ? `(${selectedTemplates.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{tab}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client details</div>
              {[
                ['Client', job.client], ['Email', job.email], ['Phone', job.phone],
                ['Address', job.address], ['Lot / RP', job.lot], ['Council', job.council], ['Zone', job.zone]
              ].map(([k, v]) => (
                <div key={k} className="flex py-1.5 border-b border-gray-50 last:border-0">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">{k}</div>
                  <div className="text-xs">{v}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Application details</div>
              {[
                ['Type', job.type], ['Proposed use', job.use], ['Assessment', job.assessment],
                ['Planner', job.planner], ['Rate', `$${job.rate}/hr`],
                ['Budget', `${job.budgetHrs} hrs ($${totalBudget.toLocaleString()})`],
                ['Lodgement', job.lodgement], ['Decision due', job.decisionDue], ['Referrals', job.referrals]
              ].map(([k, v]) => (
                <div key={k} className="flex py-1.5 border-b border-gray-50 last:border-0">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">{k}</div>
                  <div className="text-xs">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Budget snapshot</div>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{job.usedHrs} hrs used</span><span>{job.budgetHrs} hrs budget</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                </div>
              </div>
              <div className={`text-xs font-medium ${budgetPct > 90 ? 'text-red-600' : budgetPct > 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {budgetPct}% · ${budgetCost.toLocaleString()} of ${totalBudget.toLocaleString()}
              </div>
            </div>
            {budgetPct > 75 && (
              <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg mt-2">
                IR response outstanding — due tomorrow. Est. 4 hrs remaining will push to 89% budget utilisation.
              </div>
            )}
          </div>

          {/* Key dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Key dates</div>
              <button onClick={() => setEditingDates(!editingDates)} className="text-xs text-emerald-600 hover:underline">
                {editingDates ? 'Save dates' : 'Edit dates'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6">
              {[
                { label: 'Confirmation notice', key: 'confirmation' },
                { label: 'IR response due', key: 'irResponse' },
                { label: 'Referral agency response', key: 'referral' },
                { label: 'Public notice start', key: 'publicNoticeStart' },
                { label: 'Public notice end', key: 'publicNoticeEnd' },
                { label: 'Statutory decision date', key: 'decision' },
              ].map(d => (
                <div key={d.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="text-xs text-gray-400">{d.label}</div>
                  {editingDates ? (
                    <input
                      type="date"
                      value={dates[d.key] || ''}
                      onChange={e => setDates(prev => ({ ...prev, [d.key]: e.target.value }))}
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-emerald-400"
                    />
                  ) : (
                    <div className={`text-xs font-medium ${dates[d.key] ? 'text-gray-700' : 'text-gray-300'}`}>
                      {dates[d.key] || 'Not set'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documents</div>
            <div className="flex gap-2">
              <button onClick={() => setShowGenerate(true)} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">⬡ Generate docs</button>
              <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">↑ Upload</button>
            </div>
          </div>
          {generated.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-emerald-600 mb-2">Recently generated — check your downloads folder</div>
              {generated.map((g, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-emerald-100 bg-emerald-50 rounded-lg px-3 mb-1">
                  <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700 flex-shrink-0">W</div>
                  <div className="flex-1 text-xs font-medium">{g}</div>
                  <span className="text-xs text-emerald-600 font-medium">Downloaded ✓</span>
                </div>
              ))}
            </div>
          )}
          {docs.map((doc, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 ${doc.color}`}>{doc.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{doc.name}</div>
                <div className={`text-xs ${doc.urgent ? 'text-red-500' : 'text-gray-400'}`}>{doc.meta}</div>
              </div>
              {doc.version && <span className={`text-xs font-medium ${doc.urgent ? 'text-red-500' : 'text-emerald-600'}`}>{doc.version}</span>}
              {!doc.version && <button onClick={() => setShowGenerate(true)} className="px-2 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">⬡ Generate</button>}
              <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">{doc.icon === '$' ? 'View' : 'Edit'}</button>
              <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Versions</button>
            </div>
          ))}
        </div>
      )}

      {/* TIME & BUDGET */}
      {activeTab === 'time & budget' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Time log</div>
            {timelog.map((t, i) => (
              <div key={i} className="flex items-center py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1 text-xs">{t.task}</div>
                <div className="text-xs font-medium w-12 text-right">{t.hrs} hrs</div>
                <div className="text-xs text-gray-400 w-16 text-right">${(t.hrs * job.rate).toLocaleString()}</div>
              </div>
            ))}
            <div className="flex items-center py-2 mt-1 border-t border-gray-200">
              <div className="flex-1 text-xs font-semibold">Total logged</div>
              <div className="text-xs font-semibold w-12 text-right">{job.usedHrs} hrs</div>
              <div className="text-xs font-semibold text-emerald-600 w-16 text-right">${budgetCost.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Remaining budget', value: `$${((job.budgetHrs - job.usedHrs) * job.rate).toLocaleString()}`, sub: `${(job.budgetHrs - job.usedHrs).toFixed(1)} hrs at $${job.rate}/hr`, color: 'text-amber-600' },
              { label: 'Est. hours to complete', value: '~12 hrs', sub: 'IR #1 final + IR #2 DTMR', color: 'text-gray-800' },
              { label: 'Projected variance', value: '-$222', sub: 'Slight over-run likely', color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                <div className={`text-xl font-semibold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IR & NOTES */}
      {activeTab === 'ir & notes' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Information requests</div>
          {[
            { title: 'IR #1 — TRC Information Request', sub: 'Received 5 Mar · Response due 19 Mar', status: 'Draft ready', urgent: true },
            { title: 'IR #2 — DTMR Referral Agency', sub: 'Received 12 Mar · Response due 26 Mar', status: 'Not started', urgent: false },
          ].map((ir, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
              <div className="flex-1">
                <div className="text-xs font-medium">{ir.title}</div>
                <div className={`text-xs ${ir.urgent ? 'text-red-500' : 'text-gray-400'}`}>{ir.sub}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ir.urgent ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{ir.status}</span>
              <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">{ir.urgent ? 'Edit response' : 'Auto-draft'}</button>
            </div>
          ))}
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">Job notes</div>
          <textarea
            defaultValue="19/03 - Council officer (M. Walsh) confirmed no objection to car parking variation subject to traffic report. Advised client to instruct traffic engineer ASAP. SB."
            className="w-full h-24 px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-emerald-400"
          />
        </div>
      )}

      {/* HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Activity history</div>
          {history.map((h, i) => (
            <div key={i} className="flex gap-3 mb-3 last:mb-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${h.type === 'paid' ? 'bg-emerald-500' : h.type === 'call' ? 'bg-blue-500' : h.type === 'doc' ? 'bg-purple-500' : 'bg-gray-300'}`} />
              <div>
                <div className="text-xs font-medium">{h.title}</div>
                <div className="text-xs text-gray-400">{h.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}