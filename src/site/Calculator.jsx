// src/site/Calculator.jsx
// The free business day calculator. It uses the same counting code as the app.
import { useState } from 'react'
import { addBusinessDays, businessDaysUntil, skippedHolidays, beyondHolidayData, isValidDateStr, todayBrisbane, HOLIDAY_DATA_START, HOLIDAY_DATA_END } from '../businessDays'
import DayGrid from './DayGrid'
import { longDate } from './clock'

// Councils with a show holiday that covers the whole council area (the list the app keeps)
const COUNCILS = ['Brisbane City Council', 'City of Gold Coast', 'Logan City Council', 'City of Moreton Bay', 'Redland City Council', 'Ipswich City Council', 'Scenic Rim Regional Council', 'Lockyer Valley Regional Council', 'Somerset Regional Council', 'Noosa Shire Council']
const PRESETS = [5, 10, 15, 20, 25, 35]
const short = (d) => new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z'))

export default function Calculator() {
  const [mode, setMode] = useState('add') // add | between
  // Opens on a worked example that crosses the Christmas break. "Use today" swaps in today's date.
  const [start, setStart] = useState('2026-12-10')
  const [end, setEnd] = useState('2027-01-18')
  const [days, setDays] = useState(15)
  const [council, setCouncil] = useState('')
  const [publicNotice, setPublicNotice] = useState(true)
  const touch = (fn) => (v) => fn(v)

  const opts = publicNotice ? { publicNotice: true } : {}
  const n = Math.min(400, Math.max(1, Math.round(Number(days) || 0)))
  const okStart = isValidDateStr(start)
  const result = mode === 'add'
    ? (okStart ? addBusinessDays(start, n, council, opts) : '')
    : (okStart && isValidDateStr(end) ? businessDaysUntil(end, council, start, opts) : null)
  const rangeEnd = mode === 'add' ? result : end
  const skipped = okStart && isValidDateStr(rangeEnd) && rangeEnd >= start ? skippedHolidays(start, rangeEnd, council, opts) : []
  const beyond = okStart && isValidDateStr(rangeEnd) && beyondHolidayData(rangeEnd, council, start)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start" data-testid="calculator">
      <form className="qs-panel grid gap-4" onSubmit={e => e.preventDefault()}>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="qs-label">What do you want to work out?</legend>
          <button type="button" onClick={() => setMode('add')} aria-pressed={mode === 'add'} className={`qs-btn qs-btn-sm ${mode === 'add' ? 'qs-btn-green' : 'qs-btn-line'}`}>The end date of a period</button>
          <button type="button" onClick={() => setMode('between')} aria-pressed={mode === 'between'} className={`qs-btn qs-btn-sm ${mode === 'between' ? 'qs-btn-green' : 'qs-btn-line'}`}>Business days between two dates</button>
        </fieldset>
        <div>
          <label htmlFor="calc-start" className="qs-label">{mode === 'add' ? 'The day the period starts from' : 'From'}</label>
          <div className="flex gap-2">
            <input id="calc-start" type="date" className="qs-field" value={start} onChange={e => touch(setStart)(e.target.value)} />
            <button type="button" className="qs-btn qs-btn-line qs-btn-sm" onClick={() => setStart(todayBrisbane())}>Use today</button>
          </div>
          <p className="qs-small qs-soft mt-1">This day is not counted. Counting starts the next business day.</p>
        </div>
        {mode === 'add' ? (
          <div>
            <label htmlFor="calc-days" className="qs-label">Number of business days</label>
            <input id="calc-days" type="number" min="1" max="400" inputMode="numeric" className="qs-field" value={days} onChange={e => touch(setDays)(e.target.value)} />
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESETS.map(p => <button key={p} type="button" onClick={() => touch(setDays)(p)} aria-pressed={n === p} className={`qs-btn qs-btn-sm ${n === p ? 'qs-btn-gold' : 'qs-btn-line'}`}>{p}</button>)}
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="calc-end" className="qs-label">To</label>
            <input id="calc-end" type="date" className="qs-field" value={end} onChange={e => touch(setEnd)(e.target.value)} />
          </div>
        )}
        <div>
          <label htmlFor="calc-council" className="qs-label">Council (for the local show holiday)</label>
          <select id="calc-council" className="qs-field" value={council} onChange={e => touch(setCouncil)(e.target.value)}>
            <option value="">Another Queensland council (no show holiday applied)</option>
            {COUNCILS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <label className="flex gap-3 items-start cursor-pointer">
          <input type="checkbox" className="mt-1.5 w-4 h-4 flex-shrink-0" checked={publicNotice} onChange={e => touch(setPublicNotice)(e.target.checked)} />
          <span><span className="font-semibold">This is a public notification period</span><span className="block qs-small qs-soft">Uses the longer Christmas break, 20 December to 5 January. Other periods skip 26 December to 1 January.</span></span>
        </label>
      </form>

      <div className="grid gap-4" aria-live="polite">
        <div className="qs-panel">
          {mode === 'add' ? (
            <>
              <div className="qs-small qs-soft">{n} business day{n === 1 ? '' : 's'} after {okStart ? short(start) : 'the start date'} is</div>
              <div className="qs-result mt-1" data-testid="calc-result">{result ? longDate(result) : 'Choose a start date'}</div>
            </>
          ) : (
            <>
              <div className="qs-small qs-soft">From {okStart ? short(start) : 'the first date'} to {isValidDateStr(end) ? short(end) : 'the second date'}</div>
              <div className="qs-result mt-1" data-testid="calc-result">{result === null ? 'Choose two dates' : `${Math.abs(result)} business day${Math.abs(result) === 1 ? '' : 's'}${result < 0 ? ' earlier' : ''}`}</div>
            </>
          )}
          {skipped.length > 0 && (
            <div className="mt-4">
              <div className="qs-label">Weekdays skipped</div>
              <ul className="qs-small qs-soft" data-testid="calc-skipped">
                {skipped.map(s => <li key={s.date + s.name}>{s.closure ? s.name : `${short(s.date)}: ${s.name}`}</li>)}
              </ul>
            </div>
          )}
          {beyond && <p className="qs-small mt-4" style={{ color: '#9A3412', fontWeight: 600 }} data-testid="calc-beyond">Part of this range is outside the holiday dates loaded ({HOLIDAY_DATA_START.slice(0, 4)} to {HOLIDAY_DATA_END.slice(0, 4)}). Weekends and the Christmas break are still skipped, but check public holidays yourself.</p>}
        </div>
        {mode === 'add' && result && <DayGrid light start={start} days={n} council={council} publicNotice={publicNotice} />}
      </div>
    </div>
  )
}
