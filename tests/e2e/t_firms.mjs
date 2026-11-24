// More than one firm: each firm has its own stages, fees and templates, a new firm starts clean,
// and only the master account can add a firm or move between firms.
import { open, db, ME, calls, authState, msState, platformState, hpcFirmRow } from './harness.mjs'
import assert from 'node:assert/strict'

const title = (page) => page.locator('.h-12 .truncate').first().innerText()
const nav = async (page, id) => { await page.locator(`[data-tour=nav-${id}]`).click(); await page.waitForTimeout(500) }
const bodyText = (page) => page.evaluate(() => document.body.innerText)
const isWrite = c => !['GET', 'HEAD', 'OPTIONS'].includes(c.method)
const FIRM2 = 'firm-2'
const keep = { jobs: db.jobs, app_users: db.app_users, planner_profiles: db.planner_profiles, time_logs: db.time_logs, companies: db.companies, me: { ...ME }, ms: { ...msState } }

// ---------- 1. The first firm sees exactly what it always has
{
  const { browser, page, errors } = await open('/')
  await page.waitForSelector('[data-tour=dash-stats]')
  assert.equal(await page.getByTestId('setup-checklist').count(), 0, 'no set-up checklist for a firm that is already set up')
  await nav(page, 'jobs'); await page.locator('[data-tour=jobs-first]:visible').click(); await page.waitForSelector('[data-tour=job-tabs]')
  assert.equal((await page.locator('[data-tour=jobtab-hpc-stages]').innerText()).trim(), 'HPC Stages')
  await page.locator('[data-tour=jobtab-hpc-stages]').click(); await page.waitForTimeout(300)
  const stagesText = await page.locator('[data-tour=job-body]').innerText()
  for (const want of ['HPC STAGE PROGRESS', 'Stage 1: Preliminary Planning Investigations', 'Stage 3: Manage and Coordinate Post Lodgement Services', '0 of 3 stages complete', '$5,500']) assert.ok(stagesText.includes(want), 'HPC stages tab shows: ' + want)
  await page.getByRole('button', { name: 'Save stages' }).click(); await page.waitForTimeout(400)
  const saved = db.jobs.find(j => j.id === 'j1')
  assert.deepEqual(Object.keys(saved.hpc_stages).sort(), ['stage1', 'stage2', 'stage3']); assert.equal(saved.hpc_stages.stage2.fee, 3000)
  assert.ok(saved.job_history.some(h => h.text === 'HPC stages updated'), 'history still reads "HPC stages updated"')
  await page.getByRole('button', { name: 'Generate docs' }).click(); await page.waitForTimeout(300)
  const gen = await page.locator('.fixed.inset-0').last().innerText()
  for (const want of ['STAGE 1', 'Fee Proposal - Code Assessable', 'MISCELLANEOUS', 'Generic Letterhead (blank)', 'DA Report - Gold Coast']) assert.ok(gen.includes(want), 'generate list shows: ' + want)
  await page.getByRole('button', { name: 'Cancel' }).click()
  await nav(page, 'templates'); await page.waitForTimeout(300)
  const tpl = await bodyText(page)
  assert.ok(tpl.includes('Fee_Proposal_Code.docx') && tpl.includes('Quote Request') && tpl.includes('18 templates') && tpl.includes('15 templates'), 'templates page lists the firm\'s templates')
  assert.equal(await page.getByTestId('templates-empty').count(), 0)
  assert.equal(await page.locator('[data-tour=nav-firms]').count(), 0, 'an ordinary director has no Firms page')
  console.log('1 first firm: HPC stages, fees, history wording and 45 templates all as before', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 2. A brand new firm starts clean and makes QPlan its own
{
  Object.assign(ME, { company_id: FIRM2, company_code: '482930', companyName: 'Coastline Planning', id: 'u-new', username: 'Dana Reed' })
  db.companies = [{ id: FIRM2, name: 'Coastline Planning', company_code: '482930' }]
  db.app_users = [{ id: 'u-new', username: 'Dana Reed', role: 'director', company_id: FIRM2, is_approved: true, is_active: true }]
  db.planner_profiles = []; db.time_logs = []
  db.jobs = [{ id: 'n1', code: '2026-001', name: 'Sam Lee - 4 Reef Street, Burleigh Heads 2026-001', client_type: 'individual', client_first_name: 'Sam', client_last_name: 'Lee', address: '4 Reef Street, Burleigh Heads', council: 'City of Gold Coast', app_type: 'MCU', assessment_level: 'Code Assessable', planner: 'Dana Reed', planners: ['Dana Reed'], planner_rate: 190, budget_hours: 20, status: 'Active', complexity: 'C2', created_at: new Date().toISOString(), company_id: FIRM2, hpc_stages: null, da_stages: null, job_history: null, notes: '', share_token: 'b'.repeat(48), share_include_budget: true }]
  db.firm_settings = [hpcFirmRow(), { company_id: FIRM2, stage_label: null, stages: null, templates: null, legacy_templates: false, setup: {} }]
  Object.assign(msState, { connected: false, jobsFolder: null })
  const { browser, page, errors } = await open('/')
  const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); d.accept() })
  await page.waitForSelector('[data-testid=setup-checklist]')
  const list = await page.getByTestId('setup-checklist').innerText()
  assert.ok(list.includes('Set up Coastline Planning') && list.includes('482930'), 'checklist names the firm and its company code')
  const done = async () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-testid^=setup-]')].filter(e => e.dataset.done !== undefined).map(e => [e.dataset.testid.replace('setup-', ''), e.dataset.done === 'true'])))
  assert.deepEqual(await done(), { team: false, ms: false, folder: false, stages: false, templates: false, xero: true, jobs: true })

  // Nothing of the first firm's shows anywhere
  const seen = []
  for (const id of ['dashboard', 'jobs', 'newjob', 'docs', 'time', 'calendly', 'calendar', 'workload', 'xero', 'templates', 'planners', 'firm', 'microsoft']) {
    await nav(page, id); await page.waitForTimeout(400)
    const text = await bodyText(page); seen.push(id)
    assert.ok(!/HPC|hpcplanning/i.test(text), `the ${id} page must not mention another firm: ${(text.match(/.{0,40}HPC.{0,40}/i) || [''])[0]}`)
    const html = await page.evaluate(() => [...document.querySelectorAll('input, textarea')].map(e => e.placeholder).join(' | '))
    assert.ok(!/HPC|hpcplanning/i.test(html), `no HPC in a placeholder on ${id}: ${(html.match(/.{0,30}hpc.{0,30}/i) || [''])[0]}`)
  }
  await nav(page, 'templates')
  assert.equal(await page.getByTestId('templates-empty').count(), 1, 'a new firm has no templates')
  await nav(page, 'jobs'); await page.locator('[data-tour=jobs-first]:visible').click(); await page.waitForSelector('[data-tour=job-tabs]')
  assert.equal((await page.locator('[data-tour=jobtab-hpc-stages]').innerText()).trim(), 'Service Stages')
  for (const tab of ['overview', 'hpc-stages', 'da-stages', 'documents', 'time-budget', 'ir-notes', 'history']) {
    await page.locator(`[data-tour=jobtab-${tab}]`).click(); await page.waitForTimeout(250)
    assert.ok(!/HPC/i.test(await bodyText(page)), `job tab ${tab} must not mention HPC`)
  }
  await page.locator('[data-tour=jobtab-hpc-stages]').click(); await page.waitForTimeout(200)
  let st = await page.locator('[data-tour=job-body]').innerText()
  assert.ok(st.includes('Stage 1: Preliminary advice') && st.includes('SERVICE STAGE PROGRESS') && st.includes('0 of 3 stages complete'), 'standard stages for a new firm')
  await page.getByRole('button', { name: 'Generate docs' }).click(); await page.waitForTimeout(200)
  assert.ok((await page.locator('.fixed.inset-0').last().innerText()).includes('no templates yet'))
  await page.getByRole('button', { name: 'Cancel' }).click()
  console.log('2 new firm: clean start, no trace of the first firm on', seen.length, 'pages and 7 job tabs')

  // Firm settings: name the stages, set a fee, add a stage, save
  await nav(page, 'firm'); await page.waitForSelector('[data-testid=firm-settings]')
  assert.equal(await page.getByTestId('stage-row').count(), 3)
  assert.equal(await page.getByTestId('firm-save').isDisabled(), true, 'nothing to save yet')
  await page.getByTestId('stage-label').fill('CP')
  assert.ok((await bodyText(page)).includes('CP Stages'))
  await page.getByTestId('stage-row').nth(0).getByRole('button', { name: 'Edit' }).click()
  await page.getByPlaceholder('0', { exact: true }).fill('1,250')
  await page.getByRole('button', { name: '+ Add a stage' }).click()
  await page.getByPlaceholder('Stage 1: Preliminary advice').last().fill('Stage 4: Compliance')
  await page.locator('textarea').last().fill('Check conditions\n\nLodge compliance documents  ')
  await page.getByTestId('firm-save').click(); await page.waitForTimeout(600)
  const fs2 = db.firm_settings.find(f => f.company_id === FIRM2)
  assert.equal(fs2.stage_label, 'CP'); assert.equal(fs2.stages.length, 4); assert.equal(fs2.stages[0].defaultFee, 1250)
  assert.deepEqual(fs2.stages[3].items, ['Check conditions', 'Lodge compliance documents']); assert.equal(fs2.stages[3].label, 'Stage 4: Compliance')
  assert.equal(new Set(fs2.stages.map(s => s.id)).size, 4)
  assert.equal(db.firm_settings.find(f => f.company_id !== FIRM2).stage_label, 'HPC', 'the first firm is untouched')
  assert.ok((await bodyText(page)).includes('Saved'))
  // The job follows straight away, with the new fee as the starting point
  await nav(page, 'jobs'); await page.locator('[data-tour=jobs-first]:visible').click(); await page.waitForSelector('[data-tour=job-tabs]')
  assert.equal((await page.locator('[data-tour=jobtab-hpc-stages]').innerText()).trim(), 'CP Stages')
  await page.locator('[data-tour=jobtab-hpc-stages]').click(); await page.waitForTimeout(250)
  st = await page.locator('[data-tour=job-body]').innerText()
  assert.ok(st.includes('CP STAGE PROGRESS') && st.includes('Stage 4: Compliance') && st.includes('0 of 4 stages complete') && st.includes('$1,250'), 'job shows the firm\'s own stages: ' + st.slice(0, 200))
  await page.getByRole('button', { name: 'Save stages' }).click(); await page.waitForTimeout(400)
  assert.ok(db.jobs[0].job_history.some(h => h.text === 'CP stages updated')); assert.equal(Object.keys(db.jobs[0].hpc_stages).length, 4)
  // the shared summary carries the firm's stage names too
  const sum = await open('/summary/' + 'b'.repeat(48), { loggedIn: false })
  await sum.page.waitForTimeout(700)
  const sumText = await bodyText(sum.page)
  assert.ok(sumText.includes('Stage 4: Compliance') && !/HPC/.test(sumText), 'summary page shows this firm\'s stages')
  await sum.browser.close()
  console.log('2 firm settings: label, fee and a fourth stage saved; job tab, history and summary follow')

  // Templates: add one, it lands in the firm's own folder, then remove it
  await nav(page, 'templates')
  await page.getByRole('button', { name: '+ Add a template' }).click()
  await page.getByTestId('template-file').setInputFiles({ name: 'Fee proposal (standard).docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK fake docx') })
  assert.equal(await page.getByPlaceholder('Fee proposal').inputValue(), 'Fee proposal (standard)')
  await page.getByRole('button', { name: 'Show the tags QPlan can fill in' }).click()
  assert.ok((await bodyText(page)).includes('{site_address}'))
  await page.getByRole('button', { name: 'Add template', exact: true }).click(); await page.waitForTimeout(700)
  assert.equal(authState.templateUploads.length, 1); assert.ok(authState.templateUploads[0].startsWith(FIRM2 + '/'), 'the file is stored under the firm\'s own folder: ' + authState.templateUploads[0])
  const cat = db.firm_settings.find(f => f.company_id === FIRM2).templates
  assert.equal(cat.length, 1); assert.equal(cat[0].stage, 'Stage 1'); assert.equal(cat[0].groups[0].items[0].label, 'Fee proposal (standard)')
  assert.equal(await page.getByTestId('templates-empty').count(), 0)
  assert.ok((await bodyText(page)).includes('Fee proposal _standard_.docx'), 'shown under its own file name, without the folder or timestamp')
  await page.getByRole('button', { name: 'Remove templates' }).click(); await page.getByRole('button', { name: 'Remove', exact: true }).click(); await page.waitForTimeout(600)
  assert.equal(db.firm_settings.find(f => f.company_id === FIRM2).templates.length, 0); assert.equal(authState.templateRemovals.length, 1)
  assert.equal(await page.getByTestId('templates-empty').count(), 1)
  // checklist: stages now ticked; hide it and it stays hidden
  await nav(page, 'dashboard'); await page.waitForSelector('[data-testid=setup-checklist]')
  assert.equal((await done()).stages, true)
  await page.getByRole('button', { name: 'Hide this' }).click(); await page.waitForTimeout(500)
  assert.equal(await page.getByTestId('setup-checklist').count(), 0); assert.equal(db.firm_settings.find(f => f.company_id === FIRM2).setup.hidden, true)
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(600)
  assert.equal(await page.getByTestId('setup-checklist').count(), 0)
  console.log('2 templates per firm, checklist ticks and hides: ok', errors); assert.deepEqual(errors, [])
  await browser.close()

  // Staff at the firm: no Firm settings, no Firms, and cannot manage templates
  Object.assign(ME, { role: 'employee', id: 'u-staff', username: 'Kim Staff' })
  db.app_users.push({ id: 'u-staff', username: 'Kim Staff', role: 'employee', company_id: FIRM2, is_approved: true, is_active: true })
  const s = await open('/')
  await s.page.waitForSelector('[data-tour=dash-stats]')
  assert.equal(await s.page.locator('[data-tour=nav-firm]').count(), 0); assert.equal(await s.page.locator('[data-tour=nav-firms]').count(), 0)
  assert.equal(await s.page.getByTestId('setup-checklist').count(), 0)
  await nav(s.page, 'templates'); assert.equal(await s.page.getByTestId('templates-manage').count(), 0)
  console.log('2 staff see no firm settings', s.errors); assert.deepEqual(s.errors, [])
  await s.browser.close()
}

