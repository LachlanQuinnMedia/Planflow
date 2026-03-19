import { useState } from 'react'
const planners = [
  { initials: 'SB', name: 'Sarah Barnes', role: 'Principal Planner', rate: 185, pct: 96, hrs: 38, available: 40, jobs: ['2025-031 Ridgeline MCU', '2025-033 Apex RAA', '2025-029 Hillcrest SPS', '2025-027 Park St MCU'], specialisation: 'MCU, RAA, Impact assessable', color: 'bg-emerald-100 text-emerald-700' },
  { initials: 'JT', name: 'James Thompson', role: 'Senior Planner', rate: 155, pct: 78, hrs: 31, available: 40, jobs: ['2025-028 Stonewood ROL', '2025-030 Valley OW', '2025-032 Apex MCU'], specialisation: 'MCU, ROL', color: 'bg-blue-100 text-blue-700' },
  { initials: 'PM', name: 'Priya Mehta', role: 'Senior Planner', rate: 160, pct: 62, hrs: 25, available: 40, jobs: ['2025-028 Stonewood ROL', '2025-035 Newtown SPS'], specialisation: 'ROL, MCU, SPS', color: 'bg-pink-100 text-pink-700' },
  { initials: 'AC', name: 'Amy Chen', role: 'Associate Planner', rate: 140, pct: 55, hrs: 22, available: 40, jobs: ['2025-029 Hillcrest SPS', '2025-036 Creek PE'], specialisation: 'MCU, SPS, PE', color: 'bg-purple-100 text-purple-700' },
  { initials: 'LR', name: 'Luke Rawlings', role: 'Associate Planner', rate: 135, pct: 45, hrs: 18, available: 40, jobs: ['2025-034 Creek OW', '2025-030 Valley OW'], specialisation: 'ROL, OW', color: 'bg-green-100 text-green-700' },
  { initials: 'BO', name: 'Ben Okafor', role: 'Graduate Planner', rate: 110, pct: 30, hrs: 12, available: 40, jobs: ['2025-028 Stonewood ROL'], specialisation: 'ROL, research support', color: 'bg-amber-100 text-amber-700' },
  { initials: 'RK', name: 'Rachel Kim', role: 'Graduate Planner', rate: 115, pct: 40, hrs: 16, available: 40, jobs: ['2025-031 Ridgeline MCU', '2025-034 Creek OW'], specialisation: 'MCU, OW', color: 'bg-orange-100 text-orange-700' },
  { initials: 'TW', name: 'Tom Walsh', role: 'Graduate Planner', rate: 110, pct: 25, hrs: 10, available: 40, jobs: ['2025-033 Apex RAA'], specialisation: 'RAA, research support', color: 'bg-teal-100 text-teal-700' },
  { initials: 'CD', name: 'Chloe Davis', role: 'Associate Planner', rate: 140, pct: 50, hrs: 20, available: 40, jobs: ['2025-032 Apex MCU', '2025-036 Creek PE'], specialisation: 'MCU, PE', color: 'bg-indigo-100 text-indigo-700' },
  { initials: 'DP', name: 'Dev Patel', role: 'Senior Planner', rate: 160, pct: 35, hrs: 14, available: 40, jobs: ['2025-035 Newtown SPS'], specialisation: 'SPS, ROL, MCU', color: 'bg-rose-100 text-rose-700' },
  { initials: 'NS', name: 'Nina Singh', role: 'Associate Planner', rate: 140, pct: 60, hrs: 24, available: 40, jobs: ['2025-027 Park St MCU', '2025-030 Valley OW'], specialisation: 'MCU, OW', color: 'bg-cyan-100 text-cyan-700' },
]


export default function Workload() {
  const [selected, setSelected] = useState(planners[0])

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Total planners</div>
          <div className="text-xl font-semibold">11</div>
          <div className="text-xs text-gray-400 mt-0.5">Active this week</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Avg capacity</div>
          <div className="text-xl font-semibold">49%</div>
          <div className="text-xs text-gray-400 mt-0.5">Across all planners</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="text-xs text-red-400 mb-1">Near capacity</div>
          <div className="text-xl font-semibold text-red-600">2</div>
          <div className="text-xs text-red-400 mt-0.5">Sarah B. · James T.</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Available capacity</div>
          <div className="text-xl font-semibold text-emerald-600">213 hrs</div>
          <div className="text-xs text-gray-400 mt-0.5">Across team this week</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Team list */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Team — week of 17 Mar 2025</div>
          {planners.map(p => (
            <div
              key={p.name}
              onClick={() => setSelected(p)}
              className={`flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer rounded-lg px-2 transition-colors ${selected.name === p.name ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${p.color}`}>
                {p.initials}
              </div>
              <div className="w-24 text-xs font-medium truncate">{p.name.split(' ')[0]} {p.name.split(' ')[1][0]}.</div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${p.pct >= 90 ? 'bg-red-500' : p.pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${p.pct}%` }}
                />
              </div>
              <div className={`text-xs font-medium w-8 text-right ${p.pct >= 90 ? 'text-red-500' : p.pct >= 75 ? 'text-amber-500' : 'text-gray-500'}`}>
                {p.pct}%
              </div>
            </div>
          ))}
          {planners.find(p => p.pct >= 90) && (
            <div className="mt-3 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">
              Sarah B. at {planners[0].pct}% capacity. Consider reassigning jobs to Luke R. or Ben O.
            </div>
          )}
        </div>

        {/* Planner profile */}
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Planner profile</div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${selected.color}`}>
                {selected.initials}
              </div>
              <div>
                <div className="text-sm font-semibold">{selected.name}</div>
                <div className="text-xs text-gray-400">{selected.role} · ${selected.rate}/hr</div>
              </div>
            </div>
            {[
              ['Specialisation', selected.specialisation],
              ['Active jobs', selected.jobs.length],
              ['Hours this week', `${selected.hrs} / ${selected.available} available`],
              ['Capacity', `${selected.pct}%`],
              ['Revenue MTD', `$${(selected.hrs * 4 * selected.rate).toLocaleString()}`],
            ].map(([k, v]) => (
              <div key={k} className="flex py-1.5 border-b border-gray-50 last:border-0">
                <div className="text-xs text-gray-400 w-28 flex-shrink-0">{k}</div>
                <div className="text-xs font-medium">{v}</div>
              </div>
            ))}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{selected.hrs} hrs used</span>
                <span>{selected.available} hrs available</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${selected.pct >= 90 ? 'bg-red-500' : selected.pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${selected.pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Active jobs */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Active jobs</div>
            {selected.jobs.map((job, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <div className="text-xs">{job}</div>
              </div>
            ))}
          </div>

          {/* Planner grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All planners</div>
            <div className="grid grid-cols-3 gap-2">
              {planners.map(p => (
                <div
                  key={p.name}
                  onClick={() => setSelected(p)}
                  className={`p-2 rounded-lg border cursor-pointer transition-colors ${selected.name === p.name ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${p.color}`} style={{ fontSize: '9px' }}>
                      {p.initials}
                    </div>
                    <div className="text-xs font-medium truncate">{p.name.split(' ')[0]}</div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p.pct >= 90 ? 'bg-red-500' : p.pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${p.pct}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{p.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}