import { open, db, ME, calls, authState } from './harness.mjs'
import assert from 'node:assert/strict'
const card = (page) => page.getByTestId('tour-card')
const shown = (page) => page.waitForFunction(() => { const c = document.querySelector('[data-testid=tour-card]'); return c && getComputedStyle(c).visibility === 'visible' }, null, { timeout: 8000 })
const stepId = (page) => page.getByTestId('tour').getAttribute('data-step')
const title = (page) => page.locator('.h-12 .truncate').first().innerText()
const settle = async (page) => { await shown(page); await page.waitForTimeout(420) }
const activeTab = (page) => page.evaluate(() => document.querySelector('[data-tour^=jobtab-][data-active=true]')?.innerText || null)
// Opening any job tidies an old-style stored name into the standard format. That is the app's normal
// behaviour on opening a job (not the tour's), so the name is left out of the comparison and checked on its own.
const snapshotDb = () => JSON.stringify({ jobs: db.jobs.map(({ name, ...rest }) => rest), logs: db.time_logs.length, timers: db.active_timers.length, bookings: db.bookings.length, docs: db.documents.length })
// Finishing the tutorial is remembered on the person's account (user_state). That is the one thing the tour saves.
const isWrite = c => !['GET', 'HEAD', 'OPTIONS'].includes(c.method) && c.path.startsWith('/rest/v1/') && !c.path.startsWith('/rest/v1/user_state')
const geometry = (page) => page.evaluate(() => {
  const c = document.querySelector('[data-testid=tour-card]').getBoundingClientRect(); const s = document.querySelector('[data-testid=tour-skip]').getBoundingClientRect(); const n = document.querySelector('[data-testid=tour-next]').getBoundingClientRect()
  const sp = document.querySelector('[data-testid=tour-spot]')?.getBoundingClientRect()
  return { skipBelowNext: s.top >= n.bottom, gapToBottom: c.bottom - s.bottom, inView: c.top >= 0 && c.left >= 0 && c.bottom <= innerHeight + 0.5 && c.right <= innerWidth + 0.5, spot: !!sp, arrow: !!document.querySelector('[data-testid=tour-arrow]'), covers: sp ? !(c.right <= sp.left || c.left >= sp.right || c.bottom <= sp.top || c.top >= sp.bottom) : false, hot: !!document.querySelector('[data-testid=tour-hot]') }
})
const JOB_STEPS = ['job-header', 'job-overview', 'job-hpc-stages', 'job-da-stages', 'job-documents', 'job-time-budget', 'job-ir-notes', 'job-history']
const TAB_FOR = { 'job-header': 'Overview', 'job-overview': 'Overview', 'job-hpc-stages': 'HPC Stages', 'job-da-stages': 'DA Stages', 'job-documents': 'Documents', 'job-time-budget': 'Time & Budget', 'job-ir-notes': 'IR & Notes', 'job-history': 'History' }
const DIRECTOR = ['welcome', 'dashboard', 'jobs', ...JOB_STEPS, 'newjob', 'docs', 'time', 'timer', 'calendar', 'bookings', 'workload', 'xero', 'templates', 'planners', 'firm', 'microsoft', 'finish']
const STAFF = ['welcome', 'dashboard', 'jobs', ...JOB_STEPS, 'newjob', 'docs', 'time', 'timer', 'calendar', 'xero', 'templates', 'planners', 'outlook', 'finish']
const PAGE_FOR = { dashboard: 'Dashboard', jobs: 'All Jobs', newjob: 'New Job', docs: 'Documents', time: 'Time & Budget', timer: 'Time & Budget', calendar: 'Calendar', bookings: 'Bookings', workload: 'Team Workloads', xero: 'Xero', templates: 'Templates', planners: 'Planners', firm: 'Firm settings', microsoft: 'Microsoft 365' }

