// src/seasons.js
// The Seasonal theme: a different look each month, chosen by the date. Nobody picks one.
// (February has two: the Super Bowl for the first half, Lunar New Year for the second.)
//
// Each season has:
//   base     'light' or 'dark': which of the two ordinary themes it is built on
//   accent   the hue and strength of the main colour (buttons, links, the selected menu item)
//   page     the colour behind the cards (hue and strength). Light pink for Women's Day, and so on.
//            Kept gentle: Quinn asked for the colours to be relaxed (24 November 2026).
//   side     the menu's tint, when it differs from the page (optional)
//   bar      the top bar: lightness, strength and hue. Its text colour is picked to be readable.
//   line     the season's second colour. The logo's dot uses it when gold would not show on the bar.
//   tint     dark seasons only: the hue of the dark backgrounds
// The colours themselves are worked out from these in scripts/seasons-css.mjs, which writes
// src/seasons-palette.css. Run `node scripts/seasons-css.mjs` after changing a number here.
// The pictures are in src/seasonArt.jsx and src/Seasonal.jsx.

export const SEASONS = [
  // Midnight violet and gold
  { id: 'newyear', month: 1, name: 'New Year', greeting: 'Happy New Year', base: 'dark', accent: { h: 285, c: 0.12 }, tint: { h: 278, c: 0.05 },
    bar: { l: 0.33, c: 0.1, h: 295 }, line: { l: 0.82, c: 0.14, h: 88 } },
  // Football leather and lace white, over turf green
  { id: 'superbowl', month: 2, toDay: 14, name: 'Super Bowl', greeting: 'Super Bowl season', base: 'light', accent: { h: 150, c: 0.105 }, page: { h: 145, c: 0.018 },
    bar: { l: 0.42, c: 0.06, h: 64 }, line: { l: 0.96, c: 0.015, h: 90 } },
  // Red and gold, with jade buttons
  { id: 'lunar', month: 2, fromDay: 15, name: 'Lunar New Year', greeting: 'Happy Lunar New Year', base: 'light', accent: { h: 172, c: 0.085 }, page: { h: 22, c: 0.012 }, side: { h: 85, c: 0.045 },
    bar: { l: 0.47, c: 0.125, h: 31 }, line: { l: 0.83, c: 0.15, h: 88 } },
  // Pink, with the purple of International Women's Day
  { id: 'womens', month: 3, name: "International Women's Day", greeting: "International Women's Day", base: 'light', accent: { h: 352, c: 0.13 }, page: { h: 350, c: 0.02 },
    bar: { l: 0.5, c: 0.12, h: 342 }, line: { l: 0.6, c: 0.17, h: 305 } },
  // Pastels: lilac, mint and butter yellow
  { id: 'easter', month: 4, name: 'Easter', greeting: 'Happy Easter', base: 'light', accent: { h: 295, c: 0.1 }, page: { h: 305, c: 0.018 }, side: { h: 168, c: 0.045 },
    bar: { l: 0.82, c: 0.065, h: 300 }, line: { l: 0.9, c: 0.13, h: 98 } },
  // Denim blue and hi-vis orange
  { id: 'labour', month: 5, name: 'Labour Day', greeting: 'Labour Day', base: 'light', accent: { h: 252, c: 0.075 }, page: { h: 250, c: 0.011 },
    bar: { l: 0.43, c: 0.068, h: 252 }, line: { l: 0.76, c: 0.17, h: 60 } },
  // Forest green and new-leaf green
  { id: 'environment', month: 6, name: 'World Environment Day', greeting: 'World Environment Day', base: 'light', accent: { h: 142, c: 0.11 }, page: { h: 130, c: 0.018 },
    bar: { l: 0.4, c: 0.075, h: 148 }, line: { l: 0.82, c: 0.18, h: 125 } },
  // The yellow jersey, with French blue
  { id: 'tour', month: 7, name: 'Tour de France', greeting: 'Tour de France', base: 'light', accent: { h: 258, c: 0.12 }, page: { h: 98, c: 0.02 },
    bar: { l: 0.9, c: 0.085, h: 98 }, line: { l: 0.48, c: 0.17, h: 258 } },
  // Strawberry sundae: strawberry, vanilla cream and showbag teal
  { id: 'ekka', month: 8, name: 'Ekka', greeting: 'Ekka time', base: 'light', accent: { h: 208, c: 0.085 }, page: { h: 96, c: 0.016 }, side: { h: 8, c: 0.04 },
    bar: { l: 0.54, c: 0.115, h: 18 }, line: { l: 0.93, c: 0.06, h: 92 } },
  // Navy and gold over grass green
  { id: 'footy', month: 9, name: 'Footy finals', greeting: 'Finals footy', base: 'light', accent: { h: 158, c: 0.1 }, page: { h: 140, c: 0.018 },
    bar: { l: 0.31, c: 0.062, h: 262 }, line: { l: 0.81, c: 0.15, h: 85 } },
  // Black and orange
  { id: 'halloween', month: 10, name: 'Halloween', greeting: 'Happy Halloween', base: 'dark', accent: { h: 52, c: 0.12 }, tint: { h: 60, c: 0.008 },
    bar: { l: 0.5, c: 0.105, h: 62 }, line: { l: 0.2, c: 0.01, h: 60 } },
  // Quiet: charcoal, sage and a line of poppy red
  { id: 'remembrance', month: 11, name: 'Remembrance Day', greeting: 'Lest we forget', base: 'light', accent: { h: 155, c: 0.05 }, page: { h: 100, c: 0.014 },
    bar: { l: 0.31, c: 0.012, h: 150 }, line: { l: 0.55, c: 0.21, h: 27 } },
  // Velvet maroon and pine green, on a frosted white with a breath of green in it
  { id: 'christmas', month: 12, name: 'Christmas', greeting: 'Merry Christmas', base: 'light', accent: { h: 160, c: 0.085 }, page: { h: 155, c: 0.015 }, side: { h: 152, c: 0.062 },
    bar: { l: 0.35, c: 0.105, h: 9 }, line: { l: 0.8, c: 0.13, h: 85 } },
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
