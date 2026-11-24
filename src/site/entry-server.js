// src/site/entry-server.js
// Used at build time only (scripts/prerender.mjs). Turns each website page into finished HTML,
// so search engines and people on slow connections get the words without waiting for scripts.
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import SiteApp from './SiteApp'
import { PAGES, SITE_URL } from './pages'
import { headFor, sitemap } from './head'

export { PAGES, SITE_URL, headFor, sitemap }
export const renderPage = (path) => renderToString(createElement(SiteApp, { path }))
