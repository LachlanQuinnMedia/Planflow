// scripts/og-image.mjs
// Draws public/og.png, the card shown when a QPlan link is shared (1200 x 630).
// Run by hand when the brand changes:  node scripts/og-image.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const font = fs.readFileSync(path.join(root, 'node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2')).toString('base64')
const logoSrc = fs.readFileSync(path.join(root, 'src/Logo.jsx'), 'utf8')
const PIN = /const PIN = '([^']+)'/.exec(logoSrc)[1]
const PLAN = /const PLAN = '([^']+)'/.exec(logoSrc)[1]

const html = `<!doctype html><html><head><style>
@font-face { font-family: Archivo; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #0E5A43; color: #fff; font-family: Archivo, sans-serif; position: relative; overflow: hidden; }
.lots { position: absolute; inset: 0; opacity: .12; }
.in { position: absolute; inset: 0; padding: 70px 80px; display: flex; flex-direction: column; justify-content: space-between; }
h1 { font-stretch: 122%; font-weight: 720; font-size: 112px; line-height: .98; letter-spacing: -0.02em; }
p { font-size: 34px; font-weight: 550; opacity: .92; }
</style></head><body>
<svg class="lots" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#fff" stroke-width="1.5">
<path d="M-20 470 C 200 430 380 520 640 470 S 1050 380 1240 430" stroke-width="3"/><path d="M-20 520 C 200 480 380 570 640 520 S 1050 430 1240 480" stroke-width="3"/>
<path d="M60 455 L20 60 M210 446 L190 40 M360 462 L352 30 M505 474 L520 20 M650 468 L690 30 M800 440 L850 40 M950 412 L1010 50 M1090 404 L1160 70"/>
<path d="M32 180 L1185 250 M26 120 L520 150 M540 152 L1175 190"/><path d="M40 300 L512 330 M660 338 L1120 366" stroke-dasharray="10 8"/></svg>
<div class="in">
<svg viewBox="0 -100 370.45 101.5" height="76" style="align-self:flex-start;overflow:visible"><path d="${PIN}" fill-rule="evenodd" fill="#fff"/><circle cx="50" cy="-50" r="10" fill="#F6B73C"/><path d="${PLAN}" fill="#fff"/></svg>
<div><h1>Less Process<br>More Progress</h1></div>
<p>Town planning software for Queensland firms</p>
</div></body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: path.join(root, 'public/og.png') })
await browser.close()
console.log('wrote public/og.png')
