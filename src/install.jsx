// src/install.jsx
// "Install app" for phones, tablets and desktops. On Android, Windows and Chrome the browser
// offers a one-tap install. On iPhone and iPad, Apple only allows it from the Share menu, so
// QPlan shows the two steps instead.
import { useState, useEffect } from 'react'

let savedPrompt = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    savedPrompt = e
    window.dispatchEvent(new Event('qplan-installable'))
  })
}

const isStandalone = () =>
  (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true

const isAppleTouch = () => {
  const ua = window.navigator.userAgent || ''
  const iPadOS = /Macintosh/.test(ua) && (window.navigator.maxTouchPoints || 0) > 1
  return /iPhone|iPad|iPod/.test(ua) || iPadOS
}

export function InstallAppButton() {
  const [canPrompt, setCanPrompt] = useState(!!savedPrompt)
  const [showSteps, setShowSteps] = useState(false)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const ready = () => setCanPrompt(true)
    const done = () => { savedPrompt = null; setCanPrompt(false); setInstalled(true) }
    window.addEventListener('qplan-installable', ready)
    window.addEventListener('appinstalled', done)
    return () => { window.removeEventListener('qplan-installable', ready); window.removeEventListener('appinstalled', done) }
  }, [])

  if (installed) return null
  const apple = isAppleTouch()
  if (!canPrompt && !apple) return null

  const install = async () => {
    if (savedPrompt) {
      savedPrompt.prompt()
      await savedPrompt.userChoice.catch(() => {})
      savedPrompt = null
      setCanPrompt(false)
      return
    }
    setShowSteps(v => !v)
  }

  return (
    <div>
      <button onClick={install}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 text-xs text-gray-600 transition-colors">
        <span>Install app</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
      </button>
      {showSteps && (
        <div className="mt-1 px-2 py-2 text-xs text-gray-600 bg-gray-50 rounded-lg leading-relaxed">
          In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
        </div>
      )}
    </div>
  )
}
