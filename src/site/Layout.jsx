// src/site/Layout.jsx
// The frame every page of the public website shares: top bar, footer, and the few building
// blocks the pages are made from. Links are ordinary links: each page is its own address.
import Logo from '../Logo'
import { PAGES } from './pages'

const NAV = ['/features', '/da-tracking', '/integrations', '/business-day-calculator', '/security']
const nameOf = (path) => PAGES.find(p => p.path === path)?.name || path

// The faint lines of a lot plan, behind the green bands
export function LotLines() {
  return (
    <svg className="qs-lots" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M-20 470 C 200 430 380 520 640 470 S 1050 380 1240 430" strokeWidth="3" />
      <path d="M-20 520 C 200 480 380 570 640 520 S 1050 430 1240 480" strokeWidth="3" />
      <path d="M60 455 L20 60 M210 446 L190 40 M360 462 L352 30 M505 474 L520 20 M650 468 L690 30 M800 440 L850 40 M950 412 L1010 50 M1090 404 L1160 70" />
      <path d="M32 180 L1185 250 M26 120 L520 150 M540 152 L1175 190" />
      <path d="M40 300 L512 330 M660 338 L1120 366" strokeDasharray="10 8" />
      <circle cx="505" cy="474" r="6" /><circle cx="650" cy="468" r="6" /><circle cx="520" cy="20" r="6" />
    </svg>
  )
}

export function Header({ path }) {
  return (
    <header className="qs-header">
      <div className="qs-wrap flex items-center gap-4 lg:gap-7 h-16">
        <a href="/" aria-label="QPlan home" className="flex items-center mr-auto lg:mr-2"><Logo className="h-8 w-auto" /></a>
        <nav aria-label="Main" className="qs-nav hidden lg:flex items-center gap-6 mr-auto">
          {NAV.map(p => <a key={p} href={p} aria-current={path === p ? 'page' : undefined}>{nameOf(p)}</a>)}
        </nav>
        <a href="/login" className="qs-btn qs-btn-line qs-btn-sm qs-from-sm" data-testid="site-login">Log in</a>
        <a href="/contact" className="qs-btn qs-btn-green qs-btn-sm qs-from-narrow">Book a demo</a>
        <details className="qs-menu">
          <summary className="qs-btn qs-btn-line qs-btn-sm" aria-label="Menu" data-testid="site-menu">Menu</summary>
          <div className="qs-menu-panel">
            <nav aria-label="All pages" className="qs-wrap py-2">
              {PAGES.map(p => <a key={p.path} href={p.path} aria-current={path === p.path ? 'page' : undefined}>{p.name}</a>)}
              <a href="/login">Log in</a>
            </nav>
          </div>
        </details>
      </div>
    </header>
  )
}

const FOOT = [
  ['QPlan', ['/features', '/da-tracking', '/time-and-invoicing', '/documents-and-templates']],
  ['Setting up', ['/integrations', '/import-old-jobs', '/security', '/faq']],
  ['For planners', ['/business-day-calculator', '/da-timeframes-queensland']],
]

export function Footer() {
  return (
    <footer className="qs-forest">
      <div className="qs-wrap py-12 grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <Logo className="h-8 w-auto" tone="on-dark" />
          <p className="mt-4 text-white/80 qs-measure">Practice management software for town planners. Built in Queensland around the Planning Act 2016.</p>
          <p className="mt-2 qs-wide" style={{ color: '#fff', fontSize: '1.05rem' }}>Less Process More Progress</p>
        </div>
        <div className="grid gap-8 grid-cols-2 sm:grid-cols-3">
          {FOOT.map(([heading, paths]) => (
            <nav key={heading} aria-label={heading}>
              <div className="qs-small font-semibold text-white/60 mb-2">{heading}</div>
              <ul className="space-y-2">
                {paths.map(p => <li key={p}><a href={p} className="text-white/90 hover:text-white no-underline hover:underline underline-offset-4">{nameOf(p)}</a></li>)}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="qs-wrap py-5 flex flex-wrap gap-x-6 gap-y-2 qs-small text-white/70">
          <span>© {new Date().getFullYear()} QPlan</span>
          <a href="/contact" className="hover:text-white">Book a demo</a>
          <a href="/login" className="hover:text-white">Log in</a>
        </div>
      </div>
    </footer>
  )
}

// The green band at the top of every page but the home page
export function PageHero({ title, lead, children }) {
  return (
    <section className="qs-green qs-on-green">
      <LotLines />
      <div className="qs-wrap py-14 sm:py-20">
        <h1 className="qs-h1 max-w-4xl">{title}</h1>
        {lead && <p className="qs-lead mt-5 qs-measure text-white/90">{lead}</p>}
        {children}
      </div>
    </section>
  )
}

export function Section({ title, intro, tone, children, id }) {
  return (
    <section id={id} className={`${tone === 'mist' ? 'qs-mist' : tone === 'forest' ? 'qs-forest qs-on-green' : ''} qs-band scroll-mt-20`}>
      <div className="qs-wrap">
        {title && <h2 className="qs-h2 max-w-3xl">{title}</h2>}
        {intro && <p className={`mt-4 qs-measure ${tone === 'forest' ? 'text-white/85' : 'qs-soft'}`}>{intro}</p>}
        <div className={title ? 'mt-8 sm:mt-10' : ''}>{children}</div>
      </div>
    </section>
  )
}

// rows: [term, description, href?]
export function Ledger({ rows }) {
  return (
    <dl className="qs-ledger">
      {rows.map(([term, text, href]) => (
        <div key={term}>
          <dt>{href ? <a href={href}>{term}</a> : term}</dt>
          <dd>{text}{href && <> <a href={href} className="qs-link whitespace-nowrap">Read more</a></>}</dd>
        </div>
      ))}
    </dl>
  )
}

// steps: [title, text]
export function Steps({ steps }) {
  return (
    <ol className="qs-steps">
      {steps.map(([title, text]) => (
        <li key={title}>
          <div>
            <div className="qs-h3 qs-wide">{title}</div>
            <p className="mt-1 opacity-85">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

// items: [question, answer]
export function Faq({ items }) {
  return (
    <div className="qs-faq">
      {items.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <div>{a}</div>
        </details>
      ))}
    </div>
  )
}

// The closing band on every page
export function DemoBand({ title = 'See QPlan with your own jobs.', text = 'Tell us a little about your firm. We will set up a time and walk you through it.' }) {
  return (
    <section className="qs-green qs-on-green">
      <LotLines />
      <div className="qs-wrap qs-band flex flex-wrap items-center gap-x-10 gap-y-6">
        <div className="flex-1 basis-80">
          <h2 className="qs-h2">{title}</h2>
          <p className="mt-3 text-white/90 qs-measure">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/contact" className="qs-btn qs-btn-gold">Book a demo</a>
          <a href="/features" className="qs-btn qs-btn-line">See the features</a>
        </div>
      </div>
    </section>
  )
}

export function Shell({ path, children }) {
  return (
    <div className="qp-site" data-page={path}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <Header path={path} />
      <main id="main">{children}</main>
      <Footer />
    </div>
  )
}
