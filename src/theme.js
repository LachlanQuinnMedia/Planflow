// src/theme.js
// Light, Dark or Auto (follow the device). The choice is remembered on this device.
// The dark colours themselves live in index.css.

const KEY = 'qplan_theme'
export const THEME_CHOICES = ['light', 'dark', 'auto']

const systemDark = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches

export function getThemeChoice() {
  try {
    const saved = localStorage.getItem(KEY)
    return THEME_CHOICES.includes(saved) ? saved : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(choice = getThemeChoice()) {
  const dark = choice === 'dark' || (choice === 'auto' && systemDark())
  const root = document.documentElement
  const next = dark ? 'dark' : 'light'
  if (root.dataset.theme !== next) {
    // Change every colour in the same instant. Buttons and rows have their own short colour fades,
    // and left alone they lag behind the rest of the page, which looks like a flash.
    root.classList.add('qp-theme-switching')
    root.dataset.theme = next
    void root.offsetHeight // apply the new colours now, while the fades are off
    const done = () => root.classList.remove('qp-theme-switching')
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(done))
    else setTimeout(done, 50)
  }
  // The phone's status bar and the installed app's title bar follow the theme
  const bar = document.querySelector('meta[name="theme-color"]')
  if (bar) bar.setAttribute('content', dark ? '#151d1a' : '#ffffff')
}

export function setThemeChoice(choice) {
  try { localStorage.setItem(KEY, choice) } catch { /* storage unavailable */ }
  applyTheme(choice)
}

// On Auto, follow the device when it switches between light and dark (for example at sunset)
export function watchSystemTheme() {
  if (typeof window.matchMedia !== 'function') return () => {}
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => { if (getThemeChoice() === 'auto') applyTheme('auto') }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
