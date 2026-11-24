// src/site/clock.js
// Works out the calendar the website draws for a period of business days.
// The counting itself is the app's own (businessDays.js).
import { addBusinessDays, nonBusinessReason } from '../businessDays'

const DAY = 86400000
const utc = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const iso = (t) => new Date(t).toISOString().slice(0, 10)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
export const longDate = (d) => new Intl.DateTimeFormat('en-AU', LONG).format(new Date(utc(d)))

// Every day from the Monday before `start` to the Sunday after the period ends
export function clockDays(start, days, council, opts) {
  const end = addBusinessDays(start, days, council, opts)
  const first = utc(start) - ((new Date(utc(start)).getUTCDay() + 6) % 7) * DAY
  const last = utc(end) + ((7 - new Date(utc(end)).getUTCDay()) % 7) * DAY
  const out = []
  let count = 0
  for (let t = first; t <= last; t += DAY) {
    const d = iso(t)
    const inside = d > start && d <= end
    const reason = nonBusinessReason(d, council, opts)
    if (inside && !reason) count++
    out.push({
      date: d, day: Number(d.slice(8)), month: MONTHS[Number(d.slice(5, 7)) - 1],
      kind: d === start ? 'start' : !inside ? 'out' : reason ? 'skip' : d === end ? 'end' : 'count',
      count: inside && !reason ? count : null, reason,
    })
  }
  return { end, cells: out }
}
