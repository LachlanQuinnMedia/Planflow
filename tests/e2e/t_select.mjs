import { open } from './harness.mjs'
import assert from 'node:assert/strict'
const lum = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
for (const theme of ['dark', 'light']) {
  const { browser, page } = await open('/', { theme })
  let worst = 99, count = 0
  const visit = async () => {
    const rows = await page.evaluate(() => [...document.querySelectorAll('select')].flatMap(sel => [...sel.options].slice(0, 3).map(o => { const c = getComputedStyle(o), s = getComputedStyle(sel); return { o: [c.color, c.backgroundColor], s: [s.color, s.backgroundColor] } })))
    for (const r of rows) {
      count++
      assert.ok(!/rgba\(0, 0, 0, 0\)|transparent/.test(r.o[1]), 'every option has a solid background')
      worst = Math.min(worst, contrast(r.o[0], r.o[1]))
    }
  }
  await page.waitForTimeout(500); await visit()
  for (const label of ['Jobs', 'New Job', 'Time & Budget', 'Bookings', 'Calendar', 'Workloads', 'Documents']) {
    await page.getByRole('button', { name: new RegExp('^' + label, 'i') }).first().click(); await page.waitForTimeout(450); await visit()
  }
  console.log(`${theme}: ${count} dropdown options checked, lowest text contrast ${worst.toFixed(1)}:1`)
  assert.ok(worst >= 7, 'options are easy to read')
  await browser.close()
}
console.log('DROPDOWN CHECK PASSED')
