// src/site/Resources.jsx
// The free calculator, the DA timeframes guide, the questions page and the contact page.
import { PageHero, Section, Ledger, Faq, DemoBand } from './Layout'
import Calculator from './Calculator'
import DemoForm from './DemoForm'
import { ALL_FAQ } from './faqData'
import { HOLIDAY_DATA_START, HOLIDAY_DATA_END } from '../businessDays'

const GUIDANCE = 'https://www.planning.qld.gov.au/__data/assets/pdf_file/0014/102272/da-rules-guidance-version3.pdf'
const ACT = 'https://www.legislation.qld.gov.au/view/whole/html/inforce/current/act-2016-025'
const HOLIDAYS = 'https://www.qld.gov.au/recreation/travel/holidays/public'

export function CalculatorPage() {
  return (
    <>
      <PageHero title="Queensland business day calculator"
        lead="Work out when a development assessment period ends. Counts business days the way the Planning Act 2016 does: no weekends, no Queensland public holidays, no Christmas period." />
      <Section>
        <Calculator />
      </Section>
      <Section tone="mist" title="How the days are counted">
        <Ledger rows={[
          ['The start day is not counted', 'A period of 10 business days after a day starts counting on the next business day.'],
          ['Weekends and public holidays', `Saturdays, Sundays and Queensland public holidays are skipped. Holiday dates are loaded for ${HOLIDAY_DATA_START.slice(0, 4)} to ${HOLIDAY_DATA_END.slice(0, 4)}.`],
          ['Show holidays', 'Choose a council to skip its show holiday. Only councils where one show day covers the whole council area are listed.'],
          ['Christmas', 'Under the Planning Act 2016 a business day does not include a day between 26 December and 1 January. For public notification the break is longer: 20 December to 5 January.'],
          ['Christmas Eve', '24 December is a public holiday only from 6pm, so it is counted as a business day.'],
        ]} />
        <p className="mt-6 qs-small qs-soft qs-measure">
          This calculator is a guide. It does not know about periods that have been stopped or extended by agreement, or special extension notices. Check important dates against the <a className="qs-link" href={ACT} rel="noopener">Planning Act 2016</a> and the <a className="qs-link" href={HOLIDAYS} rel="noopener">Queensland public holiday list</a>.
        </p>
      </Section>
      <Section title="The same count, on every job"
        intro="QPlan does this for each stage of each development application, shows what is due across the firm, and keeps the history.">
        <p><a href="/da-tracking" className="qs-link">How DA tracking works in QPlan</a></p>
      </Section>
      <DemoBand />
    </>
  )
}

// [stage, who, period, what starts it or what it is for]
const PERIODS = [
  ['Confirmation period', 'Assessment manager', '10 business days', 'Starts when the application is lodged. Ends early if a confirmation notice or an action notice is given.'],
  ['Responding to an action notice', 'Applicant', '20 business days', 'To make the application properly made. Can be extended by agreement.'],
  ['Referring the application', 'Applicant', '10 business days', 'To give the application to each referral agency. Can be extended by agreement.'],
  ['Referral confirmation period', 'Referral agency', '5 business days', 'For the agency to confirm the referral is properly made.'],
  ['Referral agency assessment', 'Referral agency', '25 business days', 'The default period. Some agencies have a different period set in schedule 2 of the Rules.'],
  ['Information request', 'Assessment manager or referral agency', '10 business days', 'To make an information request. This time counts toward the assessment or decision period.'],
  ['Responding to an information request', 'Applicant', '3 months', 'Calendar months, not business days. Can be extended by agreement.'],
  ['Starting public notification', 'Applicant', '20 business days', 'Counted from the confirmation notice, or from a later point where there are referrals or an information request.'],
  ['Public notification period', 'Applicant', 'At least 15 business days', '30 business days for a variation request. Some application types have a longer prescribed period.'],
  ['Notice of compliance', 'Applicant', '10 business days', 'After the notification period ends. The application lapses if it is not given.'],
  ['Decision period', 'Assessment manager', '35 business days', 'Includes the time taken for an information request. Can be extended by agreement.'],
  ['Decision notice', 'Assessment manager', '5 business days', 'After the application is decided.'],
]

