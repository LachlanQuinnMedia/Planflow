import { open, calls, db, msState } from './harness.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const D = 'out/newjob'
fs.mkdirSync(D, { recursive: true })
const COMPANY = db.companies[0].id
const letterhead = fs.readFileSync(new URL('../../dist/templates/Generic_Letterhead.docx', import.meta.url))
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
const templates = (page) => page.route('**/storage/v1/object/templates/**', r => r.fulfill({ status: 200, headers: cors, contentType: 'application/octet-stream', body: letterhead }))
const fillJob = async (page, first, address) => {
  await page.getByRole('button', { name: '+ New Job', exact: true }).click()
  await page.waitForSelector('text=Create new job')
  await page.getByPlaceholder('First name').fill(first)
  await page.getByPlaceholder('12 Marine Parade, Southport QLD 4215').fill(address)
}

// A. Jobs folder not chosen yet: the "Create a new folder" option does the one-off set-up itself
{
  const savedFolder = msState.jobsFolder; msState.jobsFolder = null
  const { browser, page, errors } = await open('/', { theme: 'dark' })
  await templates(page)
  await fillJob(page, 'Ava', '5 Test Street, Southport QLD 4215')
  await page.waitForSelector('text=Click to choose where your job folders live')
  assert.equal(await page.getByText('Set where new job folders are created').count(), 0, 'the separate link is gone')
  await page.locator('text=Documents to generate').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${D}/a-before.png` })
  await page.getByRole('button', { name: /Create a new folder for this job/ }).click()
  await page.waitForSelector('text=Use this folder')
  await page.getByText('Jobs', { exact: true }).last().click().catch(() => {})
  await page.getByRole('button', { name: /Use this folder/ }).click()
  await page.waitForSelector('text=Created automatically inside')
  assert.ok(msState.jobsFolder, 'the jobs folder was saved')
  await page.waitForSelector('text=Change where new job folders are created')
  console.log('A. option sets up the jobs folder itself: ok', errors)

  // B. Tick two documents, create, and they are saved into the new folder
  await page.getByRole('button', { name: '+ Fee Proposal - Code Assessable' }).click()
  await page.getByRole('button', { name: '+ Generic Letterhead (blank)' }).click()
  await page.getByRole('button', { name: '+ Advertising Register (Excel)' }).click()
  await page.getByRole('button', { name: '✓ Advertising Register (Excel)' }).click() // untick
  await page.waitForSelector("text=saved in the job's folder when you create the job")
  await page.locator('text=Documents to generate').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${D}/b-selected.png` })
  await page.getByRole('button', { name: 'Create job and generate 2 documents' }).click()
  await page.waitForSelector('text=Job created ✓')
  await page.waitForSelector("text=2 documents generated and saved in the job's folder")
  await page.screenshot({ path: `${D}/b-created.png` })
  const ups = msState.uploads || []
  console.log('UPLOADS:', ups.map(u => `${u.name} -> ${u.parent_id} (${u.drive_id}) ${u.content_base64.slice(0, 4)} ${Math.round(u.content_base64.length * 0.75 / 1024)}KB`))
  assert.equal(ups.length, 2)
  assert.deepEqual(ups.map(u => u.name).sort(), ['2026-007_Fee_Proposal_Code.docx', '2026-007_Generic_Letterhead.docx'])
  assert.ok(ups.every(u => u.parent_id === 'f-new' && u.content_base64.startsWith('UEsD')), 'real Word files, sent to the new job folder')
  const job = db.jobs.find(j => j.code === '2026-007')
  console.log('HISTORY:', job.job_history.map(h => h.text))
  assert.ok(job.job_history.some(h => h.text === 'Document generated: Fee Proposal - Code Assessable'))
  assert.ok(job.job_history.some(h => /OneDrive folder created/.test(h.text)) && job.job_history.some(h => h.text === 'Job created'))
  assert.equal(errors.length, 0, JSON.stringify(errors))
  await browser.close()
  msState.jobsFolder = savedFolder
}

// C. No folder: the documents are kept with the job in QPlan
{
  const { browser, page, errors } = await open('/')
  await templates(page)
  await fillJob(page, 'Ben', '9 Sample Road, Nerang QLD 4211')
  await page.getByRole('button', { name: /No folder for now/ }).click()
  await page.waitForSelector("text=saved on the job's Documents tab when you create the job")
  assert.ok(await page.getByRole('button', { name: 'Create job', exact: true }).isVisible(), 'with nothing ticked the button just says Create job')
  await page.getByRole('button', { name: '+ Quote Request' }).click()
  await page.getByRole('button', { name: 'Create job and generate 1 document', exact: true }).click()
  await page.waitForSelector("text=1 document generated and saved on the job's Documents tab")
  const job = db.jobs.find(j => j.client_first_name === 'Ben')
  const up = calls.filter(c => c.method === 'POST' && c.path.startsWith(`/storage/v1/object/documents/${COMPANY}/${job.id}/`))
  assert.equal(up.length, 1)
  const row = db.documents.find(d => d.job_id === job.id)
  console.log('KEPT IN QPLAN:', row.name, '|', row.file_path.split('/').slice(0, 2).join('/') === `${COMPANY}/${job.id}`)
  assert.equal(row.name, `${job.code}_Quote_Request.docx`)
  assert.equal(errors.length, 0, JSON.stringify(errors))
  await browser.close()
}

// D. Microsoft refuses a file: the job is still created and the person is told which one failed
{
  msState.uploadFails = true
  const { browser, page } = await open('/')
  await templates(page)
  await fillJob(page, 'Cal', '1 Fail Lane, Robina QLD 4226')
  await page.getByRole('button', { name: '+ IR Response' }).click()
  await page.getByRole('button', { name: /^Create job and generate 1 document/ }).click()
  await page.waitForSelector('text=Job created ✓')
  await page.waitForSelector('text=1 could not be generated')
  await page.waitForSelector('text=IR Response: Access denied')
  console.log('D. a failed save is reported, job still created: ok')
  msState.uploadFails = false
  await browser.close()
}
console.log('NEW JOB DOCUMENTS TESTS PASSED')
