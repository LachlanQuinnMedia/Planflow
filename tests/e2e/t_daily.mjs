// Day-to-day: find a job from anywhere, a day view for the calendar on phones, lists that keep
// themselves up to date, and generated documents going straight into the job's folder.
import { open, db, calls, msState } from './harness.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const title = (page) => page.locator('.h-12 .truncate').first().innerText()
const bodyText = (page) => page.evaluate(() => document.body.innerText)
const letterhead = fs.readFileSync(new URL('../../dist/templates/Generic_Letterhead.docx', import.meta.url))
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }

// ---------- 1. Find a job from anywhere
{
  db.jobs.push({ id: 'old1', code: '2019-044', name: 'Wilson - 3 Harbour Drive 2019-044', client_type: 'individual', client_last_name: 'Wilson', address: '3 Harbour Drive', status: 'Complete', imported_at: '2026-11-20T00:00:00Z', import_batch_id: 'b1', company_id: db.companies[0].id, created_at: '2019-05-01T00:00:00Z' })
  const { browser, page, errors } = await open('/')
  await page.waitForSelector('[data-tour=dash-stats]')
  assert.equal(await page.getByTestId('search-box').count(), 0)
  await page.keyboard.press('Control+k'); await page.waitForSelector('[data-testid=search-box]')
  await page.getByTestId('search-input').fill('charlotte'); await page.waitForTimeout(150)
  assert.equal(await page.getByTestId('search-result').count(), 1)
  assert.ok((await page.getByTestId('search-result').innerText()).includes('2026-006'))
  await page.keyboard.press('Enter'); await page.waitForSelector('[data-tour=job-tabs]')
  assert.equal(await title(page), 'Job Detail'); assert.ok((await page.locator('[data-tour=job-header]').innerText()).includes('2026-006'))
  assert.equal(await page.getByTestId('search-box').count(), 0)
  // "/" opens it too, a past job is found and marked, and Escape closes it
  await page.locator('[data-tour=job-header]').click({ position: { x: 5, y: 5 } }).catch(() => {})
  await page.keyboard.press('/'); await page.waitForSelector('[data-testid=search-box]')
  await page.getByTestId('search-input').fill('harbour'); await page.waitForTimeout(700)
  const past = await page.getByTestId('search-result').innerText()
  assert.ok(past.includes('2019-044') && past.includes('Past job'), 'past job found: ' + past)
  await page.getByTestId('search-input').fill('zzzz nothing'); await page.waitForTimeout(500)
  assert.ok((await page.getByTestId('search-box').innerText()).includes('No job matches'))
  await page.keyboard.press('Escape'); assert.equal(await page.getByTestId('search-box').count(), 0)
  // typing "/" in a text box types a slash
  await page.locator('[data-tour=timer] input').first().fill(''); await page.locator('[data-tour=timer] input').first().press('/')
  assert.equal(await page.getByTestId('search-box').count(), 0); assert.equal(await page.locator('[data-tour=timer] input').first().inputValue(), '/')
  await page.getByTestId('search-open').click(); await page.getByTestId('search-input').fill('harbour'); await page.waitForTimeout(700)
  await page.getByTestId('search-result').first().click(); await page.waitForTimeout(500)
  assert.ok((await page.locator('[data-tour=job-header]').innerText()).includes('2019-044'), 'a past job opens from search')
  console.log('1 find a job from anywhere: Ctrl+K, "/", the button; working and past jobs', errors); assert.deepEqual(errors, [])
  await browser.close()
  db.jobs = db.jobs.filter(j => j.id !== 'old1')
}

