// src/site/pages.js
// Every page of the public website: its address, and the title and description search
// engines show for it. The page bodies are in the other files in this folder.
//
// Adding a page: add it here, add its component to SiteApp.jsx, and add its address to the
// SITE list near the top of index.html (a test checks the two lists match).
//
// SITE_URL is the address search engines are told to use. Change it in this one place when
// QPlan moves to its own domain.
export const SITE_URL = 'https://planflow-beige.vercel.app'

export const PAGES = [
  { path: '/', key: 'home', name: 'Home',
    title: 'Town planning software for Queensland firms | QPlan',
    description: 'QPlan is practice management software for town planners. Jobs, DA deadlines in business days, documents, time and Xero invoices in one place.' },
  { path: '/features', key: 'features', name: 'Features',
    title: 'Features: job management for town planners | QPlan',
    description: 'Everything in QPlan: jobs, DA stages, your own service stages and fees, documents, time tracking, calendar, workloads and Xero invoicing.' },
  { path: '/da-tracking', key: 'daTracking', name: 'DA tracking',
    title: 'Development application tracking software | QPlan',
    description: 'Track every development application against the statutory clock. QPlan counts Queensland business days, public holidays and the Christmas break.' },
  { path: '/time-and-invoicing', key: 'time', name: 'Time and invoicing',
    title: 'Time tracking and invoicing for town planners | QPlan',
    description: 'A timer that follows the job you are on, hours against the fee budget, and draft invoices sent to Xero. Built for planning consultancies.' },
  { path: '/documents-and-templates', key: 'documents', name: 'Documents and templates',
    title: 'Fee proposals and document templates for planners | QPlan',
    description: 'Fill fee proposals, consent forms, letters and reports from the job in one click. Files live in the job folder in your Microsoft 365.' },
  { path: '/integrations', key: 'integrations', name: 'Integrations',
    title: 'Microsoft 365, Outlook and Xero integrations | QPlan',
    description: 'QPlan works with the tools a planning firm already has: OneDrive, SharePoint, Word, Outlook, Calendly and Xero.' },
  { path: '/import-old-jobs', key: 'importJobs', name: 'Bring your old jobs',
    title: 'Switching to QPlan: import your old jobs | QPlan',
    description: 'Bring thousands of old jobs into QPlan from your job folders or a spreadsheet export. Preview first, skip duplicates, undo if needed.' },
  { path: '/security', key: 'security', name: 'Security',
    title: 'Security and where your data is kept | QPlan',
    description: 'How QPlan keeps each firm separate, where data is stored in Australia, and what stays inside your own Microsoft 365.' },
  { path: '/business-day-calculator', key: 'calculator', name: 'Business day calculator',
    title: 'Queensland business day calculator for DA periods | QPlan',
    description: 'Free calculator for Planning Act 2016 business days. Skips weekends, Queensland public holidays, show days and the Christmas break.' },
  { path: '/da-timeframes-queensland', key: 'timeframes', name: 'DA timeframes guide',
    title: 'Queensland DA timeframes in plain English | QPlan',
    description: 'The Development Assessment Rules periods in one table: confirmation, referral, information request, public notification and decision.' },
  { path: '/faq', key: 'faq', name: 'Questions',
    title: 'Questions and answers about QPlan | Town planning software',
    description: 'Who QPlan is for, how it counts business days, what it connects to, how to bring old jobs across and how to get started.' },
  { path: '/contact', key: 'contact', name: 'Book a demo',
    title: 'Book a demo of QPlan | Town planning software',
    description: 'See QPlan with your own jobs. Tell us about your firm and we will set up a time to walk you through it.' },
]

export const SITE_PATHS = PAGES.map(p => p.path)
export const cleanPath = (pathname) => String(pathname || '/').replace(/\/+$/, '') || '/'
export const pageFor = (pathname) => PAGES.find(p => p.path === cleanPath(pathname)) || null
