// The Monday email: off by default, a director switches it on, sees what it would say, and can send a test.
import { open, db, ME, digestState } from './harness.mjs'
import assert from 'node:assert/strict'
const COMPANY = ME.company_id
const mine = () => db.firm_settings.find(f => f.company_id === COMPANY)

{
  digestState.items = [
    { code: '2026-003', job: 'Josh Richards - 18 Parma Court', planner: 'Todd Grubb', what: 'IR response due', date: '2026-11-23', when: 'Mon 23 Nov', days: -1 },
    { code: '2026-006', job: 'Brad Miller - 25 Charlotte Street', planner: 'Chris Lewis', what: 'Public notification ends', date: '2026-11-27', when: 'Fri 27 Nov', days: 3 },
  ]
  const { browser, page, errors } = await open('/')
  await page.waitForSelector('[data-tour=dash-stats]'); await page.locator('[data-tour=nav-firm]').click(); await page.waitForSelector('[data-testid=digest-item]')
  const card = page.getByTestId('digest-card')
  assert.equal(await page.getByTestId('digest-switch').isChecked(), false, 'off until a director switches it on')
  const text = await card.innerText()
  assert.ok(text.includes('murray@hpc.example, lq@example.com'), 'says who gets it')
  assert.ok(text.includes('would list 2 dates') && text.includes('Mon 23 Nov') && text.includes('IR response due') && text.includes('2026-006'), 'shows this week: ' + text.slice(0, 200))
  assert.ok(text.includes('Not delivering to firms yet'), 'is honest that the sending address is not set up')
  await page.getByTestId('digest-switch').check(); await page.waitForTimeout(500)
  assert.equal(mine().setup.weekly_email, true); assert.equal(mine().setup.hidden, true, 'other settings are kept'); assert.equal(mine().stage_label, 'HPC')
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('[data-testid=digest-item]')
  assert.equal(await page.getByTestId('digest-switch').isChecked(), true, 'the choice sticks')
  // a test email: says where it went, or why it was not sent
  await card.getByRole('button', { name: 'Send me a test now' }).click(); await page.waitForSelector('[data-testid=notices]')
  assert.ok((await page.getByTestId('notices').innerText()).includes('Sent to lq@example.com'))
  await page.getByTestId('notices').getByRole('button', { name: 'Close' }).click()
  digestState.testFails = 'You can only send testing emails to your own email address.'
  await card.getByRole('button', { name: 'Send me a test now' }).click(); await page.waitForSelector('[data-testid=notices]')
  assert.ok((await page.getByTestId('notices').innerText()).includes('was not sent to lq@example.com: You can only send testing emails'))
  await page.getByTestId('digest-switch').uncheck(); await page.waitForTimeout(400)
  assert.equal(mine().setup.weekly_email, false)
  console.log('Monday email: off by default, switch saved, this week shown, test send reports what happened', errors); assert.deepEqual(errors, [])
  await browser.close()
  digestState.testFails = ''; digestState.items = []
}
// a week with nothing due, and a real sending address
{
  digestState.from = 'QPlan <notices@qplan.net.au>'
  const { browser, page } = await open('/')
  await page.waitForSelector('[data-tour=dash-stats]'); await page.locator('[data-tour=nav-firm]').click(); await page.waitForSelector('[data-testid=digest-card]'); await page.waitForTimeout(400)
  const text = await page.getByTestId('digest-card').innerText()
  assert.ok(text.includes('would list 0 dates.') && !text.includes('Not delivering'))
  await browser.close(); digestState.from = 'QPlan <onboarding@resend.dev>'
}
console.log('DIGEST TESTS PASSED')
