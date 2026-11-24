// On a phone the app stays put: it cannot be dragged down as a whole, left scrolled with the
// top bar off the screen, or moved sideways. The page area inside it still scrolls up and down.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { installMocks, fakeSession, ME, open, swipe } from './harness.mjs'
const require = createRequire(import.meta.url)
const { chromium, devices } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:4173'

const phone = async (name, { loggedIn = true } = {}) => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ ...devices[name], timezoneId: 'Australia/Brisbane', locale: 'en-AU' })
  await context.addInitScript(({ me, session, loggedIn }) => {
    localStorage.setItem('qplan_known_user', '1')
    for (const role of ['director', 'staff']) localStorage.setItem(`qplan_tour_${role}_${me.id}`, '1')
    if (!loggedIn) return
    localStorage.setItem('pf_session', JSON.stringify(me)); localStorage.setItem('pf_stay', '1')
    localStorage.setItem('sb-sltaaiumviyzgdsdkkbe-auth-token', JSON.stringify(session))
  }, { me: ME, session: fakeSession(ME.id), loggedIn })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await installMocks(page)
  // drag a finger by (dx, dy): dragging down is +dy, dragging right is +dx
  const drag = (dx, dy, x = 200, y = 330) => swipe(page, x, y, x + dx, y + dy)
  return { browser, page, errors, drag }
}
const state = (page) => page.evaluate(() => {
  const doc = document.documentElement, main = document.querySelector('[data-testid=page-scroll]'), bar = document.querySelector('.qp-topbar')
  return {
    docY: Math.round(window.scrollY + visualViewport.offsetTop), docX: Math.round(window.scrollX + visualViewport.offsetLeft),
    docCanScroll: doc.scrollHeight - doc.clientHeight, bodyFixed: getComputedStyle(document.body).position === 'fixed',
    barTop: bar ? Math.round(bar.getBoundingClientRect().top) : null, barBottom: bar ? Math.round(bar.getBoundingClientRect().bottom) : null,
    mainTop: main ? Math.round(main.scrollTop) : null, mainLeft: main ? Math.round(main.scrollLeft) : null,
    mainCanMoveSideways: main ? main.scrollWidth - main.clientWidth : null, mainOverflowX: main ? getComputedStyle(main).overflowX : null,
    appFills: (() => { const a = document.querySelector('.qp-app'); return a ? Math.round(a.getBoundingClientRect().height) === innerHeight : null })(),
  }
})

for (const name of ['iPhone 13', 'iPhone SE', 'Pixel 7']) {
  const { browser, page, errors, drag } = await phone(name)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await page.waitForSelector('.qp-app'); await page.waitForTimeout(700)
  let s = await state(page)
  assert.equal(s.bodyFixed, true, `${name}: the app is pinned to the screen`)
  assert.equal(s.docCanScroll, 0, `${name}: the page as a whole has nowhere to scroll`)
  assert.equal(s.appFills, true, `${name}: the app fills the screen exactly`)
  assert.equal(s.barTop, 0, `${name}: the top bar starts at the top`)
  assert.equal(s.mainOverflowX, 'hidden', `${name}: the page area does not scroll sideways`)

  // drag down from the top, hard: the app does not come with the finger
  await drag(0, 300, 200, 120)
  s = await state(page)
  assert.deepEqual([s.docY, s.barTop], [0, 0], `${name}: dragging down does not move the app or hide the top bar`)
  assert.equal(await page.evaluate(() => { window.scrollTo(0, 300); return window.scrollY }), 0, `${name}: the whole page cannot be scrolled`)

  // drag sideways, both ways, and diagonally
  for (const [dx, dy] of [[-180, 0], [180, 0], [-170, -40], [170, 200]]) {
    await drag(dx, dy)
    s = await state(page)
    assert.deepEqual([s.docX, s.mainLeft, s.barTop], [0, 0, 0], `${name}: dragging ${dx},${dy} does not move anything sideways`)
  }

  // the page area still scrolls up and down, and the top bar stays where it is
  await page.evaluate(() => { document.querySelector('[data-testid=page-scroll]').scrollTop = 0 })
  await drag(0, -280, 200, 480)
  s = await state(page)
  assert.ok(s.mainTop > 100, `${name}: the page area scrolls (${s.mainTop})`)
  assert.deepEqual([s.docY, s.barTop], [0, 0], `${name}: ...and the top bar stays put`)

  // every page: nothing in the page area is wider than it
  for (const nav of ['dashboard', 'jobs', 'newjob', 'calendar', 'workload', 'templates', 'time', 'planners', 'xero', 'firm', 'microsoft']) {
    await page.evaluate((n) => document.querySelector(`[data-tour=nav-${n}]`)?.click(), nav); await page.waitForTimeout(700)
    s = await state(page)
    assert.equal(s.mainCanMoveSideways, 0, `${name} ${nav}: nothing wider than the page area`)
    assert.deepEqual([s.docCanScroll, s.barTop], [0, 0], `${name} ${nav}: still pinned`)
    const squeezed = await page.evaluate(() => [...document.querySelectorAll('[data-testid=page-scroll] select, [data-testid=page-scroll] input:not([type=checkbox]):not([type=radio]), [data-testid=page-scroll] textarea')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).minWidth !== '0px').length)
    assert.equal(squeezed, 0, `${name} ${nav}: drop-downs and text boxes may shrink to fit`)
  }
  // the menu slides out and its own list scrolls without moving the app
  await page.locator('.qp-topbar-btn').first().tap(); await page.waitForTimeout(350)
  await drag(0, -200, 80, 400)
  s = await state(page)
  assert.deepEqual([s.docY, s.docX], [0, 0], `${name}: scrolling the menu does not move the app`)
  assert.deepEqual(errors, [], name)
  await browser.close()
  console.log(`${name}: app stays put, page area scrolls, nothing sideways`)
}

// The ordinary pages still scroll as pages: the login screen, the website, a client's summary
{
  const { browser, page } = await phone('iPhone SE', { loggedIn: false })
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' }); await page.waitForSelector('text=Welcome back')
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).position), 'static', 'the login screen is an ordinary page')
  await page.goto(BASE + '/features', { waitUntil: 'networkidle' }); await page.waitForSelector('.qp-site h1')
  assert.equal(await page.evaluate(() => { window.scrollTo(0, 600); return window.scrollY }), 600, 'the website scrolls normally')
  await browser.close()
  // signing in pins the app, and logging out lets the login screen scroll again
  const a = await open('/', { viewport: { width: 390, height: 500 } })
  assert.equal(await a.page.evaluate(() => getComputedStyle(document.body).position), 'fixed')
  await a.page.evaluate(() => [...document.querySelectorAll('.qp-sidebar button')].find(b => b.textContent.trim() === 'Log out').click())
  await a.page.waitForSelector('text=Welcome back')
  assert.equal(await a.page.evaluate(() => getComputedStyle(document.body).position), 'static', 'after logging out the page scrolls again')
  await a.browser.close()
  console.log('login, website: ordinary scrolling pages')
}
console.log('t_phone: all passed')
