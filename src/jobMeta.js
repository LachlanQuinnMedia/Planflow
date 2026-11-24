// src/jobMeta.js
// One place for application types, client names and the job naming format,
// so every page shows a job the same way.

// Application types. `code` is what is stored on the job (jobs.app_type).
export const APP_TYPES = [
  { code: 'MCU', label: 'Material Change of Use',     badge: 'bg-blue-100 text-blue-700' },
  { code: 'ROL', label: 'Reconfiguration of a Lot',   badge: 'bg-amber-100 text-amber-700' },
  { code: 'CDM', label: 'Combined Application',       badge: 'bg-indigo-100 text-indigo-700' },
  { code: 'RAA', label: 'Referral Agency Assessment', badge: 'bg-pink-100 text-pink-700' },
  { code: 'OW',  label: 'Operational Works',          badge: 'bg-green-100 text-green-700' },
  { code: 'MC',  label: 'Minor Change',               badge: 'bg-teal-100 text-teal-700' },
  { code: 'OC',  label: 'Other Change',               badge: 'bg-cyan-100 text-cyan-700' },
  { code: 'SPS', label: 'Superseded Planning Scheme', badge: 'bg-purple-100 text-purple-700' },
  { code: 'PE',  label: 'Preliminary Enquiry',        badge: 'bg-orange-100 text-orange-700' },
  { code: 'PDA', label: 'Priority Development Area',  badge: 'bg-rose-100 text-rose-700' },
  { code: 'PS',  label: 'Plan Sealing',               badge: 'bg-lime-100 text-lime-700' },
  { code: 'PM',  label: 'Project Management',         badge: 'bg-slate-200 text-slate-700' },
]

export function appTypeLabel(code) {
  const t = APP_TYPES.find(x => x.code === code)
  return t ? t.label : (code || '')
}

// "MCU · Material Change of Use"
export function appTypeFull(code) {
  const t = APP_TYPES.find(x => x.code === code)
  return t ? `${t.code} · ${t.label}` : (code || '')
}

export function appTypeBadge(code) {
  const t = APP_TYPES.find(x => x.code === code)
  return t ? t.badge : 'bg-gray-100 text-gray-600'
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()

// The person: the client themselves, or the contact person at a company client
export function contactName(job) {
  if (!job) return ''
  return [clean(job.client_first_name), clean(job.client_last_name)].filter(Boolean).join(' ')
}

export function isCompanyClient(job) {
  return !!job && job.client_type === 'company' && !!clean(job.client_company)
}

// The client's name: the company for a company client, otherwise the person
export function clientName(job) {
  if (!job) return ''
  return isCompanyClient(job) ? clean(job.client_company) : contactName(job)
}

// Naming format: [Client Name] - [Address] [Job Number]
export function buildJobName(job) {
  if (!job) return ''
  const left = [clientName(job), clean(job.address)].filter(Boolean).join(' - ')
  return [left, clean(job.code)].filter(Boolean).join(' ')
}

// Full job title for headings and dropdowns. Built from the job's fields when they
// are loaded, otherwise falls back to the stored name.
export function jobTitle(job) {
  if (!job) return ''
  if (clientName(job) || clean(job.address)) return buildJobName(job)
  return clean(job.name) || clean(job.code)
}

// The title without the job number, for tables that already have a job number column
export function jobListName(job) {
  if (!job) return ''
  const left = [clientName(job), clean(job.address)].filter(Boolean).join(' - ')
  if (left) return left
  const name = clean(job.name)
  const code = clean(job.code)
  return code && name.endsWith(code) ? name.slice(0, -code.length).trim() : name
}

// Time tracker label: Job number and address
export function timerLabel(job) {
  if (!job) return ''
  // Falls back to the client's name when a job has no address yet
  const parts = [clean(job.code), clean(job.address) || clientName(job)].filter(Boolean)
  return parts.length ? parts.join(' · ') : clean(job.name)
}

// Folder name for OneDrive / SharePoint. Same format as the job name, with the
// characters Microsoft 365 does not allow in folder names removed.
export function oneDriveFolderName(job) {
  const name = buildJobName(job)
    .replace(/["*:<>?/\\|#%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  return name.slice(0, 180) || clean(job?.code) || 'New job'
}

// Lower-case text used when searching jobs
export function jobSearchText(job) {
  if (!job) return ''
  return [
    job.code, job.name, buildJobName(job), job.client_company,
    job.client_first_name, job.client_last_name, job.address, job.planner,
  ].map(clean).filter(Boolean).join(' ').toLowerCase()
}

// ------------------------------------------------------------------
// Planning zones
// ------------------------------------------------------------------
// The zones a Queensland planning scheme may use: Planning Regulation 2017, schedule 2
// (checked against the version in force 20 March 2026). Stored on the job without the
// word "zone", in the regulation's own wording. Kept in alphabetical order.
//
// Older schemes, priority development areas and zone precincts use other names, so the
// New Job and Edit forms also offer "Other" with a box to type one in.
export const QLD_ZONES = [
  'Centre', 'Character residential', 'Community facilities', 'Conservation', 'District centre',
  'Emerging community', 'Environmental management', 'Environmental management and conservation',
  'Extractive industry', 'General residential', 'High density residential', 'High impact industry',
  'Industry', 'Industry investigation', 'Innovation', 'Limited development', 'Local centre',
  'Low density residential', 'Low impact industry', 'Low-medium density residential', 'Major centre',
  'Major tourism', 'Medium density residential', 'Medium impact industry', 'Minor tourism', 'Mixed use',
  'Neighbourhood centre', 'Open space', 'Principal centre', 'Recreation and open space',
  'Research and technology industry', 'Rural', 'Rural residential', 'Special industry', 'Special purpose',
  'Specialised centre', 'Sport and recreation', 'Tourism', 'Tourist accommodation', 'Township',
  'Waterfront and marine industry',
]

const zoneKey = (s) => clean(s).toLowerCase().replace(/[‐-―]/g, '-').replace(/\s*-\s*/g, '-').replace(/\bzone\b/g, '').replace(/\s+/g, ' ').trim()
const ZONE_BY_KEY = new Map(QLD_ZONES.map(z => [zoneKey(z), z]))

// The standard zone a piece of typed text means ("Medium Density Residential Zone" ->
// "Medium density residential"), or '' when it is not one of the standard zones.
export function standardZone(text) {
  return ZONE_BY_KEY.get(zoneKey(text)) || ''
}
