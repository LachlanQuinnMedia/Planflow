import { open, db } from './harness.mjs'
import fs from 'node:fs'
const D = 'out/dark'
fs.mkdirSync(D, { recursive: true })
const snap = (page, name, opts = {}) => page.screenshot({ path: `${D}/${name}.png`, ...opts })
const { browser, page, errors } = await open('/', { theme: 'dark' })
const nav = async (label) => { await page.getByRole('button', { name: new RegExp('^' + label, 'i') }).first().click({ timeout: 8000 }); await page.waitForTimeout(600) }
await nav('Time & Budget'); await snap(page, '80-time')
await nav('Calendar'); await page.getByRole('button', { name: '+ New meeting' }).click(); await page.waitForTimeout(400); await snap(page, '81-modal-meeting')
await page.keyboard.press('Escape'); await page.reload({ waitUntil: 'networkidle' })
await nav('Jobs'); await page.locator('text=Josh Richards - 18 Parma Court >> visible=true').first().click(); await page.waitForSelector('text=Client details')
await page.getByRole('button', { name: 'Generate docs' }).click(); await page.waitForTimeout(500); await snap(page, '82-modal-generate')
await page.reload({ waitUntil: 'networkidle' })
await nav('Jobs'); await page.locator('text=Josh Richards - 18 Parma Court >> visible=true').first().click(); await page.waitForSelector('text=Client details')
await page.getByRole('button', { name: 'Edit job' }).click(); await page.waitForTimeout(500); await snap(page, '83-modal-editjob')
await page.reload({ waitUntil: 'networkidle' })
await nav('Planners'); await page.getByRole('button', { name: /Edit my profile/i }).first().click(); await page.waitForTimeout(500); await snap(page, '84-modal-profile')
// switch back to light with the control, and check it sticks after reload
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('radio', { name: 'Light' }).click()
console.log('AFTER LIGHT CLICK:', await page.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem('qplan_theme')]))
await snap(page, '85-light-again')
await page.getByRole('radio', { name: 'Dark' }).click(); await page.reload({ waitUntil: 'networkidle' })
console.log('AFTER DARK + RELOAD:', await page.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem('qplan_theme')]))
console.log('ERRORS:', errors); await browser.close()
// Auto follows the device
for (const scheme of ['dark', 'light']) {
  const { browser, page } = await open('/', { theme: 'auto', colorScheme: scheme })
  const before = await page.evaluate(() => document.documentElement.dataset.theme)
  await page.emulateMedia({ colorScheme: scheme === 'dark' ? 'light' : 'dark' }); await page.waitForTimeout(200)
  console.log(`AUTO on a ${scheme} device:`, before, '-> device switches ->', await page.evaluate(() => document.documentElement.dataset.theme))
  await browser.close()
}
// phone
{
  const { browser, page } = await open('/', { theme: 'dark', viewport: { width: 390, height: 844 } })
  await page.waitForTimeout(600); await snap(page, '86-phone')
  await browser.close()
}
// default for someone who has never chosen: light, even on a dark device
{
  const { browser, page } = await open('/', { colorScheme: 'dark' })
  console.log('NEVER CHOSEN, dark device:', await page.evaluate(() => document.documentElement.dataset.theme))
  await browser.close()
}
