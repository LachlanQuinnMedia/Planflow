import { open, shot } from './harness.mjs'
const { browser, page, errors } = await open('/')
await page.getByRole('button', { name: 'Calendar' }).first().click()
await page.waitForSelector('text=New meeting')
for (let i = 0; i < 4; i++) { await page.locator('button:has-text("›")').last().click(); await page.waitForTimeout(150) }
await page.waitForTimeout(300)
await shot(page, 'calendar-christmas', { clip: { x: 208, y: 48, width: 1152, height: 260 } })
console.log('holiday labels:', await page.locator('[title^="Public holiday"]').allTextContents())
console.log('ERRORS:', errors)
await browser.close()
