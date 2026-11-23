// src/theme.js
// Light, Dark or Seasonal. The choice is remembered on this device.
// Seasonal changes its look each month by itself (see seasons.js). Nobody picks the season.
// The colours themselves live in index.css and seasons-palette.css.
import { brisbaneToday, seasonForDate, seasonById } from './seasons'

const KEY = 'qplan_theme'
export const THEME_CHOICES = ['light', 'dark', 'seasonal']

export function getThemeChoice() {
  try {
    const saved = localStorage.getItem(KEY)
    // "auto" was the old third choice. It has gone, so those people are back on Light.
    return THEME_CHOICES.includes(saved) ? saved : 'light'
  } catch {
    return 'light'
  }
}

// The season for today. For looking at another month without waiting for it, open QPlan with
// ?season=easter (or any id from seasons.js) on the end of the address. That lasts until the tab closes.
export function currentSeason() {
  try {
    const asked = new URLSearchParams(window.location.search).get('season')
    if (asked) sessionStorage.setItem('qplan_season_preview', asked)
    const preview = seasonById(sessionStorage.getItem('qplan_season_preview'))
    if (preview) return preview
  } catch { /* storage unavailable */ }
  return seasonForDate(brisbaneToday())
}

export function applyTheme(choice = getThemeChoice()) {
  const root = document.documentElement
  // The job summary that clients open is always plain and light
  const summary = window.location.pathname.indexOf('/summary/') === 0
  const season = choice === 'seasonal' && !summary ? currentSeason() : null
  const next = summary ? 'light' : season ? season.base : choice === 'dark' ? 'dark' : 'light'
  const nextSeason = season ? season.id : ''
  if (root.dataset.theme !== next || (root.dataset.season || '') !== nextSeason) {
    // Change every colour in the same instant. Buttons and rows have their own short colour fades,
    // and left alone they lag behind the rest of the page, which looks like a flash.
    root.classList.add('qp-theme-switching')
    root.dataset.theme = next
    if (nextSeason) root.dataset.season = nextSeason
    else delete root.dataset.season
    void root.offsetHeight // apply the new colours now, while the fades are off
    const done = () => root.classList.remove('qp-theme-switching')
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(done))
    else setTimeout(done, 50)
    window.dispatchEvent(new Event('qplan:theme'))
  }
  // The phone's status bar and the installed app's title bar follow the theme
  const bar = document.querySelector('meta[name="theme-color"]')
  if (bar) bar.setAttribute('content', next === 'dark' ? '#151d1a' : '#ffffff')
}

export function setThemeChoice(choice) {
  try { localStorage.setItem(KEY, choice) } catch { /* storage unavailable */ }
  applyTheme(choice)
}

// On Seasonal, move to the new month's look when the month turns over, without a reload
export function watchSeason() {
  const check = () => { if (getThemeChoice() === 'seasonal' && document.visibilityState !== 'hidden') applyTheme('seasonal') }
  const timer = setInterval(check, 10 * 60 * 1000)
  document.addEventListener('visibilitychange', check)
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check) }
}
