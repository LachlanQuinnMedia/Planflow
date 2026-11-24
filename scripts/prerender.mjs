// scripts/prerender.mjs
// Runs after the build. Writes each page of the public website out as finished HTML:
//   dist/index.html                 the home page
//   dist/<page>/index.html          every other page
//   dist/app.html                   the app, for every other address (login, job summaries)
//   dist/sitemap.xml                the list search engines read
// Each file has its own title, description and canonical address, and the page's words are
// already in it, so search engines do not have to run scripts to read the site.
//
// The app still works from the same files: index.html decides, before anything is drawn,
// whether the address is a website page or the app (see the script at the top of index.html).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const dist = path.join(root, 'dist')
const server = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href)
const { PAGES, headFor, sitemap, renderPage } = server

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
for (const mark of ['<!--qplan:head-->', '<!--/qplan:head-->', '<!--qplan:title-->', '<!--/qplan:title-->', '<div id="root"></div>']) {
  if (!template.includes(mark)) throw new Error(`prerender: index.html is missing ${mark}`)
}

// The heading typeface, fetched early so headings do not change shape as the page loads
const font = fs.readdirSync(path.join(dist, 'assets')).find(f => /^archivo-latin-wdth-normal.*\.woff2$/.test(f))
const preload = font ? `\n    <link rel="preload" href="/assets/${font}" as="font" type="font/woff2" crossorigin />` : ''

// The app's own page, with nothing of the website in it. Every address that is not a website
// page is sent here (vercel.json): /login, a client's job summary, anything unknown.
fs.writeFileSync(path.join(dist, 'app.html'), template.replace(/<!--\/?qplan:(head|title)-->/g, ''))

let count = 0
for (const page of PAGES) {
  const body = renderPage(page.path)
  const html = template
    .replace(/<!--qplan:title-->[\s\S]*?<!--\/qplan:title-->/, '')
    .replace(/<!--qplan:head-->[\s\S]*?<!--\/qplan:head-->/, headFor(page) + preload)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
  const file = page.path === '/' ? path.join(dist, 'index.html') : path.join(dist, page.path.slice(1), 'index.html')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, html)
  count++
}

const today = new Date().toISOString().slice(0, 10)
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap(today))
fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true })
console.log(`prerender: wrote ${count} pages and sitemap.xml`)
