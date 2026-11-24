// src/useAutoRefresh.js
// Keeps a list fresh without anyone pressing refresh: once a minute while the page is showing,
// and straight away when the person comes back to the tab or the connection returns.
// It never runs while a pop-up box is open or while someone is typing, so nothing jumps
// under their hands.
import { useEffect, useRef } from 'react'

const busy = () => {
  if (document.querySelector('.fixed.inset-0')) return true // a pop-up box is open
  const el = document.activeElement
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export function useAutoRefresh(refresh, everyMs = 60000) {
  const fn = useRef(refresh)
  const last = useRef(0)
  useEffect(() => { fn.current = refresh })
  useEffect(() => {
    last.current = Date.now()
    const auto = () => {
      if (document.visibilityState !== 'visible' || busy()) return
      if (Date.now() - last.current < 15000) return // not twice in quick succession
      last.current = Date.now()
      fn.current?.()
    }
    const timer = setInterval(auto, everyMs)
    document.addEventListener('visibilitychange', auto)
    window.addEventListener('focus', auto)
    window.addEventListener('online', auto)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', auto)
      window.removeEventListener('focus', auto)
      window.removeEventListener('online', auto)
    }
  }, [everyMs])
}
