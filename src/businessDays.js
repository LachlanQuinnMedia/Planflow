// src/businessDays.js
// Queensland business-day calculator for statutory DA periods.
//
// A business day here is a day that is NOT:
//   - a Saturday or Sunday
//   - a Queensland public holiday
//   - the local show holiday for the job's council (where one is on file below)
//   - a day from 26 December to 1 January (Planning Act 2016, schedule 2:
//     "business day does not include a day between 26 December of a year and
//     1 January of the next year")
//
// Sources, checked 23 November 2026:
//   Public holidays  https://www.qld.gov.au/recreation/travel/holidays/public
//   Show holidays    https://www.qld.gov.au/recreation/travel/holidays/show
//   Planning Act     https://www.legislation.qld.gov.au/view/whole/html/current/act-2016-025
//
// TO UPDATE EACH YEAR: add the new year's dates to STATE_HOLIDAYS and SHOW_HOLIDAYS,
// then move HOLIDAY_DATA_END / SHOW_DATA_END forward.
//
// Christmas Eve (24 December) is a public holiday only from 6pm, so it is counted
// as a business day.

export const HOLIDAY_DATA_END = '2028-12-31'
export const SHOW_DATA_END = '2027-12-31'

const STATE_HOLIDAYS = {
  // 2026
  '2026-01-01': "New Year's Day",
  '2026-01-26': 'Australia Day',
  '2026-04-03': 'Good Friday',
  '2026-04-04': 'The day after Good Friday',
  '2026-04-05': 'Easter Sunday',
  '2026-04-06': 'Easter Monday',
  '2026-04-25': 'Anzac Day',
  '2026-05-04': 'Labour Day',
  '2026-10-05': "King's Birthday",
  '2026-12-25': 'Christmas Day',
  '2026-12-26': 'Boxing Day',
  '2026-12-28': 'Boxing Day holiday',
  // 2027
  '2027-01-01': "New Year's Day",
  '2027-01-26': 'Australia Day',
  '2027-03-26': 'Good Friday',
  '2027-03-27': 'The day after Good Friday',
  '2027-03-28': 'Easter Sunday',
  '2027-03-29': 'Easter Monday',
  '2027-04-26': 'Anzac Day holiday',
  '2027-05-03': 'Labour Day',
  '2027-10-04': "King's Birthday",
  '2027-12-25': 'Christmas Day',
  '2027-12-26': 'Boxing Day',
  '2027-12-27': 'Christmas Day holiday',
  '2027-12-28': 'Boxing Day holiday',
  // 2028
  '2028-01-01': "New Year's Day",
  '2028-01-03': "New Year's Day holiday",
  '2028-01-26': 'Australia Day',
  '2028-04-14': 'Good Friday',
  '2028-04-15': 'The day after Good Friday',
  '2028-04-16': 'Easter Sunday',
  '2028-04-17': 'Easter Monday',
  '2028-04-25': 'Anzac Day',
  '2028-05-01': 'Labour Day',
  '2028-10-02': "King's Birthday",
  '2028-12-25': 'Christmas Day',
  '2028-12-26': 'Boxing Day',
}

// Show holidays that apply to a whole council area. Councils where the show holiday
// only covers part of the area (for example Sunshine Coast, Toowoomba, Gympie,
// Bundaberg) are left out on purpose: the planner adjusts the end date by hand.
const SHOW_HOLIDAYS = {
  brisbane: {
    name: 'Royal Queensland Show (Brisbane)',
    dates: ['2026-08-12', '2027-08-11', '2028-08-16'],
  },
  goldcoast: {
    name: 'Gold Coast Show',
    dates: ['2026-08-28', '2027-08-27'],
  },
  ekkaMonday: {
    name: 'Royal Queensland Show holiday',
    dates: ['2026-08-10', '2027-08-09'],
  },
  ipswich: {
    name: 'Ipswich Show',
    dates: ['2026-05-15', '2027-05-14'],
  },
  noosa: {
    name: 'Noosa Show',
    dates: ['2026-09-11', '2027-09-10'],
  },
}

// QPlan council name -> show holiday set
const COUNCIL_SHOW = {
  'Brisbane City Council': 'brisbane',
  'Port of Brisbane': 'brisbane',
  'City of Gold Coast': 'goldcoast',
  'Logan City Council': 'ekkaMonday',
  'City of Moreton Bay': 'ekkaMonday',
  'The Mill at Moreton Bay': 'ekkaMonday',
  'South Pine Sports Complex Development Code': 'ekkaMonday',
  'Redland City Council': 'ekkaMonday',
  'Scenic Rim Regional Council': 'ekkaMonday',
  'Lockyer Valley Regional Council': 'ekkaMonday',
  'Somerset Regional Council': 'ekkaMonday',
  'Ipswich City Council': 'ipswich',
  'Noosa Shire Council': 'noosa',
}

const DAY_MS = 86400000

