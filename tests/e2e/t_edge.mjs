import { open, shot, calls, db, msState } from './harness.mjs'
import assert from 'node:assert/strict'

const fill = async (page) => {
  await page.getByPlaceholder('First name').fill('Dana')
  await page.getByPlaceholder('Last name').fill('Reid')
  await page.getByPlaceholder('12 Marine Parade, Southport QLD 4215').fill('7 Test Street, Southport QLD 4215')
}

// (a) Microsoft refuses to create the folder: the job must still be saved
{
  msState.createFails = true
  const { browser, page, errors } = await open('/')
  await page.getByRole('button', { name: '+ New Job', exact: true }).click()
  await page.waitForSelector('text=Create a new folder for this job')
  await fill(page)
  await page.getByRole('button', { name: /^Create job/ }).click()
  await page.waitForSelector('text=Job created ✓')
  await page.waitForSelector('text=its OneDrive folder could not be set up')
  assert.ok(db.jobs.some(j => j.client_first_name === 'Dana' && !j.onedrive_folder_id))
  await shot(page, 'edge-folder-failed')
  console.log('(a) folder failure keeps the job:', errors.length === 0 ? 'ok' : errors)
  await browser.close()
  msState.createFails = false
}

// (b) Link an existing folder
{
  const { browser, page, errors } = await open('/')
  await page.getByRole('button', { name: '+ New Job', exact: true }).click()
  await page.waitForSelector('text=Create a new folder for this job')
  await fill(page)
  await page.getByText('Link a folder that already exists').click()
  await page.waitForSelector('text=Use this folder')
  await page.getByText('Admin', { exact: true }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '✓ Use this folder' }).click()
  await page.waitForSelector('text=Linked to')
  await page.getByRole('button', { name: /^Create job/ }).click()
  await page.waitForSelector('text=OneDrive folder linked')
  const j = db.jobs[db.jobs.length - 1]
  console.log('(b) existing folder:', j.onedrive_folder_id, '|', j.onedrive_folder_name, '|', j.onedrive_drive_id)
  assert.equal(j.onedrive_folder_id, 'f-a')
  assert.equal(calls.filter(c => c.path.includes('create_folder')).length, 1) // only the failed attempt from (a)
  console.log('   errors:', errors)
  await browser.close()
}

// (c) Not connected, and (d) no jobs folder set + director sets it
{
  msState.connected = false
  let r = await open('/')
  await r.page.getByRole('button', { name: '+ New Job', exact: true }).click()
  await r.page.waitForSelector('text=Microsoft 365 is not connected')
  await fill(r.page)
  await r.page.getByRole('button', { name: /^Create job/ }).click()
  await r.page.waitForSelector('text=Job created ✓')
  console.log('(c) not connected still creates the job: ok', r.errors)
  await r.browser.close()

  msState.connected = true; msState.jobsFolder = null
  r = await open('/')
  await r.page.getByRole('button', { name: '+ New Job', exact: true }).click()
  await r.page.waitForSelector('text=Click to choose where your job folders live')
  await shot(r.page, 'edge-no-root')
  await r.page.getByRole('button', { name: /Create a new folder for this job/ }).click()
  await r.page.waitForSelector('text=Where should new job folders be created?')
  await r.page.getByText('Jobs', { exact: true }).last().click()
  await r.page.waitForTimeout(300)
  await r.page.getByRole('button', { name: '✓ Use this folder' }).click()
  await r.page.waitForSelector('text=Change where new job folders are created')
  console.log('(d) jobs folder saved:', JSON.stringify(msState.jobsFolder), r.errors)
  assert.equal(msState.jobsFolder.folderId, 'f-jobs')
  await r.browser.close()
}

// (e) Phone layout of New Job and a job page
{
  const r = await open('/', { viewport: { width: 390, height: 844 } })
  await r.page.getByRole('button', { name: '+ New Job', exact: true }).click()
  await r.page.waitForSelector('text=Create new job')
  await shot(r.page, 'phone-newjob')
  console.log('(e) phone errors:', r.errors)
  await r.browser.close()
}
console.log('edge scenarios passed')
