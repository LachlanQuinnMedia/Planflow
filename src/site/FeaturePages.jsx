// src/site/FeaturePages.jsx
// The pages that explain what QPlan does. Everything said here is something the app does today.
import { PageHero, Section, Ledger, Steps, DemoBand } from './Layout'
import DayGrid from './DayGrid'

export function Features() {
  return (
    <>
      <PageHero title="Job management software for town planners"
        lead="One place for the whole life of a development application: the client and site, the statutory clock, your stages and fees, the documents, the hours and the invoice." />
      <Section title="Jobs">
        <Ledger rows={[
          ['Set a job up once', 'Enter the client, site address, lot reference, council, zone, application type, assessment level and proposed use. QPlan reuses them in every document and screen, so nobody types them twice.'],
          ['Find any job from anywhere', 'Search by job number, client or address from the top of any page, or press Ctrl+K. Filter the job list by type, planner and status.'],
          ['Know what is due', 'Each job shows who is on it and when the decision is due. Overdue jobs are marked red and jobs due soon are amber. The dashboard lists the dates due this week and in the next 30 days.'],
          ['History kept for you', 'Status changes, documents generated, files uploaded, time logged and notes saved are recorded against the job automatically.'],
          ['A summary link for clients', 'Send the client one read-only link showing where their job is up to. You choose whether it includes the budget and your notes. No login needed.'],
        ]} />
      </Section>
      <Section tone="mist" title="Stages, fees and the statutory clock">
        <Ledger rows={[
          ['DA stages in business days', 'Application, referral, information request, public notification and decision. Start a stage and QPlan works out the end date, skipping weekends, public holidays and the Christmas period.', '/da-tracking'],
          ['Your own service stages', 'The stages your firm sells, each with its usual fee and scope of works. Tick items off as they are done and mark a stage in progress, invoiced or complete. The fee summary adds it up with GST.'],
          ['Firm settings, not hard-coding', 'A director sets the firm\'s stages, fees and templates once. Every new job starts from them, and they can be changed at any time.'],
        ]} />
      </Section>
      <Section title="Documents, time and money">
        <Ledger rows={[
          ['Documents from templates', 'Fee proposals, consent forms, letters and reports filled in from the job and the planner\'s own details, then saved to the job folder.', '/documents-and-templates'],
          ['A folder for every job', 'Creating a job can create its folder in your OneDrive or SharePoint. Open and co-edit Word files straight from the job.', '/integrations'],
          ['Time against budget', 'A timer that follows the job you have open, with a recording light on every page. See hours logged against the budget as you go.', '/time-and-invoicing'],
          ['Invoices to Xero', 'Build an invoice from the time logged on a job and send it to Xero as a draft.', '/time-and-invoicing'],
        ]} />
      </Section>
      <Section tone="mist" title="Running the team">
        <Ledger rows={[
          ['A shared calendar', 'See the week for yourself or any planner. Add a meeting with its time, address, attendees and purpose. Connect your own Outlook so your meetings show too. On a phone the calendar shows one day at a time.'],
          ['Bookings in one list', 'Client bookings, internal meetings and past meetings across the team, for one person or all staff.'],
          ['Workloads', 'How busy each planner is this week, with jobs weighted by complexity, so directors can share work out evenly.'],
          ['Directors and staff', 'Staff create their own accounts with the firm\'s company code and wait for a director to approve them. Some pages, such as workloads and firm settings, are for directors only.'],
          ['On any device', 'QPlan runs in the browser on a computer, tablet or phone and can be installed as an app. It has a light and a dark theme.'],
          ['A built-in tour', 'New people get a short guided tour of every page, with an example job if the firm has none yet.'],
        ]} />
      </Section>
      <DemoBand />
    </>
  )
}

