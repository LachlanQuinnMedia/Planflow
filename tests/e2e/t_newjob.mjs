import { open, shot, calls, db } from './harness.mjs'
import assert from 'node:assert/strict'

const { browser, page, errors } = await open('/')
await page.getByRole('button', { name: '+ New Job', exact: true }).click()
await page.waitForSelector('text=Create new job')
await page.waitForSelector('text=Create a new folder for this job')
await shot(page, 'newjob-1-empty', { fullPage: true })

// Company client
await page.selectOption('#client-type', 'company')
await page.getByPlaceholder('Company name').fill('Sunny Developments Pty Ltd')
await page.getByPlaceholder('First name').fill('Troy')
await page.getByPlaceholder('Last name').fill('Hipwood')
await page.getByPlaceholder('client@email.com.au').fill('troy@example.com')
// application type list
const types = await page.locator('select:has(option[value="PS"])').locator('option').allTextContents()
console.log('TYPES:', types.join(' | '))
await page.locator('select:has(option[value="PS"])').selectOption('PS')
await page.getByPlaceholder('12 Marine Parade, Southport QLD 4215').fill('32 Dune Drive, Stapylton QLD 4207')
await page.waitForTimeout(200)
await shot(page, 'newjob-2-filled', { fullPage: true })

await page.getByRole('button', { name: /^Create job/ }).click()
await page.waitForSelector('text=Job created ✓')
await shot(page, 'newjob-3-created')

const insert = calls.find(c => c.method === 'POST' && c.path.startsWith('/rest/v1/jobs'))
console.log('INSERT:', JSON.stringify({ code: insert.body.code, name: insert.body.name, client_type: insert.body.client_type, client_company: insert.body.client_company, first: insert.body.client_first_name, app_type: insert.body.app_type, company_id: insert.body.company_id, planners: insert.body.planners }))
assert.equal(insert.body.code, '2026-007')
assert.equal(insert.body.name, 'Sunny Developments Pty Ltd - 32 Dune Drive, Stapylton QLD 4207 2026-007')
assert.equal(insert.body.client_type, 'company')
assert.equal(insert.body.app_type, 'PS')
const folder = calls.find(c => c.path.includes('ms-graph?action=create_folder'))
console.log('FOLDER:', JSON.stringify(folder.body))
assert.equal(folder.body.name, 'Sunny Developments Pty Ltd - 32 Dune Drive, Stapylton QLD 4207 2026-007')
const link = calls.filter(c => c.method === 'PATCH' && c.path.startsWith('/rest/v1/jobs')).pop()
console.log('LINK:', JSON.stringify({ id: link.body.onedrive_folder_id, path: link.body.onedrive_folder_path, hist: link.body.job_history?.map(h => h.text) }))
assert.equal(link.body.onedrive_folder_id, 'f-new')
const saved = db.jobs.find(j => j.code === '2026-007')
assert.equal(saved.onedrive_folder_name, 'Sunny Developments Pty Ltd - 32 Dune Drive, Stapylton QLD 4207 2026-007')
console.log('ERRORS:', errors)
await browser.close()
console.log('new job scenario passed')
