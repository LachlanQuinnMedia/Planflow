// Less typing on New Job: pick a past client, tick referral agencies, and start on the right council.
import { open, calls, db } from './harness.mjs'
import assert from 'node:assert/strict'
import { REFERRAL_AGENCIES, splitReferrals, joinReferrals, pastClients, matchClients, usualCouncil } from '../../src/newJobHelp.js'

// ---------- 0. The helpers
assert.deepEqual(splitReferrals('SARA, energex; TMR rail corridor'), { ticked: ['SARA', 'Energex'], other: 'TMR rail corridor' })
assert.deepEqual(splitReferrals(''), { ticked: [], other: '' })
assert.equal(joinReferrals(['Energex', 'SARA'], ' Airport ,  '), 'SARA, Energex, Airport', 'ticks keep the list order, then anything typed')
assert.equal(joinReferrals(['SARA'], 'energex'), 'SARA, Energex', 'typing an agency that has a tick box ticks it, with no repeat')
assert.equal(joinReferrals([], ''), '')
for (const a of REFERRAL_AGENCIES) assert.equal(joinReferrals(splitReferrals(a).ticked, ''), a)
{
  const rows = [
    { client_type: 'company', client_company: 'KP Development Group', client_first_name: 'Kailem', client_last_name: 'Perkins', client_email: '', client_phone: '', council: 'City of Gold Coast' },
    { client_type: 'company', client_company: 'kp development  group', client_first_name: 'Old', client_last_name: 'Contact', client_email: 'kailem@example.com', client_phone: '0400 000 003', council: 'City of Gold Coast' },
    { client_type: 'individual', client_company: null, client_first_name: 'Josh', client_last_name: 'Richards', client_email: 'josh@example.com', client_phone: null, council: 'Brisbane City Council' },
    { client_type: 'individual', client_company: null, client_first_name: '', client_last_name: '', council: '' },
  ]
  const list = pastClients(rows)
  assert.equal(list.length, 2, 'a company with two jobs is one client, and a job with no client is skipped')
  const kp = list.find(c => c.type === 'company')
  assert.deepEqual([kp.company, kp.firstName, kp.email, kp.phone, kp.jobs], ['KP Development Group', 'Kailem', 'kailem@example.com', '0400 000 003', 2], 'newest job wins, an older one fills the gaps')
  assert.deepEqual(matchClients(list, 'kp').map(c => c.label), ['KP Development Group'])
  assert.deepEqual(matchClients(list, 'rich jo').map(c => c.label), ['Josh Richards'], 'any words, any order')
  assert.deepEqual(matchClients(list, 'kailem@').map(c => c.label), ['KP Development Group'], 'email finds them too')
  assert.deepEqual(matchClients(list, ''), [])
  assert.equal(usualCouncil(rows), 'City of Gold Coast'); assert.equal(usualCouncil([]), '')
}

const openNewJob = async (opts = {}) => {
  const ctx = await open('/', opts)
  await ctx.page.getByRole('button', { name: '+ New Job', exact: true }).click()
  await ctx.page.waitForSelector('text=Create new job')
  await ctx.page.waitForTimeout(400)
  return ctx
}
const lastInsert = (from) => calls.slice(from).find(c => c.method === 'POST' && c.path.startsWith('/rest/v1/jobs'))

