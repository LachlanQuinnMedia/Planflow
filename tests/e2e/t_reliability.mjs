// Messages on screen instead of browser pop-ups, changing your own password, and the app
// reporting its own crashes to the master account.
import { open, db, ME, calls, authState } from './harness.mjs'
import assert from 'node:assert/strict'
const bodyText = (page) => page.evaluate(() => document.body.innerText)
const reports = () => calls.filter(c => c.method === 'POST' && c.path.startsWith('/rest/v1/client_errors'))

// ---------- 1. On-screen messages, not pop-ups
{
  const { browser, page, errors } = await open('/')
  const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); d.dismiss() })
  await page.waitForSelector('[data-tour=dash-stats]')
  await page.locator('[data-tour=timer] button').last().click() // play with no job chosen
  await page.waitForSelector('[data-testid=notices]')
  assert.ok((await page.getByTestId('notices').innerText()).includes('Please select a job first'))
  assert.deepEqual(dialogs, [], 'no browser pop-up')
  await page.locator('[data-tour=timer] button').last().click(); await page.waitForTimeout(200)
  assert.equal(await page.locator('[data-testid=notices] > div').count(), 1, 'the same message is not stacked up')
  await page.getByTestId('notices').getByRole('button', { name: 'Close' }).click()
  assert.equal(await page.getByTestId('notices').count(), 0)
  console.log('1 messages show on screen and can be closed; no pop-ups', errors); assert.deepEqual(errors, [])

  // ---------- 2. Change password
  await page.getByTestId('open-change-password').click(); await page.waitForSelector('[data-testid=change-password]')
  const box = page.getByTestId('change-password')
  await box.getByRole('button', { name: 'Change password' }).click()
  assert.ok((await page.getByTestId('cp-error').innerText()).includes('fill in all three'))
  await box.getByLabel('Current password').fill('wrong one'); await box.getByLabel('New password', { exact: true }).fill('Brand-New-9'); await box.getByLabel('New password again').fill('Brand-New-8')
  await box.getByRole('button', { name: 'Change password' }).click()
  assert.ok((await page.getByTestId('cp-error').innerText()).includes('do not match'))
  await box.getByLabel('New password again').fill('Brand-New-9'); await box.getByRole('button', { name: 'Change password' }).click(); await page.waitForTimeout(400)
  assert.ok((await page.getByTestId('cp-error').innerText()).includes('current password is not right'))
  assert.equal(authState.changed, undefined)
  await box.getByLabel('Current password').fill('Right-Pass-1'); await box.getByRole('button', { name: 'Change password' }).click(); await page.waitForTimeout(500)
  assert.equal(await page.getByTestId('change-password').count(), 0)
  assert.deepEqual(authState.changed, ['Brand-New-9'])
  assert.ok((await page.getByTestId('notices').innerText()).includes('Password changed'))
  const sent = calls.filter(c => c.path.includes('/functions/v1/auth?action=change_password')).pop()
  assert.ok(/^Bearer .+\..+\./.test(sent.auth), 'sent with the person\'s own sign-in')
  console.log('2 change password: checks the boxes, refuses a wrong current password, then changes it'); assert.deepEqual(errors, [])
  await browser.close(); authState.password = 'Right-Pass-1'
}

// ---------- 3. A page that breaks says so, the rest of the app carries on, and QPlan is told
{
  db.jobs.find(j => j.id === 'j2').job_history = 'not a list' // bad data that the History tab cannot draw
  const { browser, page } = await open('/')
  await page.waitForSelector('[data-tour=dash-stats]')
  await page.locator('[data-tour=nav-jobs]').click(); await page.locator('[data-tour=jobs-list]:visible >> text=2026-006').first().click(); await page.waitForSelector('[data-tour=job-tabs]')
  const before = reports().length
  await page.locator('[data-tour=jobtab-history]').click()
  await page.waitForSelector('[data-testid=page-broken]')
  assert.ok((await page.getByTestId('page-broken').innerText()).includes('This page hit a problem'))
  await page.waitForTimeout(400)
  const mine = reports().slice(before)
  assert.equal(mine.length, 1, 'reported once')
  const r = mine[0].body
  assert.equal(r.company_id, ME.company_id); assert.equal(r.user_id, ME.id); assert.equal(r.username, 'Lachlan Quinn'); assert.equal(r.page, 'jobdetail')
  assert.ok(/map is not a function/.test(r.message), r.message); assert.ok(r.detail.includes('Page crashed'))
  assert.ok(!JSON.stringify(r).includes('Brad Miller'), 'no job or client details are sent')
  // the menu still works
  await page.locator('[data-tour=nav-dashboard]').click(); await page.waitForSelector('[data-tour=dash-stats]')
  assert.equal(await page.getByTestId('page-broken').count(), 0)
  // an error nothing caught is reported once; noise is not
  await page.evaluate(() => { setTimeout(() => { throw new Error('Test crash 123') }); setTimeout(() => { throw new Error('Test crash 123') }, 30); setTimeout(() => Promise.reject(new TypeError('Failed to fetch')), 60) })
  await page.waitForTimeout(500)
  const more = reports().slice(before + 1)
  assert.equal(more.length, 1); assert.equal(more[0].body.message, 'Test crash 123'); assert.equal(more[0].body.page, 'dashboard')
  console.log('3 a broken page is contained and reported once; dropped connections are not reported')
  await browser.close()
  db.jobs.find(j => j.id === 'j2').job_history = null
}

// ---------- 4. Only the master account sees the reports
{
  db.client_errors = [{ id: 1, company_id: ME.company_id, user_id: 'u-todd', username: 'Todd Grubb', page: 'jobdetail', message: 'history.map is not a function', detail: 'Page crashed', created_at: new Date().toISOString() }]
  db.app_users.find(u => u.id === 'u-quinn').is_platform_admin = true; ME.is_platform_admin = true
  const { browser, page, errors } = await open('/')
  page.on('dialog', d => d.accept())
  await page.waitForSelector('[data-tour=nav-firms]'); await page.locator('[data-tour=nav-firms]').click(); await page.waitForSelector('[data-testid=problem-row]')
  const row = await page.getByTestId('problem-row').innerText()
  assert.ok(row.includes('history.map is not a function') && row.includes('HPC Planning') && row.includes('Todd Grubb') && row.includes('jobdetail'))
  await page.getByTestId('problems').getByRole('button', { name: 'Clear' }).click(); await page.waitForTimeout(500)
  assert.equal(db.client_errors.length, 0); assert.ok((await page.getByTestId('problems').innerText()).includes('Nothing reported'))
  console.log('4 the master account reads and clears the reports', errors); assert.deepEqual(errors, [])
  await browser.close(); delete ME.is_platform_admin; db.app_users.find(u => u.id === 'u-quinn').is_platform_admin = false
}
console.log('RELIABILITY TESTS PASSED')
