// The planning zone is picked from a list, not typed: Queensland's standard zones, in
// alphabetical order, with "Other" for anything that is not one of them.
import { open, calls, db } from './harness.mjs'
import assert from 'node:assert/strict'
import { QLD_ZONES, standardZone } from '../../src/jobMeta.js'

// ---------- 0. The list itself
assert.equal(QLD_ZONES.length, 41, 'the 41 zones in Planning Regulation 2017, schedule 2')
assert.deepEqual(QLD_ZONES, [...QLD_ZONES].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })), 'alphabetical')
assert.equal(new Set(QLD_ZONES).size, 41)
for (const z of ['Low density residential', 'Low-medium density residential', 'Principal centre', 'Emerging community', 'Rural residential', 'Township', 'Waterfront and marine industry', 'Research and technology industry']) assert.ok(QLD_ZONES.includes(z), z)
assert.equal(standardZone('Medium Density Residential Zone'), 'Medium density residential')
assert.equal(standardZone('LMR2 (2 or 3 storey mix)'), '')

// ---------- 1. New Job: pick a zone without typing
{
  const { browser, page, errors } = await open('/')
  await page.getByRole('button', { name: '+ New Job', exact: true }).click()
  await page.waitForSelector('text=Create new job')
  const zone = page.getByTestId('zone-select')
  const options = await zone.locator('option').allTextContents()
  assert.deepEqual(options, ['Choose a zone...', ...QLD_ZONES, 'Other (type it in)'], 'every zone, in order, then Other')
  assert.equal(await page.getByLabel('Planning zone', { exact: true }).getAttribute('data-testid'), 'zone-select', 'the label belongs to the list')
  assert.equal(await page.getByTestId('zone-other').count(), 0, 'no typing box until Other is chosen')
  await page.getByPlaceholder('First name').fill('Dana'); await page.getByPlaceholder('Last name').fill('Reid')
  await page.getByPlaceholder('12 Marine Parade, Southport QLD 4215').fill('8 Shore Street, Burleigh Heads QLD 4220')
  await zone.selectOption('Low-medium density residential')
  const before = calls.length
  await page.getByRole('button', { name: /^Create job/ }).click()
  await page.waitForSelector('text=Job created ✓')
  const insert = calls.slice(before).find(c => c.method === 'POST' && c.path.startsWith('/rest/v1/jobs'))
  assert.equal(insert.body.zone, 'Low-medium density residential')
  console.log('1 new job: zone picked from the list and saved', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 2. New Job: a zone that is not on the list
{
  const { browser, page, errors } = await open('/')
  await page.getByRole('button', { name: '+ New Job', exact: true }).click()
  await page.waitForSelector('text=Create new job')
  await page.getByPlaceholder('First name').fill('Eli'); await page.getByPlaceholder('Last name').fill('Voss')
  await page.getByPlaceholder('12 Marine Parade, Southport QLD 4215').fill('3 Quay Street, Brisbane City QLD 4000')
  await page.getByTestId('zone-select').selectOption({ label: 'Other (type it in)' })
  const box = page.getByTestId('zone-other')
  assert.ok(await box.isVisible()); assert.equal(await box.evaluate(e => e === document.activeElement), true, 'the box is ready to type in')
  await box.fill('PC1 Principal centre (City centre)')
  assert.equal(await page.getByTestId('zone-select').inputValue(), '__other__')
  // typing a standard zone into the box, in any capitals, saves it as the standard name
  const before = calls.length
  await page.getByRole('button', { name: /^Create job/ }).click()
  await page.waitForSelector('text=Job created ✓')
  assert.equal(calls.slice(before).find(c => c.method === 'POST' && c.path.startsWith('/rest/v1/jobs')).body.zone, 'PC1 Principal centre (City centre)')
  console.log('2 new job: Other lets a zone be typed', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 3. Editing: what was typed before still shows, and standard wording is recognised
{
  db.jobs[0].zone = 'Medium Density Residential'   // typed by hand before the list existed
  db.jobs[1].zone = 'LMR2 (2 or 3 storey mix)'      // a Brisbane zone precinct
  const { browser, page, errors } = await open('/')
  const openEdit = async (code) => {
    await page.evaluate(() => document.querySelector('[data-tour=nav-jobs]').click())
    await page.locator(`.qp-row:visible:has-text("${code}")`).first().click()
    await page.getByRole('button', { name: /Edit details|Edit job|Edit/ }).first().click()
    await page.waitForSelector('#edit-job-zone')
  }
  await openEdit(db.jobs[0].code)
  assert.equal(await page.locator('#edit-job-zone').inputValue(), 'Medium density residential', 'old typing is matched to the standard zone')
  assert.equal(await page.getByTestId('zone-other').count(), 0)
  await page.locator('#edit-job-zone').selectOption('Mixed use')
  const before = calls.length
  await page.getByRole('button', { name: /^Save/ }).first().click(); await page.waitForTimeout(600)
  const patch = calls.slice(before).find(c => c.method === 'PATCH' && c.path.startsWith('/rest/v1/jobs') && c.body && 'zone' in c.body)
  assert.equal(patch.body.zone, 'Mixed use')
  await page.keyboard.press('Escape')
  await openEdit(db.jobs[1].code)
  assert.equal(await page.locator('#edit-job-zone').inputValue(), '__other__', 'a zone that is not standard shows under Other')
  assert.equal(await page.getByTestId('zone-other').inputValue(), 'LMR2 (2 or 3 storey mix)', 'and nothing typed before is lost')
  console.log('3 edit job: old values kept, standard wording recognised', errors); assert.deepEqual(errors, [])
  await browser.close()
}
console.log('t_zone: all passed')
