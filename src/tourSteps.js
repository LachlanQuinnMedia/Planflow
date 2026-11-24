// src/tourSteps.js
// The words of the two tutorials. One for directors, one for staff.
//
// Each card names:
//   page      the page to open ('jobdetail' opens a job: a real one, or the example job if there are none; null stays where it is)
//   jobTab    on the job page, the tab to open
//   targets   the things to light up (data-tour names). The card points at them.
//   sidebar   true when the thing is in the menu (on a phone the menu slides out for it)
//   chapter   the small heading above the title
//
// To change the tutorial, edit the cards here. Tour.jsx only does the pointing.

export const MENU_LABELS = {
  dashboard: 'Dashboard', jobs: 'Jobs', newjob: 'New Job', docs: 'Documents', time: 'Time & Budget',
  calendly: 'Bookings', calendar: 'Calendar', workload: 'Workloads', xero: 'Xero',
  templates: 'Templates', planners: 'Planners', microsoft: 'Microsoft 365',
}

export const JOB_TAB_LABELS = {
  overview: 'Overview', 'hpc stages': 'Service Stages', // Tour.jsx swaps in the firm's own name for its stages
  'da stages': 'DA Stages', documents: 'Documents',
  'time & budget': 'Time & Budget', 'ir & notes': 'IR & Notes', history: 'History',
}

// "hpc stages" -> "jobtab-hpc-stages", the name the tab carries on the job page
export const jobTabAnchor = (tab) => `jobtab-${tab.replace(/[^a-z]+/g, '-')}`

const tabCard = (tab, title, body) => ({
  id: `job-${tab.replace(/[^a-z]+/g, '-')}`, page: 'jobdetail', jobTab: tab, chapter: 'Inside a job',
  targets: [jobTabAnchor(tab), 'job-body'], maxHeight: 330, title, body,
})

// ------------------------------------------------------------------
// Cards both tutorials share. The job page works the same way for everyone.
// ------------------------------------------------------------------

// A firm with no jobs yet still gets every card: the tour opens a built-in example job
// (src/tourDemoJob.js) and says so on the first card.
function jobCards(hasJobs, stagesTab = 'Service Stages') {
  return [
    {
      id: 'job-header', page: 'jobdetail', jobTab: 'overview', chapter: 'Inside a job', targets: ['job-header'],
      title: 'A job, from the top',
      body: hasJobs ? [
        'This row stays put on every tab. Change the status, edit the job\'s details, or share a read-only summary with the client.',
        '"Generate docs" fills your templates in from this job.',
        'The tabs underneath hold everything else. We will go through them one at a time.',
      ] : [
        'You have no jobs yet, so this is an example job. It is not saved, and it goes away when the tour ends.',
        'This row stays put on every tab. Change the status, edit the details, share a summary with the client, or generate documents.',
        'The tabs underneath hold everything else. We will go through them one at a time.',
      ],
    },
    tabCard('overview', 'Overview tab: the essentials', [
      'The client, the site and the application details, as entered when the job was created.',
      'Key dates are here too. Click "Edit dates" to change one, then save.',
    ]),
    tabCard('hpc stages', `${stagesTab} tab: your stages and fees`, [
      'Your firm\'s own stages for the job. Open a stage to see its scope of works, and tick items off as they are done.',
      'Each stage has a fee. Set a stage to in progress, or to invoiced and complete. The fee summary adds it up with GST.',
    ]),
    tabCard('da stages', 'DA Stages tab: the statutory clock', [
      'The stages of the development assessment. Start a stage and QPlan works out its end date in business days, skipping Queensland public holidays.',
      'Stop the clock when the period is paused and resume it later. Mark each stage complete as it finishes.',
    ]),
    tabCard('documents', 'Documents tab: this job\'s files', [
      'The job\'s Microsoft 365 folder opens from here, if one is linked.',
      'Files kept in QPlan sit underneath. Drop a file onto the box to add one.',
    ]),
    tabCard('time & budget', 'Time & Budget tab: time on this job', [
      'Every time entry on this job, and the total against its budget.',
      'Add an entry by hand if the timer was not running, or edit one that is wrong.',
    ]),
    tabCard('ir & notes', 'IR & Notes tab: running notes', [
      'Keep notes for the job here, such as what an information request asked for.',
      'Click "Save notes" when you are done. Anyone who opens the job sees the same notes.',
    ]),
    tabCard('history', 'History tab: who did what', [
      'QPlan keeps this list by itself. Status changes, documents generated, files uploaded, time logged and notes saved all appear here.',
      'Nothing to fill in. It is there when you need to look back.',
    ]),
  ]
}

