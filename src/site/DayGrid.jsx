// src/site/DayGrid.jsx
// The statutory clock, drawn as a calendar: the days that count are numbered, the days that
// do not are hatched. It uses the same counting code as the app (businessDays.js), so what
// the website shows is what QPlan does.
import { clockDays, longDate } from './clock'

export default function DayGrid({ start, days, council = '', publicNotice = false, light = false, label }) {
  const opts = publicNotice ? { publicNotice: true } : {}
  const { end, cells } = clockDays(start, days, council, opts)
  // More than ten weeks would be a wall of squares. The dates in words say it instead.
  const tooLong = cells.length > 70
  return (
    <figure className={`qs-clock ${light ? 'qs-clock-light' : ''}`} data-testid="day-grid">
      <figcaption className="mb-3">
        <div className="qs-wide" style={{ color: 'inherit', fontSize: '1.05rem' }}>{label || `${days} business days`}</div>
        <div className="qs-small opacity-80">Starts {longDate(start)}. Ends <strong data-testid="day-grid-end">{longDate(end)}</strong>.</div>
      </figcaption>
      {!tooLong && (
        <div className="qs-days" role="img" aria-label={`A calendar from ${longDate(cells[0].date)} to ${longDate(cells[cells.length - 1].date)}. ${days} business days after ${longDate(start)} is ${longDate(end)}.`}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="qs-dow" aria-hidden="true">{d}</div>)}
          {cells.map((c, i) => (
            <div key={c.date} aria-hidden="true" title={c.reason || undefined}
              className={`qs-day qs-day-${c.kind}`}>
              <span className="qs-date">{c.day}{(i === 0 || c.day === 1) ? ` ${c.month}` : ''}</span>
              {c.count !== null && <span className="qs-count">{c.count}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="qs-small mt-3 flex flex-wrap gap-x-5 gap-y-1 opacity-90">
        <span><span className="qs-key qs-day-count" />Counted</span>
        <span><span className="qs-key qs-day-skip" />Not a business day</span>
        <span><span className="qs-key qs-day-end" />Last day</span>
      </div>
    </figure>
  )
}
