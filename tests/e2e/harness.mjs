// Mock-backed browser harness: runs the built app against a fake Supabase so screens can be checked
// without touching live data. Usage: node harness.mjs <scenario>
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
import fs from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:4173'
const OUT = process.env.OUT || 'out/shots'
fs.mkdirSync(OUT, { recursive: true })

const COMPANY = 'b14f0515-8538-4356-aa0c-9f828058e744'
const ME = { id: 'u-quinn', username: 'Lachlan Quinn', role: 'director', company_id: COMPANY, company_code: '0000', companyName: 'HPC Planning' }

export const db = {
  jobs: [
    { id: 'j1', code: '2026-003', name: 'Josh Richards — MCU', client_type: 'individual', client_company: null, client_first_name: 'Josh', client_last_name: 'Richards', client_email: 'josh@example.com', client_phone: '0400 000 001', address: '18 Parma Court, Mount Nathan QLD 4211', lot_reference: 'Lot 4 RP123456', council: 'City of Gold Coast', zone: 'Rural residential', app_type: 'MCU', assessment_level: 'Code Assessable', proposed_use: 'Secondary dwelling', referral_agencies: 'SARA', planner: 'Todd Grubb', planners: ['Todd Grubb', 'Lachlan Quinn'], planner_rate: 180, budget_hours: 40, status: 'Active', complexity: 'C2', lodgement_date: '2026-09-23', decision_due_date: '2026-12-22', created_at: '2026-11-05T01:00:00Z', da_stages: null, hpc_stages: null, job_history: null, notes: 'Client prefers email.', company_id: COMPANY, share_token: null, share_include_budget: true, share_include_notes: false },
    { id: 'j2', code: '2026-006', name: 'Brad Miller — MCU', client_type: 'individual', client_company: null, client_first_name: 'Brad', client_last_name: 'Miller', client_email: null, client_phone: null, address: '25 Charlotte Street, Paddington QLD 4064', lot_reference: 'Lot 12 SP445566', council: 'Brisbane City Council', zone: 'Character residential', app_type: 'MCU', assessment_level: 'Impact Assessable', proposed_use: 'Multiple dwelling', referral_agencies: '', planner: 'Chris Lewis', planners: ['Chris Lewis'], planner_rate: 200, budget_hours: 60, status: 'Draft', complexity: 'C3', lodgement_date: '2026-11-13', decision_due_date: '2027-01-29', created_at: '2026-11-10T01:00:00Z', da_stages: null, hpc_stages: null, job_history: null, notes: '', company_id: COMPANY, share_token: null, share_include_budget: true, share_include_notes: false },
    { id: 'j3', code: '2026-005', name: 'KP — MCU', client_type: 'company', client_company: 'KP Development Group', client_first_name: 'Kailem', client_last_name: 'Perkins', client_email: 'kailem@example.com', client_phone: '0400 000 003', address: '102 Rumrunner Street, Mermaid Waters', lot_reference: '', council: 'City of Gold Coast', zone: '', app_type: 'CDM', assessment_level: 'Code Assessable', proposed_use: '', referral_agencies: '', planner: 'Lachlan Quinn', planners: ['Lachlan Quinn'], planner_rate: 150, budget_hours: 0, status: 'Draft', complexity: 'C2', lodgement_date: null, decision_due_date: null, created_at: '2026-11-08T01:00:00Z', da_stages: null, hpc_stages: null, job_history: null, notes: '', company_id: COMPANY, share_token: 'a'.repeat(48), share_include_budget: true, share_include_notes: false, share_created_by: 'Lachlan Quinn', share_created_at: '2026-11-20T02:00:00Z' },
  ],
  app_users: [
    { id: 'u-quinn', username: 'Lachlan Quinn', role: 'director', company_id: COMPANY, is_approved: true, is_active: true },
    { id: 'u-murray', username: 'Murray', role: 'director', company_id: COMPANY, is_approved: true, is_active: true },
    { id: 'u-todd', username: 'Todd Grubb', role: 'employee', company_id: COMPANY, is_approved: true, is_active: true },
    { id: 'u-chris', username: 'Chris Lewis', role: 'employee', company_id: COMPANY, is_approved: true, is_active: true },
    { id: 'u-clare', username: 'Clare Harvey', role: 'employee', company_id: COMPANY, is_approved: true, is_active: true },
  ],
  planner_profiles: [
    { id: 'p1', user_id: 'u-quinn', company_id: COMPANY, full_name: 'Lachlan Quinn', position: 'Director', email: 'lq@example.com', phone: '', hourly_rate: 150, avatar_color: '#059669', avatar_url: null },
    { id: 'p2', user_id: 'u-todd', company_id: COMPANY, full_name: 'Todd Grubb', position: 'Senior Town Planner', email: 'todd@example.com', phone: '07 0000 0000', hourly_rate: 180, avatar_color: '#dc2626', avatar_url: null },
    { id: 'p3', user_id: 'u-chris', company_id: COMPANY, full_name: 'Chris Lewis', position: 'Director', email: 'chris@example.com', phone: '', hourly_rate: 200, avatar_color: '#0284c7', avatar_url: null },
  ],
  time_logs: [
    { id: 't1', job_id: 'j1', job_code: '2026-003', planner: 'Todd Grubb', task: 'Report writing', hours: 2.5, duration_seconds: 9000, rate: 180, log_date: '2026-11-20', created_at: '2026-11-20T03:00:00Z' },
  ],
  active_timers: [], notifications: [], documents: [], bookings: [], stage_notifications: [], xero_tokens: [], calendar_connections: [],
  companies: [{ id: COMPANY, name: 'HPC Planning', company_code: '0000' }],
}
export const calls = []
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
export const fakeToken = (sub) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
export const fakeSession = (sub) => ({ access_token: fakeToken(sub), refresh_token: 'refresh-' + sub, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: sub, aud: 'authenticated', role: 'authenticated', email: `${sub}@users.qplan.invalid` } })
export const authState = { password: 'Right-Pass-1', answer: 'brisbane', registered: [], resets: [], consent: [] }
export const msState = { connected: true, jobsFolder: { driveId: 'd1', folderId: 'f-jobs', name: 'Jobs', path: 'HPC / Jobs', webUrl: 'https://example.sharepoint.com/jobs' }, createFails: false, email: 'office@hpc.example' }
export const calState = { me: { connected: false }, team: [] }

