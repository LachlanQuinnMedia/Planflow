import { open, shot, db, calls } from './harness.mjs'
import assert from 'node:assert/strict'
db.app_users.find(u => u.id === 'u-quinn').is_platform_admin = true
const { browser, page, errors } = await open('/')
await page.waitForSelector('text=Time tracker')
await page.waitForTimeout(500)
// sidebar label
const side = await page.locator('.w-52').first().innerText()
assert.match(side, /Master account/i); console.log('sidebar says Master account: ok')
// dashboard: directors land straight on the firm-wide view, with no view switch
const dash = await page.locator('.overflow-y-auto').last().innerText()
assert.ok(dash.includes('Director overview')); assert.ok(!dash.includes('View as')); assert.ok(!dash.includes('My view'))
console.log('dashboard: director view, no switch: ok')

// planners page
await page.getByRole('button', { name: 'Planners' }).first().click()
await page.waitForSelector('text=Todd Grubb >> visible=true')
await page.waitForTimeout(400)
const main = page.locator('.overflow-y-auto').last()
const plannersText = await main.innerText()
assert.ok(!plannersText.includes('Lachlan Quinn'), 'master must not be on the planners page')
assert.ok(plannersText.includes('Murray') && plannersText.includes('Chris Lewis'))
await shot(page, 'master-planners')
console.log('planners page: master not listed, others are: ok')

// new job planner list
await page.getByRole('button', { name: '+ New Job', exact: true }).click()
await page.waitForTimeout(600)
const njText = await main.innerText()
assert.ok(!njText.includes('Lachlan Quinn')); assert.ok(njText.includes('Todd Grubb'))
console.log('new job: master not offered as a planner: ok')

// workload
await page.getByRole('button', { name: 'Workloads' }).first().click()
await page.waitForTimeout(600)
const wl = await main.innerText()
assert.ok(!/Lachlan Quinn\s*\n?\s*(Director|director)/.test(wl)); console.log('workload has master card:', /Lachlan Quinn/.test(wl))

// calendar: own week still selected, not offered as an attendee
await page.getByRole('button', { name: 'Calendar' }).first().click()
await page.waitForSelector('text=Connect calendar')
const calSel = page.locator('select').filter({ hasText: 'Murray' }).first()
assert.equal(await calSel.inputValue(), 'Lachlan Quinn')
await page.getByRole('button', { name: '+ New meeting' }).click()
await page.waitForTimeout(400)
await shot(page, 'master-new-meeting')
const modal = await page.locator('.fixed.inset-0').last().innerText()
console.log('new meeting lists master as attendee:', modal.includes('Lachlan Quinn'))
await page.keyboard.press('Escape')
await page.reload({ waitUntil: 'networkidle' })

// time & budget: can still log own time
await page.getByRole('button', { name: 'Time & Budget' }).first().click()
await page.waitForTimeout(600)
const tb = await main.innerText()
console.log('time & budget loaded:', tb.slice(0, 60).replace(/\n/g, ' | '))

// bookings
await page.getByRole('button', { name: 'Bookings' }).first().click()
await page.waitForTimeout(500)
const bkSel = page.locator('select').filter({ hasText: 'All staff' }).first()
console.log('bookings viewing value:', await bkSel.inputValue(), JSON.stringify((await bkSel.locator('option').allInnerTexts()).map(s => s.trim())))
assert.equal(await bkSel.inputValue(), 'Lachlan Quinn')

// every staff query carried the filter
const staffCalls = calls.filter(c => c.method === 'GET' && c.path.startsWith('/rest/v1/app_users') && c.path.includes('is_approved=eq.true'))
assert.ok(staffCalls.length >= 5 && staffCalls.every(c => c.path.includes('is_platform_admin=not.is.true')), 'filter on all staff queries')
console.log('staff queries with the filter:', staffCalls.length, 'ERRORS:', errors)
await browser.close()
console.log('MASTER TESTS PASSED')