export function DaTracking() {
  return (
    <>
      <PageHero title="Development application tracking, on the statutory clock"
        lead="QPlan tracks each stage of a development application in business days, the way Queensland's Planning Act 2016 counts them. Start a stage and the end date is worked out for you." />
      <Section title="How the clock works in QPlan">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] items-start">
          <Steps steps={[
            ['Start a stage', 'Each job has the stages of development assessment: application, referral, information request, public notification and decision. Start one and QPlan sets its end date in business days.'],
            ['Stop the clock when the period stops', 'Record why, and resume it later. QPlan keeps count of the days it was stopped.'],
            ['Watch what is coming', 'The dashboard lists the dates due this week and in the next 30 days. Overdue jobs show red, jobs due soon show amber.'],
            ['Mark it complete', 'Finish a stage and start the next. The job\'s history records who did what, and when.'],
          ]} />
          <div>
            <DayGrid light start="2027-03-22" days={10} council="Brisbane City Council" label="10 business days over Easter" />
            <p className="qs-small qs-soft mt-3">Ten business days from Monday 22 March 2027 runs past Good Friday and Easter Monday, so it ends a fortnight and two days later.</p>
          </div>
        </div>
      </Section>
      <Section tone="mist" title="What QPlan leaves out of the count" intro="A business day in QPlan is a day that is none of these.">
        <Ledger rows={[
          ['Weekends', 'Saturdays and Sundays.'],
          ['Queensland public holidays', 'Including the Monday or Tuesday given when a holiday falls on a weekend.'],
          ['The local show holiday', 'For councils where one show holiday covers the whole council area, such as Brisbane, Gold Coast, Logan, Moreton Bay, Redland, Ipswich and Noosa. Where the show day only covers part of a council area, the planner adjusts the end date by hand.'],
          ['The Christmas period', '26 December to 1 January for most periods. Public notification has a longer break under the Act: 20 December to 5 January.'],
        ]} />
        <p className="mt-6 qs-soft qs-measure">The end date QPlan works out can always be changed by hand, for example where a period has been extended by agreement.</p>
      </Section>
      <Section title="Two free tools for planners">
        <Ledger rows={[
          ['Business day calculator', 'Add business days to a date or count them between two dates, with the same rules QPlan uses.', '/business-day-calculator'],
          ['Queensland DA timeframes', 'The periods in the Development Assessment Rules, in one plain-English table with links to the source.', '/da-timeframes-queensland'],
        ]} />
      </Section>
      <DemoBand title="Stop counting days on a wall calendar." />
    </>
  )
}

export function TimeInvoicing() {
  return (
    <>
      <PageHero title="Time tracking and invoicing for planning consultancies"
        lead="Record time as you work, see it against the fee budget for the job, and send the invoice to Xero without retyping it." />
      <Section title="Recording time">
        <Ledger rows={[
          ['A timer that follows your work', 'Pick a job, say what you are working on and press play. Press stop and the time is saved to that job. Open a different job and QPlan offers to switch the timer to it.'],
          ['Hard to forget', 'A red light shows on every page while the timer is recording.'],
          ['Fix it afterwards', 'Add an entry by hand if the timer was not running, or edit one that is wrong.'],
          ['Each planner\'s rate', 'Every person has an hourly rate on their profile, so logged time has a dollar value straight away.'],
        ]} />
      </Section>
      <Section tone="mist" title="Hours against budget">
        <Ledger rows={[
          ['A budget on every job', 'Set the budget hours when the job is created. The job shows the total logged against it.'],
          ['The whole firm on one page', 'Time & Budget shows the hours logged on each job against its budget, and a log of every entry.'],
          ['Fees by stage', 'Your firm\'s service stages each carry a fee. Mark a stage invoiced or complete and the fee summary adds it up with GST.'],
        ]} />
      </Section>
      <Section title="Invoices to Xero">
        <Steps steps={[
          ['Connect the firm\'s Xero once', 'A director connects it. The firm\'s invoices and their status then show inside QPlan.'],
          ['Build the invoice from the job', 'QPlan builds an invoice from the time logged on a job, for an individual or a company client.'],
          ['Send it to Xero as a draft', 'It arrives in Xero as a draft, so your bookkeeper still checks and approves it there.'],
        ]} />
      </Section>
      <DemoBand />
    </>
  )
}

