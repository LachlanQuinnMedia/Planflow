// src/ZoneField.jsx
// The planning zone on a job: pick from Queensland's standard zones (jobMeta.js) so nobody
// types one out. "Other" opens a box for a zone that is not on the list, such as a zone
// precinct or a priority development area.
import { useState } from 'react'
import { QLD_ZONES, standardZone } from './jobMeta'

const OTHER = '__other__'

export default function ZoneField({ value, onChange, className, id = 'job-zone' }) {
  const standard = standardZone(value)
  // "Other" stays chosen while the box is empty, so picking it does not snap back to "Choose..."
  const [other, setOther] = useState(() => !!String(value || '').trim() && !standard)
  const showOther = other || (!!String(value || '').trim() && !standard)
  const pick = (v) => {
    if (v === OTHER) { setOther(true); onChange(''); return }
    setOther(false); onChange(v)
  }
  return (
    <>
      <select id={id} data-testid="zone-select" value={showOther ? OTHER : standard} onChange={e => pick(e.target.value)} className={className}>
        <option value="">Choose a zone...</option>
        {QLD_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
        <option value={OTHER}>Other (type it in)</option>
      </select>
      {showOther && (
        <input autoFocus data-testid="zone-other" value={value || ''} onChange={e => onChange(e.target.value)}
          aria-label="Planning zone, typed" placeholder="Type the zone or precinct" className={`${className} mt-2`} />
      )}
    </>
  )
}
