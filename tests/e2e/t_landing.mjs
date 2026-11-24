import { open, authState, calls } from './harness.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const D = 'out/landing'
fs.mkdirSync(D, { recursive: true })
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
// 1. A new visitor sees the front page at every size, with nothing wider than the screen
for (const [n, w, h] of [['desktop', 1360, 900], ['ipad', 820, 1180], ['phone', 390, 844], ['fold', 344, 882]]) {
  const { browser, page, errors } = await open('/', { loggedIn: false, fresh: true, viewport: { width: w, height: h } })
  await page.waitForSelector('text=Less Process')
  assert.equal(await overflow(page), 0, `${n}: nothing wider than the screen`)
  assert.ok(await page.getByRole('button', { name: 'Log in' }).first().isVisible(), `${n}: Log in is visible`)
  const box = await page.getByRole('button', { name: 'Log in' }).first().boundingBox()
  assert.ok(box.y < 60 && box.x > w / 3, `${n}: Log in is top right`)
  await page.screenshot({ path: `${D}/${n}.png`, fullPage: true })
  assert.equal(errors.length, 0, JSON.stringify(errors))
  await browser.close()
}
// 2. Request form: validation, send, thank you
{
  const { browser, page, errors } = await open('/', { loggedIn: false, fresh: true })
  await page.getByRole('button', { name: 'Book a demo' }).first().click()
  await page.getByRole('button', { name: 'Book a demo' }).last().click()
  await page.waitForSelector('text=Please enter your name, your firm and your email.')
  await page.getByLabel('Your name').fill('Sam Lee'); await page.getByLabel('Firm').fill('Lee Planning'); await page.getByLabel('Email').fill('sam@leeplanning.example')
  await page.getByLabel(/How many people/).selectOption('2 to 5')
  await page.getByRole('button', { name: 'Book a demo' }).last().click()
  await page.waitForSelector('text=Thanks. We have your details.')
  assert.equal(authState.leads.length, 1)
  assert.deepEqual({ ...authState.leads[0] }, { contactName: 'Sam Lee', firmName: 'Lee Planning', email: 'sam@leeplanning.example', phone: '', teamSize: '2 to 5', message: '', website: '' })
  console.log('request form OK', errors)
  // 3. Log in goes to the login screen, and back
  await page.getByRole('button', { name: 'Log in' }).first().click()
  await page.waitForSelector('text=Welcome back')
  await page.getByRole('button', { name: 'About QPlan' }).click()
  await page.waitForSelector('text=Less Process')
  console.log('log in and back OK')
  await browser.close()
}
// 4. Someone who has used QPlan here before, or opens /login, skips the front page
{
  const a = await open('/', { loggedIn: false }); await a.page.waitForSelector('text=Welcome back'); await a.browser.close()
  const b = await open('/login', { loggedIn: false, fresh: true }); await b.page.waitForSelector('text=Welcome back'); await b.browser.close()
  console.log('returning user and /login go straight to login OK')
}
// 5. Install files are served
{
  const { browser, page } = await open('/', { loggedIn: false })
  const res = await page.evaluate(async () => {
    const m = await fetch('/manifest.webmanifest').then(r => r.json())
    const sw = await fetch('/sw.js').then(r => r.status)
    const icons = await Promise.all(m.icons.map(i => fetch(i.src).then(r => r.status)))
    const off = await fetch('/offline.html').then(r => r.status)
    return { name: m.name, display: m.display, start: m.start_url, sw, icons, off, link: !!document.querySelector('link[rel=manifest]') }
  })
  console.log('INSTALL FILES:', JSON.stringify(res))
  assert.deepEqual(res.icons, [200, 200, 200]); assert.equal(res.sw, 200)
  await browser.close()
}
console.log('LANDING TESTS PASSED')
