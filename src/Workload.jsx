import { useState } from 'react'

const COMPLEXITY = {
  C1: { label: 'C1', description: 'Simple', weight: 1, color: 'bg-gray-100 text-gray-600' },
  C2: { label: 'C2', description: 'Moderate', weight: 2, color: 'bg-blue-100 text-blue-700' },
  C3: { label: 'C3', description: 'Complex', weight: 3, color: 'bg-amber-100 text-amber-700' },
  C4: { label: 'C4', description: 'High complexity', weight: 4, color: 'bg-red-100 text-red-700' },
}

const planners = [
  {
    initials: 'SB', name: 'Sarah Barnes', role: 'Principal Planner', rate: 185,
    available: 40, color: 'bg-emerald-100 text-emerald-700',
    specialisation: 'MCU, RAA, Impact assessable',
    jobs: [
      { code: '2025-031', name: 'Ridgeline MCU', complexity: 'C4', hrs: 12 },
      { code: '2025-033', name: 'Apex RAA', complexity: 'C3', hrs: 10 },
      { code: '2025-029', name: 'Hillcrest SPS', complexity: 'C2', hrs: 8 },
      { code: '2025-027', name: 'Park St MCU', complexity: 'C3', hrs: 8 },
    ],
  },
  {
    initials: 'JT', name: 'James Thompson', role: 'Senior Planner', rate: 155,
    available: 40, color: 'bg-blue-100 text-blue-700',
    specialisation: 'MCU, ROL',
    jobs: [
      { code: '2025-028', name: 'Stonewood ROL', complexity: 'C2', hrs: 12 },
      { code: '2025-030', name: 'Valley OW', complexity: 'C2', hrs: 10 },
      { code: '2025-032', name: 'Apex MCU', complexity: 'C3', hrs: 9 },
    ],
  },
  {
    initials: 'PM', name: 'Priya Mehta', role: 'Senior Planner', rate: 160,
    available: 40, color: 'bg-pink-100 text-pink-700',
    specialisation: 'ROL, MCU, SPS',
    jobs: [
      { code: '2025-028', name: 'Stonewood ROL', complexity: 'C2', hrs: 14 },
      { code: '2025-035', name: 'Newtown SPS', complexity: 'C1', hrs: 11 },
    ],
  },
  {
    initials: 'AC', name: 'Amy Chen', role: 'Associate Planner', rate: 140,
    available: 40, color: 'bg-purple-100 text-purple-700',
    specialisation: 'MCU, SPS, PE',
    jobs: [
      { code: '2025-029', name: 'Hillcrest SPS', complexity: 'C2', hrs: 12 },
      { code: '2025-036', name: 'Creek PE', complexity: 'C1', hrs: 10 },
    ],
  },
  {
    initials: 'LR', name: 'Luke Rawlings', role: 'Associate Planner', rate: 135,
    available: 40, color: 'bg-green-100 text-green-700',
    specialisation: 'ROL, OW',
    jobs: [
      { code: '2025-034', name: 'Creek OW', complexity: 'C2', hrs: 10 },
      { code: '2025-030', name: 'Valley OW', complexity: 'C2', hrs: 8 },
    ],
  },
  {
    initials: 'BO', name: 'Ben Okafor', role: 'Graduate Planner', rate: 110,
    available: 40, color: 'bg-amber-100 text-amber-700',
    specialisation: 'ROL, research support',
    jobs: [
      { code: '2025-028', name: 'Stonewood ROL', complexity: 'C1', hrs: 12 },
    ],
  },
  {
    initials: 'RK', name: 'Rachel Kim', role: 'Graduate Planner', rate: 115,
    available: 40, color: 'bg-orange-100 text-orange-700',
    specialisation: 'MCU, OW',
    jobs: [
      { code: '2025-031', name: 'Ridgeline MCU', complexity: 'C3', hrs: 8 },
      { code: '2025-034', name: 'Creek OW', complexity: 'C2', hrs: 8 },
    ],
  },
  {
    initials: 'TW', name: 'Tom Walsh', role: 'Graduate Planner', rate: 110,
    available: 40, color: 'bg-teal-100 text-teal-700',
    specialisation: 'RAA, research support',
    jobs: [
      { code: '2025-033', name: 'Apex RAA', complexity: 'C1', hrs: 10 },
    ],
  },
  {
    initials: 'CD', name: 'Chloe Davis', role: 'Associate Planner', rate: 140,
    available: 40, color: 'bg-indigo-100 text-indigo-700',
    specialisation: 'MCU, PE',
    jobs: [
      { code: '2025-032', name: 'Apex MCU', complexity: 'C3', hrs: 10 },
      { code: '2025-036', name: 'Creek PE', complexity: 'C2', hrs: 10 },
    ],
  },
  {
    initials: 'DP', name: 'Dev Patel', role: 'Senior Planner', rate: 160,
    available: 40, color: 'bg-rose-100 text-rose-700',
    specialisation: 'SPS, ROL, MCU',
    jobs: [
      { code: '2025-035', name: 'Newtown SPS', complexity: 'C2', hrs: 14 },
    ],
  },
  {
    initials: 'NS', name: 'Nina Singh', role: 'Associate Planner', rate: 140,
    available: 40, color: 'bg-cyan-100 text-cyan-700',
    specialisation: 'MCU, OW',
    jobs: [
      { code: '2025-027', name: 'Park St MCU', complexity: 'C3', hrs: 12 },
      { code: '2025-030', name: 'Valley OW', complexity: 'C2', hrs: 12 },
    ],
  },
]

