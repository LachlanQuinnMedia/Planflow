import { open, shot, calls, db } from './harness.mjs'
import assert from 'node:assert/strict'
import { addBusinessDays } from '../../src/businessDays.js'

const { browser, page, errors } = await open('/')
await page.getByRole('button', { name: 'Jobs' }).first().click()
await page.locator('text=Brad Miller - 25 Charlotte Street >> visible=true').first().waitFor()
await shot(page, 'jobs-list')

// Open the Brisbane job
await page.locator('text=Brad Miller - 25 Charlotte Street >> visible=true').first().click()
await page.waitForSelector('text=Client details')
const title = await page.locator('.text-base.font-semibold').first().textContent()
console.log('TITLE:', title)
assert.equal(title, 'Brad Miller - 25 Charlotte Street, Paddington QLD 4064 2026-006')
await shot(page, 'jobdetail-overview')

// Timer preselected to the opened job
const timerValue = await page.locator('select').first().inputValue()
const timerText = await page.locator('select').first().locator('option:checked').textContent()
console.log('TIMER PRESELECT:', timerValue, '|', timerText)
assert.equal(timerValue, 'j2')
assert.equal(timerText, '2026-006 · 25 Charlotte Street, Paddington QLD 4064')

// DA stages: start the decision stage on 18 Dec 2026 (runs across Christmas)
await page.getByRole('button', { name: 'DA Stages' }).click()
await page.waitForSelector('text=DA stage progress')
await page.getByText('Decision stage', { exact: true }).first().click()
const dateInputs = page.locator('input[type="date"]')
await dateInputs.nth(0).fill('2026-12-18')
await page.waitForTimeout(200)
const end = await dateInputs.nth(1).inputValue()
const expected = addBusinessDays('2026-12-18', 20, 'Brisbane City Council')
console.log('DECISION END:', end, 'expected', expected)
assert.equal(end, expected)
await page.getByRole('button', { name: 'Start stage' }).click()
await page.waitForTimeout(200)
await shot(page, 'jobdetail-da-stages')
// Stop the clock for 5 business days -> end date extends
await page.getByRole('button', { name: 'Stop clock', exact: true }).first().click()
await page.locator('input[type="number"]').fill('5')
await page.getByRole('button', { name: 'Stop clock', exact: true }).last().click()
await page.waitForTimeout(200)
const end2 = await page.locator('input[type="date"]').nth(1).inputValue()
console.log('AFTER STOP 5:', end2, 'expected', addBusinessDays('2026-12-18', 25, 'Brisbane City Council'))
assert.equal(end2, addBusinessDays('2026-12-18', 25, 'Brisbane City Council'))
// Manual override then recalc
await page.locator('input[type="date"]').nth(1).fill('2027-02-26')
await page.waitForSelector('text=End date was entered by hand')
await shot(page, 'jobdetail-da-manual')
await page.getByRole('button', { name: 'Use calculated date' }).click()
assert.equal(await page.locator('input[type="date"]').nth(1).inputValue(), end2)
await page.getByRole('button', { name: 'Save stages' }).click()
await page.waitForSelector('text=✓ Saved')
const saved = db.jobs.find(j => j.id === 'j2').da_stages.decision
console.log('SAVED DECISION:', JSON.stringify(saved))
assert.equal(saved.endDate, end2)

// Share summary
await page.getByRole('button', { name: /Share summary/ }).click()
await page.getByRole('button', { name: 'Create summary link' }).click()
await page.waitForSelector('text=Summary link')
const link = await page.locator('input[readonly]').inputValue()
console.log('LINK:', link)
assert.match(link, /^http:\/\/localhost:4173\/summary\/[0-9a-f]{48}$/)
await shot(page, 'jobdetail-share')
await page.locator('label:has-text("Hours and budget") input').uncheck()
await page.waitForTimeout(200)
assert.equal(db.jobs.find(j => j.id === 'j2').share_include_budget, false)
await page.getByRole('button', { name: 'Done' }).click()

// Edit job: switch to company
await page.getByRole('button', { name: 'Edit job' }).click()
await page.selectOption('#edit-client-type', 'company')
await page.locator('label:has-text("Company name") + input').fill('Miller Holdings Pty Ltd')
await shot(page, 'jobdetail-edit')
await page.getByRole('button', { name: 'Save changes' }).click()
await page.waitForSelector('text=Miller Holdings Pty Ltd - 25 Charlotte Street')
const j2 = db.jobs.find(j => j.id === 'j2')
console.log('EDITED:', j2.name, '|', j2.client_type, '|', j2.client_company)
assert.equal(j2.name, 'Miller Holdings Pty Ltd - 25 Charlotte Street, Paddington QLD 4064 2026-006')

console.log('ERRORS:', errors)
await browser.close()
console.log('job detail scenario passed')
