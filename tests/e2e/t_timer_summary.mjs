import { open, shot, calls, db } from './harness.mjs'
import assert from 'node:assert/strict'

// ---------- Timer: switch prompt
{
  const { browser, page, errors } = await open('/')
  await page.locator('select').first().selectOption('j1')
  await page.getByPlaceholder('What are you working on?').fill('IR response')
  await page.getByTitle('Start timer').click()
  await page.waitForSelector('text=● 2026-003')
  await page.waitForTimeout(11500) // entries under 10 seconds are not saved
  await page.getByRole('button', { name: 'Jobs' }).first().click()
  await page.locator('text=Brad Miller - 25 Charlotte Street >> visible=true').first().click()
  await page.waitForSelector('text=Switch the timer to this job?')
  await shot(page, 'timer-switch-prompt')
  const input = page.getByPlaceholder('e.g. IR response')
  assert.equal(await input.inputValue(), 'IR response')
  await input.fill('Pre-lodgement review')
  await page.getByRole('button', { name: 'Switch to 2026-006' }).click()
  await page.waitForSelector('text=● 2026-006')
  await page.waitForTimeout(300)
  const log = db.time_logs.find(l => l.job_id === 'j1' && l.task === 'IR response')
  console.log('SAVED LOG:', JSON.stringify({ job: log?.job_code, task: log?.task, secs: log?.duration_seconds, planner: log?.planner }))
  assert.ok(log && log.duration_seconds >= 10 && log.planner === 'Lachlan Quinn')
  const running = db.active_timers[db.active_timers.length - 1]
  console.log('RUNNING:', JSON.stringify({ job: running.job_code, task: running.task }))
  assert.equal(running.job_code, '2026-006'); assert.equal(running.task, 'Pre-lodgement review')
  await shot(page, 'timer-after-switch')

  // Keep current: open another job, choose keep, no second prompt for that job
  await page.getByRole('button', { name: '← Back' }).click()
  await page.locator('text=Josh Richards - 18 Parma Court >> visible=true').first().click()
  await page.waitForSelector('text=Switch the timer to this job?')
  await page.getByRole('button', { name: 'Keep current timer' }).click()
  await page.getByRole('button', { name: '← Back' }).click()
  await page.locator('text=Josh Richards - 18 Parma Court >> visible=true').first().click()
  await page.waitForSelector('text=Client details')
  await page.waitForTimeout(400)
  assert.equal(await page.locator('text=Switch the timer to this job?').count(), 0)
  console.log('TIMER ERRORS:', errors)
  await browser.close()
}

// ---------- Summary page (no login)
{
  db.jobs[2].da_stages = { application: { status: 'complete', startDate: '2026-11-09', endDate: '2026-11-16' }, referral: { status: 'active', startDate: '2026-11-17', endDate: '2026-12-01' }, information: { status: 'pending' }, notification: { status: 'pending' }, decision: { status: 'pending' } }
  db.jobs[2].hpc_stages = { stage1: { status: 'complete', fee: 500, checkedItems: [], completedDate: '2026-11-08' }, stage2: { status: 'active', fee: 3000, checkedItems: ['a', 'b'] }, stage3: { status: 'pending', fee: 2000, checkedItems: [] } }
  db.jobs[2].budget_hours = 30
  const { browser, page, errors } = await open('/summary/' + 'a'.repeat(48), { loggedIn: false })
  await page.waitForSelector('text=KP Development Group - 102 Rumrunner Street, Mermaid Waters 2026-005')
  await shot(page, 'summary-page', { fullPage: true })
  assert.equal(await page.locator('text=Log out').count(), 0)
  assert.ok(await page.locator('text=Contact').count() > 0)
  console.log('SUMMARY ERRORS:', errors)
  await browser.close()
  const miss = await open('/summary/' + 'b'.repeat(48), { loggedIn: false })
  await miss.page.waitForSelector('text=This summary link is not active')
  await shot(miss.page, 'summary-missing')
  await miss.browser.close()
  const phone = await open('/summary/' + 'a'.repeat(48), { loggedIn: false, viewport: { width: 390, height: 844 } })
  await phone.page.waitForSelector('text=Project team')
  await shot(phone.page, 'summary-phone', { fullPage: true })
  await phone.browser.close()
}
console.log('timer and summary scenarios passed')
