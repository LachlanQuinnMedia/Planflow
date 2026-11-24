import { open, shot, calls, db, msState, calState } from './harness.mjs'
import assert from 'node:assert/strict'

const COMPANY = db.companies[0].id
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64')
const captureMicrosoft = async (page) => {
  const urls = []
  await page.route('https://login.microsoftonline.com/**', r => { urls.push(r.request().url()); r.fulfill({ status: 200, body: 'ms' }) })
  return urls
}
const goMs = async (page) => { await page.getByRole('button', { name: 'Microsoft 365', exact: true }).click(); await page.waitForSelector('text=Approve QPlan for HPC Planning') }

// 1. Personal account warning, admin approval link, calendar connect link
{
  msState.email = 'lachlanquinnmedia@outlook.com'
  calState.team = [{ username: db.app_users[0].username, email: 'a@hpc.example', needs_reconnect: false }]
  const { browser, page, errors } = await open('/')
  const urls = await captureMicrosoft(page)
  await goMs(page)
  await page.waitForSelector('text=This is a personal Microsoft account')
  await page.waitForSelector('text=Switch to our work account')
  await page.waitForSelector('text=Team calendars')
  await shot(page, 'ms365-personal')
  await page.getByRole('button', { name: "I'm the admin: approve now" }).click()
  await page.waitForTimeout(500)
  const consent = new URL(urls.at(-1))
  assert.equal(consent.pathname, '/organizations/v2.0/adminconsent')
  assert.equal(consent.searchParams.get('scope'), 'https://graph.microsoft.com/.default')
  const cst = JSON.parse(Buffer.from(consent.searchParams.get('state'), 'base64').toString())
  assert.equal(cst.provider, 'msadmin')
  assert.ok(db.companies[0].ms_consent_nonce && db.companies[0].ms_consent_nonce.length >= 32, 'a one-off code was created')
  assert.equal(cst.nonce, db.companies[0].ms_consent_nonce, 'the link carries the code')
  console.log('consent url ok')
  console.log('ERRORS 1:', errors)
  await browser.close()
}
{
  const { browser, page, errors } = await open('/')
  const urls = await captureMicrosoft(page)
  await goMs(page)
  await page.getByRole('button', { name: 'Connect my calendar' }).click()
  await page.waitForTimeout(500)
  const u = new URL(urls.at(-1))
  assert.match(u.searchParams.get('scope'), /Calendars\.ReadWrite/)
  assert.match(u.searchParams.get('scope'), /User\.Read/)
  assert.equal(JSON.parse(Buffer.from(u.searchParams.get('state'), 'base64').toString()).returnTo, 'microsoft')
  console.log('calendar url ok; ERRORS:', errors)
  await browser.close()
}

// 2. Admin returns from Microsoft with approval
{
  // (a) an admin with no QPlan login opens the link: recorded through the one-off code
  {
    const st = b64({ provider: 'msadmin', company_id: COMPANY, username: 'Lachlan Quinn', nonce: db.companies[0].ms_consent_nonce })
    const { browser, page } = await open('/', { loggedIn: false })
    await page.goto(`http://localhost:4173/?admin_consent=True&tenant=tenant-123&state=${encodeURIComponent(st)}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid=notices]')
    const said = await page.getByTestId('notices').innerText() // a message on screen, not a browser pop-up
    assert.match(said, /approved for the whole firm/)
    assert.equal(db.companies[0].ms_tenant_id, 'tenant-123')
    console.log('admin without a login: recorded')
    await browser.close()
  }
  // (b) a made-up code is refused
  {
    db.companies[0].ms_tenant_id = null; db.companies[0].ms_admin_consent_at = null
    const st = b64({ provider: 'msadmin', company_id: COMPANY, username: 'x', nonce: 'made-up-code-0123456789' })
    const { browser, page } = await open('/', { loggedIn: false })
    await page.goto(`http://localhost:4173/?admin_consent=True&tenant=evil&state=${encodeURIComponent(st)}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid=notices]')
    const said = await page.getByTestId('notices').innerText() // a message on screen, not a browser pop-up
    assert.match(said, /could not record it/)
    assert.equal(db.companies[0].ms_tenant_id, null)
    console.log('made-up code: refused')
    await browser.close()
  }
  const st = b64({ provider: 'msadmin', company_id: COMPANY, username: 'Lachlan Quinn', nonce: db.companies[0].ms_consent_nonce })
  const { browser, page, errors } = await open(`/?admin_consent=True&tenant=tenant-123&state=${encodeURIComponent(st)}`)
  await page.waitForSelector('text=QPlan is approved for the whole firm')
  assert.equal(db.companies[0].ms_tenant_id, 'tenant-123')
  assert.ok(db.companies[0].ms_admin_consent_at)
  await page.waitForSelector('text=Approved')
  await shot(page, 'ms365-approved')
  console.log('ERRORS 2:', errors)
  await browser.close()
}

// 3. Admin approval refused (not an admin)
{
  db.companies[0].ms_admin_consent_at = null
  const st = b64({ provider: 'msadmin', company_id: COMPANY })
  const { browser, page, errors } = await open(`/?error=access_denied&error_description=${encodeURIComponent('AADSTS90094: admin permission required')}&state=${encodeURIComponent(st)}`)
  await page.waitForSelector('text=Microsoft 365 Global Administrator')
  console.log('ERRORS 3:', errors)
  await browser.close()
}

// 4. Return from calendar sign-in
{
  msState.email = 'office@hpc.example'
  const st = b64({ provider: 'outlook', company_id: COMPANY, username: 'x', returnTo: 'microsoft' })
  const { browser, page, errors } = await open(`/?code=abc123&state=${encodeURIComponent(st)}`)
  await page.waitForSelector('text=Your calendar is connected')
  await page.waitForSelector('text=quinn@hpc.example')
  assert.equal(await page.locator('text=This is a personal Microsoft account').count(), 0)
  await shot(page, 'ms365-calendar-connected')
  console.log('ERRORS 4:', errors)
  await browser.close()
}

// 5. Calendar needs reconnecting, phone width
{
  calState.me = { connected: true, email: 'quinn@hpc.example', needs_reconnect: true }
  const { browser, page, errors } = await open('/', { viewport: { width: 390, height: 844 } })
  await page.getByLabel('Open menu').click()
  await goMs(page)
  await page.waitForSelector('text=Reconnect my calendar')
  await shot(page, 'ms365-phone', { fullPage: true })
  console.log('ERRORS 5:', errors)
  await browser.close()
}
console.log('microsoft 365 scenarios passed')
