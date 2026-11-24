import { open, shot, db, calState, ME, calls } from './harness.mjs'
import assert from 'node:assert/strict'
const COMPANY = db.companies[0].id
const pad = n => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const FIXED = new Date('2026-11-25T10:30:00+10:00') // a Wednesday morning
const day = (offset) => { const d = new Date(2026, 10, 25); d.setDate(d.getDate() - d.getDay() + offset); return iso(d) }
db.bookings = [
  { id: 'b1', company_id: COMPANY, title: 'Site visit', type: 'client', date: day(3), start_time: '14:00:00', duration_minutes: 90, attendees: ['Lachlan Quinn', 'Todd Grubb'], client_name: 'Josh Richards', created_by: 'Lachlan Quinn', job_code: '2026-003', notes: 'Email: josh@example.com\nPhone: 0400 000 001\nAddress: 18 Parma Court, Mount Nathan QLD 4211\nAgenda: Walk the site and confirm the building envelope' },
  { id: 'b2', company_id: COMPANY, title: 'Team catch up', type: 'internal', date: day(4), start_time: '09:00', duration_minutes: 30, attendees: ['Lachlan Quinn', 'Murray', 'Chris Lewis'], created_by: 'Murray', notes: 'Weekly workload review' },
  { id: 'b3', company_id: COMPANY, title: 'Pre-lodgement call', type: 'client', date: day(2), start_time: '18:00', duration_minutes: 60, attendees: ['Lachlan Quinn'], client_name: 'Brad Miller', created_by: 'Lachlan Quinn', job_code: '2026-006', notes: 'Email: \nPhone: \nAddress: \nAgenda: ' },
]
calState.eventsReply = { success: true, connected: true, events: [
  { id: 'o1', subject: 'Council meeting', start: `${day(3)}T10:00:00`, end: `${day(3)}T11:00:00`, allDay: false, location: '8 Karp Court, Bundall QLD 4217', webLink: 'https://outlook.example/o1', attendees: ['Lachlan Quinn', 'Sam Council'], organizer: 'Sam Council', preview: 'Discuss the information request for Parma Court.' },
  { id: 'o2', subject: 'Teams sync', start: `${day(1)}T08:00:00`, end: `${day(1)}T08:30:00`, allDay: false, location: 'Microsoft Teams Meeting', webLink: 'https://outlook.example/o2' },
  { id: 'o3', subject: 'Conference', start: `${day(4)}T00:00:00`, end: `${day(6)}T00:00:00`, allDay: true, location: '', webLink: null, attendees: [], organizer: '', preview: '' },
] }

async function openCal(viewport, theme) {
  const ctx = await open('/', { viewport, theme })
  await ctx.page.clock.install({ time: FIXED })
  if (viewport.width < 1024) await ctx.page.getByRole('button', { name: /Open menu/ }).click()
  await ctx.page.getByRole('button', { name: 'Calendar' }).first().click()
  await ctx.page.waitForSelector('text=Connect calendar')
  await ctx.page.reload({ waitUntil: 'networkidle' })
  await ctx.page.waitForSelector('[data-testid=calendar-grid]')
  await ctx.page.waitForTimeout(400)
  return ctx
}

