import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import JobSummary from './JobSummary.jsx'

// A share link (/summary/<token>) opens the read-only job summary. Everything else is the app.
const summaryMatch = window.location.pathname.match(/^\/summary\/([A-Za-z0-9_-]{20,})\/?$/)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {summaryMatch ? <JobSummary token={summaryMatch[1]} /> : <App />}
  </StrictMode>,
)
