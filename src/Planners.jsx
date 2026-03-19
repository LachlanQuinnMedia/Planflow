import { useState } from 'react'

const planners = [
  { initials: 'SB', name: 'Sarah Barnes', role: 'Principal Planner', rate: 185, pct: 96, activeJobs: 4, hrsMonth: 62, specialisation: 'MCU, RAA, Impact assessable', calendly: 'calendly.com/planflow/sarah-b', color: 'bg-emerald-100 text-emerald-700' },
  { initials: 'JT', name: 'James Thompson', role: 'Senior Planner', rate: 155, pct: 78, activeJobs: 3, hrsMonth: 48, specialisation: 'MCU, ROL', calendly: 'calendly.com/planflow/james-t', color: 'bg-blue-100 text-blue-700' },
  { initials: 'PM', name: 'Priya Mehta', role: 'Senior Planner', rate: 160, pct: 62, activeJobs: 2, hrsMonth: 40, specialisation: 'ROL, MCU, SPS', calendly: 'calendly.com/planflow/priya-m', color: 'bg-pink-100 text-pink-700' },
  { initials: 'AC', name: 'Amy Chen', role: 'Associate Planner', rate: 140, pct: 55, activeJobs: 2, hrsMonth: 36, specialisation: 'MCU, SPS, PE', calendly: 'calendly.com/planflow/amy-c', color: 'bg-purple-100 text-purple-700' },
  { initials: 'LR', name: 'Luke Rawlings', role: 'Associate Planner', rate: 135, pct: 45, activeJobs: 2, hrsMonth: 28, specialisation: 'ROL, OW', calendly: 'calendly.com/planflow/luke-r', color: 'bg-green-100 text-green-700' },
  { initials: 'BO', name: 'Ben Okafor', role: 'Graduate Planner', rate: 110, pct: 30, activeJobs: 1, hrsMonth: 22, specialisation: 'ROL, research support', calendly: 'calendly.com/planflow/ben-o', color: 'bg-amber-100 text-amber-700' },
  { initials: 'RK', name: 'Rachel Kim', role: 'Graduate Planner', rate: 115, pct: 40, activeJobs: 2, hrsMonth: 26, specialisation: 'MCU, OW', calendly: 'calendly.com/planflow/rachel-k', color: 'bg-orange-100 text-orange-700' },
  { initials: 'TW', name: 'Tom Walsh', role: 'Graduate Planner', rate: 110, pct: 25, activeJobs: 1, hrsMonth: 18, specialisation: 'RAA, research support', calendly: 'calendly.com/planflow/tom-w', color: 'bg-teal-100 text-teal-700' },
  { initials: 'CD', name: 'Chloe Davis', role: 'Associate Planner', rate: 140, pct: 50, activeJobs: 2, hrsMonth: 32, specialisation: 'MCU, PE', calendly: 'calendly.com/planflow/chloe-d', color: 'bg-indigo-100 text-indigo-700' },
  { initials: 'DP', name: 'Dev Patel', role: 'Senior Planner', rate: 160, pct: 35, activeJobs: 1, hrsMonth: 24, specialisation: 'SPS, ROL, MCU', calendly: 'calendly.com/planflow/dev-p', color: 'bg-rose-100 text-rose-700' },
  { initials: 'NS', name: 'Nina Singh', role: 'Associate Planner', rate: 140, pct: 60, activeJobs: 2, hrsMonth: 38, specialisation: 'MCU, OW', calendly: 'calendly.com/planflow/nina-s', color: 'bg-cyan-100 text-cyan-700' },
]

export default function Planners() {
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('Graduate Planner')
  const [newRate, setNewRate] = useState('')
  const [newSpec, setNewSpec] = useState('')

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-gray-400">{planners.length} planners in the team</div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          + Add planner
        </button>
      </div>

      {/* Add planner form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-emerald-200 p-4 mb-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">New planner</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Full name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Smith" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                <option>Principal Planner</option>
                <option>Senior Planner</option>
                <option>Associate Planner</option>
                <option>Graduate Planner</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hourly rate ($)</label>
              <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="150" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Specialisation</label>
              <input value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="MCU, ROL" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => { alert(`Planner ${newName} added!`); setShowAdd(false) }} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Add planner</button>
          </div>
        </div>
      )}

      {/* Planner grid */}
      <div className="grid grid-cols-3 gap-3">
        {planners.map(p => (
          <div
            key={p.name}
            onClick={() => setSelected(selected?.name === p.name ? null : p)}
            className={`bg-white rounded-xl border cursor-pointer transition-colors p-4 ${selected?.name === p.name ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${p.color}`}>
                {p.initials}
              </div>
              <div>
                <div className="text-xs font-semibold">{p.name}</div>
                <div className="text-xs text-gray-400">{p.role}</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-2">{p.specialisation}</div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
              <div className={`h-full rounded-full ${p.pct >= 90 ? 'bg-red-500' : p.pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${p.pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{p.activeJobs} active jobs</span>
              <span>{p.pct}% capacity</span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected planner detail */}
      {selected && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold ${selected.color}`}>
              {selected.initials}
            </div>
            <div>
              <div className="text-sm font-semibold">{selected.name}</div>
              <div className="text-xs text-gray-400">{selected.role} · ${selected.rate}/hr</div>
            </div>
            <button onClick={() => setSelected(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              ['Specialisation', selected.specialisation],
              ['Active jobs', selected.activeJobs],
              ['Hours this month', `${selected.hrsMonth} hrs`],
              ['Capacity', `${selected.pct}%`],
              ['Revenue MTD', `$${(selected.hrsMonth * selected.rate).toLocaleString()}`],
              ['Calendly link', selected.calendly],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-xs text-gray-400 mb-0.5">{k}</div>
                <div className={`text-xs font-medium ${k === 'Calendly link' ? 'text-emerald-600' : ''}`}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}