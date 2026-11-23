// scripts/seasons-css.mjs
// Writes src/seasons-palette.css from the numbers in src/seasons.js, and checks every season's
// colours are readable before writing. Run: node scripts/seasons-css.mjs
import fs from 'node:fs'
import { SEASONS } from '../src/seasons.js'

// ---- colour maths (OKLCH to sRGB, and WCAG contrast), only used for the checks
function oklchToLinear([L, C, H]) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
}
const inGamut = (rgb) => rgb.every(v => v >= -0.0005 && v <= 1.0005)
// Browsers bring an out-of-range colour back by easing off its strength. Do the same.
function fit([L, C, H]) {
  let lo = 0, hi = C
  if (inGamut(oklchToLinear([L, C, H]))) return [L, C, H]
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (inGamut(oklchToLinear([L, mid, H]))) lo = mid; else hi = mid }
  return [L, lo, H]
}
const luminance = (lch) => { const [r, g, b] = oklchToLinear(fit(lch)).map(v => Math.min(1, Math.max(0, v))); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const WHITE = [1, 0, 0]
const css = (lch) => { const [L, C, H] = fit(lch); return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H})` }
const mixOverSurface = (lch, pct, surface) => `color-mix(in oklab, ${css(lch)} ${pct}%, ${surface})`

// ---- the ramps. Lightness is the same for every season, so every season is equally readable.
const LIGHT = { 50: [0.975, 0.10], 100: [0.945, 0.22], 200: [0.895, 0.42], 300: [0.83, 0.65], 400: [0.73, 0.95], 500: [0.62, 1], 600: [0.52, 1], 700: [0.44, 0.92], 800: [0.37, 0.8], 900: [0.31, 0.66] }
const DARK_SOLID = { 400: [0.76, 0.95], 500: [0.66, 1], 600: [0.54, 1] }
const DARK_LIGHT = { 700: [0.845, 0.85], 800: [0.905, 0.55], 900: [0.95, 0.3] }
const DARK_MIX = { 50: 11, 100: 20, 200: 32, 300: 46 }

const problems = []
const need = (season, what, ratio, min = 4.5) => { if (ratio < min) problems.push(`${season}: ${what} is ${ratio.toFixed(2)}:1, needs ${min}:1`) }

let out = `/* Written by scripts/seasons-css.mjs from src/seasons.js. Do not edit by hand. */\n`
for (const s of SEASONS) {
  const { h, c } = s.accent
  const lines = []
  if (s.base === 'light') {
    const shade = (k) => [LIGHT[k][0], c * LIGHT[k][1], h]
    for (const k of Object.keys(LIGHT)) lines.push(`  --color-emerald-${k}: ${css(shade(k))};`)
    // page, card edges and soft fills take a whisper of the season's colour
    const tints = { 50: [0.985, 0.55], 100: [0.966, 0.8], 200: [0.926, 1.15] }
    for (const k of Object.keys(tints)) lines.push(`  --color-gray-${k}: ${css([tints[k][0], s.tint.c * tints[k][1], s.tint.h])};`)
    need(s.id, 'white on a button', contrast(WHITE, shade(600)))
    need(s.id, 'white on a hovered button', contrast(WHITE, shade(700)))
    need(s.id, 'link text on white', contrast(shade(600), WHITE))
    need(s.id, 'dark accent text on its palest tint', contrast(shade(700), shade(50)))
    need(s.id, 'dark accent text on its second tint', contrast(shade(700), shade(100)))
    need(s.id, 'body text on the tinted page', contrast([0.446, 0.03, 257], [0.966, s.tint.c, s.tint.h]))
    out += `\n/* ${s.name} */\n:root[data-theme="light"][data-season="${s.id}"] {\n${lines.join('\n')}\n}\n`
  } else {
    const surface = [0.225, s.tint.c, s.tint.h], page = [0.165, s.tint.c * 0.8, s.tint.h]
    lines.push(`  --qp-surface: ${css(surface)};`, `  --qp-page: ${css(page)};`)
    const greys = { 50: 0.195, 100: 0.265, 200: 0.315, 300: 0.395 }
    for (const k of Object.keys(greys)) lines.push(`  --color-gray-${k}: ${css([greys[k], s.tint.c * 0.9, s.tint.h])};`)
    for (const k of Object.keys(DARK_MIX)) lines.push(`  --color-emerald-${k}: ${mixOverSurface([0.7, c, h], DARK_MIX[k], 'var(--qp-surface)')};`)
    for (const k of Object.keys(DARK_SOLID)) lines.push(`  --color-emerald-${k}: ${css([DARK_SOLID[k][0], c * DARK_SOLID[k][1], h])};`)
    for (const k of Object.keys(DARK_LIGHT)) lines.push(`  --color-emerald-${k}: ${css([DARK_LIGHT[k][0], c * DARK_LIGHT[k][1], h])};`)
    const text = [0.78, c, h], hover = [0.47, c * 0.85, h], pressed = [0.41, c * 0.75, h]
    lines.push(`  --qp-accent-text: ${css(text)};`, `  --qp-accent-hover: ${css(hover)};`, `  --qp-accent-pressed: ${css(pressed)};`)
    need(s.id, 'white on a button', contrast(WHITE, [0.54, c, h]))
    need(s.id, 'white on a hovered button', contrast(WHITE, hover))
    need(s.id, 'accent text on a card', contrast(text, surface))
    need(s.id, 'light accent text on a card', contrast([0.845, c * 0.85, h], surface))
    need(s.id, 'body text on a card', contrast([0.80, 0.01, 160], surface))
    out += `\n/* ${s.name} */\n:root[data-theme="dark"][data-season="${s.id}"] {\n${lines.join('\n')}\n}\n`
  }
}

if (problems.length) { console.error('Not written. These colours are too hard to read:\n  ' + problems.join('\n  ')); process.exit(1) }
fs.writeFileSync(new URL('../src/seasons-palette.css', import.meta.url), out)
console.log(`Wrote src/seasons-palette.css for ${SEASONS.length} seasons. Every text and button colour passes 4.5:1.`)
