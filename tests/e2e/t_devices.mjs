// What QPlan remembers about a person follows their account, not the device:
// the tutorial is shown once ever, and a notification read on one device is not new on the next.
import assert from 'node:assert/strict'
import { open, db, calls, userStateMock } from './harness.mjs'

const tourCount = (page) => page.getByTestId('tour').count()
const settle = (page, ms = 1700) => page.waitForTimeout(ms)
const badge = async (page) => { const b = page.getByTestId('notifications-badge'); return (await b.count()) ? Number(await b.first().textContent()) : 0 }
const stateWrites = () => calls.filter(c => c.method === 'POST' && c.path.startsWith('/rest/v1/user_state'))
const mine = () => db.user_state.find(r => r.user_id === 'u-quinn')
const COMPANY = 'b14f0515-8538-4356-aa0c-9f828058e744'

// ---------- 1. A brand new device, but the account has done the tutorial: not shown again
{
  const { browser, page, errors } = await open('/', { tour: 'account' })
  await settle(page)
  assert.equal(await tourCount(page), 0, 'the tutorial is not shown again on a new device')
  assert.equal(await page.evaluate(() => localStorage.getItem('qplan_tour_director_u-quinn')), '1', 'the new device now remembers too')
  console.log('1 new device, tutorial already done on the account: not shown', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 2. Never done anywhere: shown, finished once, then never again on any device
{
  const first = await open('/', { tour: true })
  await settle(first.page)
  assert.equal(await tourCount(first.page), 1, 'someone who has never done it gets the tutorial')
  await first.page.getByTestId('tour-skip').click(); await first.page.waitForTimeout(600)
  assert.ok(mine()?.tours_done?.director, 'skipping or finishing is saved to the account')
  assert.equal(mine().tours_done.staff, undefined, 'only the tutorial they were shown is marked')
  await first.browser.close()
  // the laptop, the installed app, the phone: each a device that has never seen this person
  for (const viewport of [{ width: 1360, height: 900 }, { width: 390, height: 844 }]) {
    const next = await open('/', { tour: 'account', keepUserState: true, viewport })
    await settle(next.page)
    assert.equal(await tourCount(next.page), 0, `not shown again on another device (${viewport.width} wide)`)
    assert.deepEqual(next.errors, [])
    await next.browser.close()
  }
  console.log('2 finished once, never shown again on other devices: ok')
}

// ---------- 3. A device that already knew hands it to the account
{
  db.user_state = []
  const { browser, page, errors } = await open('/', { keepUserState: true }) // this device has the old "done" flag, the account has nothing yet
  await settle(page, 900)
  assert.equal(await tourCount(page), 0)
  assert.ok(mine()?.tours_done?.director, 'the account learned it from the device')
  console.log('3 an old device passes what it knew to the account: ok', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 4. Notifications: read on one device, not new on the next
{
  db.notifications = [
    { id: 'n1', company_id: COMPANY, type: 'new_user', message: 'New director account created: Chris Lewis. ', is_read: true, created_at: '2026-11-01T23:20:59Z' },
    { id: 'n2', company_id: COMPANY, type: 'new_meeting', message: 'New staff meeting: Team catch up on Mon 23 Nov at 9:00am (3 attendees)', is_read: false, created_at: '2026-11-22T01:00:00Z' },
  ]
  const a = await open('/', { tour: 'account' })
  await settle(a.page, 900)
  assert.equal(await badge(a.page), 2, 'both are new to someone who has never opened Notifications')
  const before = stateWrites().length
  await a.page.getByTestId('notifications-button').click(); await a.page.waitForTimeout(700)
  assert.equal(await badge(a.page), 0)
  assert.equal(stateWrites().length, before + 1, 'opening the panel is saved to the account')
  const seen = mine().notifications_seen[COMPANY]
  assert.ok(new Date(seen) > new Date('2026-11-22T01:00:00Z'))
  await a.browser.close()

  const b = await open('/', { tour: 'account', keepUserState: true, viewport: { width: 390, height: 844 } })
  await settle(b.page, 900)
  assert.equal(await badge(b.page), 0, 'already read on the first device, so not new on the phone')
  // something that arrives after that is new everywhere
  db.notifications.unshift({ id: 'n3', company_id: COMPANY, type: 'new_meeting', message: 'New staff meeting: Site visit', is_read: false, created_at: new Date(Date.now() + 1000).toISOString() })
  await b.page.reload({ waitUntil: 'networkidle' }); await settle(b.page, 900)
  assert.equal(await badge(b.page), 1, 'only the one that arrived since')
  assert.deepEqual(b.errors, [])
  await b.browser.close()
  console.log('4 notifications read on one device are not new on the next: ok')

  // the master account keeps a separate "last read" for each firm it opens
  assert.deepEqual(Object.keys(mine().notifications_seen), [COMPANY])
  db.notifications = []
}

// ---------- 5. If the account's memory cannot be reached, the device's own memory still works
{
  userStateMock.down = true
  const known = await open('/', {})
  await settle(known.page)
  assert.equal(await tourCount(known.page), 0, 'a device that knows does not show it')
  assert.deepEqual(known.errors, [])
  await known.browser.close()
  const fresh = await open('/', { tour: true })
  await settle(fresh.page)
  assert.equal(await tourCount(fresh.page), 1, 'a device that does not know shows it, as before')
  await fresh.page.getByTestId('tour-skip').click(); await fresh.page.waitForTimeout(400)
  await fresh.page.reload({ waitUntil: 'networkidle' }); await settle(fresh.page)
  assert.equal(await tourCount(fresh.page), 0, 'and remembers on this device')
  await fresh.browser.close()
  userStateMock.down = false
  console.log('5 account memory unreachable: falls back to the device: ok')
}
console.log('t_devices: all passed')
