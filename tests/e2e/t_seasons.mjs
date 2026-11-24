import { open, db, ME, shot } from './harness.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const { SEASONS, seasonForDate } = await import('../../src/seasons.js')
const title = (page) => page.locator('.h-12 .truncate').first().innerText()
const attrs = (page) => page.evaluate(() => ({ theme: document.documentElement.dataset.theme, season: document.documentElement.dataset.season || null }))

// ---------- 1. The calendar: one season for every day of the year, and the page's own copy of the list agrees
{
  const want = { 1: 'newyear', 3: 'womens', 4: 'easter', 5: 'labour', 6: 'environment', 7: 'tour', 8: 'ekka', 9: 'footy', 10: 'halloween', 11: 'remembrance', 12: 'christmas' }
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= 31; d++) {
    const s = seasonForDate({ month: m, day: d })
    assert.ok(s, `no season for ${d}/${m}`)
    if (m === 2) assert.equal(s.id, d <= 14 ? 'superbowl' : 'lunar'); else assert.equal(s.id, want[m])
  }
  const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
  const inline = JSON.parse(/var SEASONS = (\[\[.*?\]\])/.exec(html)[1].replace(/'/g, '"'))
  const fromJs = SEASONS.map(s => [s.month, s.fromDay || 1, s.toDay || 31, s.id, s.base])
  assert.deepEqual(inline, fromJs, 'index.html and seasons.js list the same seasons')
  assert.equal(SEASONS.length, 13)
  console.log('1 every day of the year has a season; the two lists agree: ok')
}

// ---------- 2. The switch: Light, Dark, Seasonal. No Auto. Nobody picks a season.
{
  const { browser, page, errors } = await open('/')
  await page.clock.install({ time: new Date('2026-12-10T09:00:00+10:00') })
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('text=Time tracker')
  const labels = (await page.locator('[role=radiogroup][aria-label=Theme] [role=radio]').allInnerTexts()).map(s => s.trim())
  assert.deepEqual(labels, ['Light', 'Dark', 'Seasonal'])
  const fits = await page.evaluate(() => { const g = document.querySelector('[role=radiogroup][aria-label=Theme]'); const r = g.getBoundingClientRect(); return [...g.querySelectorAll('[role=radio]')].every(b => { const x = b.getBoundingClientRect(); return x.left >= r.left - 0.5 && x.right <= r.right + 0.5 }) })
  assert.ok(fits, 'the three buttons fit inside the switch')
  assert.deepEqual(await attrs(page), { theme: 'light', season: null })
  assert.equal(await page.getByTestId('season-banner').count(), 0); assert.equal(await page.getByTestId('season-strip').count(), 0)
  await page.getByRole('radio', { name: 'Seasonal' }).click(); await page.waitForTimeout(300)
  assert.deepEqual(await attrs(page), { theme: 'light', season: 'christmas' })
  assert.equal((await page.getByTestId('season-greeting').innerText()).trim(), 'Merry Christmas')
  for (const id of ['season-sticker', 'season-particles', 'season-banner']) assert.equal(await page.getByTestId(id).count(), 1, id)
  assert.equal(await page.getByTestId('season-strip').count(), 0, 'the strip under the top bar is switched off for now')
  assert.equal(await page.locator('select, [role=listbox], [role=radio]').filter({ hasText: /Easter|Halloween|Christmas/ }).count(), 0, 'there is no way to pick a season')
  console.log('2 Seasonal in December is Christmas, with sticker, snow and banner, and no strip: ok')
  // remembered across a reload, and set before the page draws
  await page.reload({ waitUntil: 'domcontentloaded' })
  assert.deepEqual(await attrs(page), { theme: 'light', season: 'christmas' })
  await page.waitForSelector('[data-testid=season-banner]')
  // the month turns over while the app is open
  await page.clock.setFixedTime(new Date('2027-01-02T09:00:00+10:00'))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await page.waitForTimeout(300)
  assert.deepEqual(await attrs(page), { theme: 'dark', season: 'newyear' })
  assert.equal((await page.getByTestId('season-greeting').innerText()).trim(), 'Happy New Year')
  assert.ok((await page.getByTestId('season-banner').innerText()) !== '')
  assert.ok((await page.locator('[data-testid=season-banner] svg text').first().textContent()).includes('2027'))
  console.log('2 it moves to New Year (dark) by itself when the month changes: ok')
  await page.clock.setFixedTime(new Date('2027-02-10T09:00:00+10:00')); await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await page.waitForTimeout(200)
  assert.equal((await attrs(page)).season, 'superbowl')
  await page.clock.setFixedTime(new Date('2027-02-15T00:30:00+10:00')); await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await page.waitForTimeout(200)
  assert.equal((await attrs(page)).season, 'lunar')
  console.log('2 February splits on the 15th: ok')
  // back to Light and Dark: every decoration goes
  await page.getByRole('radio', { name: 'Dark' }).click(); await page.waitForTimeout(200)
  assert.deepEqual(await attrs(page), { theme: 'dark', season: null })
  for (const id of ['season-strip', 'season-sticker', 'season-particles', 'season-banner']) assert.equal(await page.getByTestId(id).count(), 0, id + ' gone on Dark')
  await page.getByRole('radio', { name: 'Light' }).click(); await page.waitForTimeout(200)
  assert.deepEqual(await attrs(page), { theme: 'light', season: null })
  // someone who had the old Auto saved is on Light
  await page.evaluate(() => localStorage.setItem('qplan_theme', 'auto')); await page.reload({ waitUntil: 'networkidle' })
  assert.deepEqual(await attrs(page), { theme: 'light', season: null })
  assert.equal(await page.getByRole('radio', { name: 'Light' }).getAttribute('aria-checked'), 'true')
  console.log('2 Light and Dark are untouched; old Auto becomes Light: ok', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 3. Every season, on three pages: no errors, and nothing decorative is ever on top of text
const overlapCheck = () => {
  const box = el => el.getBoundingClientRect()
  const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5
  const visible = r => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
  // every piece of text on screen, as the boxes its characters occupy
  const texts = []
  const walker = document.createTreeWalker(document.getElementById('root'), NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || n.parentElement.closest('svg, [aria-hidden=true]')) continue
    const range = document.createRange(); range.selectNodeContents(n)
    for (const r of range.getClientRects()) if (visible(r)) texts.push({ r, text: n.nodeValue.trim().slice(0, 30), el: n.parentElement })
  }
  const problems = []
  const strip = document.querySelector('[data-testid=season-strip]'), sticker = document.querySelector('[data-testid=season-sticker]'), art = document.querySelector('[data-testid=season-banner] svg')
  for (const [name, el] of [['garland', strip], ['sticker', sticker], ['banner picture', art]]) {
    if (!el) continue
    const r = box(el)
    for (const t of texts) if (hit(r, t.r)) problems.push(`${name} overlaps "${t.text}"`)
  }
  const p = document.querySelector('[data-testid=season-particles]')
  // Drifting pieces: behind everything (a negative layer inside the app's own stack) and unclickable. Part 4 checks the pixels.
  const order = p ? { particles: getComputedStyle(p).zIndex, pointer: getComputedStyle(p).pointerEvents, pieces: p.children.length, rootIsolated: getComputedStyle(p.closest('.isolate')).isolation } : null
  return { texts: texts.length, problems, order }
}
{
  let checked = 0
  for (const s of SEASONS) {
    for (const viewport of [{ width: 1360, height: 820 }, { width: 390, height: 844 }]) {
      const { browser, page, errors } = await open(`/?season=${s.id}`, { theme: 'seasonal', viewport })
      await page.waitForSelector('[data-testid=season-banner]')
      assert.deepEqual(await attrs(page), { theme: s.base, season: s.id })
      assert.equal((await page.getByTestId('season-greeting').innerText()).trim(), s.greeting)
      for (const nav of ['dashboard', 'jobs', 'calendar']) {
        if (viewport.width < 1024) await page.getByRole('button', { name: /Open menu/ }).click()
        await page.locator(`[data-tour=nav-${nav}]`).click(); await page.waitForTimeout(500)
        const res = await page.evaluate(overlapCheck)
        assert.deepEqual(res.problems, [], `${s.id} / ${nav} / ${viewport.width}px`)
        assert.ok(res.texts > 15)
        if (res.order) { assert.equal(res.order.pointer, 'none'); assert.ok(Number(res.order.particles) < 0, 'the drifting pieces sit behind the page'); assert.equal(res.order.rootIsolated, 'isolate'); assert.ok(res.order.pieces >= 8) }
        checked++
      }
      // the strip under the top bar is off for now; the Dashboard banner is still there
      assert.equal(await page.getByTestId('season-strip').count(), 0, `${s.id}: no strip`)
      // the calendar still fits the screen
      const fit = await page.evaluate(() => { const g = document.querySelector('[data-testid=calendar-grid]'); const sc = g.closest('.overflow-y-auto'); return g.getBoundingClientRect().bottom <= sc.getBoundingClientRect().bottom })
      assert.ok(fit, `${s.id}: calendar fits`)
      assert.deepEqual(errors, [], `${s.id}: no errors`)
      await browser.close()
    }
  }
  console.log(`3 all ${SEASONS.length} seasons x 3 pages x 2 screen sizes (${checked} screens): no decoration touches any text, no errors`)
}

// ---------- 4. Reduced motion, the client summary page, and the tutorial on a seasonal theme
{
  const a = await open('/?season=christmas', { theme: 'seasonal', reducedMotion: 'reduce' })
  await a.page.waitForSelector('[data-testid=season-banner]')
  const still = await a.page.evaluate(() => ({ flakes: [...document.querySelectorAll('.qp-s-fall')].every(e => getComputedStyle(e).display === 'none'), twinkle: [...document.querySelectorAll('.qp-s-twinkle')].every(e => getComputedStyle(e).animationName === 'none') }))
  assert.deepEqual(still, { flakes: true, twinkle: true })
  await a.browser.close()
  const b = await open('/summary/' + 'a'.repeat(48) + '?season=christmas', { loggedIn: false, theme: 'seasonal' })
  await b.page.waitForTimeout(600)
  assert.deepEqual(await attrs(b.page), { theme: 'light', season: null })
  await b.browser.close()
  // a pop-up box on a page still covers the whole app, menu included, on a seasonal theme
  const c = await open('/?season=christmas', { theme: 'seasonal' })
  await c.page.locator('[data-tour=nav-calendar]').click(); await c.page.waitForSelector('text=Connect calendar')
  await c.page.getByRole('button', { name: '+ New meeting' }).click(); await c.page.waitForTimeout(400)
  const cover = await c.page.evaluate(() => { const overMenu = document.elementFromPoint(60, 300), overBar = document.elementFromPoint(400, 20); const inBox = el => !!el && !!el.closest('.fixed.inset-0'); return { menu: inBox(overMenu), bar: inBox(overBar) } })
  assert.deepEqual(cover, { menu: true, bar: true }, 'a pop-up covers the menu and the top bar')
  // and the snow is really there, behind the page
  await c.page.keyboard.press('Escape'); await c.page.reload({ waitUntil: 'networkidle' }); await c.page.waitForSelector('[data-testid=season-particles]'); await c.page.waitForTimeout(1500)
  // Freeze the snow, note where each flake is and what is there (open page, or a card), then look at the actual pixels
  const flakes = await c.page.evaluate(() => {
    document.getAnimations().forEach(a => a.pause())
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const rgb = (v) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = v; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data] } // works for oklch() too. Fourth number is how solid it is.
    const out = []
    for (const f of document.querySelector('[data-testid=season-particles]').children) {
      const r = f.getBoundingClientRect(); const x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2
      if (y < 70 || y > innerHeight - 6 || x < 215 || x > innerWidth - 6) continue
      let el = document.elementFromPoint(x, y), under = null
      for (; el && el.id !== 'root'; el = el.parentElement) { const c = rgb(getComputedStyle(el).backgroundColor); if (c[3] >= 250) { under = c.slice(0, 3); break } } // see-through tints are skipped: look for the solid thing behind
      const isPage = !el || el.id === 'root' || el.classList.contains('isolate')
      out.push({ x, y, where: isPage ? 'open' : 'card', under })
    }
    return out
  })
  fs.writeFileSync('seasons/flakes.json', JSON.stringify(flakes))
  await c.page.screenshot({ path: 'seasons/flakes.png' })
  const { execFileSync } = await import('node:child_process')
  const verdict = JSON.parse(execFileSync('python3', ['check_flakes.py', 'seasons/flakes.png', 'seasons/flakes.json']).toString())
  console.log('   snow, by the pixels:', JSON.stringify(verdict))
  assert.ok(verdict.total >= 5); assert.ok(verdict.open_and_visible >= 1, 'snow is visible on the open page')
  assert.equal(verdict.showing_through_a_card, 0, 'no flake shows on top of a card')
  await c.browser.close()
  console.log('4 reduced motion stops it; the client summary page is never seasonal; pop-ups still cover the menu: ok')
}
// ---------- 5. Colour coding: every season colours the page, the menu and the top bar, each plainly its own
{
  const SYMBOLS = { newyear: 'champagne', superbowl: 'american football', lunar: 'firecracker', womens: 'pink ribbon', easter: 'painted egg', labour: 'hard hat', environment: 'leaf', tour: 'mountain', ekka: 'ferris wheel', footy: 'rugby ball', halloween: 'jack-o-lantern', remembrance: 'poppy', christmas: 'christmas tree with three presents' }
  const ALL = ['newyear', 'superbowl', 'lunar', 'womens', 'easter', 'labour', 'environment', 'tour', 'ekka', 'footy', 'halloween', 'remembrance', 'christmas']
  const read = (page) => page.evaluate(() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1; const ctx = cv.getContext('2d', { willReadFrequently: true })
    const rgb = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
    const bg = (sel) => rgb(getComputedStyle(document.querySelector(sel)).backgroundColor)
    const fg = (sel) => rgb(getComputedStyle(document.querySelector(sel)).color)
    const bar = document.querySelector('.qp-topbar')
    return {
      page: bg('.qp-app'), side: bg('.qp-sidebar'), bar: bg('.qp-topbar'), title: fg('.qp-topbar .truncate'), help: fg('[data-tour=help-button]'),
      cta: bg('.qp-topbar-cta'), ctaText: fg('.qp-topbar-cta'), chip: fg('.qp-topbar-chip'), line: rgb(getComputedStyle(bar).borderBottomColor), lineWidth: getComputedStyle(bar).borderBottomWidth,
      barH: bar.getBoundingClientRect().height, card: bg('[data-tour=dash-stats] > *'), body: rgb(getComputedStyle(document.body).backgroundColor),
      // the menu down the left: every kind of text on it, and what it sits on
      menu: (() => {
        const side = document.querySelector('.qp-sidebar'), head = side.querySelector('.qp-sidebar-head')
        const el = (sel) => side.querySelector(sel)
        const item = [...side.querySelectorAll('[data-tour^="nav-"]:not([data-tour^="nav-section"])')].find(b => !b.classList.contains('qp-nav-on'))
        const on = el('.qp-nav-on'), seg = el('.qp-seg-on'), segOff = [...side.querySelectorAll('button')].find(b => b.textContent.trim() === 'Light')
        const byText = (t) => [...side.querySelectorAll('button, div, span')].filter(e => e.children.length === 0 && e.textContent.trim() === t)[0]
        const c = (e) => rgb(getComputedStyle(e).color), b = (e) => rgb(getComputedStyle(e).backgroundColor)
        const logo = side.querySelectorAll('svg[aria-label=QPlan] path')
        const input = side.querySelector('input[placeholder="What are you working on?"]'), select = side.querySelector('select')
        return {
          item: c(item), section: c(byText('main')), on: c(on), onBg: b(on), seg: c(seg), segBg: b(seg), segOff: c(segOff), segTrack: b(seg.parentElement),
          notifications: c(byText('Notifications')), name: c(byText('Lachlan Quinn')), role: c(byText('director')), password: c(byText('Change password')),
          logout: c(byText('Log out')), logoutBg: getComputedStyle(byText('Log out')).backgroundColor, tracker: c(byText('Time tracker')),
          logoPin: rgb(getComputedStyle(logo[0]).fill), logoText: rgb(getComputedStyle(logo[1]).fill), logoDot: rgb(getComputedStyle(side.querySelector('svg[aria-label=QPlan] circle')).fill),
          input: c(input), inputBg: b(input), select: c(select), selectBg: b(select),
          sticker: side.querySelector('[data-testid=season-sticker]')?.dataset.sticker, stickerRight: side.querySelector('[data-testid=season-sticker]')?.getBoundingClientRect().right, stickerLeft: side.querySelector('[data-testid=season-sticker]')?.getBoundingClientRect().left, logoRight: side.querySelector('svg[aria-label=QPlan]').getBoundingClientRect().right, arrowLeft: head.querySelector('button').getBoundingClientRect().left, headLine: rgb(getComputedStyle(head).borderBottomColor), headLineWidth: getComputedStyle(head).borderBottomWidth, sectionWeight: getComputedStyle(byText('main')).fontWeight, sectionSize: getComputedStyle(byText('main')).fontSize, sectionSpacing: parseFloat(getComputedStyle(byText('main')).letterSpacing), itemWeight: getComputedStyle(item).fontWeight, itemSize: getComputedStyle(item).fontSize, sectionRule: getComputedStyle(side.querySelectorAll('.qp-nav-section')[1]).borderTopWidth, headBottom: Math.round(head.getBoundingClientRect().bottom), barBottom: Math.round(bar.getBoundingClientRect().bottom),
        }
      })(),
    }
  })
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  const sat = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b)
  const got = {}
  for (const id of ALL) {
    const { browser, page, errors } = await open(`/?season=${id}`, { theme: 'seasonal' })
    await page.waitForSelector('[data-testid=season-banner]'); await page.waitForTimeout(300)
    const c = got[id] = await read(page)
    assert.ok(ratio(c.title, c.bar) >= 4.5, `${id}: page title on the top bar ${ratio(c.title, c.bar).toFixed(2)}`)
    assert.ok(ratio(c.help, c.bar) >= 4.5, `${id}: ? button on the top bar`)
    assert.ok(ratio(c.chip, c.bar) >= 4.5, `${id}: firm name on the top bar`)
    assert.ok(ratio(c.ctaText, c.cta) >= 4.5, `${id}: New Job button text ${ratio(c.ctaText, c.cta).toFixed(2)}`)
    assert.ok(ratio(c.cta, c.bar) >= 3, `${id}: New Job button stands out on the bar`)
    assert.ok(dist(c.bar, c.page) > 60, `${id}: the top bar is a different colour from the page`)
    // No coloured trim: one thin, quiet line under the top bar, as on Light and Dark
    assert.equal(c.lineWidth, '1px', `${id}: the line under the top bar is thin`)
    assert.ok(dist(c.line, c.bar) > 12 && dist(c.line, c.bar) < 110 && sat(c.line) <= sat(c.bar) + 6, `${id}: the line under the top bar is quiet, not a coloured trim: ${c.line} on ${c.bar}`)
    assert.equal(c.barH, 48, `${id}: the top bar keeps its height`)
    assert.ok(sat(c.bar) <= 135, `${id}: the bar colour is relaxed, not loud (${sat(c.bar)}): ${c.bar}`)
    assert.deepEqual(c.body, c.page, `${id}: nothing shows a different colour behind the app`)
    // The menu down the left is the same colour as the top bar, with the same trim, level with it
    const m = c.menu
    assert.deepEqual(c.side, c.bar, `${id}: the menu is the same colour as the top bar`)
    assert.deepEqual(m.headLine, c.line, `${id}: the same line runs under the logo`); assert.equal(m.headLineWidth, '1px')
    assert.equal(m.headBottom, m.barBottom, `${id}: the line under the logo lines up with the line under the top bar`)
    // Main, Tools and Settings read as headings, not as one more menu item
    assert.ok(Number(m.sectionWeight) >= 700 && Number(m.itemWeight) <= 500, `${id}: section headings are heavy, menu items are not`)
    assert.ok(parseFloat(m.sectionSize) < parseFloat(m.itemSize) && m.sectionSpacing >= 1.2, `${id}: section headings are small, wide-spaced capitals`)
    assert.ok(ratio(m.section, c.side) > ratio(m.item, c.side) - 0.01, `${id}: section headings are at least as strong as the items under them`)
    assert.equal(m.sectionRule, '1px', `${id}: a line separates each group of the menu`)
    // The symbol beside the logo is the one he chose for this season, and it sits clear of the logo and the arrows
    assert.equal(m.sticker, SYMBOLS[id], `${id}: the symbol beside the logo`)
    assert.ok(m.stickerLeft >= m.logoRight + 4 && m.stickerRight <= m.arrowLeft - 4, `${id}: the symbol fits between the logo and the arrows`)
    for (const [what, colour] of Object.entries({ 'a menu item': m.item, 'a section label': m.section, 'Notifications': m.notifications, 'the person\'s name': m.name, 'their role': m.role, 'Change password': m.password, 'Log out': m.logout, 'the Time tracker label': m.tracker, 'the logo\'s pin': m.logoPin, 'the logo\'s lettering': m.logoText, 'the unselected theme buttons': m.segOff })) {
      assert.ok(ratio(colour, c.side) >= 4.5, `${id}: ${what} is readable on the menu (${ratio(colour, c.side).toFixed(2)})`)
    }
    assert.ok(ratio(m.on, m.onBg) >= 4.5, `${id}: the selected menu item is readable (${ratio(m.on, m.onBg).toFixed(2)})`)
    assert.ok(ratio(m.onBg, c.side) >= 3, `${id}: the selected menu item stands out`)
    assert.ok(ratio(m.seg, m.segBg) >= 4.5, `${id}: the selected theme button is readable`)
    assert.ok(ratio(m.segOff, m.segTrack) >= 4.5, `${id}: the other theme buttons are readable on their track`)
    assert.ok(ratio(m.input, m.inputBg) >= 4.5 && ratio(m.select, m.selectBg) >= 4.5, `${id}: the timer's boxes are readable`)
    assert.ok(ratio(m.logoDot, c.side) >= 1.85, `${id}: the dot in the logo shows (${ratio(m.logoDot, c.side).toFixed(2)})`)
    assert.equal(m.logoutBg, 'rgba(0, 0, 0, 0)', `${id}: Log out is outlined, not a red block`)
    if (!['newyear', 'halloween'].includes(id)) {
      assert.ok(sat(c.page) >= 4 && sat(c.page) <= 20, `${id}: the page is tinted, gently: ${c.page}`)
      assert.ok(lum(c.page) > 0.82, `${id}: the page stays light`)
    }
    assert.deepEqual(errors, [], id)
    await browser.close()
  }
  // No two seasons share a top bar, and no two share the pair of page and bar
  for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) {
    const a = got[ALL[i]], b = got[ALL[j]]
    assert.ok(dist(a.bar, b.bar) > 28, `${ALL[i]} and ${ALL[j]} have top bars too alike: ${a.bar} ${b.bar}`)
    assert.ok(dist(a.bar, b.bar) + dist(a.page, b.page) + dist(a.side, b.side) > 45, `${ALL[i]} and ${ALL[j]} look too alike`)
  }
  // What he asked for by name
  const hue = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360 }
  const w = got.womens; assert.ok(w.page[0] > w.page[1] + 4 && w.page[0] > w.page[2], `Women's Day page is light pink: ${w.page}`); assert.ok(hue(w.bar) > 300 || hue(w.bar) < 10, `Women's Day bar is pink: ${w.bar}`)
  const x = got.christmas; assert.ok(x.page[1] >= x.page[0] && x.page[1] >= x.page[2], `Christmas page is a frosted white, not orange: ${x.page}`); assert.ok(x.bar[0] > 90 && x.bar[1] < 60 && x.bar[2] < 70 && x.bar[0] < 150 && x.bar[0] > x.bar[1] + 45, `Christmas bar is a deep maroon: ${x.bar}`); assert.deepEqual(x.side, x.bar, 'Christmas menu is the same maroon as the bar')
  const hw = got.halloween; assert.ok(lum(hw.page) < 0.02 && sat(hw.page) < 12, `Halloween page is black: ${hw.page}`); assert.ok(hue(hw.bar) > 15 && hue(hw.bar) < 45 && sat(hw.bar) > 70, `Halloween bar is orange: ${hw.bar}`)
  console.log('5 colour coding: 13 seasons, each with its own page and frame; the menu matches the top bar; all text on both readable')
  console.log('   ' + ALL.map(id => `${id} bar rgb(${got[id].bar}) page rgb(${got[id].page})`).join('\n   '))
  // A pop-up that opens from the menu is an ordinary card, not the menu's colour
  for (const id of ['tour', 'remembrance', 'halloween']) {
    const { browser, page } = await open(`/?season=${id}`, { theme: 'seasonal' })
    await page.waitForSelector('[data-testid=season-banner]')
    await page.getByTestId('notifications-button').click(); await page.waitForSelector('text=No notifications')
    const pop = await page.evaluate(() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 1; const ctx = cv.getContext('2d', { willReadFrequently: true })
      const rgb = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
      const panel = document.querySelector('.qp-sidebar .qp-plain'), words = [...panel.querySelectorAll('div')].find(d => d.textContent.trim() === 'No notifications')
      return { panel: rgb(getComputedStyle(panel).backgroundColor), words: rgb(getComputedStyle(words).color), heading: rgb(getComputedStyle(panel.querySelector('.font-semibold')).color), side: rgb(getComputedStyle(document.querySelector('.qp-sidebar')).backgroundColor), card: rgb(getComputedStyle(document.querySelector('[data-tour=dash-stats]').parentElement.querySelector('.bg-white') || document.body).backgroundColor) }
    })
    assert.ok(dist(pop.panel, pop.side) > 60, `${id}: the Notifications box is a card, not the menu colour`)
    assert.ok(ratio(pop.words, pop.panel) >= 4.5 && ratio(pop.heading, pop.panel) >= 4.5, `${id}: its words are readable (${ratio(pop.words, pop.panel).toFixed(2)})`)
    await browser.close()
  }
  console.log('5 pop-ups from the menu stay ordinary cards: ok')
  // Light and Dark keep the plain white (or dark) top bar
  for (const theme of ['light', 'dark']) {
    const { browser, page } = await open('/', { theme })
    await page.waitForSelector('[data-tour=dash-stats]')
    const c = await read(page)
    assert.deepEqual(c.bar, c.side, `${theme}: top bar and menu are the same plain colour`)
    if (theme === 'light') { assert.deepEqual(c.bar, [255, 255, 255]); assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.qp-topbar')).borderBottomWidth), '1px') }
    assert.ok(Number(c.menu.sectionWeight) >= 700 && ratio(c.menu.section, c.side) >= 7, `${theme}: Main, Tools and Settings stand out`)
    await browser.close()
  }
  console.log('5 Light and Dark are untouched: ok')
}

console.log('SEASON TESTS PASSED')
