// src/site/Home.jsx
// The home page. Everything said here is something QPlan does today.
import { LotLines, Section, Ledger, Steps, Faq } from './Layout'
import DayGrid from './DayGrid'
import DemoForm from './DemoForm'
import { HOME_FAQ } from './faqData'

const WHAT = [
  ['Every job in one place', 'Client, site, lot, council, zone, application type and planner, entered once and reused everywhere. Search any job from any page.', '/features'],
  ['The statutory clock', 'Start a DA stage and QPlan works out its end date in business days. Stop the clock and resume it. Overdue shows red, due soon shows amber.', '/da-tracking'],
  ['Your stages and your fees', 'Set up your firm\'s own service stages once, with the usual fee and scope of works for each. Every new job starts from them.', '/features'],
  ['Documents from templates', 'Fee proposals, consent forms, letters and reports filled in from the job and saved into the job folder in your Microsoft 365.', '/documents-and-templates'],
  ['Time against budget', 'A timer that follows the job you are working on. See hours logged against the budget, then send a draft invoice to Xero.', '/time-and-invoicing'],
  ['A summary link for clients', 'Send the client one read-only link that shows where their job is up to. They do not need a login.', '/features'],
]

export default function Home() {
  return (
    <>
      <section className="qs-green qs-on-green">
        <LotLines />
        <div className="qs-wrap py-12 sm:py-16 lg:py-20 grid gap-10 lg:gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] items-center">
          <div>
            <h1>
              <span className="block qs-lead font-semibold text-white/90" style={{ fontStretch: '100%', letterSpacing: 0 }}>Town planning software for Queensland firms</span>
              <span className="block qs-display mt-4">Less Process<br />More Progress</span>
            </h1>
            <p className="qs-lead mt-6 qs-measure text-white/90">
              QPlan runs a planning practice from fee proposal to final invoice. Every job, deadline and document in one place, with statutory periods counted in business days for you.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <a href="/contact" className="qs-btn qs-btn-gold">Book a demo</a>
              <a href="/features" className="qs-btn qs-btn-line">See the features</a>
            </div>
          </div>
          <div>
            <DayGrid start="2026-12-10" days={15} publicNotice label="Public notification: 15 business days" />
            <p className="qs-small mt-3 text-white/80">
              QPlan skipped the weekends and the Christmas break for public notification, 20 December to 5 January. <a href="/business-day-calculator" className="qs-link">Try your own dates</a>
            </p>
          </div>
        </div>
      </section>

      <section className="border-b" style={{ borderColor: 'var(--qs-line)' }}>
        <div className="qs-wrap py-5 qs-small qs-soft">
          Built in Queensland around the Planning Act 2016. Works with Microsoft 365, OneDrive, SharePoint, Outlook and Xero.
        </div>
      </section>

      <Section title="What a planning firm gets" intro="QPlan is practice management software made for town planners, not a general job tracker bent to fit. These are the parts firms use every day.">
        <Ledger rows={WHAT} />
      </Section>

      <Section tone="mist" title="Deadlines counted the way the Planning Act counts them"
        intro="A period of 15 business days is not three weeks. Weekends, Queensland public holidays, the local show day and the Christmas period all fall out. QPlan does that count for every stage of every job.">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="qs-prose qs-measure">
            <p>The dashboard lists what is due this week and in the next 30 days across the whole firm. A job that has run over shows red. A job that is due soon shows amber.</p>
            <p>Public notification uses the longer break the Act sets for it, 20 December to 5 January. Every other period skips 26 December to 1 January.</p>
            <p><a href="/da-tracking">How DA tracking works in QPlan</a></p>
          </div>
          <dl className="qs-ledger">
            <div><dt><a href="/business-day-calculator">Business day calculator</a></dt><dd>Free to use. Add business days to a date, or count them between two dates.</dd></div>
            <div><dt><a href="/da-timeframes-queensland">Queensland DA timeframes</a></dt><dd>The Development Assessment Rules periods in one plain-English table.</dd></div>
          </dl>
        </div>
      </Section>

      <Section title="Starting fresh, or bringing thousands of jobs"
        intro="Most firms start QPlan with their next job. If you want your history too, QPlan reads it from your existing job folders or a spreadsheet export. Nobody retypes anything.">
        <div className="grid gap-8 lg:grid-cols-2 items-start">
          <Steps steps={[
            ['Point QPlan at your job folders', 'It reads the folder names in your Microsoft 365 and works out the job number, client and address from each.'],
            ['Check the preview', 'You see every job before anything is saved. Duplicates are skipped.'],
            ['Import, and undo if you need to', 'An import can be reversed as one. Old completed jobs stay out of everyday lists and are found by search.'],
          ]} />
          <div className="qs-prose qs-measure">
            <p>Have a spreadsheet instead? Export it as Excel or CSV. QPlan matches the columns for you and shows the same preview.</p>
            <p><a href="/import-old-jobs">More about bringing old jobs across</a></p>
          </div>
        </div>
      </Section>

      <Section tone="forest" title="Up and running in an afternoon">
        <Steps steps={[
          ['We set up your firm', 'You get a company code for your team and a director code for you.'],
          ['Connect what you already use', 'Approve Microsoft 365 once for the whole firm, choose where job folders go, and connect Xero.'],
          ['Your team joins', 'Each person creates their own account with the company code. A director approves them.'],
          ['A built-in tour shows everyone around', 'About five minutes, with an example job, so day one does not need a training session.'],
        ]} />
      </Section>

      <Section title="Common questions">
        <Faq items={HOME_FAQ} />
        <p className="mt-6"><a href="/faq" className="qs-link">All questions and answers</a></p>
      </Section>

      <section id="demo" className="qs-mist qs-band scroll-mt-20">
        <div className="qs-wrap grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <h2 className="qs-h2">See QPlan with your own jobs.</h2>
            <p className="mt-4 qs-soft qs-measure">Tell us a little about your firm. We will set up a time, walk you through it, and get your team in.</p>
            <p className="mt-6 qs-small qs-soft">Already use QPlan? <a href="/login" className="qs-link">Log in</a></p>
          </div>
          <DemoForm />
        </div>
      </section>
    </>
  )
}
