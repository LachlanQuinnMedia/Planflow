import { open, shot, calls, db } from './harness.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// ---------- Planners: colours
{
  const { browser, page, errors } = await open('/')
  await page.getByRole('button', { name: 'Planners' }).click()
  await page.waitForSelector('text=Todd Grubb')
  await shot(page, 'planners-list')
  await page.getByRole('button', { name: /Edit my profile/i }).first().click()
  await page.waitForSelector('text=Or pick a colour')
  const swatches = await page.locator('.grid-cols-8 button').count()
  console.log('COLOUR SWATCHES:', swatches)
  assert.equal(swatches, 24)
  await page.getByLabel('Navy').click()
  await shot(page, 'planners-edit')
  console.log('PLANNERS ERRORS:', errors)
  await browser.close()
}

// ---------- Templates: letterhead downloads from the app
{
  const { browser, page, errors } = await open('/')
  await page.getByRole('button', { name: 'Templates' }).click()
  await page.waitForSelector('text=Generic Letterhead (blank)')
  await page.getByText('Generic Letterhead (blank)').click()
  await shot(page, 'templates-letterhead')
  await page.getByRole('button', { name: /^Generate/ }).first().click()
  await page.waitForSelector('text=Job to fill from')
  await page.locator('select:has(option:has-text("No job"))').selectOption('j1')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Generate 1' }).click(),
  ])
  const file = 'out/shots/' + download.suggestedFilename()
  await download.saveAs(file)
  console.log('DOWNLOADED:', download.suggestedFilename(), fs.statSync(file).size)
  assert.equal(download.suggestedFilename(), '2026-003_Generic_Letterhead.docx')
  console.log('TEMPLATES ERRORS:', errors)
  await browser.close()
}

// ---------- Dashboard + calendar
{
  db.jobs[0].date_ir_response = '2026-12-01'
  const { browser, page, errors } = await open('/')
  await page.waitForSelector('text=Director overview') // directors land on the firm-wide view
  await shot(page, 'dashboard')
  await page.getByRole('button', { name: 'Calendar' }).first().click()
  await page.waitForSelector('text=New meeting')
  await shot(page, 'calendar')
  await page.getByRole('button', { name: 'Time & Budget' }).first().click()
  await page.getByRole('button', { name: 'log time' }).click()
  const opts = await page.locator('select:has(option:has-text("Select a job"))').locator('option').allTextContents()
  console.log('LOG TIME OPTIONS:', opts.join(' | '))
  console.log('DASH ERRORS:', errors)
  await browser.close()
}
console.log('misc scenarios passed')
