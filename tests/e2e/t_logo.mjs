import { open } from './harness.mjs'
import fs from 'node:fs'
const D = 'out/logo'
fs.mkdirSync(D, { recursive: true })
const shots = [
  ['landing', '/', { loggedIn: false, fresh: true }, 1360, 460],
  ['login', '/', { loggedIn: false }, 1360, 460],
  ['app', '/', {}, 1360, 460],
  ['app-dark', '/', { theme: 'dark' }, 1360, 460],
  ['login-dark', '/', { loggedIn: false, theme: 'dark' }, 1360, 460],
  ['landing-phone', '/', { loggedIn: false, fresh: true, viewport: { width: 390, height: 460 } }, 390, 460],
]
for (const [name, path, opts, w, h] of shots) {
  const { browser, page, errors } = await open(path, { viewport: { width: w, height: h }, ...opts })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${D}/${name}.png` })
  if (errors.length) console.log(name, errors)
  await browser.close()
}
console.log('ok')