export function Documents() {
  return (
    <>
      <PageHero title="Fee proposals and planning documents, filled in for you"
        lead="Keep your firm's Word templates in QPlan. Pick a job and the client, site and planner details go in by themselves. The finished file lands in the job's folder." />
      <Section title="From template to finished document">
        <Steps steps={[
          ['Add your templates', 'A director uploads the firm\'s own Word documents: fee proposals, owner\'s consent forms, covering letters, planning reports. They are grouped by stage.'],
          ['Tick the ones you want', 'On a job, or when creating one, tick the documents to generate.'],
          ['QPlan fills them in', 'The client, the site, the job number and your own name and position are written into each document.'],
          ['Saved where the job lives', 'Each document is saved into the job\'s Microsoft 365 folder, downloaded to your computer, or both.'],
        ]} />
      </Section>
      <Section tone="mist" title="Files stay in your Microsoft 365">
        <Ledger rows={[
          ['A folder for every job', 'When a job is created QPlan can create its folder in your OneDrive or SharePoint, in the place a director chooses.', '/integrations'],
          ['Open and co-edit in Word', 'Open a Word file from the job and edit it with your colleagues at the same time. The file never leaves your Microsoft 365.'],
          ['Every file, searchable', 'The Documents page lists files across every job. Search by name, job number or who uploaded it, or browse the firm\'s folders.'],
          ['Drop a file on a job', 'Files can also be uploaded straight onto a job in QPlan.'],
        ]} />
      </Section>
      <DemoBand title="Write the fee proposal once. Reuse it on every job." />
    </>
  )
}

export function Integrations() {
  return (
    <>
      <PageHero title="Works with Microsoft 365, Outlook and Xero"
        lead="QPlan connects to the tools a planning firm already pays for. Your files stay in your OneDrive or SharePoint and your accounts stay in Xero." />
      <Section title="Microsoft 365">
        <Ledger rows={[
          ['Approved once for the whole firm', 'A director, or your IT administrator, approves QPlan once. After that nobody in the firm is asked for Microsoft permissions again.'],
          ['OneDrive and SharePoint', 'Choose the folder where job folders go. QPlan creates a folder for each new job and opens it from the job.'],
          ['Word', 'Open Word documents from a job and co-edit them with colleagues.'],
          ['Outlook calendar', 'Each person connects their own Outlook. Their meetings show in the QPlan calendar, and meetings made in QPlan go to Outlook.'],
        ]} />
      </Section>
      <Section tone="mist" title="Xero">
        <Ledger rows={[
          ['Draft invoices', 'Build an invoice from the time logged on a job and send it to Xero as a draft.', '/time-and-invoicing'],
          ['Invoice status', 'The firm\'s Xero invoices and whether they are paid show inside QPlan.'],
        ]} />
      </Section>
      <Section title="Bookings">
        <Ledger rows={[
          ['Calendly', 'Connect Calendly and client bookings appear in the QPlan calendar and the bookings list.'],
        ]} />
      </Section>
      <Section tone="mist" title="Setting it up" intro="A checklist on the director's dashboard ticks itself off as each step is done.">
        <Steps steps={[
          ['Approve QPlan for the firm', 'One approval by a Microsoft 365 administrator.'],
          ['Connect OneDrive or SharePoint and choose the jobs folder', 'This is the firm\'s shared account, connected once.'],
          ['Connect Xero', 'A director connects the firm\'s Xero organisation.'],
          ['Each person connects their own calendar', 'From the Calendar page, in a couple of clicks.'],
        ]} />
      </Section>
      <DemoBand />
    </>
  )
}

