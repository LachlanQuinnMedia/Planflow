// src/AppRoot.jsx
// The app itself (everything behind the login), or the read-only job summary a client opens.
import App from './App.jsx'
import JobSummary from './JobSummary.jsx'
import Notices from './Notices.jsx'

export default function AppRoot({ summaryToken }) {
  return (
    <>
      {summaryToken ? <JobSummary token={summaryToken} /> : <App />}
      <Notices />
    </>
  )
}