const documentsCard = {
  id: 'docs', page: 'docs', chapter: 'Your tools', targets: ['docs-source', 'docs-upload'],
  title: 'Documents: all your files',
  body: [
    'Every file across every job. Drop a file here to upload it, or click the box to choose one.',
    'The second button opens the firm\'s Microsoft 365 folders. Below, you can search by name, job code or who uploaded it.',
  ],
}

const timeCard = {
  id: 'time', page: 'time', chapter: 'Your tools', targets: ['time-tabs'],
  title: 'Time & Budget: hours against budget',
  body: [
    'Overview shows the hours logged on each job against its budget.',
    'Time Log lists every entry. Log Time adds one by hand if you forgot to run the timer.',
  ],
}

const timerCard = {
  id: 'timer', page: 'time', chapter: 'Your tools', targets: ['timer'], sidebar: true, prefer: 'right',
  title: 'Time tracker: record as you work',
  body: [
    'Pick a job, say what you are working on and press play. Press stop and the time is saved to that job.',
    'A red light shows while it is recording, on every page. The small arrow tucks the tracker away.',
  ],
}

const templatesCard = {
  id: 'templates', page: 'templates', chapter: 'Settings', targets: ['templates-top'],
  title: 'Templates: letters and reports',
  body: [
    'The firm\'s standard documents, grouped by stage. Tick the ones you want and click Generate.',
    'Pick a job and QPlan fills in the client, the site and your details. "My details" sets how your name and position appear.',
  ],
}

const finishCard = (which) => ({
  id: 'finish', page: null, chapter: 'All done', targets: ['help-button'], // stays on whatever page is open
  title: `That is the ${which} tour`,
  body: [
    'This ? button runs it again whenever you want a reminder.',
    'Light, dark and the seasonal theme are at the bottom of the menu.',
  ],
  nextLabel: 'Finish',
})

// ------------------------------------------------------------------
// The director tutorial
// ------------------------------------------------------------------

export function directorTour({ firstName, isPhone, hasJobs, stagesTab }) {
  return [
    {
      id: 'welcome', page: 'dashboard', chapter: 'Director tour',
      title: `Welcome to QPlan${firstName ? `, ${firstName}` : ''}`,
      body: [
        'This is the director tour. It takes about five minutes and covers every page, including the ones only directors see.',
        isPhone
          ? 'You do not need to type anything. Read each card, then tap Next.'
          : 'You do not need to type anything. Read each card, then click Next, or click the thing that lights up.',
      ],
      nextLabel: 'Start the tour',
    },
    {
      id: 'dashboard', page: 'dashboard', chapter: 'Getting started', targets: ['dash-stats'],
      title: 'Dashboard: the firm at a glance',
      body: [
        'These cards count the firm\'s active jobs, the planners on them, and the dates due this week and in the next 30 days.',
        'Underneath you can search every job, and see firm-wide deadlines and all active jobs by planner.',
        ...(isPhone ? ['On a phone, the button at the top left opens the menu.'] : []),
      ],
    },
    {
      id: 'jobs', page: 'jobs', chapter: 'Jobs', targets: ['jobs-search', 'jobs-list'], maxHeight: 300,
      title: 'Jobs: every job in the firm',
      body: [
        'Search, or filter by type, planner and status. Each row shows who is on the job and when the decision is due.',
        'Overdue jobs are marked in red, and jobs due soon in amber.',
      ],
    },
    ...jobCards(hasJobs, stagesTab),
    {
      id: 'newjob', page: 'newjob', chapter: 'Jobs', targets: ['newjob-form'], maxHeight: 320,
      title: 'New Job: set a job up once',
      body: [
        'Enter the client and site details here. QPlan reuses them everywhere, so nobody types them twice.',
        'Further down you assign planners and a budget, and tick the documents you want generated straight away.',
        'QPlan can create the job folder in Microsoft 365. As a director, you choose once where those folders go.',
      ],
    },
    documentsCard,
    timeCard,
    timerCard,
    {
      id: 'calendar', page: 'calendar', chapter: 'Your tools', targets: ['calendar-tools', 'calendar-grid'], maxHeight: 300,
      title: 'Calendar: the week',
      body: [
        'Click an empty slot to add a meeting. Click a meeting to see its time, address, attendees and purpose.',
        'The name box at the top shows any planner\'s week. "Connect calendar" brings in your own Outlook meetings.',
      ],
    },
    {
      id: 'bookings', page: 'calendly', chapter: 'Director tools', targets: ['bookings-top'],
      title: 'Bookings: every meeting, as a list',
      body: [
        'All meetings across the team in one list. Choose one person, or all staff.',
        'Client bookings, internal meetings and past meetings are listed separately.',
      ],
    },
    {
      id: 'workload', page: 'workload', chapter: 'Director tools', targets: ['workload-stats'],
      title: 'Workloads: who has room',
      body: [
        'How busy each planner is this week, so you can share jobs out evenly.',
        'Jobs are weighted by complexity, from C1 simple to C4 high. Click a planner to see what they are carrying.',
      ],
    },
    {
      id: 'xero', page: 'xero', chapter: 'Director tools', targets: ['xero-main'], maxHeight: 260,
      title: 'Xero: invoices',
      body: [
        'The firm\'s Xero account connects here. Once connected, its invoices and their status show on this page.',
        'An invoice can be built from the time logged on a job and sent to Xero.',
      ],
    },
    templatesCard,
    {
      id: 'planners', page: 'planners', chapter: 'Settings', targets: ['planners-list'], maxHeight: 280,
      title: 'Planners: your team',
      body: [
        'Each person\'s profile, position and hourly rate. As a director you can edit anyone, and deactivate someone who has left.',
        'When a new person signs up, they wait for your approval under Notifications at the bottom of the menu.',
      ],
    },
    {
      id: 'microsoft', page: 'microsoft', chapter: 'Settings', targets: ['ms-main'], maxHeight: 280,
      title: 'Microsoft 365: set up once',
      body: [
        'Three steps, each done once: approve QPlan for the firm, connect the firm\'s OneDrive or SharePoint and choose the jobs folder, then connect your own Outlook.',
        'Only directors see this page. Staff connect their own Outlook from the Calendar.',
      ],
    },
    finishCard('director'),
  ]
}

