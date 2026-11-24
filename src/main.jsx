import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'

// Three things live at this address, and each loads only its own code:
//   the public website   (the pages listed in src/site/pages.js)
//   a client's job summary (/summary/<token>)
//   the app              (everything else)
// index.html decides which, before anything is drawn, and leaves the answer in window.__qplanSite.
const root = document.getElementById('root')
const summaryMatch = window.location.pathname.match(/^\/summary\/([A-Za-z0-9_-]{20,})\/?$/)

// Lets QPlan be installed as an app and shows a friendly page when offline. Live site only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}

if (window.__qplanSite === true && !summaryMatch) {
  import('./site/SiteApp.jsx').then((mod) => {
    const SiteApp = mod.default
    const page = <StrictMode><SiteApp path={window.location.pathname} /></StrictMode>
    // The page arrives already written out (built by scripts/prerender.mjs). Wake it up in place.
    // If what arrived is some other page's words, or nothing, draw this page from scratch.
    const here = window.location.pathname.replace(/\/+$/, '') || '/'
    if (root.querySelector(':scope > .qp-site')?.dataset.page === here) hydrateRoot(root, page)
    else { root.textContent = ''; createRoot(root).render(page) }
  })
} else {
  Promise.all([import('./AppRoot.jsx'), import('./errorReport.js')]).then(([mod, { watchForErrors }]) => {
    const AppRoot = mod.default
    // The app reports its own crashes (see errorReport.js)
    watchForErrors()
    root.textContent = '' // at the front door the website's home page is written into this file; the app does not want it
    document.title = 'QPlan'
    createRoot(root).render(<StrictMode><AppRoot summaryToken={summaryMatch ? summaryMatch[1] : null} /></StrictMode>)
  })
}