export function Timeframes() {
  return (
    <>
      <PageHero title="Queensland DA timeframes in plain English"
        lead="The periods that run a development application under the Development Assessment Rules, in one table. For planners who want the numbers without opening the Rules." />
      <Section title="The main periods"
        intro="These apply to most development applications under chapter 1 of the Development Assessment Rules. Days are business days unless the table says otherwise.">
        <div className="qs-table-wrap">
          <table className="qs-table" data-testid="periods">
            <thead><tr><th scope="col">Step</th><th scope="col">Who</th><th scope="col">Period</th><th scope="col">Notes</th></tr></thead>
            <tbody>
              {PERIODS.map(([step, who, period, notes]) => (
                <tr key={step}><th scope="row">{step}</th><td>{who}</td><td className="qs-num">{period}</td><td className="qs-soft">{notes}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 qs-small qs-soft qs-measure">
          Checked against the Queensland Government's <a className="qs-link" href={GUIDANCE} rel="noopener">guidance for the Development Assessment Rules</a> dated July 2025. This page is a summary, not legal advice. The Rules, the <a className="qs-link" href={ACT} rel="noopener">Planning Act 2016</a> and any agreement between the parties decide the actual dates.
        </p>
      </Section>
      <Section tone="mist" title="Things that change the count">
        <Ledger rows={[
          ['What a business day is', 'Not a Saturday, Sunday or public holiday, and not a day between 26 December and 1 January.'],
          ['Public notification over Christmas', 'For public notification, business days do not include 20 December to 5 January.'],
          ['Stopping the clock', 'An applicant can stop the current period by giving notice. There is one pool of 130 business days for each application, and it cannot be extended.'],
          ['Extensions by agreement', 'Most periods can be extended if the parties agree before the period ends.'],
          ['If an application lapses', 'An application can lapse if it is not referred, not publicly notified, or the notice of compliance is not given. It can be revived within 20 business days.'],
        ]} />
      </Section>
      <Section title="Work the dates out">
        <Ledger rows={[
          ['Business day calculator', 'Add any of these periods to a start date, with public holidays and the Christmas break skipped.', '/business-day-calculator'],
          ['DA tracking in QPlan', 'QPlan runs the clock on every stage of every job and shows what is due across the firm.', '/da-tracking'],
        ]} />
      </Section>
      <DemoBand title="Let the software keep the count." />
    </>
  )
}

export function FaqPage() {
  return (
    <>
      <PageHero title="Questions and answers" lead="What firms ask before they start using QPlan." />
      <Section>
        <Faq items={ALL_FAQ} />
      </Section>
      <DemoBand title="Still have a question?" text="Book a demo and ask us anything." />
    </>
  )
}

export function Contact() {
  return (
    <>
      <PageHero title="Book a demo" lead="See QPlan with your own jobs. Tell us a little about your firm and we will set up a time." />
      <Section>
        <div className="grid gap-10 lg:grid-cols-2 items-start">
          <DemoForm />
          <div>
            <h2 className="qs-h3">What happens next</h2>
            <ol className="qs-steps mt-4">
              <li><div><div className="qs-h3 qs-wide">We get in touch</div><p className="mt-1 qs-soft">To find a time that suits you.</p></div></li>
              <li><div><div className="qs-h3 qs-wide">We walk you through QPlan</div><p className="mt-1 qs-soft">Using the kind of jobs your firm does.</p></div></li>
              <li><div><div className="qs-h3 qs-wide">We set up your firm</div><p className="mt-1 qs-soft">You get your codes and your team can sign in.</p></div></li>
            </ol>
            <p className="mt-6 qs-small qs-soft">Already use QPlan? <a href="/login" className="qs-link">Log in</a></p>
          </div>
        </div>
      </Section>
    </>
  )
}
