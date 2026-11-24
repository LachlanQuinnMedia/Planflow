// tests/e2e/run.mjs
// Runs the browser tests against the built app. Nothing here touches live data: the tests
// open the app in a headless browser and answer its database calls from a fake (harness.mjs).
//
//   npm run build && npm run test:e2e            every test
//   npm run test:e2e -- t_tour t_seasons         just these
//
// Needs Playwright's Chromium (npx playwright install chromium) and, for one check in
// t_seasons, Python 3 with Pillow.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = fileURLToPath(new URL('../..', import.meta.url))
const ALL = ['t_auth', 't_landing', 't_misc', 't_jobdetail', 't_ms365', 't_docs', 't_newjob', 't_newjob_folder', 't_newjob_docs',
  't_timer_summary', 't_edge', 't_calendar', 't_outlook', 't_dark', 't_dark2', 't_sizes', 't_select', 't_logo', 't_refresh',
  't_master', 't_firms', 't_import', 't_reliability', 't_daily', 't_digest', 't_cal2', 't_tour', 't_seasons', 't_theme_flash']
const ARGS = { t_theme_flash: ['strict'] }
const wanted = process.argv.slice(2).map(a => a.replace(/\.mjs$/, ''))
const tests = wanted.length ? wanted : ALL

if (!fs.existsSync(root + 'dist/index.html')) { console.error('Build the app first: npm run build'); process.exit(1) }
for (const d of ['out/shots', 'out/landing', 'out/newjob', 'out/dark', 'out/sizes', 'out/logo', 'out/logs', 'seasons', 'tour']) fs.mkdirSync(here + d, { recursive: true })

const run = (cmd, args, opts) => new Promise(resolve => {
  const child = spawn(cmd, args, opts)
  let out = ''
  child.stdout?.on('data', d => { out += d }); child.stderr?.on('data', d => { out += d })
  child.on('close', code => resolve({ code, out }))
})

// Serve the built app for the tests, and stop it when they finish
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: root, stdio: 'ignore' })
const stop = () => { try { server.kill() } catch { /* already gone */ } }
process.on('exit', stop)
for (let i = 0; i < 60; i++) {
  try { if ((await fetch('http://localhost:4173/')).ok) break } catch { /* not up yet */ }
  await new Promise(r => setTimeout(r, 500))
}

const failed = []
for (const t of tests) {
  const started = Date.now()
  const { code, out } = await run('node', [`${t}.mjs`, ...(ARGS[t] || [])], { cwd: here })
  fs.writeFileSync(`${here}out/logs/${t}.log`, out)
  console.log(`${code === 0 ? 'PASS' : 'FAIL'} ${t} (${Math.round((Date.now() - started) / 1000)}s)`)
  if (code !== 0) { failed.push(t); console.log(out.split('\n').slice(-25).join('\n')) }
}
stop()
console.log(failed.length ? `\n${failed.length} of ${tests.length} failed: ${failed.join(', ')}` : `\nAll ${tests.length} passed`)
process.exit(failed.length ? 1 : 0)
