// src/lazyPage.js
// Each page is downloaded the first time it is opened, not all at once when the app starts.
// That makes the first load much smaller, which matters most on phones.
//
// Two safety nets:
//  - After sign-in the remaining pages are fetched quietly in the background (preloadPages),
//    so moving between pages stays instant.
//  - If a page's file cannot be fetched (the app was updated while this tab was open, or the
//    connection dropped), the app reloads once. It reopens on the same page.
import { lazy } from 'react'

const RELOAD_FLAG = 'qplan_chunk_reload'
const loaders = []

export function lazyPage(load) {
  const safe = () => load().then(
    (mod) => { try { sessionStorage.removeItem(RELOAD_FLAG) } catch { /* storage unavailable */ } return mod },
    (err) => {
      let already = false
      try { already = sessionStorage.getItem(RELOAD_FLAG) === '1'; sessionStorage.setItem(RELOAD_FLAG, '1') } catch { already = true }
      if (!already && navigator.onLine !== false) { window.location.reload(); return new Promise(() => {}) } // the reload takes over
      throw err
    })
  loaders.push(safe)
  return lazy(safe)
}

// Fetch every page that has not been opened yet, one at a time, when the browser is idle
export function preloadPages() {
  const queue = [...loaders]
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400))
  const next = () => { const load = queue.shift(); if (!load) return; load().catch(() => {}).finally(() => idle(next)) }
  idle(next)
}
