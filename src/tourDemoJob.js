// src/tourDemoJob.js
// The example job the tutorial opens when a firm has no jobs of its own yet.
//
// It is never saved. It only exists on the screen while the tutorial is running, so the
// tutorial can walk through every tab of a job on day one. The job page checks `demo`
// and does not read or write the database for it.

export const DEMO_JOB_ID = '00000000-0000-4000-8000-0000000000aa'

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysFrom = (now, n) => { const d = new Date(now); d.setDate(d.getDate() + n); return d }

export function buildDemoJob(currentUser, now = new Date()) {
  const planner = String(currentUser?.username || '').trim() || 'You'
  const year = now.getFullYear()
  const at = (n, hour = 9) => { const d = daysFrom(now, n); d.setHours(hour, 15, 0, 0); return d.toISOString() }
  return {
    id: DEMO_JOB_ID,
    demo: true,
    company_id: currentUser?.company_id || null,
    code: `${year}-000`,
    name: `Example Client - 12 Example Street, Brisbane ${year}-000`,
    client_type: 'individual', client_company: null,
    client_first_name: 'Example', client_last_name: 'Client',
    client_email: 'client@example.com', client_phone: '0400 000 000',
    address: '12 Example Street, Brisbane QLD 4000',
    lot_reference: 'Lot 1 RP000000',
    council: 'Brisbane City Council',
    zone: 'Low density residential',
    app_type: 'MCU',
    assessment_level: 'Code Assessable',
    proposed_use: 'Dual occupancy',
    referral_agencies: '',
    planner, planners: [planner],
    planner_rate: 180, budget_hours: 40,
    status: 'Active', complexity: 'C2',
    lodgement_date: iso(daysFrom(now, -12)),
    decision_due_date: iso(daysFrom(now, 30)),
    date_confirmation: iso(daysFrom(now, -5)),
    created_at: at(-20),
    notes: 'Example note: council asked for an updated stormwater plan. Engineer is preparing it.',
    share_token: null, share_include_budget: true, share_include_notes: false,
    hpc_stages: {
      stage1: { status: 'complete', fee: 500, notes: '', completedDate: iso(daysFrom(now, -14)), checkedItems: [0, 1, 2, 3, 4, 5] },
      stage2: { status: 'active', fee: 3000, notes: '', completedDate: '', checkedItems: [0, 1] },
      stage3: { status: 'pending', fee: 2000, notes: '', completedDate: '', checkedItems: [] },
    },
    da_stages: {
      application: { status: 'complete', startDate: iso(daysFrom(now, -12)), endDate: iso(daysFrom(now, -5)), stoppedDays: 0, stopReason: '', isStopped: false, endDateManual: true },
      information: { status: 'active', startDate: iso(daysFrom(now, -5)), endDate: iso(daysFrom(now, 9)), stoppedDays: 0, stopReason: '', isStopped: false, endDateManual: true },
    },
    job_history: [
      { text: 'Time logged: Planning report (2h 30m)', time: at(-1, 15) },
      { text: 'HPC stages updated', time: at(-3, 11) },
      { text: 'Document generated: Fee proposal', time: at(-13, 10) },
      { text: 'Status changed to Active', time: at(-14, 9) },
      { text: 'Job created', time: at(-20) },
    ],
    demo_time_logs: [
      { id: 'demo-log-2', job_id: DEMO_JOB_ID, job_code: `${year}-000`, planner, task: 'Planning report', hours: 2.5, duration_seconds: 9000, rate: 180, log_date: iso(daysFrom(now, -1)), created_at: at(-1, 15) },
      { id: 'demo-log-1', job_id: DEMO_JOB_ID, job_code: `${year}-000`, planner, task: 'Site visit and photos', hours: 1.25, duration_seconds: 4500, rate: 180, log_date: iso(daysFrom(now, -9)), created_at: at(-9, 13) },
    ],
  }
}