// Walks every card with Next, checking each one as it goes
async function walk(page, expected, label, { phone = false } = {}) {
  const seen = []
  for (let i = 0; i < expected.length; i++) {
    await settle(page)
    const id = await stepId(page); seen.push(id)
    assert.equal(id, expected[i], `${label}: card ${i + 1}`)
    const text = await card(page).innerText()
    assert.ok(text.includes(`${i + 1} of ${expected.length}`), `${label}: counter on ${id}: ${text.slice(0, 50)}`)
    assert.equal((await page.getByTestId('tour-skip').innerText()).trim(), 'Skip tutorial', `${label}: ${id} has Skip tutorial`)
    const g = await geometry(page)
    assert.ok(g.skipBelowNext && g.gapToBottom < 24, `${label}: skip at the bottom of ${id}`)
    assert.ok(g.inView, `${label}: card ${id} fully on screen`)
    if (i > 0) { assert.ok(g.spot && g.arrow, `${label}: card ${id} points at something`); assert.equal(g.covers, false, `${label}: card ${id} must not cover what it points at`) }
    if (phone) assert.equal(g.hot, false, `${label}: nothing to click but Next on a phone`)
    if (PAGE_FOR[id]) assert.equal(await title(page), PAGE_FOR[id], `${label}: ${id} opens its page`)
    if (TAB_FOR[id]) { assert.equal(await title(page), 'Job Detail'); assert.equal(await activeTab(page), TAB_FOR[id], `${label}: ${id} opens its tab`) }
    const lastOne = i === expected.length - 1
    assert.equal((await page.getByTestId('tour-next').innerText()).trim(), lastOne ? 'Finish' : i === 0 ? 'Start the tour' : 'Next')
    await page.getByTestId('tour-next').click()
  }
  await page.waitForTimeout(400)
  assert.equal(await page.getByTestId('tour').count(), 0, `${label}: closes after Finish`)
  return seen
}

// ---------- 1. Director tour: every page, the job page and each of its tabs. Nothing is changed.
{
  // a timer running on another job must not be disturbed when the tour opens a job
  db.active_timers = [{ id: 'run1', job_id: 'j2', job_code: '2026-006', planner: 'Lachlan Quinn', user_id: 'u-quinn', task: 'Report', elapsed_seconds: 30, rate: 200, created_at: new Date(Date.now() - 31000).toISOString() }]
  const before = snapshotDb()
  const { browser, page, errors } = await open('/', { tour: true })
  const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); d.dismiss() })
  await settle(page)
  assert.ok((await card(page).innerText()).includes('Welcome to QPlan, Lachlan')); assert.ok((await card(page).innerText()).includes('director tour'))
  const writesBefore = calls.filter(isWrite).filter(c => !c.path.includes('active_timers')).length
  const seen = await walk(page, DIRECTOR, 'director')
  console.log(`1 director tour: ${seen.length} cards:`, seen.join(' > '))
  assert.ok(seen.length > 10)
  assert.equal(await title(page), 'Dashboard')
  assert.equal(await page.evaluate(() => document.getElementById('root').hasAttribute('inert')), false)
  assert.equal(await page.locator('text=Switch the timer to this job?').count(), 0, 'opening a job in the tour must not ask to switch the timer')
  assert.equal(await page.getByTestId('timer-rec').count(), 1, 'the running timer is still running')
  assert.equal(snapshotDb(), before, 'no job, time log, meeting or document changed')
  const writes = calls.filter(isWrite).filter(c => !c.path.includes('active_timers')).slice(writesBefore)
  // Two pieces of housekeeping the app does by itself whenever these pages are opened, tour or not:
  // tidying an old job name, and creating the one-off Microsoft approval code the first time a director opens that page.
  const housekeeping = c => c.method === 'PATCH' && ((c.path.startsWith('/rest/v1/jobs?id=eq.') && Object.keys(c.body || {}).join() === 'name') || (c.path.startsWith('/rest/v1/companies?id=eq.') && Object.keys(c.body || {}).join() === 'ms_consent_nonce'))
  const other = writes.filter(c => !housekeeping(c))
  console.log('   writes during the tour:', JSON.stringify(writes.map(c => c.method + ' ' + c.path + ' ' + JSON.stringify(c.body))))
  assert.equal(other.length, 0, 'the tour makes no changes: ' + JSON.stringify(other.map(c => c.method + ' ' + c.path)))
  assert.equal(await page.evaluate(() => sessionStorage.getItem('qplan_job_tab')), null, 'the tour does not change which job tab you were on')
  assert.equal(await page.evaluate(() => localStorage.getItem('qplan_tour_director_u-quinn')), '1')
  assert.ok(db.user_state.find(r => r.user_id === 'u-quinn')?.tours_done?.director, 'finishing is remembered on the account, not just this device')
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1600)
  assert.equal(await page.getByTestId('tour').count(), 0)
  console.log('1 no data changed, timer untouched, not shown again: ok', errors, dialogs); assert.deepEqual(errors, [])
  await page.getByRole('button', { name: 'Show the tutorial' }).click()
  await settle(page); assert.equal(await stepId(page), 'welcome')
  await page.getByTestId('tour-skip').click(); await page.waitForTimeout(300)
  assert.equal(await page.getByTestId('tour').count(), 0)
  console.log('1 ? button replays, Skip closes: ok')
  await browser.close()
  db.active_timers = []
}

