// src/site/faqData.jsx
// Questions and answers, kept in one place: the Questions page shows them all, the home page
// shows a few, and search engines are given the same text (see head.js).
// Each entry: [question, answer as plain text, optional link [label, href]]
const QA = [
  ['What is QPlan?',
    'QPlan is practice management software for town planning firms. It keeps every job, statutory deadline, document, time entry and invoice in one place, and counts development assessment periods in business days.'],
  ['Who is QPlan for?',
    'Town planning consultancies in Queensland, from a sole practitioner to a firm with several directors and a team of planners. Directors and staff each get their own view.'],
  ['How does QPlan count business days?',
    'It skips weekends, Queensland public holidays, the show holiday for the job\'s council where one covers the whole council area, and the Christmas period in the Planning Act 2016: 26 December to 1 January, or 20 December to 5 January for public notification.',
    ['Try the business day calculator', '/business-day-calculator']],
  ['Does QPlan work outside Queensland?',
    'QPlan is built around Queensland\'s Planning Act 2016 and Queensland public holidays. Job, document, time and invoice management work anywhere, but the business-day counting is Queensland only for now.'],
  ['Does it work with Microsoft 365?',
    'Yes. A director approves QPlan once for the whole firm. QPlan can then create a folder for each job in your OneDrive or SharePoint, open Word documents from the job, and show each person\'s own Outlook calendar.',
    ['See the integrations', '/integrations']],
  ['Does it work with Xero?',
    'Yes. Connect the firm\'s Xero account and QPlan can build an invoice from the time logged on a job and send it to Xero as a draft. Your invoices and their status show inside QPlan.'],
  ['Can we bring our old jobs across?',
    'Yes. QPlan can read your existing job folders in Microsoft 365, or an Excel or CSV export from another system. You see a preview before anything is saved, duplicates are skipped, and an import can be undone.',
    ['How importing works', '/import-old-jobs']],
  ['Can clients see how their job is going?',
    'Yes. Each job can have a read-only summary link to send to the client. It shows where the job is up to, and you choose whether it includes the budget and your notes. The client does not need a login.'],
  ['Does QPlan work on a phone?',
    'Yes. QPlan runs in the browser on a phone, tablet or computer, and can be installed as an app on each. The layout changes to suit the screen.'],
  ['Where is our data kept?',
    'Job data is stored in Australia, in Sydney. Each firm\'s data is separated in the database itself, so one firm can never see another\'s. Files in your Microsoft 365 stay in your Microsoft 365.',
    ['Read about security', '/security']],
  ['How do we get started?',
    'Book a demo. We set up your firm and give you a company code for your team and a director code for you. A short checklist walks a director through connecting Microsoft 365 and Xero, and a built-in tour shows each person around.',
    ['Book a demo', '/contact']],
  ['How much does QPlan cost?',
    'Book a demo and we will go through pricing for a firm of your size.',
    ['Book a demo', '/contact']],
]

export const FAQ_TEXT = QA.map(([q, a]) => [q, a])

const withLink = ([q, a, link]) => [q, link ? <>{a} <a href={link[1]} className="qs-link">{link[0]}</a></> : a]
export const ALL_FAQ = QA.map(withLink)
export const HOME_FAQ = [QA[2], QA[6], QA[9], QA[10]].map(withLink)
