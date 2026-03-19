const stats = [
  { label: 'Active jobs', value: '18', sub: '4 due this week' },
  { label: 'Hours MTD', value: '412', sub: 'of 640 budgeted' },
  { label: 'Revenue MTD', value: '$68k', sub: '+9% vs last month' },
  { label: 'Planners active', value: '11', sub: '2 near capacity' },
  { label: 'Bookings this week', value: '7', sub: '3 client · 4 internal' },
]
const recentJobs = [
  { code: '2025-031', name: 'Ridgeline Mixed-Use MCU', type: 'MCU', planner: 'Sarah B.', budget: 82, over: false },
  { code: '2025-028', name: 'Stonewood Estate ROL', type: 'ROL', planner: 'Priya M.', budget: 55, over: false },
  { code: '2025-033', name: 'Apex Logistics RAA', type: 'RAA', planner: 'Sarah B.', budget: 112, over: true },
  { code: '2025-034', name: 'Creek Rd OW Stage 2', type: 'OW', planner: 'Luke R.', budget: 18, over: false },
  { code: '2025-029', name: 'Hillcrest SPS Request', type: 'SPS', planner: 'Amy C.', budget: 70, over: false },
]
const typeBadge = {
  MCU: 'bg-blue-100 text-blue-700',
  ROL: 'bg-amber-100 text-amber-700',
  RAA: 'bg-pink-100 text-pink-700',
  OW: 'bg-green-100 text-green-700',
  SPS: 'bg-purple-100 text-purple-700',
}
const planners = [
  { name: 'Sarah B.', pct: 96 },
  { name: 'James T.', pct: 78 },
  { name: 'Priya M.', pct: 62 },
  { name: 'Amy C.', pct: 55 },
  { name: 'Luke R.', pct: 45 },
  { name: 'Ben O.', pct: 30 },
]
const bookings = [
  { title: 'T. Nakamura — Initial consult', sub: 'Today 9:00am · Sarah B. · Client', type: 'client' },
  { title: 'Team review — 2025-028 ROL', sub: 'Today 11:00am · James T. + Priya M.', type: 'internal' },
  { title: 'R. Okafor — New enquiry', sub: 'Today 2:00pm · Luke R. · Client', type: 'client' },
  { title: 'Principal sign-off — 2025-031', sub: 'Today 3:30pm · Sarah B. + James T.', type: 'internal' },
]
export default function Dashboard({ onNavigate }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-3 mb-4">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="text-xl font-semibold">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Active jobs — priority</div>
            <button onClick={() => onNavigate('jobs')} className="text-xs text-emerald-600 hover:underline">All jobs →</button>
          </div>
          {recentJobs.map(job => (
            <div key={job.code} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:opacity-70">
              <div className="text-xs font-medium text-emerald-600 w-16 flex-shrink-0">{job.code}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{job.name}</div>
                <div className="text-xs text-gray-400">{job.planner}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[job.type]}`}>{job.type}</span>
              <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                <div className={`h-full rounded-full ${job.over ? 'bg-red-500' : job.budget > 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(job.budget, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Team capacity</div>
              <button onClick={() => onNavigate('workload')} className="text-xs text-emerald-600 hover:underline">Full view →</button>
            </div>
            {planners.map(p => (
              <div key={p.name} className="flex items-center gap-2 mb-2 last:mb-0">
                <div className="text-xs w-16 text-gray-500">{p.name}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${p.pct >= 90 ? 'bg-red-500' : p.pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${p.pct}%` }} />
                </div>
                <div className="text-xs text-gray-400 w-8 text-right">{p.pct}%</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Today's bookings</div>
              <button onClick={() => onNavigate('calendly')} className="text-xs text-emerald-600 hover:underline">Calendar →</button>
            </div>
            {bookings.map((b, i) => (
              <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${b.type === 'client' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                <div>
                  <div className="text-xs font-medium">{b.title}</div>
                  <div className="text-xs text-gray-400">{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-sm font-medium mb-3">Applications by type — active</div>
        <div className="grid grid-cols-6 gap-3">
          {[
            { type: 'MCU', count: 6, label: 'Material Change of Use', color: 'text-blue-600' },
            { type: 'ROL', count: 5, label: 'Reconfiguration of Lot', color: 'text-amber-600' },
            { type: 'RAA', count: 3, label: 'Referral Agency', color: 'text-pink-600' },
            { type: 'OW', count: 2, label: 'Operational Works', color: 'text-green-600' },
            { type: 'SPS', count: 1, label: 'Superseded Scheme', color: 'text-purple-600' },
            { type: 'PE', count: 1, label: 'Preliminary Enquiry', color: 'text-orange-600' },
          ].map(a => (
            <div key={a.type} className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">{a.type}</div>
              <div className={`text-xl font-semibold ${a.color}`}>{a.count}</div>
              <div className="text-xs text-gray-400 mt-0.5">{a.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}