// ---------- 2. Clicking what lights up: menu item, the first job, then a tab. Back, keys, locked app, Skip.
{
  const { browser, page, errors } = await open('/', { tour: true })
  await settle(page)
  await page.mouse.click(60, 130); await page.waitForTimeout(250) // the app underneath is locked
  assert.equal(await title(page), 'Dashboard'); assert.equal(await stepId(page), 'welcome')
  await page.getByTestId('tour-next').click(); await settle(page)
  assert.ok((await card(page).innerText()).includes('Now click Jobs in the menu'))
  const over = await page.evaluate(() => { const h = document.querySelector('[data-testid=tour-hot]').getBoundingClientRect(); const n = document.querySelector('[data-tour=nav-jobs]').getBoundingClientRect(); return Math.abs(h.left - n.left) <= 4 && Math.abs(h.top - n.top) <= 4 && Math.abs(h.bottom - n.bottom) <= 4 })
  assert.ok(over, 'the lit-up box sits exactly over the real menu item')
  await page.getByTestId('tour-hot').click(); await settle(page)
  assert.equal(await stepId(page), 'jobs'); assert.equal(await title(page), 'All Jobs')
  assert.ok((await card(page).innerText()).includes('Now click the first job in the list'))
  const firstCode = await page.evaluate(() => [...document.querySelectorAll('[data-tour=jobs-first]')].find(e => e.getBoundingClientRect().width > 0).innerText.match(/\d{4}-\d{3}/)[0])
  await page.getByTestId('tour-hot').click(); await settle(page)
  assert.equal(await stepId(page), 'job-header'); assert.equal(await title(page), 'Job Detail')
  assert.ok((await page.locator('[data-tour=job-header]').innerText()).includes(firstCode), 'it opens the job it was pointing at')
  console.log('2 clicking Jobs, then the first job (' + firstCode + ') opens that job: ok')
  await page.getByTestId('tour-next').click(); await settle(page)
  assert.equal(await stepId(page), 'job-overview'); assert.ok((await card(page).innerText()).includes('Now click the HPC Stages tab'))
  const overTab = await page.evaluate(() => { const h = document.querySelector('[data-testid=tour-hot]').getBoundingClientRect(); const n = document.querySelector('[data-tour=jobtab-hpc-stages]').getBoundingClientRect(); return Math.abs(h.left - n.left) <= 4 && Math.abs(h.top - n.top) <= 4 })
  assert.ok(overTab); assert.equal(await page.getByTestId('tour-tag').count(), 1)
  await page.getByTestId('tour-hot').click(); await settle(page)
  assert.equal(await stepId(page), 'job-hpc-stages'); assert.equal(await activeTab(page), 'HPC Stages')
  await page.getByTestId('tour-hot').click(); await settle(page)
  assert.equal(await stepId(page), 'job-da-stages'); assert.equal(await activeTab(page), 'DA Stages')
  console.log('2 clicking the lit-up tabs opens them: ok')
  await card(page).getByRole('button', { name: 'Back', exact: true }).click(); await settle(page)
  assert.equal(await stepId(page), 'job-hpc-stages'); assert.equal(await activeTab(page), 'HPC Stages')
  await page.keyboard.press('ArrowRight'); await settle(page); assert.equal(await stepId(page), 'job-da-stages')
  await page.keyboard.press('ArrowLeft'); await settle(page); assert.equal(await stepId(page), 'job-hpc-stages')
  await page.keyboard.press('Enter'); await settle(page); assert.equal(await stepId(page), 'job-da-stages')
  // Back all the way out of the job to the list, and forward into it again
  for (const want of ['job-hpc-stages', 'job-overview', 'job-header', 'jobs']) { await card(page).getByRole('button', { name: 'Back', exact: true }).click(); await settle(page); assert.equal(await stepId(page), want) }
  assert.equal(await title(page), 'All Jobs')
  await page.getByTestId('tour-next').click(); await settle(page); assert.equal(await title(page), 'Job Detail')
  console.log('2 Back, arrow keys, Enter, and back out of the job and in again: ok')
  await page.keyboard.type('hello'); await page.waitForTimeout(150)
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('#root input, #root textarea')].filter(i => i.value.includes('hello')).length), 0)
  await page.getByTestId('tour-skip').click(); await page.waitForTimeout(400)
  assert.equal(await page.getByTestId('tour').count(), 0); assert.equal(await title(page), 'Dashboard')
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1600)
  assert.equal(await page.getByTestId('tour').count(), 0)
  await page.getByRole('button', { name: 'Show the tutorial' }).click(); await settle(page)
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  assert.equal(await page.getByTestId('tour').count(), 0)
  console.log('2 locked app, Skip part way, Escape: ok', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 3. A firm with no jobs yet gets the WHOLE tour, on a built-in example job that is never saved
for (const [who, list, vp] of [['director', DIRECTOR, { width: 1366, height: 650 }], ['staff', STAFF, { width: 1366, height: 700 }], ['director on a phone', DIRECTOR, { width: 390, height: 844 }]]) {
  const keep = db.jobs; db.jobs = []
  if (who === 'staff') { ME.role = 'employee'; ME.id = 'u-todd'; ME.username = 'Todd Grubb' }
  const { browser, page, errors } = await open('/', { tour: true, viewport: vp })
  const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); d.dismiss() })
  const from = calls.length
  let demoReads = 0
  for (let i = 0; i < list.length; i++) {
    await settle(page)
    if (['jobs', 'workload'].includes(list[i])) await page.waitForTimeout(1300) // an empty list: the card points at the page itself
    const id = await stepId(page)
    assert.equal(id, list[i], `empty firm (${who}): card ${i + 1}`)
    const text = await card(page).innerText()
    assert.ok(text.includes(`${i + 1} of ${list.length}`), `empty firm (${who}): same number of cards as a firm with jobs: ${text.slice(0, 40)}`)
    const g = await geometry(page)
    assert.ok(g.inView, `empty firm (${who}): card ${id} on screen`)
    if (i > 0) assert.ok(g.spot && g.arrow, `empty firm (${who}): card ${id} points at something`)
    if (TAB_FOR[id]) {
      assert.equal(await title(page), 'Job Detail')
      assert.equal(await activeTab(page), TAB_FOR[id], `empty firm (${who}): ${id} opens its tab`)
      assert.equal(await page.getByTestId('demo-job-note').count(), 1, 'the example job says it is an example')
      if (id === 'job-header') { assert.ok(text.includes('example job'), 'the first job card says it is an example'); assert.ok((await page.locator('[data-tour=job-header]').innerText()).includes('Example Client')) }
      const body = await page.locator('[data-tour=job-body]').innerText()
      if (id === 'job-hpc-stages') assert.ok(/1 of 3 stages complete/.test(body), 'example stages show: ' + body.slice(0, 80))
      if (id === 'job-da-stages') assert.ok(body.includes('Information request stage'))
      if (id === 'job-time-budget') assert.ok(body.includes('Planning report') && body.includes('Site visit'), 'example time entries show')
      if (id === 'job-ir-notes') assert.ok((await page.locator('[data-tour=job-body] textarea').first().inputValue()).includes('Example note'))
      if (id === 'job-history') assert.ok(body.includes('Job created') && body.includes('Status changed to Active'))
    }
    await page.getByTestId('tour-next').click()
  }
  await page.waitForTimeout(400); assert.equal(await page.getByTestId('tour').count(), 0)
  assert.equal(await title(page), 'Dashboard')
  // nothing was saved, nothing was asked of the database about the example job, and it cannot be gone back to
  const mine = calls.slice(from)
  const housekeeping = c => c.method === 'PATCH' && c.path.startsWith('/rest/v1/companies?id=eq.') && Object.keys(c.body || {}).join() === 'ms_consent_nonce'
  const writes = mine.filter(isWrite).filter(c => !housekeeping(c))
  assert.equal(writes.length, 0, 'the example job writes nothing: ' + JSON.stringify(writes.map(c => c.method + ' ' + c.path)))
  demoReads = mine.filter(c => c.path.includes('00000000-0000-4000-8000-0000000000aa')).length
  assert.equal(demoReads, 0, 'the example job is never looked up in the database')
  assert.equal(db.jobs.length, 0); assert.equal(db.notifications.length, 0); assert.equal(db.stage_notifications.length, 0)
  assert.deepEqual(dialogs, [])
  if (vp.width >= 1024) assert.equal(await page.locator('.qp-sidebar button', { hasText: '‹' }).isDisabled(), true, 'the back button cannot return to the example job')
  assert.ok(!(await page.evaluate(() => localStorage.getItem('qplan_last_page') || '')).includes('00000000-0000-4000'), 'the example job is not remembered as the last page')
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(900)
  assert.equal(await title(page), 'Dashboard'); assert.equal(await page.getByTestId('demo-job-note').count(), 0)
  console.log(`3 empty firm, ${who} (${vp.width}x${vp.height}): all ${list.length} cards on the example job, nothing saved`, errors); assert.deepEqual(errors, [])
  db.jobs = keep
  if (who === 'staff') { ME.role = 'director'; ME.id = 'u-quinn'; ME.username = 'Lachlan Quinn' }
  await browser.close()
}

