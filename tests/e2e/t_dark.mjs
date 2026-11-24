import { open, shot, db, calState, msState } from './harness.mjs'
import fs from 'node:fs'
const D = process.env.OUT_DARK || 'out/dark'
fs.mkdirSync(D, { recursive: true })
const snap = (page, name, opts = {}) => page.screenshot({ path: `${D}/${name}.png`, ...opts })
const COMPANY = db.companies[0].id
// richer data so every state shows
db.jobs[0].da_stages = { application: { status: 'complete', startDate: '2026-09-23', endDate: '2026-10-07' }, referral: { status: 'active', startDate: '2026-11-10', endDate: '2026-11-26' }, information: { status: 'pending' }, notification: { status: 'pending' }, decision: { status: 'pending' } }
db.jobs[0].date_ir_response = '2026-11-27'
db.jobs[0].job_history = [{ date: '20 Nov 2026', time: '1:00 pm', text: 'Job created', user: 'Lachlan Quinn' }, { date: '21 Nov 2026', time: '9:10 am', text: 'Document uploaded: Site plan.pdf', user: 'Todd Grubb' }]
db.notifications.push({ id: 'n1', company_id: COMPANY, type: 'new_user', message: 'New employee account created: Sam Lee. Awaiting your approval.', is_read: false, created_at: new Date().toISOString() })
db.notifications.push({ id: 'n2', company_id: COMPANY, type: 'da_stage_deadline', message: 'Due soon: 2026-003 Referral stage ends in 2 business days', is_read: false, created_at: new Date().toISOString() })
db.documents.push({ id: 'd1', company_id: COMPANY, job_id: 'j1', job_code: '2026-003', name: 'Site plan.pdf', file_path: `${COMPANY}/j1/1_Site_plan.pdf`, file_url: null, file_type: 'pdf', file_size: 240000, uploaded_by: 'Todd Grubb', created_at: '2026-11-20T03:00:00Z' })
db.bookings.push({ id: 'b1', company_id: COMPANY, title: 'Pre-lodgement meeting', type: 'client', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), start_time: '10:00:00', duration_minutes: 60, attendees: ['Lachlan Quinn', 'Todd Grubb'], client_name: 'Josh Richards', job_id: 'j1', job_code: '2026-003', created_by: 'Lachlan Quinn' })
db.time_logs.push({ id: 't2', job_id: 'j2', job_code: '2026-006', planner: 'Chris Lewis', task: 'Site visit', hours: 70, duration_seconds: 252000, rate: 200, log_date: '2026-11-18', created_at: '2026-11-18T03:00:00Z' })
calState.team = [{ username: 'Lachlan Quinn', email: 'lq@hpc.example', needs_reconnect: false }, { username: 'Todd Grubb', email: 'todd@hpc.example', needs_reconnect: true }]
msState.email = 'lachlanquinnmedia@outlook.com'

const errorsAll = []
// login screens
{
  const { browser, page, errors } = await open('/', { loggedIn: false, theme: 'dark' })
  await page.waitForSelector('text=Welcome back'); await snap(page, '00-login')
  await page.getByRole('button', { name: 'Create account' }).click(); await page.waitForTimeout(200); await snap(page, '01-register')
  errorsAll.push(...errors); await browser.close()
}
const { browser, page, errors } = await open('/', { theme: 'dark' })
const nav = async (label) => { await page.getByRole('button', { name: new RegExp('^' + label, 'i') }).first().click({ timeout: 8000 }); await page.waitForTimeout(700) }
await page.waitForTimeout(800); await snap(page, '10-dashboard', { fullPage: true })
await page.getByRole('button', { name: /Notifications/ }).click(); await page.waitForTimeout(300); await snap(page, '11-notifications'); await page.getByRole('button', { name: /Close/ }).first().click(); await page.waitForTimeout(200)
await nav('Jobs'); await snap(page, '20-jobs', { fullPage: true })
await page.locator('text=Josh Richards - 18 Parma Court >> visible=true').first().click(); await page.waitForSelector('text=Client details'); await snap(page, '21-job-overview', { fullPage: true })
for (const tab of ['HPC Stages', 'DA Stages', 'Documents', 'Time & Budget', 'IR & Notes', 'History']) {
  const b = page.getByRole('button', { name: tab, exact: true }).last()
  if (await b.count()) { await b.click(); await page.waitForTimeout(600); await snap(page, `22-job-${tab.replace(/[^a-z]/gi, '').toLowerCase()}`, { fullPage: true }) } else console.log('no tab', tab)
}
console.log('after tabs, errors:', errors); await snap(page, '29-debug')
await nav('New job')
await snap(page, '30-newjob', { fullPage: true })
for (const [label, name] of [['Time & Budget', '40-time'], ['Bookings', '41-bookings'], ['Calendar', '42-calendar'], ['Workloads', '43-workloads'], ['Xero', '44-xero'], ['Templates', '45-templates'], ['Documents', '46-documents'], ['Planners', '47-planners'], ['Microsoft 365', '48-microsoft']]) {
  try { await nav(label); await snap(page, name, { fullPage: true }) } catch (e) { console.log('skip', label, e.message.split('\n')[0]) }
}
// calendar: new booking modal
try { await nav('Calendar'); await page.getByRole('button', { name: /New (booking|meeting|event)|\+ /i }).first().click(); await page.waitForTimeout(400); await snap(page, '49-calendar-modal') ; await page.keyboard.press('Escape') } catch (e) { console.log('no modal', e.message.split('\n')[0]) }
errorsAll.push(...errors)
await browser.close()
// phone
{
  const { browser, page, errors } = await open('/', { theme: 'dark', viewport: { width: 390, height: 844 } })
  await page.waitForTimeout(800); await snap(page, '60-phone-dashboard')
  errorsAll.push(...errors); await browser.close()
}
// client summary page stays light even when this browser is set to dark
{
  const { browser, page } = await open('/summary/' + 'a'.repeat(48), { loggedIn: false, theme: 'dark' })
  await page.waitForTimeout(600)
  console.log('SUMMARY THEME:', await page.evaluate(() => document.documentElement.dataset.theme))
  await snap(page, '70-summary'); await browser.close()
}
console.log('ERRORS:', errorsAll)
console.log(fs.readdirSync(D).join(' '))
