// The public website: every page, at every size, with the things search engines need.
import { open, authState, calls, swipe } from './harness.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { PAGES, SITE_URL, SITE_PATHS } from '../../src/site/pages.js'
import { addBusinessDays } from '../../src/businessDays.js'
const require = createRequire(import.meta.url)
const { chromium, devices } = require('playwright')

const D = 'out/landing'
fs.mkdirSync(D, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:4173'
const here = new URL('../../', import.meta.url)
const read = (f) => fs.readFileSync(new URL(f, here), 'utf8')
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const raw = (p) => fetch(BASE + p).then(async r => ({ status: r.status, type: r.headers.get('content-type') || '', text: await r.text() }))
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ')

// ---------- 1. Each page is a finished page before any script runs: this is what a search engine reads
{
  const titles = new Set(), descriptions = new Set()
  for (const p of PAGES) {
    const { status, text: html } = await raw(p.path)
    assert.equal(status, 200, p.path)
    const title = /<title>([^<]*)<\/title>/.exec(html)?.[1].replace(/&amp;/g, '&')
    assert.equal(title, p.title, `${p.path}: its own title`)
    assert.equal((html.match(/<title>/g) || []).length, 1, `${p.path}: one title`)
    const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1]
    assert.equal(desc, p.description.replace(/&/g, '&amp;').replace(/"/g, '&quot;'), `${p.path}: its own description`)
    assert.equal((html.match(/<meta name="description"/g) || []).length, 1, `${p.path}: one description`)
    assert.ok(p.title.length <= 60, `${p.path}: title fits a search result (${p.title.length})`)
    assert.ok(p.description.length >= 70 && p.description.length <= 160, `${p.path}: description fits a search result (${p.description.length})`)
    titles.add(p.title); descriptions.add(p.description)
    const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1]
    assert.equal(canonical, SITE_URL + (p.path === '/' ? '/' : p.path), `${p.path}: canonical address`)
    assert.ok(!/noindex/.test(html), `${p.path}: may be indexed`)
    assert.ok(/<html lang="en-AU"/.test(html))
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${p.path}: exactly one main heading`)
    const h1 = text(/<h1[\s\S]*?<\/h1>/.exec(html)[0]).trim()
    assert.ok(h1.length > 8, `${p.path}: heading has words: ${h1}`)
    assert.ok(text(html).length > 900, `${p.path}: the words are in the page itself (${text(html).length} characters)`)
    assert.ok(html.includes(`data-page="${p.path}"`), `${p.path}: the right page was written out`)
    for (const og of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card']) assert.ok(html.includes(og), `${p.path}: ${og}`)
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1])
    assert.equal(ld['@context'], 'https://schema.org')
    const types = ld['@graph'].map(g => g['@type'])
    assert.ok(types.includes('Organization'))
    if (p.path === '/') assert.ok(types.includes('SoftwareApplication') && types.includes('WebSite'))
    else assert.ok(types.includes('BreadcrumbList'))
    if (p.key === 'faq') { const faq = ld['@graph'].find(g => g['@type'] === 'FAQPage'); assert.ok(faq.mainEntity.length >= 10); for (const q of faq.mainEntity) assert.ok(html.includes(q.name.replace(/'/g, '&#x27;')) || text(html).includes(q.name), 'every question given to search engines is on the page: ' + q.name) }
    // every link to another page of the site goes somewhere real
    for (const m of html.matchAll(/<a [^>]*href="(\/[^"#]*)"/g)) assert.ok(SITE_PATHS.includes(m[1]) || m[1] === '/login', `${p.path}: link to ${m[1]} exists`)
    assert.ok(!/—/.test(text(html)), `${p.path}: no long dashes in the words`)
    assert.ok(/rel="preload"[^>]*as="font"/.test(html), `${p.path}: the heading typeface is fetched early`)
  }
  assert.equal(titles.size, PAGES.length, 'no two pages share a title'); assert.equal(descriptions.size, PAGES.length, 'no two pages share a description')
  console.log(`1 ${PAGES.length} pages: own title, description, canonical, one heading, words in the page, structured data, links: ok`)
}

// ---------- 2. Sitemap, robots, the sharing image, and the lists that must agree
{
  const map = await raw('/sitemap.xml')
  assert.equal(map.status, 200)
  const locs = [...map.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  assert.deepEqual(locs, PAGES.map(p => SITE_URL + (p.path === '/' ? '/' : p.path)), 'the sitemap lists every page and nothing else')
  const robots = await raw('/robots.txt')
  assert.ok(robots.text.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)); assert.ok(robots.text.includes('Disallow: /summary/')); assert.ok(/Allow: \//.test(robots.text))
  const og = await fetch(BASE + '/og.png'); assert.equal(og.status, 200); assert.ok((og.headers.get('content-type') || '').includes('image/png'))
  // index.html decides "website or app" before anything is drawn, from its own copy of the page list
  const inline = /var SITE = (\[[^\]]+\])/.exec(read('index.html'))[1]
  assert.deepEqual(JSON.parse(inline.replace(/'/g, '"')), SITE_PATHS, 'the page list in index.html matches src/site/pages.js')
  // the live site sends each page's address to its own file
  const vercel = JSON.parse(read('vercel.json'))
  const sent = vercel.rewrites.filter(r => r.source !== '/(.*)')
  assert.deepEqual(sent.map(r => r.source), SITE_PATHS.filter(p => p !== '/'), 'vercel.json has a line for every page')
  for (const r of sent) assert.equal(r.destination, r.source + '/index.html')
  assert.deepEqual(vercel.rewrites.at(-1), { source: '/(.*)', destination: '/app.html' })
  // the app's own page carries none of the website and is not indexed
  for (const p of ['/login', '/summary/abcdefghijklmnopqrstuvwxyz0123', '/some/unknown/address']) {
    const { text: html } = await raw(p)
    assert.ok(/noindex/.test(html), `${p}: not indexed`); assert.ok(!html.includes('qp-site'), `${p}: none of the website in it`); assert.ok(/<title>QPlan<\/title>/.test(html))
  }
  console.log('2 sitemap, robots, sharing image, page lists agree, app page is separate: ok')
}

// ---------- 3. Every page at every size: nothing wider than the screen, nothing broken, links in reach
for (const [n, w, h] of [['desktop', 1360, 900], ['ipad', 820, 1180], ['phone', 390, 844], ['small-phone', 360, 740], ['fold', 320, 640]]) {
  for (const p of PAGES) {
    const { browser, page, errors } = await open(p.path, { loggedIn: false, fresh: true, viewport: { width: w, height: h } })
    await page.waitForSelector('.qp-site h1')
    assert.equal(await overflow(page), 0, `${n} ${p.path}: nothing wider than the screen`)
    // nothing pokes out sideways, even where the page hides it (that is what lets a phone drag the page)
    const poking = await page.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll('.qp-site *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.right > vw + 1 || r.left < -1) && !e.closest('.qs-lots') && getComputedStyle(e).position !== 'absolute' }).map(e => e.tagName + '.' + String(e.className).slice(0, 40)).slice(0, 5) })
    assert.deepEqual(poking, [], `${n} ${p.path}: nothing pokes past the edge`)
    assert.equal(await page.evaluate(() => { window.scrollTo(300, 0); return window.scrollX }), 0, `${n} ${p.path}: the page cannot be moved sideways`)
    assert.equal(await page.title(), p.title)
    if (w >= 1024) {
      assert.ok(await page.getByTestId('site-login').isVisible(), `${n}: Log in is visible`)
      const box = await page.getByTestId('site-login').boundingBox(); assert.ok(box.y < 60 && box.x > w / 2, `${n}: Log in is top right`)
      assert.equal(await page.getByTestId('site-menu').isVisible(), false)
    } else {
      assert.ok(await page.getByTestId('site-menu').isVisible(), `${n}: Menu button shows`)
      const bar = await page.locator('.qs-header > div').boundingBox(); const menu = await page.getByTestId('site-menu').boundingBox()
      assert.ok(menu.x + menu.width <= w - 8 && bar.height <= 70, `${n}: the top bar is one tidy row`)
    }
    if (p.path === '/' || p.path === '/business-day-calculator') await page.screenshot({ path: `${D}/${n}${p.path === '/' ? '' : '-calculator'}.png`, fullPage: true })
    assert.deepEqual(errors, [], `${n} ${p.path}`)
    await browser.close()
  }
  console.log(`3 ${n} (${w} wide): all ${PAGES.length} pages fit, no sideways movement, no errors`)
}

// ---------- 4. A real phone (touch, phone layout rules): the page stays put sideways, and the menu works
for (const name of ['iPhone 13', 'iPhone SE', 'Pixel 7']) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ ...devices[name] })
  const page = await context.newPage()
  for (const p of ['/', '/business-day-calculator', '/da-timeframes-queensland', '/contact']) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    const m = await page.evaluate(() => ({ inner: innerWidth, doc: document.documentElement.scrollWidth, scale: visualViewport.scale, vv: Math.round(visualViewport.width) }))
    assert.equal(m.doc, m.inner, `${name} ${p}: the page is exactly as wide as the screen`)
    assert.equal(m.scale, 1, `${name} ${p}: not zoomed`)
    // drag sideways with a finger
    await swipe(page, 300, 400, 60, 400); await swipe(page, 60, 300, 300, 330)
    assert.equal(await page.evaluate(() => Math.round(window.scrollX + visualViewport.offsetLeft)), 0, `${name} ${p}: dragging sideways does not move the page`)
    // ...and a finger dragged up still scrolls it, so the check above is a real one
    await page.evaluate(() => window.scrollTo(0, 0)); await swipe(page, 200, 450, 200, 150)
    assert.ok(await page.evaluate(() => window.scrollY) > 100, `${name} ${p}: the page scrolls up and down`)
    const small = await page.evaluate(() => [...document.querySelectorAll('.qp-site input:not([type=checkbox]):not([type=hidden]), .qp-site select, .qp-site textarea')].filter(e => e.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(e).fontSize) < 16).length)
    assert.equal(small, 0, `${name} ${p}: text boxes are 16px, so an iPhone does not zoom in on them`)
  }
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.getByTestId('site-menu').tap()
  await page.locator('.qs-menu-panel a', { hasText: 'DA tracking' }).tap()
  await page.waitForURL('**/da-tracking'); await page.waitForSelector('h1:has-text("Development application tracking")')
  await browser.close()
  console.log(`4 ${name}: stays put sideways, not zoomed, menu works`)
}

// ---------- 5. The website does not load the app, and the app does not load the website
{
  const { browser, page } = await open('/features', { loggedIn: false, fresh: true })
  const js = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name.split('/').pop()).filter(n => n.endsWith('.js')))
  assert.ok(js.some(n => n.startsWith('SiteApp')), 'the website code loaded')
  for (const heavy of ['AppRoot', 'supabase', 'Dashboard', 'JobDetail', 'templateFiller']) assert.ok(!js.some(n => n.startsWith(heavy)), `a website page does not load ${heavy}`)
  assert.equal(calls.filter(c => c.path.startsWith('/rest/') || c.path.startsWith('/auth/')).length, 0, 'a website page asks the database nothing')
  await browser.close()
  const app = await open('/login', { loggedIn: false, fresh: true })
  await app.page.waitForSelector('text=Welcome back')
  const js2 = await app.page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name.split('/').pop()).filter(n => n.endsWith('.js')))
  assert.ok(!js2.some(n => n.startsWith('SiteApp')), 'the app does not load the website')
  assert.equal(await app.page.title(), 'QPlan')
  await app.browser.close()
  console.log('5 website and app load separately: ok')
}

// ---------- 6. Book a demo: validation, send, thank you. From the home page and the contact page.
for (const p of ['/', '/contact']) {
  const before = (authState.leads || []).length
  const { browser, page, errors } = await open(p, { loggedIn: false, fresh: true })
  const form = page.getByTestId('demo-form')
  await form.getByRole('button', { name: 'Book a demo' }).click()
  await page.waitForSelector('text=Please enter your name, your firm and your email.')
  await page.getByLabel('Your name').fill('Sam Lee'); await page.getByLabel('Firm').fill('Lee Planning'); await page.getByLabel('Email').fill('sam@leeplanning.example')
  await page.getByLabel(/How many people/).selectOption('2 to 5')
  await form.getByRole('button', { name: 'Book a demo' }).click()
  await page.waitForSelector('text=Thanks. We have your details.')
  assert.equal(authState.leads.length, before + 1)
  assert.deepEqual({ ...authState.leads.at(-1) }, { contactName: 'Sam Lee', firmName: 'Lee Planning', email: 'sam@leeplanning.example', phone: '', teamSize: '2 to 5', message: '', website: '' })
  assert.deepEqual(errors, [])
  await browser.close()
}
console.log('6 demo request form on the home and contact pages: ok')

// ---------- 7. The calculator gives the same answers as the app's own counting
{
  const { browser, page, errors } = await open('/business-day-calculator', { loggedIn: false, fresh: true })
  const result = () => page.getByTestId('calc-result').innerText()
  assert.equal(await result(), 'Monday 18 January 2027', 'the worked example: 15 business days of public notification from 10 Dec 2026')
  assert.ok((await page.getByTestId('calc-skipped').innerText()).includes('20 Dec to 5 Jan'))
  assert.equal(await page.getByTestId('day-grid-end').innerText(), 'Monday 18 January 2027')
  // not public notification: the shorter Christmas period, so it ends sooner
  await page.getByLabel(/public notification period/).uncheck()
  assert.equal(addBusinessDays('2026-12-10', 15, '', {}), '2027-01-08')
  assert.equal(await result(), 'Friday 8 January 2027')
  // a decision period over Easter, with the Brisbane show day nowhere near: 35 business days from 1 March 2027
  await page.getByLabel('The day the period starts from').fill('2027-03-01')
  await page.getByRole('button', { name: '35', exact: true }).click()
  await page.getByLabel(/Council/).selectOption('Brisbane City Council')
  const want = addBusinessDays('2027-03-01', 35, 'Brisbane City Council', {})
  assert.equal(want, '2027-04-21')
  assert.equal(await result(), 'Wednesday 21 April 2027')
  const skipped = await page.getByTestId('calc-skipped').innerText()
  for (const h of ['Good Friday', 'Easter Monday']) assert.ok(skipped.includes(h), 'lists ' + h)
  // the show holiday: 5 business days from Fri 6 Aug 2027 in Brisbane skips Wed 11 Aug
  await page.getByLabel('The day the period starts from').fill('2027-08-06'); await page.getByRole('button', { name: '5', exact: true }).click()
  assert.equal(await result(), 'Monday 16 August 2027'); assert.ok((await page.getByTestId('calc-skipped').innerText()).includes('Royal Queensland Show'))
  await page.getByLabel(/Council/).selectOption('')
  assert.equal(await result(), 'Friday 13 August 2027')
  // counting between two dates
  await page.getByRole('button', { name: 'Business days between two dates' }).click()
  await page.getByLabel('From').fill('2027-03-01'); await page.getByLabel('To', { exact: true }).fill('2027-04-21')
  assert.equal(await result(), '35 business days')
  // beyond the holiday dates on file it says so
  await page.getByLabel('To', { exact: true }).fill('2030-02-01')
  assert.ok((await page.getByTestId('calc-beyond').innerText()).includes('check public holidays yourself'))
  // Use today puts today's Brisbane date in
  await page.getByRole('button', { name: 'Use today' }).click()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  assert.equal(await page.getByLabel('From').inputValue(), today)
  assert.deepEqual(errors, [])
  await browser.close()
  console.log('7 calculator matches the app: Christmas, Easter, show day, between two dates: ok')
}

// ---------- 8. The DA timeframes table carries the checked periods
{
  const { browser, page } = await open('/da-timeframes-queensland', { loggedIn: false, fresh: true })
  const rows = await page.locator('[data-testid=periods] tbody tr').allInnerTexts()
  const period = (step) => rows.find(r => r.startsWith(step))
  for (const [step, days] of [['Confirmation period', '10 business days'], ['Referring the application', '10 business days'], ['Referral agency assessment', '25 business days'], ['Decision period', '35 business days'], ['Public notification period', 'At least 15 business days'], ['Responding to an information request', '3 months'], ['Notice of compliance', '10 business days']]) assert.ok(period(step)?.includes(days), `${step}: ${days}`)
  assert.ok(await page.locator('a[href*="planning.qld.gov.au"]').count() >= 1, 'links to the government source')
  await browser.close()
  console.log('8 DA timeframes table: ok')
}

// ---------- 9. Who sees what at the front door
{
  // someone new: the website, and Log in goes to the login screen
  const a = await open('/', { loggedIn: false, fresh: true })
  await a.page.waitForSelector('.qp-site h1')
  await a.page.getByTestId('site-login').click()
  await a.page.waitForSelector('text=Welcome back')
  assert.equal(new URL(a.page.url()).pathname, '/login')
  // from the login screen, "About QPlan" shows the website, even though this device now knows QPlan
  await a.page.evaluate(() => localStorage.setItem('qplan_known_user', '1'))
  await a.page.getByRole('button', { name: 'About QPlan' }).click()
  await a.page.waitForSelector('.qp-site h1'); assert.equal(new URL(a.page.url()).pathname, '/')
  await a.page.reload({ waitUntil: 'networkidle' }); await a.page.waitForSelector('.qp-site h1')
  // ...and going back to log in ends that
  await a.page.getByTestId('site-login').click(); await a.page.waitForSelector('text=Welcome back')
  await a.page.goto(BASE + '/', { waitUntil: 'networkidle' }); await a.page.waitForSelector('text=Welcome back')
  assert.equal(await a.page.locator('.qp-site').count(), 0)
  await a.browser.close()
  // someone who has used QPlan on this device goes straight to login, and never sees the website flash past
  const b = await open('/', { loggedIn: false })
  await b.page.waitForSelector('text=Welcome back')
  assert.equal(await b.page.locator('.qp-site').count(), 0); assert.equal(await b.page.title(), 'QPlan')
  await b.browser.close()
  // signed in: straight into the app
  const c = await open('/', {})
  await c.page.waitForSelector('.qp-app'); assert.equal(await c.page.locator('.qp-site').count(), 0)
  // ...but they can still read a website page, in the light theme whatever theme the app is in
  await c.page.evaluate(() => localStorage.setItem('qplan_theme', 'dark'))
  await c.page.goto(BASE + '/features', { waitUntil: 'networkidle' }); await c.page.waitForSelector('.qp-site h1')
  assert.equal(await c.page.evaluate(() => document.documentElement.dataset.theme), 'light')
  await c.browser.close()
  // coming back from a Microsoft or Xero sign-in lands in the app, not on the website
  const d = await open('/?code=abc&state=xyz', { loggedIn: false, fresh: true })
  await d.page.waitForSelector('text=Welcome back'); await d.browser.close()
  console.log('9 front door: new visitor sees the website, known users and sign-in returns go to the app, About QPlan works: ok')
}

// ---------- 10. Install files are served
{
  const { browser, page } = await open('/login', { loggedIn: false })
  const res = await page.evaluate(async () => {
    const m = await fetch('/manifest.webmanifest').then(r => r.json())
    const sw = await fetch('/sw.js').then(r => r.status)
    const icons = await Promise.all(m.icons.map(i => fetch(i.src).then(r => r.status)))
    const off = await fetch('/offline.html').then(r => r.status)
    return { name: m.name, display: m.display, start: m.start_url, sw, icons, off, link: !!document.querySelector('link[rel=manifest]') }
  })
  assert.deepEqual(res.icons, [200, 200, 200]); assert.equal(res.sw, 200); assert.equal(res.off, 200); assert.equal(res.start, '/login'); assert.ok(res.link)
  await browser.close()
  console.log('10 install files: ok')
}
console.log('SITE TESTS PASSED')
