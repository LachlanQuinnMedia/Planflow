// src/seasons.js
// The Seasonal theme: a different look each month, chosen by the date. Nobody picks one.
// (February has two: the Super Bowl for the first half, Lunar New Year for the second.)
//
// Each season has:
//   base     'light' or 'dark': which of the two ordinary themes it is built on
//   accent   the hue and strength of the main colour (buttons, links, the selected menu item)
//   tint     the faint hue of the page and card backgrounds
// The colours themselves are worked out from these in scripts/seasons-css.mjs, which writes
// src/seasons.css. Run `node scripts/seasons-css.mjs` after changing a number here.
// The pictures are in src/Seasonal.jsx.

export const SEASONS = [
  { id: 'newyear', month: 1, name: 'New Year', greeting: 'Happy New Year', base: 'dark', accent: { h: 285, c: 0.15 }, tint: { h: 270, c: 0.03 } },
  { id: 'superbowl', month: 2, toDay: 14, name: 'Super Bowl', greeting: 'Super Bowl season', base: 'light', accent: { h: 150, c: 0.13 }, tint: { h: 140, c: 0.008 } },
  { id: 'lunar', month: 2, fromDay: 15, name: 'Lunar New Year', greeting: 'Happy Lunar New Year', base: 'light', accent: { h: 172, c: 0.105 }, tint: { h: 62, c: 0.011 } },
  { id: 'womens', month: 3, name: "International Women's Day", greeting: "International Women's Day", base: 'light', accent: { h: 352, c: 0.17 }, tint: { h: 350, c: 0.012 } },
  { id: 'easter', month: 4, name: 'Easter', greeting: 'Happy Easter', base: 'light', accent: { h: 295, c: 0.13 }, tint: { h: 305, c: 0.009 } },
  { id: 'labour', month: 5, name: 'Labour Day', greeting: 'Labour Day', base: 'light', accent: { h: 252, c: 0.085 }, tint: { h: 250, c: 0.007 } },
  { id: 'environment', month: 6, name: 'World Environment Day', greeting: 'World Environment Day', base: 'light', accent: { h: 142, c: 0.14 }, tint: { h: 120, c: 0.012 } },
  { id: 'tour', month: 7, name: 'Tour de France', greeting: 'Tour de France', base: 'light', accent: { h: 258, c: 0.16 }, tint: { h: 245, c: 0.008 } },
  { id: 'ekka', month: 8, name: 'Ekka', greeting: 'Ekka time', base: 'light', accent: { h: 208, c: 0.105 }, tint: { h: 78, c: 0.010 } },
  { id: 'footy', month: 9, name: 'Footy finals', greeting: 'Finals footy', base: 'light', accent: { h: 158, c: 0.12 }, tint: { h: 140, c: 0.008 } },
  { id: 'halloween', month: 10, name: 'Halloween', greeting: 'Happy Halloween', base: 'dark', accent: { h: 52, c: 0.16 }, tint: { h: 305, c: 0.03 } },
  { id: 'remembrance', month: 11, name: 'Remembrance Day', greeting: 'Lest we forget', base: 'light', accent: { h: 155, c: 0.05 }, tint: { h: 85, c: 0.008 } },
  { id: 'christmas', month: 12, name: 'Christmas', greeting: 'Merry Christmas', base: 'light', accent: { h: 158, c: 0.125 }, tint: { h: 80, c: 0.009 } },
]

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Today's month and day in Brisbane, wherever the device thinks it is
export function brisbaneToday(now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now)
    const get = (type) => Number(parts.find(p => p.type === type)?.value)
    return { year: get('year'), month: get('month'), day: get('day') }
  } catch {
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
  }
}

export function seasonForDate({ month, day }) {
  return SEASONS.find(s => s.month === month && (s.fromDay || 1) <= day && day <= (s.toDay || 31)) || null
}

export const seasonById = (id) => SEASONS.find(s => s.id === id) || null
