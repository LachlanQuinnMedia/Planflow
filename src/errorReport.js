// src/errorReport.js
// When the app itself breaks, it says so plainly on screen and quietly tells QPlan, so a
// problem is known about before anyone has to report it.
//
// What is sent: the error message, the page it happened on, who was signed in and their
// firm. Nothing typed into the page is sent. Only the QPlan master account can read them
// (Firms page). A browser sends at most a handful per visit, and the same one only once.
import { supabase } from './supabase'
import { loadSession } from './auth'

const MAX_PER_VISIT = 6
const sent = new Set()
let page = ''
export const setErrorPage = (name) => { page = name || '' }

// Noise that is not QPlan's doing: browser extensions, a dropped connection, a cancelled request
const IGNORE = /ResizeObserver loop|Script error\.?$|Failed to fetch|NetworkError|Load failed|AbortError|The operation was aborted|chrome-extension:|moz-extension:|safari-extension:/i

export function reportError(error, where) {
  try {
    const message = String(error?.message || error || 'Unknown error').slice(0, 500)
    if (IGNORE.test(message) || sent.has(message) || sent.size >= MAX_PER_VISIT) return
    sent.add(message)
    const me = loadSession()
    if (!me?.id || !me?.company_id) return // only signed-in people can report
    const detail = [where, String(error?.stack || '').split('\n').slice(0, 6).join('\n')].filter(Boolean).join('\n').slice(0, 2000)
    supabase.from('client_errors').insert({
      company_id: me.company_id, user_id: me.id, username: me.username || null, page: page || null,
      message, detail: detail || null, url: window.location.pathname, user_agent: navigator.userAgent.slice(0, 300),
      app_version: document.querySelector('script[type=module][src]')?.getAttribute('src')?.slice(-24) || null,
    }).then(() => {}, () => {})
  } catch { /* reporting must never break the app */ }
}

// Errors nothing else caught
export function watchForErrors() {
  window.addEventListener('error', (e) => reportError(e.error || e.message, 'Uncaught error'))
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'Unhandled promise'))
}
