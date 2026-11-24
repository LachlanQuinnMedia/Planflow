// Bringing in old jobs: from the firm's job folders, or from a file exported from an old system.
import { open, db, ME, calls, msState, importState } from './harness.mjs'
import assert from 'node:assert/strict'

const COMPANY = ME.company_id
const title = (page) => page.locator('.h-12 .truncate').first().innerText()
const bodyText = (page) => page.evaluate(() => document.body.innerText)
const goImport = async (page) => { await page.locator('[data-tour=nav-firm]').click(); await page.getByRole('button', { name: 'Bring in old jobs' }).click(); await page.waitForSelector('[data-testid=import-page]') }
const startJobs = db.jobs.length

// 1,203 job folders, grouped in year folders, the way firms really keep them
const year = (y, n) => Array.from({ length: n }, (_, i) => ({
  id: `f-${y}-${i + 1}`, name: `${y}-${String(i + 1).padStart(3, '0')} ${['Smith', 'Nguyen', 'Coastline Developments Pty Ltd', 'Lee, Sam'][i % 4]} - ${i + 1} ${['Bay Street', 'Ocean Parade', 'Reef Road'][i % 3]}, Southport`,
  childCount: 4, webUrl: `https://example.sharepoint.com/jobs/${y}/${i + 1}`, driveId: 'd1', path: `Jobs/${y}/x`, created: `${y}-0${(i % 9) + 1}-15T01:00:00Z`, modified: null,
}))
importState.folders = {
  'f-jobs': [{ id: 'y2021', name: '2021', driveId: 'd1' }, { id: 'y2022', name: '2022', driveId: 'd1' }, { id: 'y2023', name: '2023 Jobs', driveId: 'd1' }],
  y2021: year(2021, 450), y2022: year(2022, 400),
  y2023: [...year(2023, 350), { id: 'f-t', name: 'Templates', driveId: 'd1', created: '2023-01-01T00:00:00Z' }, { id: 'f-a', name: '_Admin', driveId: 'd1', created: '2023-01-01T00:00:00Z' },
    // one that is already in QPlan
    { id: 'f-dup', name: '2026-003 Josh Richards - 18 Parma Court', driveId: 'd1', created: '2023-01-01T00:00:00Z' }],
}

