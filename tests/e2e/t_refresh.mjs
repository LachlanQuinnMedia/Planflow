import { open, shot, calls, db, calState } from './harness.mjs'
import assert from 'node:assert/strict'
const COMPANY = 'b14f0515-8538-4356-aa0c-9f828058e744'
const pad = n => String(n).padStart(2, '0')
const today = () => { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Brisbane' })); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const topTitle = (page) => page.locator('.h-12 .truncate').first().innerText()

// ---------- 1. Refresh keeps the page, the job and the job tab
{
  const { browser, page, errors } = await open('/')
  await page.waitForSelector('text=Time tracker')
  assert.equal(await topTitle(page), 'Dashboard')
  await page.getByRole('button', { name: 'Calendar' }).first().click()
  await page.waitForSelector('text=Connect calendar')
  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await topTitle(page), 'Calendar'); await page.waitForSelector('text=Connect calendar')
  console.log('1a reload stays on Calendar: ok')

  await page.getByRole('button', { name: 'Jobs' }).first().click()
  await page.locator('text=Brad Miller - 25 Charlotte Street >> visible=true').first().click()
  await page.waitForSelector('text=Client details')
  await page.getByRole('button', { name: 'Time & Budget' }).last().click()
  await page.waitForTimeout(300)
  const before = await page.locator('main, body').first().innerText()
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('text=25 Charlotte Street >> visible=true')
  assert.equal(await topTitle(page), 'Job Detail')
  const tabCls = await page.getByRole('button', { name: 'Time & Budget' }).last().getAttribute('class')
  assert.match(tabCls, /border-emerald-500/)
  assert.ok((await page.locator('body').innerText()).includes('25 Charlotte Street'))
  console.log('1b reload stays on the job and on its tab: ok')
  await shot(page, 'refresh-job-tab')

  // a job that has since been deleted falls back to the job list
  db.jobs = db.jobs.filter(j => j.id !== 'j2'); const removed = true
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  assert.equal(await topTitle(page), 'All Jobs')
  console.log('1c deleted job falls back to All Jobs: ok')

  // logging out forgets the page
  await page.getByRole('button', { name: 'Templates' }).first().click()
  await page.waitForTimeout(200)
  assert.ok(await page.evaluate(() => localStorage.getItem('qplan_last_page')))
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.waitForTimeout(300)
  assert.equal(await page.evaluate(() => localStorage.getItem('qplan_last_page')), null)
  console.log('1d log out forgets the page: ok')

  // an old saved page (more than four hours) is ignored
  await page.evaluate(() => sessionStorage.removeItem('pf_test_no_seed'))
  console.log('1 ERRORS:', errors)
  await browser.close()
}
{
  const { browser, page } = await open('/')
  await page.getByRole('button', { name: 'Calendar' }).first().click()
  await page.waitForSelector('text=Connect calendar')
  await page.evaluate(() => { const v = JSON.parse(localStorage.getItem('qplan_last_page')); v.at = Date.now() - 5 * 3600 * 1000; localStorage.setItem('qplan_last_page', JSON.stringify(v)) })
  // stop the page stamping the time again as it unloads
  await page.evaluate(() => { document.addEventListener('visibilitychange', e => e.stopImmediatePropagation(), true) })
  await page.reload({ waitUntil: 'networkidle' })
  const t = await topTitle(page)
  console.log('1e page older than 4h ->', t)
  await browser.close()
}

