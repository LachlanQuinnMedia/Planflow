// src/site/SiteApp.jsx
// The public website. Picks the page for the address and puts it in the shared frame.
import { Shell } from './Layout'
import { pageFor } from './pages'
import Home from './Home'
import { Features, DaTracking, TimeInvoicing, Documents, Integrations, ImportJobs, Security } from './FeaturePages'
import { CalculatorPage, Timeframes, FaqPage, Contact } from './Resources'

const BODY = {
  home: Home, features: Features, daTracking: DaTracking, time: TimeInvoicing, documents: Documents,
  integrations: Integrations, importJobs: ImportJobs, security: Security,
  calculator: CalculatorPage, timeframes: Timeframes, faq: FaqPage, contact: Contact,
}

export default function SiteApp({ path }) {
  const page = pageFor(path) || pageFor('/')
  const Body = BODY[page.key]
  return <Shell path={page.path}><Body /></Shell>
}
