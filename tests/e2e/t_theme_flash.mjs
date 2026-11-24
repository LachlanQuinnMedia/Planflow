import { open } from './harness.mjs'
import assert from 'node:assert/strict'
const strict = process.argv[2] === 'strict'
for (const [from, to] of [['light', 'Dark'], ['dark', 'Light']]) {
  for (const nav of ['Dashboard', 'Jobs', 'Calendar']) {
    const { browser, page } = await open('/', { theme: from })
    await page.getByRole('button', { name: nav }).first().click()
    await page.waitForTimeout(700)
    // Sample colours of every visible element on each frame, starting in the same task as the click
    const res = await page.evaluate(async (to) => {
      const els = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }).slice(0, 1500)
      const snap = () => els.map(e => { const c = getComputedStyle(e); return c.backgroundColor + '|' + c.color + '|' + c.borderTopColor })
      const before = snap()
      const btn = [...document.querySelectorAll('[role=radio]')].find(b => b.textContent.trim() === to)
      btn.click()
      const frames = []
      const t0 = performance.now()
      await new Promise(done => { const tick = () => { frames.push({ t: Math.round(performance.now() - t0), s: snap() }); if (performance.now() - t0 < 500) requestAnimationFrame(tick); else done() }; requestAnimationFrame(tick) })
      const final = frames[frames.length - 1].s
      // a frame is "mixed" if some element shows a colour that is neither its old nor its final colour, or old while others are final
      let worst = 0, lastMixed = -1, mixedFrames = 0
      for (const f of frames) {
        let mid = 0
        for (let i = 0; i < els.length; i++) if (f.s[i] !== final[i]) mid++
        if (mid > 0) { mixedFrames++; lastMixed = f.t; worst = Math.max(worst, mid) }
      }
      return { els: els.length, frames: frames.length, mixedFrames, worst, lastMixed, changed: before.filter((b, i) => b !== final[i]).length, themeAfter: document.documentElement.dataset.theme, cls: document.documentElement.className }
    }, to)
    console.log(`${from} -> ${to} on ${nav}:`, JSON.stringify(res))
    if (strict) { assert.equal(res.mixedFrames, 0, 'no frame may show part-changed colours'); assert.ok(res.changed > 50); assert.ok(!res.cls.includes('qp-theme-switching')) }
    await browser.close()
  }
}
console.log('THEME FLASH TEST DONE')