// ---------- 2. Calendar: a day at a time on a phone
{
  const today = new Date(); const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  db.bookings.push({ id: 'bk1', company_id: db.companies[0].id, title: 'Site meeting', type: 'client', date: iso, start_time: '10:00', duration_minutes: 60, client_name: 'Josh Richards', attendees: ['Lachlan Quinn'], created_by: 'Lachlan Quinn' })
  const { browser, page, errors } = await open('/', { viewport: { width: 390, height: 844 } })
  await page.getByRole('button', { name: /Open menu/ }).click(); await page.locator('[data-tour=nav-calendar]').click(); await page.waitForSelector('[data-testid=calendar-grid]')
  assert.equal(await page.getByTestId('cal-view-day').getAttribute('aria-pressed'), 'true', 'a phone starts on Day')
  assert.equal(await page.getByTestId('day-strip').locator('button').count(), 7)
  const cols = await page.evaluate(() => document.querySelector('[data-testid=calendar-grid] .grid').children.length)
  assert.equal(cols, 2, 'one day column beside the times')
  const w = await page.evaluate(() => { const e = [...document.querySelectorAll('[data-testid=calendar-grid] [title*="Site meeting"]')][0]; return e ? e.getBoundingClientRect().width : 0 })
  assert.ok(w > 250, 'the meeting has room to be read: ' + w)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'nothing runs off the side')
  const label = await page.getByTestId('calendar-range').innerText()
  await page.locator('[data-tour=calendar-tools]').getByRole('button', { name: '›' }).click()
  assert.notEqual(await page.getByTestId('calendar-range').innerText(), label, 'the arrows move a day at a time')
  await page.getByRole('button', { name: 'Today' }).click(); assert.equal(await page.getByTestId('calendar-range').innerText(), label)
  await page.getByTestId('cal-view-week').click()
  assert.equal(await page.evaluate(() => document.querySelector('[data-testid=calendar-grid] .grid').children.length), 8)
  assert.equal(await page.getByTestId('day-strip').count(), 0)
  await browser.close()
  const wide = await open('/', { viewport: { width: 1366, height: 800 } })
  await wide.page.locator('[data-tour=nav-calendar]').click(); await wide.page.waitForSelector('[data-testid=calendar-grid]')
  assert.equal(await wide.page.getByTestId('cal-view-week').getAttribute('aria-pressed'), 'true', 'a computer starts on Week')
  await wide.browser.close()
  console.log('2 calendar: Day view on a phone, Week on a computer, and a switch between them', errors); assert.deepEqual(errors, [])
  db.bookings = db.bookings.filter(b => b.id !== 'bk1')
}