// ---------- 1. the day fits on screen
for (const [name, viewport] of [['desktop', { width: 1360, height: 900 }], ['laptop', { width: 1366, height: 650 }], ['tablet', { width: 820, height: 1180 }], ['phone', { width: 390, height: 844 }]]) {
  const { browser, page, errors } = await openCal(viewport)
  const m = await page.evaluate(() => {
    const g = document.querySelector('[data-testid=calendar-grid]')
    const sc = g.closest('.overflow-y-auto')
    const r = g.getBoundingClientRect(), s = sc.getBoundingClientRect()
    const row = g.querySelector('.grid').getBoundingClientRect().height
    return { gridBottom: Math.round(r.bottom), viewBottom: Math.round(s.bottom), row, rows: g.querySelectorAll(':scope > div > .grid').length, scrollTop: sc.scrollTop, innerScroll: getComputedStyle(g).overflowY }
  })
  console.log(`1 ${name} ${viewport.width}x${viewport.height}:`, JSON.stringify(m))
  assert.equal(m.rows, 13)
  assert.ok(m.gridBottom <= m.viewBottom, `${name}: 7pm row must be on screen without scrolling`)
  assert.ok(m.row >= 30 && m.row <= 64)
  await shot(page, `cal-fit-${name}`)
  assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 2. summary box, QPlan and Outlook; now line
for (const theme of ['light', 'dark']) {
  const { browser, page, errors } = await openCal({ width: 1360, height: 900 }, theme)
  assert.equal(await page.getByTestId('now-line').count(), 1); console.log('2 now line shown on today:', theme)
  const popups = []; page.on('popup', p => popups.push(p))
  const grid = page.getByTestId('calendar-grid')

  await grid.locator('text=Josh R.').click()
  let box = page.getByRole('dialog', { name: 'Meeting summary' })
  let t = await box.innerText()
  console.log('2a client meeting box:', JSON.stringify(t))
  for (const want of ['Client meeting', 'Site visit', 'with Josh Richards', 'Time', '2:00pm to 3:30pm (1hr 30min)', 'Address', '18 Parma Court, Mount Nathan QLD 4211', 'Attendees', 'Lachlan Quinn, Todd Grubb, Josh Richards (client)', 'Purpose', 'Walk the site and confirm the building envelope', '2026-003', '0400 000 001']) assert.ok(t.includes(want), 'missing: ' + want)
  assert.match(await box.getByRole('link', { name: '18 Parma Court, Mount Nathan QLD 4211' }).getAttribute('href'), /google\.com\/maps\/search\/\?api=1&query=18%20Parma%20Court/)
  const size = await box.boundingBox(); assert.ok(size.width <= 384 && size.height < 420, 'small box ' + JSON.stringify(size))
  await shot(page, `cal-summary-client-${theme}`)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  assert.equal(await box.count(), 0)

  await grid.locator('text=Team catch up').click()
  t = await box.innerText(); console.log('2b staff meeting box:', JSON.stringify(t))
  for (const want of ['Staff meeting', 'Team catch up', '9:00am to 9:30am (30min)', 'Not added', 'Lachlan Quinn, Murray, Chris Lewis', 'Weekly workload review']) assert.ok(t.includes(want), 'missing: ' + want)
  await page.mouse.click(20, 500); await page.waitForTimeout(150) // click outside closes
  assert.equal(await box.count(), 0)

  // a client meeting with nothing filled in falls back to the job's address
  await grid.locator('text=Brad M.').click()
  t = await box.innerText(); console.log('2c job address fallback:', JSON.stringify(t))
  assert.ok(t.includes('25 Charlotte Street, Paddington QLD 4064')); assert.ok(t.includes('Not added'))
  await box.getByRole('button', { name: 'Edit' }).click()
  await page.waitForTimeout(300)
  assert.ok(await page.locator('text=Edit meeting').count() > 0 || await page.locator('text=Save').count() > 0)
  await page.keyboard.press('Escape'); await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('[data-testid=calendar-grid]')

  await page.getByTestId('calendar-grid').locator('text=Council meeting').click()
  box = page.getByRole('dialog', { name: 'Meeting summary' })
  t = await box.innerText(); console.log('2d outlook box:', JSON.stringify(t))
  for (const want of ['Outlook', 'Council meeting', '10:00am to 11:00am (1hr)', '8 Karp Court, Bundall QLD 4217', 'Lachlan Quinn, Sam Council', 'Discuss the information request for Parma Court.', 'Sam Council', 'Open in Outlook']) assert.ok(t.includes(want), 'missing: ' + want)
  assert.equal(await box.getByRole('button', { name: 'Edit' }).count(), 0); assert.equal(await box.getByRole('button', { name: 'Delete' }).count(), 0)
  assert.equal(await box.getByRole('link', { name: 'Open in Outlook' }).getAttribute('href'), 'https://outlook.example/o1')
  assert.equal(popups.length, 0, 'clicking an Outlook meeting must not jump out to Outlook')
  await shot(page, `cal-summary-outlook-${theme}`)
  await box.getByRole('button', { name: 'Close' }).last().click()

  // older server reply: no attendees or description; a Teams location is not a map link
  await page.getByTestId('calendar-grid').locator('text=Teams sync').click()
  t = await box.innerText(); console.log('2e outlook without details:', JSON.stringify(t))
  assert.ok(t.includes('Open it in Outlook to see who is invited')); assert.ok(t.includes('Microsoft Teams Meeting'))
  assert.equal(await box.getByRole('link', { name: 'Microsoft Teams Meeting' }).count(), 0)
  await page.keyboard.press('Escape')
  await page.getByTestId('calendar-grid').locator('text=All day: Conference').first().click()
  t = await box.innerText(); console.log('2f all day:', JSON.stringify(t))
  assert.ok(/All day, .*26 November 2026 to .*27 November 2026/.test(t)); assert.ok(t.includes('Just you'))
  await page.keyboard.press('Escape')

  // list under the grid opens the same box
  await page.locator('text=Josh Richards: Site visit').click()
  assert.ok((await box.innerText()).includes('Walk the site'))
  await page.keyboard.press('Escape')
  console.log('2 ERRORS', theme, errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 3. phone summary box
{
  const { browser, page, errors } = await openCal({ width: 390, height: 844 })
  await page.getByTestId('calendar-grid').locator('.cursor-pointer.absolute').first().click()
  await page.waitForSelector('[role=dialog]')
  await shot(page, 'cal-summary-phone')
  const b = await page.getByRole('dialog').boundingBox(); assert.ok(b.x >= 0 && b.x + b.width <= 390)
  assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 4. Microsoft 365 is for directors; staff can still connect their own Outlook
{
  // director
  const d = await open('/')
  await d.page.waitForSelector('text=Time tracker')
  let nav = await d.page.locator('.w-52').first().innerText()
  assert.ok(nav.includes('Microsoft 365')); assert.ok(!nav.includes('Connect my Outlook'))
  await d.page.getByRole('button', { name: 'Microsoft 365' }).click()
  await d.page.waitForTimeout(500)
  assert.ok(!(await d.page.locator('body').innerText()).includes('set up by a director'))
  console.log('4a director still has Microsoft 365: ok')
  await d.browser.close()

  // employee
  ME.role = 'employee'; ME.id = 'u-todd'; ME.username = 'Todd Grubb'
  calState.eventsReply = { success: true, connected: false, events: [] }
  const e = await open('/')
  await e.page.waitForSelector('text=Time tracker')
  nav = await e.page.locator('.w-52').first().innerText()
  assert.ok(!nav.includes('Microsoft 365'), 'staff must not see Microsoft 365'); assert.ok(nav.includes('Connect my Outlook'))
  // an old saved page pointing at Microsoft 365 is ignored for staff
  await e.page.evaluate(() => localStorage.setItem('qplan_last_page', JSON.stringify({ userId: 'u-todd', page: 'microsoft', jobId: null, at: Date.now() })))
  await e.page.evaluate(() => { document.addEventListener('visibilitychange', ev => ev.stopImmediatePropagation(), true) })
  await e.page.reload({ waitUntil: 'networkidle' })
  assert.equal(await e.page.locator('.h-12 .truncate').first().innerText(), 'Dashboard')
  console.log('4b staff: no Microsoft 365 in the menu, saved page ignored: ok')
  await e.page.getByRole('button', { name: 'Connect my Outlook' }).click()
  await e.page.waitForSelector('text=Connect Calendar')
  assert.equal(await e.page.locator('.h-12 .truncate').first().innerText(), 'Calendar')
  await e.page.waitForSelector('text=Microsoft Outlook')
  await shot(e.page, 'staff-connect-outlook')
  await e.page.getByRole('button', { name: 'Done' }).click()
  await e.page.waitForSelector('text=Connect your Outlook so your meetings show here')
  await shot(e.page, 'staff-connect-hint')
  // the hint's button goes to Microsoft with the calendar permission and comes back to the Calendar
  const [req] = await Promise.all([
    e.page.waitForRequest(r => r.url().startsWith('https://login.microsoftonline.com/'), { timeout: 5000 }),
    e.page.getByRole('button', { name: 'Connect Outlook' }).click(),
  ])
  const u = new URL(req.url()); const st = JSON.parse(Buffer.from(u.searchParams.get('state'), 'base64').toString())
  console.log('4c staff connect goes to Microsoft:', u.searchParams.get('scope'), JSON.stringify(st))
  assert.equal(st.provider, 'outlook'); assert.equal(st.username, 'Todd Grubb'); assert.ok(!st.returnTo)
  assert.match(u.searchParams.get('scope'), /Calendars\.ReadWrite/)
  await e.browser.close()
}
console.log('CALENDAR 2 TESTS PASSED')