// ---------- 1. A returning company client, two referral agencies, the firm's usual council: almost no typing
{
  const { browser, page, errors } = await openNewJob()
  assert.equal(await page.getByTestId('council-select').inputValue(), 'City of Gold Coast', 'starts on the council most of the firm\'s jobs are in')
  // find the client by typing two letters
  await page.getByLabel('Worked with this client before?').fill('kp')
  const option = page.getByTestId('client-option')
  assert.equal(await option.count(), 1); assert.ok((await option.innerText()).includes('KP Development Group')); assert.ok((await option.innerText()).includes('Kailem Perkins'))
  await page.keyboard.press('Enter')
  assert.equal(await page.locator('#client-type').inputValue(), 'company', 'the form switches to a company client')
  assert.equal(await page.getByPlaceholder('Company name').inputValue(), 'KP Development Group')
  assert.equal(await page.getByPlaceholder('First name').inputValue(), 'Kailem'); assert.equal(await page.getByPlaceholder('Last name').inputValue(), 'Perkins')
  assert.equal(await page.getByPlaceholder('client@email.com.au').inputValue(), 'kailem@example.com'); assert.equal(await page.getByPlaceholder('04XX XXX XXX').inputValue(), '0400 000 003')
  assert.equal(await page.getByLabel('Worked with this client before?').inputValue(), '', 'the search box clears, ready for the next thing')
  // referral agencies: two clicks and one typed
  const refs = page.getByTestId('referrals')
  assert.deepEqual(await refs.getByRole('checkbox').allInnerTexts(), REFERRAL_AGENCIES)
  await refs.getByRole('checkbox', { name: 'Energex' }).click(); await refs.getByRole('checkbox', { name: 'SARA' }).click()
  await refs.getByLabel('Other referral agencies').fill('Airport')
  assert.equal(await refs.getByRole('checkbox', { name: 'SARA' }).getAttribute('aria-checked'), 'true')
  await page.getByPlaceholder('12 Marine Parade, Southport QLD 4215').fill('5 Pier Avenue, Southport QLD 4215')
  await page.getByTestId('council-select').selectOption('Brisbane City Council')
  const from = calls.length
  await page.getByRole('button', { name: /^Create job/ }).click()
  await page.waitForSelector('text=Job created ✓')
  const row = lastInsert(from).body
  assert.deepEqual([row.client_type, row.client_company, row.client_first_name, row.client_last_name, row.client_email, row.client_phone], ['company', 'KP Development Group', 'Kailem', 'Perkins', 'kailem@example.com', '0400 000 003'])
  assert.equal(row.referral_agencies, 'SARA, Energex, Airport'); assert.equal(row.council, 'Brisbane City Council')
  // next time, this person starts on the council they used last, not the firm's most common one
  assert.equal(await page.evaluate(() => localStorage.getItem('qplan_last_council_u-quinn')), 'Brisbane City Council')
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '+ New Job', exact: true }).click(); await page.waitForSelector('text=Create new job'); await page.waitForTimeout(400)
  assert.equal(await page.getByTestId('council-select').inputValue(), 'Brisbane City Council')
  console.log('1 returning client picked, agencies ticked, council remembered', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 2. An individual client by mouse, and a name nobody has
{
  const { browser, page, errors } = await openNewJob()
  await page.getByLabel('Worked with this client before?').fill('zzz')
  await page.waitForSelector('text=No past client with that name.')
  await page.getByLabel('Worked with this client before?').fill('josh')
  await page.getByTestId('client-option').first().click()
  assert.equal(await page.locator('#client-type').inputValue(), 'individual')
  assert.equal(await page.getByPlaceholder('First name').inputValue(), 'Josh'); assert.equal(await page.getByPlaceholder('client@email.com.au').inputValue(), 'josh@example.com')
  // picking a client is a head start, not a lock: the details can still be changed
  await page.getByPlaceholder('04XX XXX XXX').fill('0411 222 333')
  assert.equal(await page.getByPlaceholder('04XX XXX XXX').inputValue(), '0411 222 333')
  console.log('2 individual client picked by mouse, details still editable', errors); assert.deepEqual(errors, [])
  await browser.close()
}

// ---------- 3. A brand new firm: no past clients to offer, and the council has to be chosen
{
  const keep = db.jobs; db.jobs = []
  const { browser, page, errors } = await openNewJob()
  assert.equal(await page.getByTestId('client-picker').count(), 0, 'no past-client box until there are past clients')
  assert.equal(await page.getByTestId('council-select').inputValue(), '', 'no council is assumed')
  assert.equal(await page.getByTestId('council-select').locator('option').first().innerText(), 'Choose a council...')
  await page.getByPlaceholder('First name').fill('Ana'); await page.getByPlaceholder('12 Marine Parade, Southport QLD 4215').fill('1 First Street, Cairns QLD 4870')
  const from = calls.length
  await page.getByRole('button', { name: /^Create job/ }).click()
  await page.waitForSelector('text=Please choose the council.')
  assert.equal(lastInsert(from), undefined, 'nothing is saved without a council')
  await page.getByTestId('council-select').selectOption('Cairns Regional Council')
  await page.getByRole('button', { name: /^Create job/ }).click()
  await page.waitForSelector('text=Job created ✓')
  assert.equal(lastInsert(from).body.council, 'Cairns Regional Council'); assert.equal(lastInsert(from).body.referral_agencies, '')
  console.log('3 new firm: council must be chosen, no client box', errors); assert.deepEqual(errors, [])
  db.jobs = keep
  await browser.close()
}

// ---------- 4. Editing a job: what was typed before shows as ticks plus the rest
{
  db.jobs[0].referral_agencies = 'sara, DTMR (state road)'
  const { browser, page, errors } = await open('/')
  await page.evaluate(() => document.querySelector('[data-tour=nav-jobs]').click())
  await page.locator(`.qp-row:visible:has-text("${db.jobs[0].code}")`).first().click()
  await page.getByRole('button', { name: 'Edit job' }).click()
  const refs = page.getByTestId('referrals')
  await refs.waitFor()
  assert.equal(await refs.getByRole('checkbox', { name: 'SARA' }).getAttribute('aria-checked'), 'true')
  assert.equal(await refs.getByLabel('Other referral agencies').inputValue(), 'DTMR (state road)')
  await refs.getByRole('checkbox', { name: 'SARA' }).click(); await refs.getByRole('checkbox', { name: 'Powerlink' }).click()
  const from = calls.length
  await page.getByRole('button', { name: /^Save/ }).first().click(); await page.waitForTimeout(600)
  const patch = calls.slice(from).find(c => c.method === 'PATCH' && c.path.startsWith('/rest/v1/jobs') && c.body && 'referral_agencies' in c.body)
  assert.equal(patch.body.referral_agencies, 'Powerlink, DTMR (state road)')
  console.log('4 edit job: old referral text kept, ticks change it', errors); assert.deepEqual(errors, [])
  await browser.close()
}
console.log('t_newjob_fast: all passed')
