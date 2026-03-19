import { useState } from 'react'

const upcoming = [
  { title: 'T. Nakamura — Initial consult', sub: 'Today 9:00am · Sarah B.', type: 'client', appType: 'MCU', linked: false },
  { title: 'Team review — 2025-028 ROL', sub: 'Today 11:00am · James T. + Priya M.', type: 'internal', linked: true, job: '2025-028' },
  { title: 'R. Okafor — New enquiry', sub: 'Today 2:00pm · Luke R.', type: 'client', appType: 'ROL', linked: false },
  { title: 'Principal sign-off — 2025-031', sub: 'Today 3:30pm · Sarah B. + James T.', type: 'internal', linked: true, job: '2025-031' },
  { title: 'M. Patel — Site review', sub: 'Wed 21 Mar 10:00am · Priya M.', type: 'client', appType: 'ROL', linked: true, job: '2025-028' },
  { title: 'OHS + compliance briefing', sub: 'Thu 22 Mar 9:00am · All planners', type: 'internal', linked: false },
  { title: 'J. Singh — New enquiry', sub: 'Fri 23 Mar 11:00am · Amy C.', type: 'client', appType: 'MCU', linked: false },
]

const clientBookings = [
  { title: 'T. Nakamura — Initial consult', sub: '19 Mar · Sarah B. · MCU enquiry', linked: false },
  { title: 'M. Patel — Site review (2025-028)', sub: '14 Mar · Priya M. · ROL · Linked', linked: true },
  { title: 'J. Hartmann — Project meeting (2025-031)', sub: '10 Mar · Sarah B. · MCU · 0.5h logged', linked: true },
  { title: 'L. Morrison — Initial consult', sub: '5 Mar · Luke R. · OW enquiry', linked: false },
]

const internalMeetings = [
  { title: 'Team review — 2025-028 ROL', sub: 'Today 11:00am · James T. + Priya M.', tag: 'Linked: 028' },
  { title: 'Principal sign-off — 2025-031', sub: 'Today 3:30pm · Sarah B. + James T.', tag: 'QA review' },
  { title: 'OHS + compliance briefing', sub: 'Thu 22 Mar 9:00am · All planners', tag: 'All staff' },
  { title: 'Monthly workload review', sub: 'Mon 31 Mar 9:00am · All principals', tag: 'Recurring' },
]

const bookingTypes = [
  { duration: '30', label: 'Initial client consultation', desc: 'Free · Auto-creates client record on booking', color: 'bg-blue-100 text-blue-700' },
  { duration: '60', label: 'Project / site review meeting', desc: '60 min · Linked to existing job · Billable', color: 'bg-emerald-100 text-emerald-700' },
  { duration: '45', label: 'Preliminary enquiry (paid)', desc: '45 min · $250 fee · Pre-payment via Calendly', color: 'bg-amber-100 text-amber-700' },
  { duration: '30', label: 'Internal team catch-up', desc: '30 min · Internal only · No client access', color: 'bg-purple-100 text-purple-700' },
  { duration: '60', label: 'Principal sign-off / QA review', desc: '60 min · Internal · Linked to job for time tracking', color: 'bg-pink-100 text-pink-700' },
]

const appTypeBadge = {
  MCU: 'bg-blue-100 text-blue-700',
  ROL: 'bg-amber-100 text-amber-700',
  RAA: 'bg-pink-100 text-pink-700',
  OW: 'bg-green-100 text-green-700',
}

export default function Bookings({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('upcoming')
  const tabs = ['upcoming', 'client bookings', 'internal meetings', 'settings']

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* UPCOMING */}
      {activeTab === 'upcoming' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All upcoming — next 7 days</div>
            {upcoming.map((b, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.type === 'client' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                <div className="flex-1">
                  <div className="text-xs font-medium">{b.title}
                    {b.appType && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${appTypeBadge[b.appType]}`}>{b.appType}</span>}
                  </div>
                  <div className="text-xs text-gray-400">{b.sub}</div>
                </div>
                {b.linked ? (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                    {b.job ? `Linked: ${b.job.slice(-3)}` : 'Linked'}
                  </span>
                ) : (
                  <button
                    onClick={() => onNavigate('newjob')}
                    className="px-2 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    → Job
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Booking types configured</div>
              {bookingTypes.map((bt, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${bt.color}`}>
                    {bt.duration}
                  </div>
                  <div>
                    <div className="text-xs font-medium">{bt.label}</div>
                    <div className="text-xs text-gray-400">{bt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="text-xs font-medium text-emerald-700 mb-1">Calendly connected</div>
              <div className="text-xs text-emerald-600">planflow-planning.calendly.com · Webhooks active · Syncs every 60s</div>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT BOOKINGS */}
      {activeTab === 'client bookings' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client bookings — last 30 days</div>
          {clientBookings.map((b, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-medium">{b.title}</div>
                <div className="text-xs text-gray-400">{b.sub}</div>
              </div>
              {b.linked ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">Linked</span>
              ) : (
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">No job yet</span>
                  <button onClick={() => onNavigate('newjob')} className="px-2 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">→ Create job</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* INTERNAL MEETINGS */}
      {activeTab === 'internal meetings' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Internal meetings — next 14 days</div>
          {internalMeetings.map((m, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
              <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-medium">{m.title}</div>
                <div className="text-xs text-gray-400">{m.sub}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">{m.tag}</span>
            </div>
          ))}
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Integration settings</div>
            {[
              ['Account', 'planflow-planning.calendly.com'],
              ['Status', '● Connected'],
              ['Webhook', 'Active — syncs every 60s'],
              ['On new client booking', 'Auto-create client record + prompt new job'],
              ['On internal booking', 'Link to job, auto-log time if billable'],
              ['Notifications', 'Email + in-app for all new bookings'],
            ].map(([k, v]) => (
              <div key={k} className="flex py-2 border-b border-gray-50 last:border-0">
                <div className="text-xs text-gray-400 w-36 flex-shrink-0">{k}</div>
                <div className={`text-xs font-medium ${v.includes('Connected') ? 'text-emerald-600' : ''}`}>{v}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Planner Calendly links</div>
            {[
              ['Sarah Barnes', 'calendly.com/planflow/sarah-b'],
              ['James Thompson', 'calendly.com/planflow/james-t'],
              ['Priya Mehta', 'calendly.com/planflow/priya-m'],
              ['Amy Chen', 'calendly.com/planflow/amy-c'],
              ['Luke Rawlings', 'calendly.com/planflow/luke-r'],
              ['Ben Okafor', 'calendly.com/planflow/ben-o'],
              ['Rachel Kim', 'calendly.com/planflow/rachel-k'],
              ['Tom Walsh', 'calendly.com/planflow/tom-w'],
              ['Chloe Davis', 'calendly.com/planflow/chloe-d'],
              ['Dev Patel', 'calendly.com/planflow/dev-p'],
              ['Nina Singh', 'calendly.com/planflow/nina-s'],
            ].map(([name, link]) => (
              <div key={name} className="flex py-1.5 border-b border-gray-50 last:border-0">
                <div className="text-xs text-gray-400 w-32 flex-shrink-0">{name}</div>
                <div className="text-xs text-emerald-600">{link}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}