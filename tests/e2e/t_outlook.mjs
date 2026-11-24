import { open, db, calState } from './harness.mjs'
import assert from 'node:assert/strict'
const COMPANY = db.companies[0].id
const day = (offset) => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// A QPlan meeting that QPlan already put into Outlook (must not be shown twice)
db.bookings.push({ id: 'b9', company_id: COMPANY, title: 'Site visit', type: 'client', date: day(2), start_time: '14:00:00', duration_minutes: 60, attendees: ['Lachlan Quinn'], client_name: 'Josh Richards', created_by: 'Lachlan Quinn', external_id: 'evt-qplan', external_source: 'outlook' })
calState.eventsReply = { success: true, connected: true, events: [
  { id: 'evt-1', subject: 'Dentist', start: `${day(3)}T10:30:00`, end: `${day(3)}T11:15:00`, allDay: false, location: 'Southport', webLink: 'https://outlook.live.com/calendar/item/evt-1' },
  { id: 'evt-2', subject: 'Conference', start: `${day(4)}T00:00:00`, end: `${day(6)}T00:00:00`, allDay: true, location: '', webLink: null },
  { id: 'evt-qplan', subject: 'Josh Richards - Site visit', start: `${day(2)}T14:00:00`, end: `${day(2)}T15:00:00`, allDay: false, location: '', webLink: null },
] }
const { browser, page, errors } = await open('/', { theme: 'dark' })
await page.getByRole('button', { name: /^Calendar/i }).first().click()
await page.waitForSelector('text=Dentist')
assert.deepEqual(calState.lastEventsBody, { start: day(0), end: day(6) })
assert.equal(await page.getByText('All day: Conference').count(), 2, 'a two-day all-day event shows on both days')
assert.equal(await page.locator('.absolute >> text=Site visit').count() + await page.locator('.absolute >> text=Josh R.').count() >= 1, true)
assert.equal(await page.getByText('Josh Richards - Site visit').count(), 0, 'a meeting QPlan sent to Outlook is not shown twice')
await page.waitForSelector('text=3 from your Outlook calendar this week')
await page.screenshot({ path: 'dark/97-outlook-calendar.png' })
// clicking an Outlook meeting opens the summary box, with a link to Outlook
await page.getByText('Dentist').first().click()
const box = page.getByRole('dialog', { name: 'Meeting summary' })
assert.ok((await box.innerText()).includes('Southport'))
assert.equal(await box.getByRole('link', { name: 'Open in Outlook' }).getAttribute('href'), 'https://outlook.live.com/calendar/item/evt-1')
await page.keyboard.press('Escape')
// a director looking at someone else's week does not read that person's Outlook
const before = calState.eventCalls
await page.locator('select:has(option:has-text("Todd Grubb"))').first().selectOption({ label: 'Todd Grubb' }).catch(async () => { await page.locator('select').filter({ hasText: 'Todd Grubb' }).first().selectOption('Todd Grubb') })
await page.waitForTimeout(600)
assert.equal(calState.eventCalls, before, "someone else's Outlook is never read")
assert.equal(await page.getByText('Dentist').count(), 0)
// signed out by Microsoft
calState.eventsReply = { success: false, connected: true, error: 'reconnect', events: [] }
await page.locator('select').filter({ hasText: 'Todd Grubb' }).first().selectOption({ index: 0 }).catch(() => {})
await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /^Calendar/i }).first().click()
await page.waitForSelector('text=Outlook has signed this calendar out')
console.log('ERRORS:', errors)
assert.equal(errors.length, 0)
await browser.close()
console.log('OUTLOOK CALENDAR TESTS PASSED')