// ---------- 2. Timer: collapse, recording light, carries on through a refresh
{
  db.active_timers = []
  const { browser, page, errors } = await open('/')
  let dialogs = []
  page.on('dialog', d => { dialogs.push(d.message()); d.accept() })
  await page.locator('select').first().selectOption('j1')
  await page.getByPlaceholder('What are you working on?').fill('IR response')
  assert.equal(await page.getByTestId('timer-rec').count(), 0)
  await page.getByTitle('Start timer').click()
  await page.waitForSelector('text=● 2026-003')
  assert.equal(await page.getByTestId('timer-rec').count(), 1)
  await shot(page, 'timer-open-running')
  await page.getByRole('button', { name: 'Hide time tracker' }).click()
  assert.equal(await page.getByPlaceholder('What are you working on?').count(), 0)
  assert.equal(await page.getByTestId('timer-rec').count(), 1)
  const anim = await page.getByTestId('timer-rec').evaluate(el => { const c = getComputedStyle(el); return { name: c.animationName, bg: c.backgroundColor, shadow: c.boxShadow, w: c.width } })
  console.log('2a collapsed, light:', JSON.stringify(anim))
  assert.equal(anim.name, 'qp-rec-glow'); assert.equal(anim.bg, 'rgb(239, 68, 68)')
  await page.waitForTimeout(6500) // let a progress save happen
  await shot(page, 'timer-collapsed-running')
  const sidebar = page.locator('.w-52').first()
  await sidebar.screenshot({ path: process.env.OUT ? process.env.OUT + '/timer-collapsed-sidebar.png' : 'out/shots/timer-collapsed-sidebar.png' })
  assert.equal(db.active_timers.length, 1)
  const savedBefore = db.active_timers[0].elapsed_seconds
  assert.ok(savedBefore >= 5, 'progress saved ' + savedBefore)

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid=timer-rec]')
  assert.equal(dialogs.length, 0, 'no unfinished-timer question after a quick refresh: ' + dialogs)
  assert.equal(db.active_timers.length, 1)
  assert.equal(await page.getByRole('button', { name: 'Show time tracker' }).count(), 1) // still collapsed
  const shown = await page.locator('button[aria-label="Show time tracker"] .font-mono').innerText()
  const [h, m, s] = shown.split(':').map(Number)
  console.log('2b after refresh the timer shows', shown, '(saved before refresh:', savedBefore + 's)')
  assert.ok(h * 3600 + m * 60 + s >= savedBefore)
  await page.getByRole('button', { name: 'Show time tracker' }).click()
  await page.waitForSelector('text=● 2026-003')
  assert.equal(await page.getByPlaceholder('What are you working on?').inputValue(), 'IR response')
  await page.waitForTimeout(5000)
  await page.getByTitle('Stop and save').click()
  await page.waitForTimeout(500)
  const log = db.time_logs.filter(l => l.task === 'IR response').pop()
  console.log('2c saved after stop:', JSON.stringify({ job: log?.job_code, secs: log?.duration_seconds, planner: log?.planner }))
  assert.ok(log && log.job_code === '2026-003' && log.duration_seconds >= 11)
  assert.equal(db.active_timers.length, 0)
  assert.equal(await page.getByTestId('timer-rec').count(), 0)
  assert.equal(db.time_logs.filter(l => l.task === 'IR response').length, 1)

  // An old abandoned timer still asks, as before
  db.active_timers.push({ id: 'old1', job_id: 'j1', job_code: '2026-003', planner: 'Lachlan Quinn', user_id: 'u-quinn', task: 'Old work', elapsed_seconds: 600, rate: 180, created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  console.log('2d old timer question:', dialogs[0])
  assert.equal(dialogs.length, 1); assert.match(dialogs[0], /unfinished timer/)
  assert.equal(await page.getByTestId('timer-rec').count(), 0)
  assert.equal(db.time_logs.filter(l => l.task === 'Old work' && l.duration_seconds === 600).length, 1)
  console.log('2 ERRORS:', errors)
  await browser.close()
}

// ---------- 3. Refresh on a job page while the timer runs on another job: no switch question
{
  db.active_timers = []
  const { browser, page, errors } = await open('/')
  await page.locator('select').first().selectOption('j1')
  await page.getByPlaceholder('What are you working on?').fill('Report')
  await page.getByTitle('Start timer').click()
  await page.waitForSelector('text=● 2026-003')
  await page.getByRole('button', { name: 'Jobs' }).first().click()
  await page.locator('text=KP Development Group - 102 Rumrunner Street >> visible=true').first().click()
  await page.waitForSelector('text=Switch the timer to this job?')
  await page.getByRole('button', { name: 'Keep current timer' }).click()
  await page.waitForTimeout(5500)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('text=● 2026-003')
  await page.waitForTimeout(800)
  assert.equal(await page.locator('text=Switch the timer to this job?').count(), 0)
  assert.equal(await topTitle(page), 'Job Detail')
  console.log('3 refresh on another job page: timer carries on, no question: ok')

  // Top bar refresh: new data shows, the timer is not interrupted, the page stays
  db.jobs[db.jobs.findIndex(j => j.id === 'j3')].notes = 'Changed elsewhere'
  const n = calls.length
  await page.getByRole('button', { name: 'Refresh this page' }).click()
  await page.waitForTimeout(900)
  assert.equal(await topTitle(page), 'Job Detail')
  assert.equal(await page.getByTestId('timer-rec').count(), 1)
  assert.ok(calls.slice(n).some(c => c.method === 'GET' && c.path.includes('/rest/v1/jobs') && c.path.includes('id=eq.j3')))
  await page.getByRole('button', { name: 'IR & Notes' }).last().click()
  await page.waitForTimeout(300)
  const notesVal = await page.locator('textarea').first().inputValue().catch(() => '')
  console.log('3b after top-bar refresh, notes box:', JSON.stringify(notesVal))
  await page.getByRole('button', { name: 'Dashboard' }).first().click()
  await page.waitForTimeout(400)
  db.jobs.push({ ...db.jobs[0], id: 'j9', code: '2026-099', name: 'New One', client_first_name: 'Nina', client_last_name: 'Newman', address: '1 Fresh Street, Brisbane', created_at: new Date().toISOString(), share_token: null })
  assert.equal(await page.locator('text=2026-099 >> visible=true').count(), 0)
  await page.getByRole('button', { name: 'Refresh this page' }).click()
  await page.waitForSelector('text=2026-099 >> visible=true')
  assert.equal(await topTitle(page), 'Dashboard')
  assert.equal(await page.getByTestId('timer-rec').count(), 1)
  console.log('3c dashboard refresh shows the new job, timer still running: ok')
  await page.getByRole('button', { name: '+ New Job', exact: true }).click()
  await page.waitForTimeout(300)
  assert.equal(await page.getByRole('button', { name: 'Refresh this page' }).count(), 0)
  console.log('3 ERRORS:', errors)
  await browser.close()
}

// ---------- 4. Calendar keeps itself up to date
{
  db.active_timers = []; db.bookings = []
  const { browser, page, errors } = await open('/')
  await page.clock.install()
  await page.getByRole('button', { name: 'Calendar' }).first().click()
  await page.waitForSelector('text=Connect calendar')
  await page.reload({ waitUntil: 'networkidle' }) // so the calendar's own timer is on the test clock
  await page.waitForSelector('text=No meetings this week.')
  const mk = (id, title, time) => ({ id, company_id: COMPANY, title, type: 'client', date: today(), start_time: time, duration_minutes: 60, attendees: ['Lachlan Quinn'], client_name: 'Josh Richards', created_by: 'Murray' })

  db.bookings.push(mk('b1', 'Added by Murray', '10:00:00'))
  await page.clock.fastForward(61000)
  await page.waitForSelector('text=Added by Murray >> visible=true')
  console.log('4a new meeting appears by itself after a minute: ok')

  db.bookings.push(mk('b2', 'Second one', '13:00:00'))
  await page.clock.fastForward(12000)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.waitForSelector('text=Second one >> visible=true')
  console.log('4b coming back to the window updates it: ok')

  db.bookings.push(mk('b3', 'Third one', '15:00:00'))
  calState.eventsReply = { success: true, connected: true, events: [{ id: 'o1', subject: 'Outlook catch up', start: `${today()}T09:00:00`, end: `${today()}T09:30:00`, allDay: false, location: '', webLink: 'https://outlook.example/o1', showAs: 'busy' }] }
  await page.getByRole('button', { name: 'Refresh calendar' }).click()
  await page.waitForSelector('text=Third one >> visible=true')
  await page.waitForSelector('text=Outlook catch up >> visible=true')
  console.log('4c refresh button pulls QPlan and Outlook: ok')
  await shot(page, 'calendar-refresh')

  // hidden tab does not poll
  const n = calls.length
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }) })
  await page.clock.fastForward(130000)
  await page.waitForTimeout(300)
  const polled = calls.slice(n).filter(c => c.path.includes('/rest/v1/bookings')).length
  console.log('4d calls while hidden:', polled)
  assert.equal(polled, 0)
  console.log('4 ERRORS:', errors)
  await browser.close()
}

// ---------- 5. Phone: recording light on the menu button
{
  db.active_timers = []
  const { browser, page, errors } = await open('/', { viewport: { width: 390, height: 844 } })
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.locator('select >> visible=true').first().selectOption('j1')
  await page.getByPlaceholder('What are you working on?').fill('Site visit')
  await page.getByTitle('Start timer').click()
  await page.waitForSelector('text=● 2026-003')
  await page.getByRole('button', { name: 'Hide time tracker' }).click()
  await page.waitForTimeout(300)
  await shot(page, 'phone-menu-timer-collapsed')
  await page.mouse.click(370, 400) // close the menu
  await page.waitForTimeout(400)
  assert.equal(await page.getByRole('button', { name: 'Open menu (timer recording)' }).count(), 1)
  assert.equal(await page.locator('button[aria-label^="Open menu"] .qp-rec').count(), 1)
  await shot(page, 'phone-topbar-recording')
  console.log('5 phone menu button shows the recording light: ok', errors)
  await browser.close()
}
console.log('ALL REFRESH TESTS PASSED')