// ---------- 4. Staff get their own tour, remembered separately
{
  ME.role = 'employee'; ME.id = 'u-todd'; ME.username = 'Todd Grubb'
  const { browser, page, errors } = await open('/', { tour: true, viewport: { width: 1366, height: 700 }, theme: 'dark' })
  await settle(page)
  const first = await card(page).innerText()
  assert.ok(first.includes('Welcome to QPlan, Todd')); assert.ok(!first.includes('director'))
  let all = ''
  page.on('framenavigated', () => {})
  const seen = []
  for (let i = 0; i < STAFF.length; i++) {
    await settle(page)
    const id = await stepId(page); seen.push(id); all += '\n' + await card(page).innerText()
    assert.equal(id, STAFF[i])
    const t = await title(page)
    assert.ok(!['Team Workloads', 'Bookings', 'Microsoft 365'].includes(t), 'staff never land on a director page: ' + t)
    const g = await geometry(page); assert.ok(g.inView, `staff: ${id} on screen`); if (i > 0) assert.ok(g.spot && g.arrow && !g.covers, `staff: ${id} points at something`)
    if (TAB_FOR[id]) assert.equal(await activeTab(page), TAB_FOR[id])
    await page.getByTestId('tour-next').click()
  }
  console.log(`4 staff tour: ${seen.length} cards:`, seen.join(' > '))
  for (const no of ['Workloads', 'Bookings', 'As a director', 'Microsoft 365: set up once']) assert.ok(!all.includes(no), 'staff tour must not mention: ' + no)
  for (const yes of ['Connect my Outlook', 'Edit my profile', 'staff tour']) assert.ok(all.includes(yes), 'staff tour mentions: ' + yes)
  await page.waitForTimeout(300)
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('qplan_tour_'))), ['qplan_tour_staff_u-todd'])
  // the same person made a director later gets the director tour, once
  await page.evaluate(() => { sessionStorage.setItem('pf_test_no_seed', '1'); const s = JSON.parse(localStorage.getItem('pf_session')); s.role = 'director'; localStorage.setItem('pf_session', JSON.stringify(s)) })
  ME.role = 'director'
  await page.reload({ waitUntil: 'networkidle' }); await settle(page)
  assert.ok((await card(page).innerText()).includes('director tour'))
  console.log('4 separate tours, remembered separately: ok', errors); assert.deepEqual(errors, [])
  await browser.close()
  ME.role = 'director'; ME.id = 'u-quinn'; ME.username = 'Lachlan Quinn'
}