// ------------------------------------------------------------------
// The staff tutorial
// ------------------------------------------------------------------

export function staffTour({ firstName, isPhone, hasJobs, stagesTab }) {
  return [
    {
      id: 'welcome', page: 'dashboard', chapter: 'Staff tour',
      title: `Welcome to QPlan${firstName ? `, ${firstName}` : ''}`,
      body: [
        'This tour takes about four minutes and shows you where everything is.',
        isPhone
          ? 'You do not need to type anything. Read each card, then tap Next.'
          : 'You do not need to type anything. Read each card, then click Next, or click the thing that lights up.',
      ],
      nextLabel: 'Start the tour',
    },
    {
      id: 'dashboard', page: 'dashboard', chapter: 'Getting started', targets: ['dash-stats'],
      title: 'Dashboard: your day at a glance',
      body: [
        'These cards show your active jobs, the hours you have logged this week and what is due soon.',
        'Underneath are your jobs and your upcoming deadlines.',
        ...(isPhone ? ['On a phone, the button at the top left opens the menu.'] : []),
      ],
    },
    {
      id: 'jobs', page: 'jobs', chapter: 'Jobs', targets: ['jobs-search', 'jobs-list'], maxHeight: 300,
      title: 'Jobs: find any job',
      body: [
        'Search by client, address or job code, or filter by planner to see just yours.',
        'Overdue jobs are marked in red, and jobs due soon in amber.',
      ],
    },
    ...jobCards(hasJobs, stagesTab),
    {
      id: 'newjob', page: 'newjob', chapter: 'Jobs', targets: ['newjob-form'], maxHeight: 320,
      title: 'New Job: set a job up once',
      body: [
        'Enter the client and site details here. QPlan reuses them everywhere, so you never type them twice.',
        'Further down you can tick the documents you want. QPlan fills them in and saves them with the job, and creates the job folder if the firm has set that up.',
      ],
    },
    documentsCard,
    timeCard,
    timerCard,
    {
      id: 'calendar', page: 'calendar', chapter: 'Your tools', targets: ['calendar-tools', 'calendar-grid'], maxHeight: 300,
      title: 'Calendar: your week',
      body: [
        'Click an empty slot to add a meeting. Click a meeting to see its time, address, attendees and purpose.',
        '"Connect calendar" brings in your Outlook meetings, and puts QPlan meetings into your Outlook.',
      ],
    },
    {
      id: 'xero', page: 'xero', chapter: 'Your tools', targets: ['xero-main'], maxHeight: 260,
      title: 'Xero: invoices',
      body: [
        'When the firm\'s Xero is connected, its invoices show here.',
        'An invoice can be built from the time logged on a job. Check with a director before sending one.',
      ],
    },
    templatesCard,
    {
      id: 'planners', page: 'planners', chapter: 'Settings', targets: ['planners-list'], maxHeight: 280,
      title: 'Planners: the team, and your profile',
      body: [
        'Everyone at the firm, with their position and contact details.',
        '"Edit my profile" at the top changes your own details, photo and colour.',
      ],
    },
    {
      id: 'outlook', page: 'planners', chapter: 'Settings', targets: ['nav-connectoutlook'], sidebar: true, prefer: 'right',
      title: 'Connect my Outlook',
      body: [
        'This signs you in with Microsoft once. After that your Outlook meetings show in the Calendar, and meetings you make in QPlan go into your Outlook.',
        'QPlan reads your calendar only. It does not read your email.',
      ],
    },
    finishCard('staff'),
  ]
}