export function ImportJobs() {
  return (
    <>
      <PageHero title="Switching to QPlan: bring your old jobs with you"
        lead="Some firms have thousands of past jobs. QPlan reads them from the job folders you already have, or from a spreadsheet export. There is no form to fill in for each one." />
      <Section title="From your job folders">
        <div className="grid gap-10 lg:grid-cols-2 items-start">
          <Steps steps={[
            ['Choose where your job folders are', 'QPlan looks in your Microsoft 365. If the folders are grouped by year, it works through each year.'],
            ['QPlan reads the folder names', 'From a name such as "2019-044 Smith - 12 Example Street, Brisbane" it works out the job number, the client and the address.'],
            ['Check the preview', 'Every job is listed before anything is saved. Jobs you already have are skipped.'],
            ['Import', 'Each imported job is linked to its folder, so its files open from the job.'],
          ]} />
          <div className="qs-prose qs-measure">
            <p>QPlan only reads the names of your folders. It does not move, rename or change anything in your Microsoft 365.</p>
            <p>Only directors can import jobs.</p>
          </div>
        </div>
      </Section>
      <Section tone="mist" title="From a spreadsheet">
        <Ledger rows={[
          ['Excel or CSV', 'Export your job list from your current system or spreadsheet and drop the file in.'],
          ['Columns matched for you', 'QPlan guesses which column is the job number, client, address, status and so on. Change any it got wrong.'],
          ['The same preview', 'See every job before it is saved, with duplicates skipped.'],
        ]} />
      </Section>
      <Section title="After the import">
        <Ledger rows={[
          ['Undo', 'An import can be undone as one. A job that has had time or documents added since is kept.'],
          ['Old jobs stay out of the way', 'Imported jobs that are complete are kept as an archive. They do not clutter everyday lists, and you find them by searching.'],
          ['Starting fresh is fine too', 'Most firms begin with their next job and bring history across later, or not at all.'],
        ]} />
      </Section>
      <DemoBand title="Bring your history, or start with your next job." />
    </>
  )
}

export function Security() {
  return (
    <>
      <PageHero title="Security, and where your data is kept"
        lead="A planning firm's jobs, clients and fees are its own business. This is how QPlan keeps them that way." />
      <Section title="Each firm is separate">
        <Ledger rows={[
          ['Separated in the database', 'Every row of data belongs to one firm, and the database itself refuses to show it to anyone outside that firm. It does not rely on the app remembering to filter.'],
          ['Nothing without signing in', 'Someone who is not signed in can read nothing. The one exception is a job summary link you choose to send a client, which needs its own long private address.'],
          ['Directors approve every account', 'Staff join with the firm\'s company code and can see nothing until a director approves them. A director can deactivate someone who has left.'],
          ['Director-only pages', 'Firm settings, workloads, importing jobs and the Microsoft 365 connection are for directors.'],
        ]} />
      </Section>
      <Section tone="mist" title="Where things are stored">
        <Ledger rows={[
          ['In Australia', 'QPlan\'s database and file storage are in Sydney.'],
          ['Your files stay in your Microsoft 365', 'Job folders and Word documents live in your own OneDrive or SharePoint. QPlan opens them from there.'],
          ['Your accounts stay in Xero', 'QPlan sends draft invoices to Xero and reads invoice status. Your books are not copied into QPlan.'],
        ]} />
      </Section>
      <Section title="Sign-in and connections">
        <Ledger rows={[
          ['Passwords', 'Passwords are never stored. QPlan keeps only a one-way hash, and limits repeated wrong attempts.'],
          ['Connections kept on the server', 'The keys that connect QPlan to your Microsoft 365, Xero and calendars are held on the server. They are never sent to a browser.'],
          ['Short-lived file links', 'A document stored in QPlan opens through a private link that expires after five minutes.'],
          ['The app reports its own faults', 'If a screen breaks, QPlan records what failed so it can be fixed. Nothing typed into the page is included.'],
        ]} />
      </Section>
      <DemoBand title="Questions about security? Ask us." text="Book a demo and bring your IT person. We will go through how QPlan connects to your Microsoft 365." />
    </>
  )
}