function toUTC(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUTC(t) {
  return new Date(t).toISOString().slice(0, 10)
}

export function isValidDateStr(dateStr) {
  return /^\d{4}-\d{2}-\d{2}/.test(String(dateStr || '')) && !isNaN(toUTC(dateStr))
}

// Today's date as YYYY-MM-DD in Brisbane time (not UTC)
export function todayBrisbane() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function showSetFor(council) {
  const key = COUNCIL_SHOW[council]
  return key ? SHOW_HOLIDAYS[key] : null
}

// True when a show holiday is on file for this council
export function hasShowHoliday(council) {
  return !!showSetFor(council)
}

function isChristmasClosure(dateStr) {
  const md = dateStr.slice(5, 10)
  return (md >= '12-26' && md <= '12-31') || md === '01-01'
}

// Name of the public or show holiday on this date for this council, or null
export function holidayName(dateStr, council) {
  const d = String(dateStr).slice(0, 10)
  if (STATE_HOLIDAYS[d]) return STATE_HOLIDAYS[d]
  const show = showSetFor(council)
  if (show && show.dates.includes(d)) return show.name
  return null
}

// Why a date is not a business day (string), or null when it is a business day
export function nonBusinessReason(dateStr, council) {
  const d = String(dateStr).slice(0, 10)
  const dow = new Date(toUTC(d)).getUTCDay()
  if (dow === 6) return 'Saturday'
  if (dow === 0) return 'Sunday'
  const holiday = holidayName(d, council)
  if (holiday) return holiday
  if (isChristmasClosure(d)) return 'Christmas period (26 Dec to 1 Jan)'
  return null
}

export function isBusinessDay(dateStr, council) {
  return nonBusinessReason(dateStr, council) === null
}

// The date that is `days` business days after `startStr`. The start date itself is
// not counted (a period "within 10 business days after" a day starts the next day).
export function addBusinessDays(startStr, days, council) {
  if (!isValidDateStr(startStr)) return ''
  const n = Math.max(0, Math.round(Number(days) || 0))
  let t = toUTC(startStr)
  let counted = 0
  let guard = 0
  while (counted < n && guard < 5000) {
    t += DAY_MS
    guard++
    if (isBusinessDay(fromUTC(t), council)) counted++
  }
  return fromUTC(t)
}

// Business days from `fromStr` (default today in Brisbane) to `endStr`.
// Positive = days remaining, 0 = due today, negative = business days overdue.
export function businessDaysUntil(endStr, council, fromStr = todayBrisbane()) {
  if (!isValidDateStr(endStr) || !isValidDateStr(fromStr)) return null
  const end = toUTC(endStr)
  const from = toUTC(fromStr)
  if (end === from) return 0
  const forward = end > from
  let t = forward ? from : end
  const stop = forward ? end : from
  let count = 0
  let guard = 0
  while (t < stop && guard < 5000) {
    t += DAY_MS
    guard++
    if (isBusinessDay(fromUTC(t), council)) count++
  }
  return forward ? count : -count
}

// Weekday holidays and closure days skipped between two dates (start excluded, end included).
// Returns [{ date, name, closure? }], with the Christmas period collapsed into one entry (closure: true).
export function skippedHolidays(startStr, endStr, council) {
  if (!isValidDateStr(startStr) || !isValidDateStr(endStr)) return []
  const out = []
  let closureAdded = false
  let t = toUTC(startStr)
  const end = toUTC(endStr)
  let guard = 0
  while (t < end && guard < 5000) {
    t += DAY_MS
    guard++
    const d = fromUTC(t)
    const dow = new Date(t).getUTCDay()
    if (dow === 0 || dow === 6) continue
    const holiday = holidayName(d, council)
    if (holiday) { out.push({ date: d, name: holiday }); continue }
    if (isChristmasClosure(d) && !closureAdded) {
      out.push({ date: d, name: 'Christmas period, 26 Dec to 1 Jan', closure: true })
      closureAdded = true
    }
  }
  return out
}

// True when a date range runs past the holiday dates loaded above
export function beyondHolidayData(endStr, council) {
  if (!isValidDateStr(endStr)) return false
  const d = String(endStr).slice(0, 10)
  if (d > HOLIDAY_DATA_END) return true
  return hasShowHoliday(council) && d > SHOW_DATA_END
}

// "3 business days remaining" / "Due today" / "2 business days overdue"
export function businessDaysLabel(n) {
  if (n === null || n === undefined) return ''
  if (n === 0) return 'Due today'
  const abs = Math.abs(n)
  const unit = `business day${abs === 1 ? '' : 's'}`
  return n > 0 ? `${abs} ${unit} remaining` : `${abs} ${unit} overdue`
}

// Public holidays (state-wide plus the council's show day) for a set of dates, for calendars.
export function holidaysOn(dateStrs, council) {
  const out = {}
  for (const d of dateStrs) {
    const name = holidayName(d, council)
    if (name) out[d] = name
  }
  return out
}

// Calendar days from `fromStr` (default today in Brisbane) to `endStr`. Negative when in the past.
export function calendarDaysUntil(endStr, fromStr = todayBrisbane()) {
  if (!isValidDateStr(endStr) || !isValidDateStr(fromStr)) return null
  return Math.round((toUTC(endStr) - toUTC(fromStr)) / DAY_MS)
}