// ---------- 1. From job folders: 1,200 jobs, grouped by year, a few seconds
{
  const { browser, page, errors } = await open('/')
  const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); d.accept() })
  await page.waitForSelector('[data-tour=dash-stats]')
  await goImport(page)
  assert.equal(await title(page), 'Import jobs')
  await page.getByRole('button', { name: 'Read "Jobs"' }).click()
  await page.waitForSelector('[data-testid=import-preview]', { timeout: 20000 })
  const pre = await bodyText(page)
  assert.ok(pre.includes('1,200') && pre.includes('Ready to import'), 'finds 1,200 jobs across the year folders: ' + pre.slice(0, 300))
  assert.ok(importState.calls.length >= 8, 'read a page at a time: ' + importState.calls.length)
  assert.ok(importState.calls.filter(c => c.next).every(c => c.next.startsWith('https://graph.microsoft.com/v1.0/')))
  const first = page.getByTestId('import-row').first()
  assert.equal(await first.locator('input').nth(0).inputValue(), '2021-001'); assert.equal(await first.locator('input').nth(1).inputValue(), 'Smith'); assert.equal(await first.locator('input').nth(2).inputValue(), '1 Bay Street, Southport')
  assert.ok(pre.includes('Showing 1 to 50 of 1,200'))
  await page.getByRole('button', { name: /^No job number \(2\)/ }).click()
  assert.equal(await page.getByTestId('import-row').count(), 2)
  await page.getByRole('button', { name: /^Skipped \(1\)/ }).click()
  assert.ok((await page.getByTestId('import-row').first().innerText()).includes('Already in QPlan'))
  // fix one by hand before importing
  await page.getByRole('button', { name: /^Ready/ }).click()
  await page.getByTestId('import-row').nth(1).locator('input').nth(1).fill('Nguyen Family Trust')
  const from = calls.length
  assert.equal((await page.getByTestId('import-go').innerText()).trim(), 'Import 1,200 jobs')
  await page.getByTestId('import-go').click()
  await page.waitForSelector('[data-testid=import-done]', { timeout: 30000 })
  assert.ok((await bodyText(page)).includes('1,200 jobs imported'))
  const imported = db.jobs.filter(j => j.import_batch_id)
  assert.equal(imported.length, 1200); assert.equal(db.jobs.length, startJobs + 1200)
  assert.equal(db.import_batches.length, 1); assert.equal(db.import_batches[0].job_count, 1200); assert.equal(db.import_batches[0].source, 'folders')
  const posts = calls.slice(from).filter(c => c.method === 'POST' && c.path.startsWith('/rest/v1/jobs'))
  assert.equal(posts.length, 6, 'saved 200 at a time, not one by one: ' + posts.length)
  const j = imported.find(x => x.code === '2021-001'), co = imported.find(x => x.code === '2021-003'), ls = imported.find(x => x.code === '2021-004'), fixed = imported.find(x => x.code === '2021-002')
  assert.equal(j.status, 'Complete'); assert.equal(j.company_id, COMPANY); assert.equal(j.client_last_name, 'Smith'); assert.equal(j.address, '1 Bay Street, Southport')
  assert.equal(j.name, 'Smith - 1 Bay Street, Southport 2021-001'); assert.equal(j.onedrive_folder_id, 'f-2021-1'); assert.equal(j.onedrive_drive_id, 'd1'); assert.ok(j.onedrive_folder_url.includes('sharepoint'))
  assert.ok(j.created_at.startsWith('2021-01-15'), 'keeps the date the folder was made: ' + j.created_at); assert.ok(j.imported_at)
  assert.equal(co.client_type, 'company'); assert.equal(co.client_company, 'Coastline Developments Pty Ltd')
  assert.equal(ls.client_first_name, 'Sam'); assert.equal(ls.client_last_name, 'Lee')
  assert.equal(fixed.client_company, 'Nguyen Family Trust', 'the hand fix was used')
  assert.ok(!imported.some(x => /Templates|Admin/.test(x.name)), 'folders that are not jobs were left out')
  console.log('1 job folders: 1,200 jobs read from 3 year folders, previewed, imported in 6 requests, each linked to its folder')

  // the archive stays out of everyday lists, and is found by searching
  await page.getByRole('button', { name: 'Go to Jobs' }).click(); await page.waitForSelector('[data-tour=jobs-list]:visible')
  await page.waitForTimeout(500)
  let text = await bodyText(page)
  assert.ok(text.includes('1,200 past jobs from your import'), 'the Jobs page says where they are')
  assert.ok(text.includes(`Showing ${startJobs} of ${startJobs} jobs`), 'everyday list unchanged: ' + (text.match(/Showing[^\n]*/) || [''])[0])
  await page.getByPlaceholder('Search jobs, clients, addresses...').fill('2022-117'); await page.waitForTimeout(900)
  text = await bodyText(page)
  assert.ok(text.includes('2022-117') && text.includes('117 Reef Road'), 'an archived job is found by its number')
  await page.locator('[data-tour=jobs-list]:visible >> text=2022-117').first().click(); await page.waitForSelector('[data-tour=job-tabs]')
  assert.ok((await page.locator('[data-tour=job-header]').innerText()).includes('2022-117'))
  await page.locator('[data-tour=jobtab-documents]').click(); await page.waitForTimeout(400)
  await page.locator('[data-tour=nav-dashboard]').click(); await page.waitForSelector('[data-tour=dash-stats]')
  assert.ok((await page.locator('[data-tour=dash-stats]').innerText()).replace(/\s+/g, ' ').includes(`Total jobs ${startJobs}`), 'dashboard counts working jobs only')
  await page.getByPlaceholder('Search by job code, client, address, planner...').fill('Coastline'); await page.waitForTimeout(900)
  assert.ok((await bodyText(page)).includes('Coastline Developments Pty Ltd'), 'dashboard search reaches the archive')
  const timerOptions = await page.locator('.qp-sidebar select').first().locator('option').count()
  assert.ok(timerOptions <= startJobs + 2, 'the time tracker is not flooded with 1,200 old jobs: ' + timerOptions)

  // run it again: nothing is doubled up
  await goImport(page)
  assert.ok((await page.getByTestId('import-history').innerText()).includes('1,200 jobs from job folders'))
  await page.getByRole('button', { name: 'Read "Jobs"' }).click(); await page.waitForSelector('[data-testid=import-preview]', { timeout: 20000 })
  assert.equal(await page.getByTestId('import-go').isDisabled(), true, 'a second run has nothing new to import')
  assert.ok((await bodyText(page)).includes('Skipped (1,201)'))
  await page.getByRole('button', { name: 'Cancel' }).click()

  // undo: one with time logged since is kept
  db.time_logs.push({ id: 't-imp', job_id: fixed.id, job_code: fixed.code, planner: 'Todd Grubb', task: 'Old file review', hours: 1, duration_seconds: 3600, rate: 180, created_at: new Date().toISOString() })
  await page.getByTestId('import-history').getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(2500)
  assert.equal(dialogs.length, 1); assert.ok(dialogs[0].includes('Undo this import'))
  assert.equal(db.jobs.filter(x => x.import_batch_id).length, 1, 'all but the one with time on it removed')
  assert.equal(db.jobs.length, startJobs + 1); assert.ok(db.import_batches[0].undone_at)
  assert.ok((await bodyText(page)).includes('1,199 jobs removed') && (await bodyText(page)).includes('1 kept'))
  console.log('1 archive is searched, not loaded; a second run skips everything; undo removes 1,199 and keeps the one with time on it', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 2. From a file: any columns, any headings
{
  db.jobs = db.jobs.filter(j => !j.import_batch_id); db.time_logs = db.time_logs.filter(t => t.id !== 't-imp'); db.import_batches = []
  const { browser, page, errors } = await open('/')
  await page.waitForSelector('[data-tour=dash-stats]'); await goImport(page)
  const csv = ['Jobs export - Old System,,,,,,,,', '',
    'Project Manager,Site Address,Job No.,Company,Client Name,LGA,Status,Date Opened,Type',
    'Dana,"4 Reef Street, Burleigh Heads",2019-004,,Sam Lee,City of Gold Coast,Closed,12/03/2019,MCU',
    'Dana,"9 ""The"" Esplanade",2019-005,Tran Holdings Pty Ltd,Kim Tran,Brisbane City Council,In progress,01/04/2019,Reconfiguration of a Lot',
    'Raj,22 Hill Road,2019-006,,Alex Kumar,,,,',
    'Raj,1 Dup Street,2026-003,,Already Here,,,,',
    ',No Number Lane,,,Lost File,,,,'].join('\r\n')
  await page.getByTestId('import-file-input').setInputFiles({ name: 'old system export.csv', mimeType: 'text/csv', buffer: Buffer.from('﻿' + csv) })
  await page.waitForSelector('[data-testid=import-columns]')
  const picked = async (k) => page.getByTestId(`col-${k}`).evaluate(el => el.options[el.selectedIndex].text)
  assert.equal(await picked('code'), 'Job No.'); assert.equal(await picked('client'), 'Client Name'); assert.equal(await picked('client_company'), 'Company')
  assert.equal(await picked('address'), 'Site Address'); assert.equal(await picked('council'), 'LGA'); assert.equal(await picked('planner'), 'Project Manager')
  assert.equal(await picked('status'), 'Status'); assert.equal(await picked('created'), 'Date Opened'); assert.equal(await picked('app_type'), 'Type'); assert.equal(await picked('notes'), 'Not in this file')
  assert.ok((await bodyText(page)).includes('5 rows'))
  await page.getByRole('button', { name: 'Looks right, show me the jobs' }).click(); await page.waitForSelector('[data-testid=import-preview]')
  assert.equal((await page.getByTestId('import-go').innerText()).trim(), 'Import 3 jobs')
  await page.getByTestId('import-unnumbered').check()
  assert.equal((await page.getByTestId('import-go').innerText()).trim(), 'Import 4 jobs')
  await page.getByTestId('import-go').click(); await page.waitForSelector('[data-testid=import-done]')
  const got = Object.fromEntries(db.jobs.filter(j => j.import_batch_id).map(j => [j.code, j]))
  assert.deepEqual(Object.keys(got).sort(), ['2019-004', '2019-005', '2019-006', 'OLD-0001'])
  assert.equal(got['2019-004'].status, 'Complete'); assert.equal(got['2019-004'].app_type, 'MCU'); assert.equal(got['2019-004'].council, 'City of Gold Coast'); assert.ok(got['2019-004'].created_at.startsWith('2019-03-12'), 'day-first dates: ' + got['2019-004'].created_at)
  assert.equal(got['2019-005'].status, 'Active', 'a row with its own status keeps it'); assert.equal(got['2019-005'].app_type, 'ROL'); assert.equal(got['2019-005'].client_company, 'Tran Holdings Pty Ltd')
  assert.equal(got['2019-005'].client_first_name, 'Kim'); assert.equal(got['2019-005'].address, '9 "The" Esplanade'); assert.equal(got['2019-005'].planner, 'Dana')
  assert.equal(got['2019-006'].status, 'Complete'); assert.equal(got['OLD-0001'].address, 'No Number Lane'); assert.equal(got['OLD-0001'].onedrive_folder_id, undefined)
  assert.equal(db.import_batches[0].source, 'file'); assert.equal(db.import_batches[0].label, 'old system export.csv')
  // an old .xls gets a plain message, not a crash
  await page.getByRole('button', { name: 'Import more' }).click()
  await page.getByTestId('import-file-input').setInputFiles({ name: 'jobs.xls', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('x') })
  await page.waitForSelector('[data-testid=import-error]')
  assert.ok((await page.getByTestId('import-error').innerText()).includes('save it as .xlsx or .csv'))
  console.log('2 file: headings matched by themselves, day-first dates, own statuses kept, numbers made for rows without one', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 3. Staff cannot import; Microsoft 365 not connected says so
{
  db.jobs = db.jobs.filter(j => !j.import_batch_id); db.import_batches = []
  const keepMs = { ...msState }; Object.assign(msState, { connected: false, jobsFolder: null })
  const d = await open('/'); await d.page.waitForSelector('[data-tour=dash-stats]'); await goImport(d.page)
  await d.page.waitForTimeout(500)
  assert.ok((await d.page.getByTestId('import-folders').innerText()).includes('Microsoft 365 is not connected yet'))
  assert.equal(await d.page.getByTestId('import-file-input').count(), 1, 'a file can still be used')
  await d.browser.close(); Object.assign(msState, keepMs)
  const me = { ...ME }; Object.assign(ME, { role: 'employee', id: 'u-todd', username: 'Todd Grubb' })
  const s = await open('/'); await s.page.waitForSelector('[data-tour=dash-stats]')
  assert.equal(await s.page.locator('[data-tour=nav-firm]').count(), 0)
  await s.page.evaluate(() => localStorage.setItem('qplan_last_page', JSON.stringify({ userId: 'u-todd', page: 'import', at: Date.now() })))
  await s.page.reload({ waitUntil: 'networkidle' }); await s.page.waitForTimeout(700)
  assert.ok((await bodyText(s.page)).includes('Importing jobs is for directors') || (await title(s.page)) === 'Dashboard')
  assert.equal(await s.page.getByTestId('import-file-input').count(), 0)
  console.log('3 staff cannot import; no Microsoft 365 leaves the file route open', s.errors); assert.deepEqual(s.errors, [])
  await s.browser.close(); Object.assign(ME, me)
}
console.log('IMPORT TESTS PASSED')
