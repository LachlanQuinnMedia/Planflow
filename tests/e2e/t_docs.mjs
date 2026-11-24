import { open, shot, calls, db } from './harness.mjs'
import assert from 'node:assert/strict'
const COMPANY = db.companies[0].id
// an older file saved before the change (public link, job-id folder)
db.documents.push({ id: 'd-old', company_id: COMPANY, job_id: 'j2', job_code: '2026-006', name: 'Old plan.pdf', file_path: 'j2/1700000000_Old_plan.pdf', file_url: 'https://sltaaiumviyzgdsdkkbe.supabase.co/storage/v1/object/public/documents/j2/1700000000_Old_plan.pdf', file_type: 'pdf', file_size: 1200, uploaded_by: 'Murray', created_at: '2026-11-01T00:00:00Z' })
const { browser, page, errors } = await open('/')
await page.getByRole('button', { name: 'Jobs' }).first().click()
await page.locator('text=Brad Miller - 25 Charlotte Street >> visible=true').first().click()
await page.waitForSelector('text=Client details')
await page.getByRole('button', { name: 'Documents', exact: true }).last().click()
await page.waitForSelector('text=Old plan.pdf')
// upload
await page.locator('input[type="file"]').setInputFiles({ name: 'Site photo.png', mimeType: 'image/png', buffer: Buffer.from('x') })
await page.waitForSelector('text=Site photo.png')
const up = calls.find(c => c.method === 'POST' && c.path.startsWith('/storage/v1/object/documents/'))
console.log('UPLOAD PATH:', up.path)
assert.ok(up.path.startsWith(`/storage/v1/object/documents/${COMPANY}/j2/`), 'new files go under the company folder')
const row = db.documents.find(d => d.name === 'Site photo.png')
assert.equal(row.file_url, null)
assert.ok(row.file_path.startsWith(`${COMPANY}/j2/`))
assert.ok(!(await page.content()).includes('/object/public/documents/'), 'no public links on the page')
await page.context().route('**/storage/v1/object/sign/**', r => r.fulfill({ status: 200, contentType: 'text/plain', body: 'file' }))
// open the old file: goes through a short-lived signed link
const [popup] = await Promise.all([
  page.context().waitForEvent('page'),
  page.locator('div:has(> div > div:text("Old plan.pdf")) button:has-text("Open")').first().click().catch(() => page.getByRole('button', { name: 'Open', exact: true }).last().click()),
])
await popup.waitForURL(/token=signed/, { timeout: 5000 }).catch(() => {})
console.log('OPENED:', popup.url())
const sign = calls.filter(c => c.path.startsWith('/storage/v1/object/sign/documents/'))
assert.ok(sign.length >= 1)
assert.match(popup.url(), /object\/sign\/documents\/.*token=signed/)
await shot(page, 'job-documents-private')
console.log('ERRORS:', errors)
assert.equal(errors.length, 0)
await browser.close()
console.log('documents scenario passed')