// ---------- 3. Generated documents go straight into the job's folder
{
  const job = db.jobs.find(j => j.id === 'j1')
  Object.assign(job, { onedrive_folder_id: 'f-j1', onedrive_drive_id: 'd1', onedrive_folder_name: '2026-003 Josh Richards', onedrive_folder_url: 'https://example.sharepoint.com/jobs/j1' })
  msState.uploads = []
  const { browser, page, errors } = await open('/')
  await page.route('**/storage/v1/object/templates/**', r => r.fulfill({ status: 200, headers: cors, contentType: 'application/octet-stream', body: letterhead }))
  const downloads = []; page.on('download', d => downloads.push(d.suggestedFilename()))
  await page.waitForSelector('[data-tour=dash-stats]'); await page.keyboard.press('Control+k'); await page.getByTestId('search-input').fill('2026-003'); await page.keyboard.press('Enter'); await page.waitForSelector('[data-tour=job-tabs]')
  await page.getByRole('button', { name: 'Generate docs' }).click(); await page.waitForSelector('[data-testid=gen-where]')
  assert.ok((await page.getByTestId('gen-where').innerText()).includes('2026-003 Josh Richards'))
  await page.locator('.fixed.inset-0 >> text=Quote Request').click()
  await page.getByTestId('gen-where').getByLabel('Download a copy to this computer').uncheck()
  await page.getByRole('button', { name: 'Generate (1)' }).click()
  await page.waitForSelector('[data-testid=notices]', { timeout: 10000 })
  assert.ok((await page.getByTestId('notices').innerText()).includes("1 document saved in the job's folder"))
  assert.equal(msState.uploads.length, 1); assert.equal(msState.uploads[0].parent_id, 'f-j1'); assert.equal(msState.uploads[0].name, '2026-003_Quote_Request.docx'); assert.ok(msState.uploads[0].content_base64.length > 1000)
  assert.deepEqual(downloads, [], 'not downloaded when the box is unticked')
  assert.ok(job.job_history.some(h => h.text === 'Document generated: Quote Request'))
  // Microsoft refuses: the document is never lost, it downloads
  msState.uploadFails = true
  await page.getByRole('button', { name: 'Generate docs' }).click(); await page.waitForSelector('[data-testid=gen-where]')
  assert.equal(await page.getByTestId('gen-where').getByLabel('Download a copy to this computer').isChecked(), false, 'the choice is remembered')
  await page.locator('.fixed.inset-0 >> text=Quote Request').click(); await page.getByRole('button', { name: 'Generate (1)' }).click()
  await page.waitForTimeout(1500)
  assert.deepEqual(downloads, ['2026-003_Quote_Request.docx']); assert.ok((await page.getByTestId('notices').innerText()).includes('downloaded only'))
  msState.uploadFails = false
  console.log('3 documents: saved into the job folder, download optional, and a fallback if Microsoft refuses', errors.filter(e => !/400/.test(e)))
  await browser.close()
  // a job with no folder downloads as before, with no boxes to tick
  const plain = await open('/'); const got = []; plain.page.on('download', d => got.push(d.suggestedFilename()))
  await plain.page.route('**/storage/v1/object/templates/**', r => r.fulfill({ status: 200, headers: cors, contentType: 'application/octet-stream', body: letterhead }))
  await plain.page.waitForSelector('[data-tour=dash-stats]'); await plain.page.keyboard.press('Control+k'); await plain.page.getByTestId('search-input').fill('2026-006'); await plain.page.keyboard.press('Enter'); await plain.page.waitForSelector('[data-tour=job-tabs]')
  await plain.page.getByRole('button', { name: 'Generate docs' }).click(); await plain.page.waitForTimeout(300)
  assert.equal(await plain.page.getByTestId('gen-where').count(), 0)
  await plain.page.locator('.fixed.inset-0 >> text=Quote Request').click(); await plain.page.getByRole('button', { name: 'Generate (1)' }).click(); await plain.page.waitForTimeout(1500)
  assert.deepEqual(got, ['2026-006_Quote_Request.docx'])
  await plain.browser.close()
  for (const k of ['onedrive_folder_id', 'onedrive_drive_id', 'onedrive_folder_name', 'onedrive_folder_url']) delete job[k]
}

// ---------- 4. Lists keep themselves up to date
{
  const { browser, page, errors } = await open('/')
  await page.waitForSelector('[data-tour=dash-stats]'); await page.locator('[data-tour=nav-jobs]').click(); await page.waitForSelector('[data-tour=jobs-list]:visible')
  assert.ok(!(await bodyText(page)).includes('2026-777'))
  db.jobs.push({ id: 'fresh', code: '2026-777', name: 'New Arrival - 1 Fresh Street 2026-777', client_type: 'individual', client_last_name: 'Arrival', client_first_name: 'New', address: '1 Fresh Street', status: 'Active', planner: 'Todd Grubb', planners: ['Todd Grubb'], company_id: db.companies[0].id, created_at: new Date().toISOString() })
  await page.waitForTimeout(15500) // not within the first few seconds of opening the page
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))) // coming back to the tab
  await page.waitForTimeout(900)
  assert.ok((await bodyText(page)).includes('2026-777'), 'a job someone else added appears without pressing refresh')
  // ...but never while someone is typing
  db.jobs.push({ id: 'fresh2', code: '2026-778', name: 'Later - 2 Fresh Street 2026-778', client_type: 'individual', client_last_name: 'Later', address: '2 Fresh Street', status: 'Active', company_id: db.companies[0].id, created_at: new Date().toISOString() })
  await page.getByPlaceholder('Search jobs, clients, addresses...').focus()
  await page.waitForTimeout(15500); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.waitForTimeout(700)
  assert.ok(!(await bodyText(page)).includes('2026-778'), 'no refresh under someone who is typing')
  console.log('4 the Jobs list refreshes itself when you come back to it, but not while you are typing', errors); assert.deepEqual(errors, [])
  await browser.close()
  db.jobs = db.jobs.filter(j => !['fresh', 'fresh2'].includes(j.id))
}
console.log('DAILY TESTS PASSED')
