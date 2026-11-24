import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import JobSummary from './JobSummary.jsx'
import Notices from './Notices.jsx'
import { watchForErrors } from './errorReport.js'

// The app reports its own crashes (see errorReport.jsx)
watchForErrors()

// A share link (/summary/<token>) opens the read-only job summary. Everything else is the app.
const summaryMatch = window.location.pathname.match(/^\/summary\/([A-Za-z0-9_-]{20,})\/?$/)

// Lets QPlan be installed as an app and shows a friendly page when offline. Live site only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {summaryMatch ? <JobSummary token={summaryMatch[1]} /> : <App />}
    <Notices />
  </StrictMode>,
)
