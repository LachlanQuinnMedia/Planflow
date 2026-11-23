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
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
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
