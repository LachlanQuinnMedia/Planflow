// src/newJobHelp.js
// Small helpers that save typing on the New Job form: past clients to pick from, referral
// agencies as tick boxes, and the council a firm usually works in.

// ---- Referral agencies ----
// The ones a Queensland planning firm names most often. Anything else goes in the "Other" box.
// Stored on the job as one line of text, comma separated, as it always was ("SARA, Energex").
export const REFERRAL_AGENCIES = ['SARA', 'Energex', 'Ergon Energy', 'Powerlink', 'Council', 'Port authority', 'Gold Coast Waterways Authority', 'Queensland Fire Department']

const agencyKey = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
const KNOWN_AGENCY = new Map(REFERRAL_AGENCIES.map(a => [agencyKey(a), a]))

// "SARA, energex, TMR rail" -> { ticked: ['SARA', 'Energex'], other: 'TMR rail' }
export function splitReferrals(text) {
  const ticked = [], rest = []
  for (const part of String(text || '').split(/[,;\n]+/)) {
    const p = part.replace(/\s+/g, ' ').trim()
    if (!p) continue
    const known = KNOWN_AGENCY.get(agencyKey(p))
    if (known) { if (!ticked.includes(known)) ticked.push(known) } else rest.push(p)
  }
  return { ticked: REFERRAL_AGENCIES.filter(a => ticked.includes(a)), other: rest.join(', ') }
}

export function joinReferrals(ticked, other) {
  // an agency typed into the Other box that has its own tick box becomes a tick, not a repeat
  const typed = splitReferrals(other)
  const all = [...ticked, ...typed.ticked]
  return [...REFERRAL_AGENCIES.filter(a => all.includes(a)), typed.other].filter(Boolean).join(', ')
}

// ---- Past clients ----
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()

// One entry per client from the firm's jobs, newest job first. A company is one client
// however many jobs it has. A person is matched on their full name.
export function pastClients(rows) {
  const byKey = new Map()
  for (const r of rows || []) {
    const company = r.client_type === 'company' ? clean(r.client_company) : ''
    const firstName = clean(r.client_first_name), lastName = clean(r.client_last_name)
    const person = clean(`${firstName} ${lastName}`)
    if (!company && !person) continue
    const key = (company ? 'c:' + company : 'p:' + person).toLowerCase()
    const found = byKey.get(key)
    if (!found) {
      byKey.set(key, { key, type: company ? 'company' : 'individual', company, firstName, lastName, email: clean(r.client_email), phone: clean(r.client_phone), jobs: 1 })
    } else {
      found.jobs++
      // the newest job wins, but an older job can fill a gap
      if (!found.email) found.email = clean(r.client_email)
      if (!found.phone) found.phone = clean(r.client_phone)
      if (!found.firstName && !found.lastName) { found.firstName = firstName; found.lastName = lastName }
    }
  }
  return [...byKey.values()].map(c => ({
    ...c,
    label: c.company || clean(`${c.firstName} ${c.lastName}`),
    sub: [c.company ? clean(`${c.firstName} ${c.lastName}`) : '', c.email, c.phone].filter(Boolean).join(', '),
  }))
}

// Clients whose name, contact or email has every word typed. Names that start with it come first.
export function matchClients(list, query, limit = 6) {
  const words = clean(query).toLowerCase().split(' ').filter(Boolean)
  if (!words.length) return []
  const scored = []
  for (const c of list) {
    const hay = `${c.label} ${c.sub}`.toLowerCase()
    if (!words.every(w => hay.includes(w))) continue
    scored.push([c.label.toLowerCase().startsWith(words[0]) ? 0 : 1, c])
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, limit).map(s => s[1])
}

// ---- The council to start on ----
// The council on most of the firm's recent jobs (rows are newest first), or '' if there are none.
export function usualCouncil(rows, recent = 50) {
  const counts = new Map()
  let seen = 0
  for (const r of rows || []) {
    const c = clean(r.council)
    if (!c) continue
    counts.set(c, (counts.get(c) || 0) + 1)
    if (++seen >= recent) break
  }
  let best = '', n = 0
  for (const [c, k] of counts) if (k > n) { best = c; n = k }
  return best
}

const lastCouncilKey = (userId) => `qplan_last_council_${userId}`
export function lastCouncil(userId) {
  try { return localStorage.getItem(lastCouncilKey(userId)) || '' } catch { return '' }
}
export function rememberCouncil(userId, council) {
  try { if (userId && council) localStorage.setItem(lastCouncilKey(userId), council) } catch { /* storage unavailable */ }
}