// Calculate weighted capacity score for a planner
// Each job contributes: (hrs / available) * complexity_weight
// Max weighted load = sum of weights if all hrs were full
function calcCapacity(planner) {
  const totalHrs = planner.jobs.reduce((sum, j) => sum + j.hrs, 0)
  const weightedLoad = planner.jobs.reduce((sum, j) => {
    return sum + (j.hrs * COMPLEXITY[j.complexity].weight)
  }, 0)
  // Normalise: max possible weighted load at full hours would be available * 4 (C4)
  const maxWeighted = planner.available * 4
  const weightedPct = Math.round((weightedLoad / maxWeighted) * 100)
  const rawPct = Math.round((totalHrs / planner.available) * 100)
  return { totalHrs, weightedPct, rawPct }
}

export default function Workload() {
  const [selected, setSelected] = useState(planners[0])
  const [view, setView] = useState('weighted') // 'weighted' | 'raw'
  const [editingJob, setEditingJob] = useState(null)
  const [plannerData, setPlannerData] = useState(planners)

  const withCapacity = plannerData.map(p => ({
    ...p,
    ...calcCapacity(p),
  }))

  const selectedWithCap = withCapacity.find(p => p.name === selected.name)
  const pct = view === 'weighted' ? selectedWithCap.weightedPct : selectedWithCap.rawPct

  const nearCapacity = withCapacity.filter(p =>
    (view === 'weighted' ? p.weightedPct : p.rawPct) >= 75
  )

  const totalAvailableHrs = plannerData.reduce((sum, p) => {
    const { totalHrs } = calcCapacity(p)
    return sum + (p.available - totalHrs)
  }, 0)

  const avgCapacity = Math.round(
    withCapacity.reduce((sum, p) => sum + (view === 'weighted' ? p.weightedPct : p.rawPct), 0) / withCapacity.length
  )

  const updateJobComplexity = (plannerName, jobCode, complexity) => {
    setPlannerData(prev => prev.map(p => {
      if (p.name !== plannerName) return p
      return {
        ...p,
        jobs: p.jobs.map(j => j.code === jobCode ? { ...j, complexity } : j)
      }
    }))
  }

  const updateJobHrs = (plannerName, jobCode, hrs) => {
    setPlannerData(prev => prev.map(p => {
      if (p.name !== plannerName) return p
      return {
        ...p,
        jobs: p.jobs.map(j => j.code === jobCode ? { ...j, hrs: parseFloat(hrs) || 0 } : j)
      }
    }))
  }

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Total planners</div>
          <div className="text-xl font-semibold">{plannerData.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Active this week</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Avg capacity</div>
          <div className="text-xl font-semibold">{avgCapacity}%</div>
          <div className="text-xs text-gray-400 mt-0.5">{view === 'weighted' ? 'Complexity weighted' : 'Raw hours'}</div>
        </div>
        <div className={`rounded-lg p-3 ${nearCapacity.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className={`text-xs mb-1 ${nearCapacity.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>Near capacity</div>
          <div className={`text-xl font-semibold ${nearCapacity.length > 0 ? 'text-red-600' : 'text-gray-800'}`}>{nearCapacity.length}</div>
          <div className={`text-xs mt-0.5 ${nearCapacity.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {nearCapacity.length > 0 ? nearCapacity.map(p => p.initials).join(' · ') : 'All within capacity'}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Available hrs</div>
          <div className="text-xl font-semibold text-emerald-600">{totalAvailableHrs} hrs</div>
          <div className="text-xs text-gray-400 mt-0.5">Across team this week</div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="text-xs text-gray-400">Capacity view:</div>
        <button
          onClick={() => setView('weighted')}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${view === 'weighted' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          Complexity weighted (C1–C4)
        </button>
        <button
          onClick={() => setView('raw')}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${view === 'raw' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          Raw hours
        </button>
        <div className="flex items-center gap-3 ml-4">
          {Object.entries(COMPLEXITY).map(([key, c]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.color}`}>{c.label}</span>
              <span className="text-xs text-gray-400">{c.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Team list */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Team — week of 17 Mar 2025</div>
          {withCapacity.map(p => {
            const capacityPct = view === 'weighted' ? p.weightedPct : p.rawPct
            return (
              <div
                key={p.name}
                onClick={() => setSelected(p)}
                className={`flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer rounded-lg px-2 transition-colors ${selected.name === p.name ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${p.color}`}>
                  {p.initials}
                </div>
                <div className="w-20 text-xs font-medium truncate">{p.name.split(' ')[0]} {p.name.split(' ')[1][0]}.</div>
                <div className="flex gap-1 flex-shrink-0">
                  {p.jobs.map(j => (
                    <span key={j.code} className={`text-xs px-1 py-0.5 rounded font-medium ${COMPLEXITY[j.complexity].color}`} style={{ fontSize: '9px' }}>
                      {j.complexity}
                    </span>
                  ))}
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${capacityPct >= 90 ? 'bg-red-500' : capacityPct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(capacityPct, 100)}%` }}
                  />
                </div>
                <div className={`text-xs font-medium w-8 text-right ${capacityPct >= 90 ? 'text-red-500' : capacityPct >= 75 ? 'text-amber-500' : 'text-gray-500'}`}>
                  {capacityPct}%
                </div>
              </div>
            )
          })}
          {nearCapacity.length > 0 && (
            <div className="mt-3 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">
              {nearCapacity.map(p => p.name.split(' ')[0]).join(' & ')} near capacity. Consider reassigning to {withCapacity.filter(p => (view === 'weighted' ? p.weightedPct : p.rawPct) < 50).map(p => p.name.split(' ')[0]).slice(0, 2).join(' or ')}.
            </div>
          )}
        </div>

        {/* Planner detail */}
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Planner profile</div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${selectedWithCap.color}`}>
                {selectedWithCap.initials}
              </div>
              <div>
                <div className="text-sm font-semibold">{selectedWithCap.name}</div>
                <div className="text-xs text-gray-400">{selectedWithCap.role} · ${selectedWithCap.rate}/hr</div>
              </div>
            </div>
            {[
              ['Specialisation', selectedWithCap.specialisation],
              ['Active jobs', selectedWithCap.jobs.length],
              ['Hours this week', `${selectedWithCap.totalHrs} / ${selectedWithCap.available} hrs`],
              ['Raw capacity', `${selectedWithCap.rawPct}%`],
              ['Weighted capacity', `${selectedWithCap.weightedPct}% (C1–C4 weighted)`],
              ['Revenue MTD', `$${(selectedWithCap.totalHrs * 4 * selectedWithCap.rate).toLocaleString()}`],
            ].map(([k, v]) => (
              <div key={k} className="flex py-1.5 border-b border-gray-50 last:border-0">
                <div className="text-xs text-gray-400 w-32 flex-shrink-0">{k}</div>
                <div className="text-xs font-medium">{v}</div>
              </div>
            ))}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{view === 'weighted' ? 'Weighted' : 'Raw'} capacity</span>
                <span>{view === 'weighted' ? selectedWithCap.weightedPct : selectedWithCap.rawPct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Active jobs with complexity editor */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Active jobs — set complexity & hours</div>
            {selectedWithCap.jobs.map((job, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <div className="text-xs font-medium">{job.code}</div>
                  <div className="text-xs text-gray-400">{job.name}</div>
                </div>
                <select
                  value={job.complexity}
                  onChange={e => updateJobComplexity(selectedWithCap.name, job.code, e.target.value)}
                  className={`text-xs px-2 py-1 rounded-lg border border-gray-200 font-medium focus:outline-none focus:border-emerald-400 ${COMPLEXITY[job.complexity].color}`}
                >
                  <option value="C1">C1 — Simple</option>
                  <option value="C2">C2 — Moderate</option>
                  <option value="C3">C3 — Complex</option>
                  <option value="C4">C4 — High</option>
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={job.hrs}
                    onChange={e => updateJobHrs(selectedWithCap.name, job.code, e.target.value)}
                    className="w-12 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-emerald-400 text-center"
                  />
                  <span className="text-xs text-gray-400">hrs</span>
                </div>
              </div>
            ))}
            <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between">
              <span className="text-xs text-gray-400">Total this week</span>
              <span className="text-xs font-semibold">{selectedWithCap.totalHrs} hrs · weighted {selectedWithCap.weightedPct}%</span>
            </div>
          </div>

          {/* All planners grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All planners</div>
            <div className="grid grid-cols-3 gap-2">
              {withCapacity.map(p => {
                const capacityPct = view === 'weighted' ? p.weightedPct : p.rawPct
                return (
                  <div
                    key={p.name}
                    onClick={() => setSelected(p)}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${selected.name === p.name ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center font-medium flex-shrink-0 ${p.color}`} style={{ fontSize: '9px' }}>
                        {p.initials}
                      </div>
                      <div className="text-xs font-medium truncate">{p.name.split(' ')[0]}</div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${capacityPct >= 90 ? 'bg-red-500' : capacityPct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(capacityPct, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-gray-400">{capacityPct}%</div>
                      <div className="flex gap-0.5">
                        {p.jobs.map(j => (
                          <span key={j.code} className={`rounded font-medium ${COMPLEXITY[j.complexity].color}`} style={{ fontSize: '8px', padding: '0px 3px' }}>
                            {j.complexity}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}