// ---------- 5. Phone, with reduced motion
{
  const { browser, page, errors } = await open('/', { tour: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  for (let i = 0; i < DIRECTOR.length; i++) {
    await settle(page)
    const id = await stepId(page); assert.equal(id, DIRECTOR[i])
    const g = await geometry(page)
    assert.ok(g.inView, `phone: card ${id} on screen`); assert.equal(g.hot, false)
    if (i > 0) assert.ok(g.spot && g.arrow, `phone: card ${id} points at something`)
    const extra = await page.evaluate(() => ({ menuOpen: document.querySelector('[data-tour=timer]').getBoundingClientRect().left >= 0, anim: getComputedStyle(document.querySelector('.qp-tour-card')).animationName, tabVisible: (() => { const t = document.querySelector('[data-tour^=jobtab-][data-active=true]'); if (!t) return null; const r = t.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth })() }))
    assert.equal(extra.menuOpen, id === 'timer', `phone: menu open only for the card about the menu (${id})`)
    assert.equal(extra.anim, 'none')
    if (TAB_FOR[id]) { assert.equal(await activeTab(page), TAB_FOR[id]); assert.equal(extra.tabVisible, true, `phone: the ${TAB_FOR[id]} tab is scrolled into view`) }
    if (i > 0 && i < DIRECTOR.length - 1) assert.ok((await card(page).innerText()).includes('Tap Next to carry on'))
    await page.getByTestId('tour-next').click()
  }
  await page.waitForTimeout(400)
  assert.equal(await page.getByTestId('tour').count(), 0)
  assert.ok(await page.evaluate(() => document.querySelector('[data-tour=timer]').getBoundingClientRect().right <= 0), 'menu closed again at the end')
  console.log('5 phone with reduced motion:', DIRECTOR.length, 'cards: ok', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 6. A first login shows it
{
  const { browser, page, errors } = await open('/login', { loggedIn: false, tour: true })
  await page.waitForSelector('input')
  const inputs = page.locator('input')
  await page.getByPlaceholder(/username/i).first().fill('Lachlan Quinn').catch(async () => { await inputs.nth(0).fill('Lachlan Quinn') })
  await page.locator('input[type=password]').first().fill(authState.password)
  await page.getByPlaceholder(/company code/i).first().fill('0000').catch(async () => { await inputs.nth(2).fill('0000') })
  await page.getByRole('button', { name: /^(log in|sign in)$/i }).first().click()
  await settle(page)
  assert.equal(await stepId(page), 'welcome')
  console.log('6 first login shows the tutorial: ok', errors)
  await browser.close()
}
console.log('TOUR TESTS PASSED')