function filterRows(rows, params) {
  let out = rows
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue
    if (v === 'not.is.true') { out = out.filter(r => r[k] !== true); continue }
    const m = /^(eq|neq|like|ilike|gte|lte|is|in)\.(.*)$/s.exec(v)
    if (!m) continue
    const [, op, raw] = m
    if (op === 'eq') out = out.filter(r => String(r[k]) === raw)
    else if (op === 'ilike') out = out.filter(r => String(r[k] ?? '').toLowerCase() === raw.toLowerCase())
    else if (op === 'like') { const pre = raw.replace(/%$/, ''); out = out.filter(r => String(r[k] ?? '').startsWith(pre)) }
    else if (op === 'is') out = out.filter(r => (raw === 'null' ? r[k] == null : true))
  }
  return out
}

export async function installMocks(page) {
  await page.route('https://sltaaiumviyzgdsdkkbe.supabase.co/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    const accept = req.headers()['accept'] || ''
    const wantObject = accept.includes('vnd.pgrst.object')
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
    const send = (body, status = 200) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    let body = null
    try { body = req.postDataJSON() } catch { body = null }
    calls.push({ method, path: url.pathname + url.search, body, auth: req.headers()['authorization'] || '' })

    // Supabase Auth
    if (url.pathname === '/auth/v1/user') {
      const tok = (req.headers()['authorization'] || '').replace('Bearer ', '')
      try { const p = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()); return send(fakeSession(p.sub).user) } catch { return send({ message: 'bad token' }, 401) }
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: cors })
    if (url.pathname === '/auth/v1/token') return send(fakeSession(ME.id))
    if (url.pathname.startsWith('/functions/v1/auth')) {
      const action = url.searchParams.get('action')
      if (action === 'login') {
        if (body.password !== authState.password || body.companyCode !== '0000') return send({ error: 'Incorrect username, password, or company code.' })
        return send({ user: { ...ME }, session: fakeSession(ME.id) })
      }
      if (action === 'register') { authState.registered.push(body); return send({ user: { id: 'u-new', username: body.username }, role: body.directorCode ? 'director' : 'employee', isApproved: !!body.directorCode }) }
      if (action === 'security_question') return body.username.toLowerCase() === 'murray' ? send({ question: 'What city were you born in?' }) : send({ error: 'User not found.' })
      if (action === 'verify_answer') return String(body.answer).toLowerCase().trim() === authState.answer ? send({ success: true }) : send({ error: 'Incorrect answer.' })
      if (action === 'reset_password') { if (String(body.answer).toLowerCase().trim() !== authState.answer) return send({ error: 'Incorrect answer.' }); authState.resets.push(body); return send({ success: true }) }
      return send({ error: 'Unknown action' }, 400)
    }
    if (url.pathname === '/rest/v1/rpc/record_ms_admin_consent') {
      authState.consent.push({ ...body, auth: req.headers()['authorization'] })
      const c = db.companies[0]
      const ok = !!c.ms_consent_nonce && body.p_nonce === c.ms_consent_nonce && body.p_company_id === c.id
      if (ok) Object.assign(c, { ms_tenant_id: body.p_tenant, ms_admin_consent_at: new Date().toISOString(), ms_admin_consent_by: body.p_by })
      return send(ok)
    }
    if (url.pathname.startsWith('/storage/v1/object/sign/')) return send({ signedURL: url.pathname.replace('/storage/v1', '') + '?token=signed' })
    if (url.pathname.startsWith('/storage/v1/object/documents/') && method === 'POST') return send({ Key: url.pathname.replace('/storage/v1/object/', '') })
    if (url.pathname.startsWith('/functions/v1/leads')) { authState.leads = authState.leads || []; if (!/@/.test(body.email || '')) return send({ error: 'Please enter a valid email address.' }); authState.leads.push(body); return send({ success: true }) }
    if (url.pathname.startsWith('/functions/v1/xero-auth')) {
      const action = url.searchParams.get('action')
      if (action === 'status') return send({ success: true, connected: true, tenant_name: 'Demo Company' })
      if (action === 'invoices') return send({ success: true, invoices: [] })
      if (action === 'contacts') return send({ success: true, contacts: [] })
    }

    // RPC
    if (url.pathname === '/rest/v1/rpc/get_job_summary') {
      const j = db.jobs.find(x => x.share_token && x.share_token === body?.p_token)
      if (!j) return send(null)
      const team = (j.planners || []).map((u, i) => {
        const user = db.app_users.find(a => a.username === u); const p = db.planner_profiles.find(pp => pp.user_id === user?.id)
        return { username: u, name: p?.full_name || u, position: p?.position || null, email: p?.email || null, phone: p?.phone || null, lead: i === 0 }
      })
      return send({ company: 'HPC Planning', ...j, key_dates: { confirmation: j.date_confirmation || null, ir_response: j.date_ir_response || null, referral: null, public_notice_start: null, public_notice_end: null, decision: j.date_decision || null }, da_stages: j.da_stages || {}, hpc_stages: j.hpc_stages || {}, team, include_budget: j.share_include_budget, include_notes: j.share_include_notes, hours_logged: 12.5, generated_at: new Date().toISOString() })
    }

    // Edge functions
    if (url.pathname.startsWith('/functions/v1/ms-graph')) {
      const action = url.searchParams.get('action')
      if (action === 'status') return send({ connected: msState.connected, email: msState.email, jobsFolder: msState.connected ? msState.jobsFolder : null })
      if (action === 'create_folder') {
        if (msState.createFails) return send({ success: false, error: 'Access denied' }, 400)
        return send({ success: true, existed: false, item: { id: 'f-new', name: body.name, isFolder: true, webUrl: 'https://example.sharepoint.com/jobs/new', driveId: 'd1', path: `Jobs/${body.name}` } })
      }
      if (action === 'upload_file') { msState.uploads = msState.uploads || []; if (msState.uploadFails) return send({ success: false, error: 'Access denied' }, 400); msState.uploads.push(body); return send({ success: true, item: { id: 'file-' + msState.uploads.length, name: body.name, webUrl: 'https://example.sharepoint.com/f/' + body.name } }) }
      if (action === 'set_jobs_folder') { msState.jobsFolder = { driveId: body.drive_id, folderId: body.folder_id, name: body.name, path: body.path, webUrl: body.web_url }; return send({ success: true, jobsFolder: msState.jobsFolder }) }
      if (action === 'drives') return send({ success: true, drives: [{ id: 'd1', name: 'OneDrive', kind: 'onedrive' }, { id: 'd2', name: 'HPC / Documents', kind: 'sharepoint' }], sharepointError: null })
      if (action === 'list') return send({ success: true, items: [{ id: 'f-jobs', name: 'Jobs', isFolder: true, childCount: 12, path: 'Jobs', webUrl: 'https://x', driveId: 'd1' }, { id: 'f-a', name: 'Admin', isFolder: true, childCount: 3, path: 'Admin', webUrl: 'https://x', driveId: 'd1' }, { id: 'file1', name: 'Fee schedule.xlsx', isFolder: false, size: 20000, webUrl: 'https://x', driveId: 'd1', path: 'Fee schedule.xlsx' }] })
      return send({ success: true })
    }
    if (url.pathname.startsWith('/functions/v1/calendar-outlook')) {
      const action = url.searchParams.get('action')
      if (action === 'events') { calState.eventCalls = (calState.eventCalls || 0) + 1; calState.lastEventsBody = body; return send(calState.eventsReply || { success: true, connected: false, events: [] }) }
      if (action === 'status') return send(calState.me)
      if (action === 'team_status') return send({ connections: calState.team })
      if (action === 'callback') { calState.me = { connected: true, email: 'quinn@hpc.example', needs_reconnect: false }; return send({ success: true, email: 'quinn@hpc.example' }) }
      return send({ success: true })
    }
    if (url.pathname.startsWith('/functions/v1/')) return send({ connected: false, success: false })
    if (url.pathname.startsWith('/storage/')) return route.fulfill({ status: 404, headers: cors, body: '{}' })

    // REST tables
    const m = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)
    if (!m) return send([])
    const table = m[1]
    db[table] = db[table] || []
    if (method === 'GET') {
      const rows = filterRows(db[table], url.searchParams)
      if (wantObject) return rows.length ? send(rows[0]) : send({ code: 'PGRST116', message: 'no rows' }, 406)
      return send(rows)
    }
    if (method === 'POST') {
      const row = { id: `${table}-${db[table].length + 1}`, created_at: new Date().toISOString(), ...(Array.isArray(body) ? body[0] : body) }
      if (table === 'jobs' && db.jobs.some(j => j.code === row.code)) return send({ code: '23505', message: 'duplicate key' }, 409)
      db[table].push(row)
      return wantObject ? send(row, 201) : send([row], 201)
    }
    if (method === 'PATCH') {
      const rows = filterRows(db[table], url.searchParams)
      rows.forEach(r => Object.assign(r, body))
      return wantObject ? send(rows[0] || null) : send(rows)
    }
    if (method === 'DELETE') {
      const rows = filterRows(db[table], url.searchParams)
      db[table] = db[table].filter(r => !rows.includes(r))
      return send([])
    }
    return send([])
  })
}

