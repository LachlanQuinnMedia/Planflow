// Visits every screen at phone, fold, tablet and landscape sizes and reports anything wider than the screen.
import { open, db, calState, msState } from './harness.mjs'
import fs from 'node:fs'
const D = 'out/sizes'
fs.mkdirSync(D, { recursive: true })
const COMPANY = db.companies[0].id
db.jobs[0].da_stages = { application: { status: 'complete', startDate: '2026-09-23', endDate: '2026-10-07' }, referral: { status: 'active', startDate: '2026-11-10', endDate: '2026-11-26' }, information: { status: 'pending' }, notification: { status: 'pending' }, decision: { status: 'pending' } }
db.jobs[0].job_history = [{ date: '20 Nov 2026', time: '1:00 pm', text: 'Job created', user: 'Lachlan Quinn' }]
db.documents.push({ id: 'd1', company_id: COMPANY, job_id: 'j1', job_code: '2026-003', name: 'Site plan for the proposed secondary dwelling.pdf', file_path: `${COMPANY}/j1/1_Site_plan.pdf`, file_url: null, file_type: 'pdf', file_size: 240000, uploaded_by: 'Todd Grubb', created_at: '2026-11-20T03:00:00Z' })
db.bookings.push({ id: 'b1', company_id: COMPANY, title: 'Pre-lodgement meeting', type: 'client', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), start_time: '10:00:00', duration_minutes: 60, attendees: ['Lachlan Quinn', 'Todd Grubb'], client_name: 'Josh Richards', job_id: 'j1', job_code: '2026-003', created_by: 'Lachlan Quinn' })
calState.team = [{ username: 'Lachlan Quinn', email: 'lq@hpc.example', needs_reconnect: false }]
const SIZES = (process.env.SIZES || 'fold-cover:344x882,phone:390x844,duo:540x720,fold-open:768x884,ipad:820x1180,phone-land:844x390').split(',').map(s => { const [n, wh] = s.split(':'); const [w, h] = wh.split('x').map(Number); return { n, w, h } })
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null
const report = []
// widest offenders on the current screen
const measure = (page) => page.evaluate(() => {
  const vw = document.documentElement.clientWidth
  const out = []
  const scrollers = new Set()
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (/(auto|scroll)/.test(cs.overflowX)) scrollers.add(el)
  }
  const inScroller = (el) => { for (let p = el.parentElement; p; p = p.parentElement) if (scrollers.has(p)) return true; return false }
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.right <= 0) continue // the slide-out menu, parked off screen
    if (r.right > vw + 1 || r.left < -1) {
      if (inScroller(el)) continue
      const cs = getComputedStyle(el)
      if (cs.position === 'fixed' && r.left >= vw) continue
      out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 70), text: (el.textContent || '').trim().slice(0, 30), left: Math.round(r.left), right: Math.round(r.right) })
    }
  }
  // keep only the outermost offenders
  return { vw, pageScroll: document.documentElement.scrollWidth > vw + 1, count: out.length, top: out.slice(0, 4) }
})
for (const size of SIZES) {
  const { browser, page, errors } = await open('/', { viewport: { width: size.w, height: size.h } })
  const isPhone = size.w < 1024
  const check = async (name) => {
    if (ONLY && !ONLY.includes(name)) return
    await page.waitForTimeout(350)
    const m = await measure(page)
    if (m.count || m.pageScroll) report.push({ size: size.n, screen: name, ...m })
    if (process.env.SHOTS) await page.screenshot({ path: `${D}/${size.n}-${name}.png` })
  }
  const nav = async (label) => {
    const item = page.getByRole('button', { name: new RegExp('^' + label, 'i') }).first()
    const box = await item.boundingBox().catch(() => null)
    if (!box || box.x < 0) { await page.getByRole('button', { name: 'Open menu' }).click(); await page.waitForTimeout(350) }
    await item.click({ timeout: 6000 }); await page.waitForTimeout(450)
  }
  try {
    await check('dashboard')
    await nav('Jobs'); await check('jobs')
    await page.locator('text=/Josh Richards/ >> visible=true').first().click(); await page.waitForSelector('text=Client details'); await check('job-overview')
    for (const tab of ['HPC Stages', 'DA Stages', 'Documents', 'Time & Budget', 'IR & Notes', 'History']) { await page.getByRole('button', { name: tab, exact: true }).last().click(); await check('job-' + tab.replace(/[^a-z]/gi, '').toLowerCase()) }
    await page.getByRole('button', { name: 'Edit job' }).click(); await check('modal-editjob'); await page.getByRole('button', { name: 'Cancel' }).click()
    for (const [label, name] of [['New Job', 'newjob'], ['Time & Budget', 'time'], ['Bookings', 'bookings'], ['Calendar', 'calendar'], ['Workloads', 'workloads'], ['Xero', 'xero'], ['Templates', 'templates'], ['Documents', 'documents'], ['Planners', 'planners'], ['Microsoft 365', 'microsoft']]) { await nav(label); await check(name) }
    await nav('Calendar'); await page.getByRole('button', { name: '+ New meeting' }).click(); await check('modal-meeting')
  } catch (e) { report.push({ size: size.n, screen: 'SCRIPT STOPPED', msg: e.message.split('\n')[0] }); await page.screenshot({ path: `${D}/${size.n}-stopped.png` }) }
  if (errors.length) report.push({ size: size.n, screen: 'console', errors })
  await browser.close()
}
for (const r of report) console.log(JSON.stringify(r))
console.log('PROBLEM SCREENS:', report.length)
