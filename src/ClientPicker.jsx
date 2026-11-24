// src/ClientPicker.jsx
// "Find a past client" on the New Job form. Type part of a name, pick the client, and their
// details fill themselves in. Only shown once the firm has past clients.
import { useState, useRef } from 'react'
import { matchClients } from './newJobHelp'

export default function ClientPicker({ clients, onPick, inputClass }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const closing = useRef(null) // the short wait before the list closes, so a click on it still lands
  if (!clients.length) return null
  const matches = open ? matchClients(clients, query) : []
  const pick = (c) => { onPick(c); setQuery(''); setOpen(false) }
  const onKey = (e) => {
    if (!matches.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % matches.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + matches.length) % matches.length) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(matches[Math.min(active, matches.length - 1)]) }
    else if (e.key === 'Escape') setOpen(false)
  }
  return (
    <div className="relative mb-4" data-testid="client-picker">
      <label htmlFor="past-client" className="text-xs text-gray-600 mb-1 block">Worked with this client before?</label>
      <input id="past-client" value={query} autoComplete="off" role="combobox" aria-expanded={matches.length > 0} aria-controls="past-client-list"
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => { clearTimeout(closing.current); setOpen(true) }}
        onBlur={() => { closing.current = setTimeout(() => setOpen(false), 150) }} onKeyDown={onKey}
        placeholder="Start typing their name to fill in their details" className={inputClass} />
      {matches.length > 0 && (
        <ul id="past-client-list" role="listbox" className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {matches.map((c, i) => (
            <li key={c.key} role="option" aria-selected={i === active} data-testid="client-option"
              onMouseDown={e => { e.preventDefault(); pick(c) }} onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 cursor-pointer ${i === active ? 'bg-emerald-50' : ''}`}>
              <div className="text-sm font-medium text-gray-800">{c.label}</div>
              <div className="text-xs text-gray-500">{[c.sub, `${c.jobs} job${c.jobs === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</div>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length > 1 && matches.length === 0 && (
        <div className="text-xs text-gray-500 mt-1">No past client with that name. Enter their details below.</div>
      )}
    </div>
  )
}