export async function open(pathname = '/', { loggedIn = true, viewport = { width: 1360, height: 900 }, theme = null, colorScheme = 'light', fresh = false, tour = false, reducedMotion = undefined } = {}) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport, timezoneId: 'Australia/Brisbane', locale: 'en-AU', colorScheme, reducedMotion })
  // The first-time tutorial would sit over every other test. Only tests that ask for it get it.
  if (!tour) await context.addInitScript(() => { for (const id of ['u-quinn', 'u-todd', 'u-murray', 'u-new']) for (const role of ['director', 'staff']) localStorage.setItem(`qplan_tour_${role}_${id}`, '1') })
  if (theme) await context.addInitScript((t) => { if (!localStorage.getItem('qplan_theme_set')) { localStorage.setItem('qplan_theme', t); localStorage.setItem('qplan_theme_set', '1') } }, theme)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()) })
  await installMocks(page)
  if (!fresh) await context.addInitScript(() => { localStorage.setItem('qplan_known_user', '1') })
  if (loggedIn === 'legacy') await context.addInitScript((me) => { localStorage.setItem('pf_session', JSON.stringify(me)) }, ME)
  else if (loggedIn) await context.addInitScript(({ me, session }) => {
    if (sessionStorage.getItem('pf_test_no_seed')) return
    localStorage.setItem('pf_session', JSON.stringify(me))
    localStorage.setItem('pf_stay', '1')
    localStorage.setItem('sb-sltaaiumviyzgdsdkkbe-auth-token', JSON.stringify(session))
  }, { me: ME, session: fakeSession(ME.id) })
  await page.goto(BASE + pathname, { waitUntil: 'networkidle' })
  return { browser, page, errors }
}

export const shot = (page, name, opts = {}) => page.screenshot({ path: `${OUT}/${name}.png`, ...opts })
export { OUT, ME }
