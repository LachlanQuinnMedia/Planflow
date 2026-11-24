// src/site/head.js
// What goes in the <head> of each website page: title, description, the address search
// engines should use, the card shown when a link is shared, and the facts search engines read.
import { SITE_URL, PAGES } from './pages'
import { FAQ_TEXT } from './faqData'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const urlFor = (path) => SITE_URL + (path === '/' ? '/' : path)

const ORG = { '@type': 'Organization', '@id': SITE_URL + '/#org', name: 'QPlan', url: SITE_URL + '/', logo: SITE_URL + '/icons/icon-512.png', slogan: 'Less Process More Progress', areaServed: { '@type': 'AdministrativeArea', name: 'Queensland, Australia' } }

function facts(page) {
  const graph = [ORG]
  if (page.path === '/') {
    graph.push({ '@type': 'WebSite', '@id': SITE_URL + '/#site', url: SITE_URL + '/', name: 'QPlan', inLanguage: 'en-AU', publisher: { '@id': ORG['@id'] } })
    graph.push({
      '@type': 'SoftwareApplication', name: 'QPlan', url: SITE_URL + '/', applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Practice management software for town planners', operatingSystem: 'Web, iOS, Android, Windows, macOS',
      description: page.description, publisher: { '@id': ORG['@id'] },
      featureList: ['Development application tracking in business days', 'Job management', 'Document templates', 'Time tracking against budget', 'Xero invoicing', 'Microsoft 365 job folders', 'Client summary links'],
    })
  } else {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: page.name, item: urlFor(page.path) },
      ],
    })
  }
  if (page.key === 'faq') {
    graph.push({ '@type': 'FAQPage', mainEntity: FAQ_TEXT.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })
  }
  if (page.key === 'calculator') {
    graph.push({ '@type': 'WebApplication', name: 'Queensland business day calculator', url: urlFor(page.path), applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' }, description: page.description, publisher: { '@id': ORG['@id'] } })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

// The tags for one page, as text ready to drop into the <head>
export function headFor(page) {
  const url = urlFor(page.path)
  const image = SITE_URL + '/og.png'
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="QPlan" />`,
    `<meta property="og:locale" content="en_AU" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    `<script type="application/ld+json">${JSON.stringify(facts(page)).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ')
}

export function sitemap(today) {
  const rows = PAGES.map(p => `  <url><loc>${esc(urlFor(p.path))}</loc><lastmod>${today}</lastmod></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`
}
