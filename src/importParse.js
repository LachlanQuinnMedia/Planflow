// src/importParse.js
// Working out old jobs from what a firm already has: the names of its job folders, or a
// spreadsheet exported from its old system. Nothing here talks to the database. It only reads
// text and makes its best guess, and the import page shows that guess before anything is saved.
import { APP_TYPES, buildJobName } from './jobMeta.js'

const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const STREET = /\b(street|st|road|rd|avenue|ave|av|drive|dr|court|ct|crescent|cres|cr|place|pl|parade|pde|terrace|tce|highway|hwy|lane|ln|way|boulevard|blvd|bvd|close|cl|circuit|cct|esplanade|esp|grove|gr|rise|quay|walk|track|square|sq|promenade|loop|row|chase|outlook|vista|mews|link)\b\.?/i
const COMPANY = /\b(pty|ltd|limited|p\/l|inc|group|holdings|trust|developments?|constructions?|builders?|homes|properties|property|investments?|enterprises|council|corporation|corp|architects?|projects|partners|super(annuation)?\s+fund|association|club|church|school|college|university)\b|&| and co\b/i

// Does this piece of text look like a street address?
export function looksLikeAddress(text) {
  const t = squash(text)
  if (!t) return false
  if (/^(lot|unit|shop|suite|level)\s*\d/i.test(t)) return true
  if (/^\d+[a-z]?(\s*[-/&]\s*\d+[a-z]?)*[\s,]/i.test(t) && (STREET.test(t) || /\d{4}\b/.test(t) || t.split(' ').length >= 2)) return true
  return STREET.test(t) && /\d/.test(t)
}

// A client's name as QPlan stores it: a company, or a person's first and last name
export function splitClient(name) {
  const n = squash(name).replace(/^[-–,.\s]+|[-–,\s]+$/g, '')
  if (!n) return { client_type: 'individual', client_company: null, client_first_name: null, client_last_name: null }
  if (COMPANY.test(n) || /\d/.test(n)) return { client_type: 'company', client_company: n, client_first_name: null, client_last_name: null }
  // "Smith, John" is last name first
  const comma = n.match(/^([^,]+),\s*(.+)$/)
  if (comma) return { client_type: 'individual', client_company: null, client_first_name: squash(comma[2]), client_last_name: squash(comma[1]) }
  const parts = n.split(' ')
  if (parts.length === 1) return { client_type: 'individual', client_company: null, client_first_name: null, client_last_name: parts[0] }
  return { client_type: 'individual', client_company: null, client_first_name: parts.slice(0, -1).join(' '), client_last_name: parts[parts.length - 1] }
}