// ---------- 3. The master account: every firm, add a firm, open a firm
{
  Object.assign(ME, keep.me, { is_platform_admin: true }); Object.assign(msState, keep.ms)
  db.jobs = keep.jobs; db.app_users = keep.app_users; db.planner_profiles = keep.planner_profiles; db.time_logs = keep.time_logs; db.companies = keep.companies
  db.firm_settings = [hpcFirmRow()]; platformState.firms = []; platformState.switched = []
  db.app_users.find(u => u.id === 'u-quinn').is_platform_admin = true
  const { browser, page, errors } = await open('/')
  await page.waitForSelector('[data-tour=nav-firms]')
  const from = calls.length
  await nav(page, 'firms'); await page.waitForSelector('[data-testid=firm-row]')
  assert.equal(await title(page), 'Firms'); assert.equal(await page.getByTestId('firm-row').count(), 1)
  assert.ok((await page.getByTestId('firm-row').innerText()).includes('You are here'))
  await page.getByRole('button', { name: '+ Add a firm' }).click()
  await page.getByRole('button', { name: 'Create firm' }).click()
  assert.ok((await bodyText(page)).includes('Enter the firm\'s name'))
  await page.getByTestId('firm-name').fill('Coastline Planning'); await page.getByRole('button', { name: 'Create firm' }).click(); await page.waitForTimeout(500)
  assert.equal(await page.getByTestId('firm-company-code').innerText(), '482930'); assert.equal(await page.getByTestId('firm-director-code').innerText(), 'K7M2PQ9X')
  const msg = await page.locator('pre').innerText()
  assert.ok(msg.includes('Company code: 482930') && msg.includes('Director code: K7M2PQ9X') && msg.includes('Create account'), 'a ready-to-send message for the new director')
  await page.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300)
  assert.equal(await page.getByTestId('firm-row').count(), 2)
  assert.equal(db.firm_settings.length, 2, 'the new firm has its own (empty) settings')
  // open the new firm: same person, new firm, starts from its Dashboard
  await page.evaluate(() => sessionStorage.setItem('pf_test_no_seed', '1'))
  db.jobs = []; Object.assign(msState, { connected: false, jobsFolder: null })
  await page.getByTestId('firm-row').nth(1).getByRole('button', { name: 'Open this firm' }).click()
  await page.waitForSelector('[data-testid=setup-checklist]', { timeout: 8000 })
  assert.deepEqual(platformState.switched, ['firm-2'])
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('pf_session')))
  assert.equal(session.company_id, 'firm-2'); assert.equal(session.companyName, 'Coastline Planning'); assert.equal(session.username, 'Lachlan Quinn')
  assert.equal(await title(page), 'Dashboard')
  assert.ok((await page.locator('.qp-topbar-chip').innerText()).includes('Coastline Planning'), 'the top bar says which firm is open')
  assert.ok(!/HPC/.test(await bodyText(page)), 'nothing of the firm just left is on screen')
  await page.locator('.qp-topbar-chip').click(); await page.waitForSelector('[data-testid=firm-row]')
  assert.ok((await page.getByTestId('firm-row').nth(1).innerText()).includes('You are here'))
  const writes = calls.slice(from).filter(isWrite).filter(c => c.path.startsWith('/rest/v1/'))
  assert.equal(writes.length, 0, 'adding and opening a firm goes through the server function only: ' + JSON.stringify(writes.map(c => c.path)))
  console.log('3 master account: lists firms, adds one with codes and an invite, opens it', errors); assert.deepEqual(errors, [])
  await browser.close()
}
Object.assign(ME, keep.me); delete ME.is_platform_admin
console.log('FIRM TESTS PASSED')