// Job numbers as firms write them: 2023-041, 23/041, J1234, HPC-0412, 21045, 2024.118
const NUM_START = [
  /^[[(#]?\s*((?:19|20)\d{2}\s?[-_./]\s?\d{1,4}[a-z]?)\b/i,
  /^[[(#]?\s*(\d{2}\s?[-_./]\s?\d{2,4}[a-z]?)\b/i,
  /^[[(#]?\s*([a-z]{1,5}\s?[-_.]?\s?\d{2,6}(?:[-_./]\d{1,4})?[a-z]?)\b/i,
  /^[[(#]?\s*(\d{3,7}[a-z]?)\b(?!\s+[a-z]+\s+(?:street|st|road|rd|avenue|ave|drive|dr|court|ct)\b)/i,
]
const NUM_END = /[\s\-–_,(]+[[(#]?((?:19|20)\d{2}[-_./]\d{1,4}[a-z]?|[a-z]{1,5}[-_.]?\d{3,6}|\d{2}[-_./]\d{2,4})[\])]?\s*$/i

const tidyCode = (code) => squash(code).replace(/\s*([-_./])\s*/g, '$1').toUpperCase()

// "2023-041 Smith - 12 Example St, Southport" -> { code, client, address }
export function parseFolderName(raw) {
  // Underscores are used as separators ("21045_Brown_45 Ocean Pde") unless the name already has dashes
  const text = String(raw ?? '')
  const name = squash(text.replace(/_+/g, /\s[-–]\s/.test(text) ? ' ' : ' - '))
  let code = '', rest = name
  for (const re of NUM_START) {
    const m = rest.match(re)
    // A leading house number is not a job number: "12 Smith Street" stays an address
    // ...unless what follows the number is itself the start of an address ("0456 Lot 12", "1042 3 Bay St")
    const after = m ? rest.slice(m[0].length) : ''
    const houseNumber = m && re === NUM_START[3] && looksLikeAddress(rest) && !/[-–]/.test(after.slice(0, 4)) && !/^\s+(lot|unit|shop|\d)/i.test(after)
    if (m && !houseNumber) {
      code = tidyCode(m[1]); rest = rest.slice(m[0].length); break
    }
  }
  if (!code) {
    const m = rest.match(NUM_END)
    if (m) { code = tidyCode(m[1]); rest = rest.slice(0, m.index) }
  }
  rest = rest.replace(/^[\s\])\-–:.,]+|[\s([\-–:.,]+$/g, '')

  // Split what is left into a client and an address
  let client = '', address = ''
  const pieces = rest.split(/\s+[-–|]\s+|\s*[|]\s*/).map(squash).filter(Boolean)
  if (pieces.length >= 2) {
    const at = pieces.findIndex(looksLikeAddress)
    if (at >= 0) { address = pieces.slice(at).join(', '); client = pieces.slice(0, at).join(' - ') || pieces.filter((_, i) => i !== at).join(' - ') }
    else { client = pieces[0]; address = pieces.slice(1).join(', ') }
    if (at === 0 && pieces.length >= 2) { address = pieces[0]; client = pieces.slice(1).join(' - ') }
  } else if (rest) {
    // One piece: "Smith 12 Example St" or just a name, or just an address
    const m = rest.match(/^(.*?)[\s,]+((?:lot|unit|shop)?\s*\d+[a-z]?(?:\s*[-/]\s*\d+[a-z]?)?\s+.+)$/i)
    if (/^(lot|unit|shop|suite|level)\s*\d/i.test(rest)) address = rest
    else if (looksLikeAddress(rest) && !(m && m[1] && !/\d/.test(m[1]) && looksLikeAddress(m[2]))) address = rest
    else if (m && m[1] && looksLikeAddress(m[2])) { client = squash(m[1]); address = squash(m[2]) }
    else client = rest
  }
  return { code, client: squash(client), address: squash(address), sure: !!code && !!(client || address) }
}

// Are these folders really year folders ("2021", "2022 Jobs") with the jobs one level down?
export function looksLikeYearFolders(names) {
  if (!names.length) return false
  const years = names.filter(n => /^(?:jobs?\s*)?(?:19|20)\d{2}(?:\s*jobs?)?$/i.test(squash(n))).length
  return years >= 2 && years / names.length >= 0.6
}

// ---------- spreadsheets ----------
// QPlan's fields, and the column headings other systems use for them
export const IMPORT_FIELDS = [
  { key: 'code', label: 'Job number', need: true, words: ['job no', 'job number', 'job #', 'job num', 'job id', 'job ref', 'job code', 'file no', 'file number', 'project no', 'project number', 'project code', 'matter', 'reference', 'ref', 'number', 'code', 'job'] },
  { key: 'client', label: 'Client name', words: ['client name', 'client', 'customer', 'applicant', 'contact name', 'account name', 'name'] },
  { key: 'client_company', label: 'Client company', words: ['company', 'organisation', 'organization', 'business', 'entity'] },
  { key: 'address', label: 'Site address', words: ['site address', 'property address', 'address', 'site', 'property', 'location', 'street'] },
  { key: 'lot_reference', label: 'Lot / RP', words: ['lot plan', 'lot/plan', 'lot on plan', 'rpd', 'lot', 'real property', 'title'] },
  { key: 'council', label: 'Council', words: ['council', 'lga', 'local government', 'authority'] },
  { key: 'app_type', label: 'Application type', words: ['application type', 'app type', 'type', 'category'] },
  { key: 'proposed_use', label: 'Proposed use', words: ['proposed use', 'proposal', 'description', 'project description', 'development'] },
  { key: 'status', label: 'Status', words: ['status', 'state', 'stage'] },
  { key: 'planner', label: 'Planner', words: ['planner', 'project manager', 'manager', 'assigned', 'staff', 'consultant', 'owner', 'lead'] },
  { key: 'client_email', label: 'Client email', words: ['email', 'e-mail'] },
  { key: 'client_phone', label: 'Client phone', words: ['phone', 'mobile', 'telephone', 'tel'] },
  { key: 'created', label: 'Date opened', words: ['date opened', 'opened', 'date created', 'created', 'start date', 'commenced', 'date'] },
  { key: 'lodgement_date', label: 'Date lodged', words: ['lodgement date', 'date lodged', 'lodged', 'lodgement', 'submitted'] },
  { key: 'notes', label: 'Notes', words: ['notes', 'comments', 'remarks'] },
]

// Which column holds which field. Returns { fieldKey: columnIndex }
export function guessColumns(headers) {
  const heads = headers.map(h => squash(h).toLowerCase().replace(/[_.:]+/g, ' '))
  const used = new Set(), map = {}
  for (let pass = 0; pass < 2; pass++) { // exact headings first, then headings that contain the word
    for (const field of IMPORT_FIELDS) {
      if (map[field.key] !== undefined) continue
      for (const word of field.words) {
        const at = heads.findIndex((h, i) => !used.has(i) && (pass === 0 ? h === word : new RegExp(`(^|[^a-z])${word.replace(/[/#]/g, '\\$&')}([^a-z]|$)`).test(h)))
        if (at >= 0) { map[field.key] = at; used.add(at); break }
      }
    }
  }
  return map
}

// A small CSV reader: commas or semicolons or tabs, quoted cells, quotes doubled inside quotes
export function parseCsv(text) {
  const raw = String(text || '')
  const src = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw // some exports start with an invisible marker
  const first = src.split(/\r?\n/, 1)[0] || ''
  const count = (ch) => first.split(ch).length - 1
  const sep = count('\t') > count(',') && count('\t') >= count(';') ? '\t' : count(';') > count(',') ? ';' : ','
  const rows = []; let row = [], cell = '', quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false } else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === sep) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(c => squash(c))) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell); if (row.some(c => squash(c))) rows.push(row)
  return rows
}

// The heading row is the first row with a few filled cells that are words, not numbers
export function splitHeader(rows) {
  const at = rows.findIndex(r => r.filter(c => squash(c)).length >= 2 && r.filter(c => squash(c) && isNaN(Number(c))).length >= Math.max(2, r.filter(c => squash(c)).length * 0.6))
  if (at < 0) return { headers: [], body: [] }
  return { headers: rows[at].map(c => squash(c)), body: rows.slice(at + 1) }
}

const STATUS_WORDS = [
  ['Complete', /complete|closed|finished|approved|decided|archiv|done|invoiced|refused|withdrawn|lapsed|inactive|cancel/i],
  ['On Hold', /hold|paused|suspend|waiting/i],
  ['Review', /review/i],
  ['Draft', /draft|quote|proposal|prospect|enquiry|lead/i],
  ['Active', /active|current|open|progress|live|ongoing|lodged|assessment/i],
]
export const readStatus = (text, fallback) => { const t = squash(text); return t ? (STATUS_WORDS.find(([, re]) => re.test(t))?.[0] || fallback) : fallback }

export function readAppType(text) {
  const t = squash(text); if (!t) return null
  const exact = APP_TYPES.find(a => a.code.toLowerCase() === t.toLowerCase()); if (exact) return exact.code
  const byLabel = APP_TYPES.find(a => t.toLowerCase().includes(a.label.toLowerCase())); if (byLabel) return byLabel.code
  const inText = APP_TYPES.find(a => new RegExp(`\\b${a.code}\\b`, 'i').test(t))
  return inText ? inText.code : null
}

// Dates as spreadsheets give them: a Date, 2023-04-12, 12/04/2023 (day first, as in Australia), 12 Apr 2023
export function readDate(value) {
  if (value instanceof Date && !isNaN(value)) return value.toISOString().slice(0, 10)
  const t = squash(value); if (!t) return null
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (m) { const y = m[3].length === 2 ? (Number(m[3]) > 50 ? '19' : '20') + m[3] : m[3]; if (Number(m[2]) <= 12 && Number(m[1]) <= 31) return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` }
  const d = new Date(t)
  return isNaN(d) || d.getFullYear() < 1980 || d.getFullYear() > 2100 ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// One row of a spreadsheet as a draft job, using the chosen columns
export function draftFromRow(row, map) {
  const get = (key) => (map[key] === undefined || map[key] === null || map[key] === '' ? '' : squash(row[map[key]]))
  const company = get('client_company'), person = get('client')
  return {
    code: tidyCode(get('code')), client: company || person, contact: company && person && person !== company ? person : '',
    address: get('address'), lot_reference: get('lot_reference'), council: get('council'), app_type: readAppType(get('app_type')),
    proposed_use: get('proposed_use'), statusText: get('status'), planner: get('planner'), client_email: get('client_email'), client_phone: get('client_phone'),
    created: readDate(map.created === undefined ? '' : row[map.created]), lodgement_date: readDate(map.lodgement_date === undefined ? '' : row[map.lodgement_date]), notes: get('notes'),
  }
}

// A draft (from a folder or a spreadsheet row) as the row QPlan saves
export function jobFromDraft(draft, { companyId, batchId, status, source, username, now = new Date() }) {
  const who = draft.contact ? { client_type: 'company', client_company: draft.client, ...(({ client_first_name, client_last_name }) => ({ client_first_name, client_last_name }))(splitClient(draft.contact)) } : splitClient(draft.client)
  const job = {
    company_id: companyId, code: draft.code, ...who,
    address: draft.address || null, lot_reference: draft.lot_reference || null, council: draft.council || null,
    app_type: draft.app_type || null, proposed_use: draft.proposed_use || null,
    client_email: draft.client_email || null, client_phone: draft.client_phone || null,
    planner: draft.planner || null, planners: draft.planner ? [draft.planner] : [],
    status: draft.statusText ? readStatus(draft.statusText, status) : status,
    lodgement_date: draft.lodgement_date || null, notes: draft.notes || null,
    import_batch_id: batchId, imported_at: now.toISOString(),
    job_history: [{ text: source === 'folders' ? 'Imported from its job folder' : 'Imported from a file', time: now.toISOString() }],
  }
  const created = draft.created ? new Date(draft.created.length === 10 ? `${draft.created}T02:00:00Z` : draft.created) : null
  if (created && !isNaN(created) && created < now) job.created_at = created.toISOString()
  if (draft.folder) {
    Object.assign(job, {
      onedrive_drive_id: draft.folder.driveId || null, onedrive_folder_id: draft.folder.id, onedrive_folder_name: draft.folder.name,
      onedrive_folder_path: draft.folder.path || null, onedrive_folder_url: draft.folder.webUrl || null,
      onedrive_linked_at: now.toISOString(), onedrive_linked_by: username || null,
    })
  }
  job.name = buildJobName(job) || draft.code
  return job
}
