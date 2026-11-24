// src/firm.js
// What belongs to one firm and not to QPlan: the name of its service stages, the stages
// themselves (with default fees and checklist items), and its list of document templates.
// It lives in the firm_settings table, one row per firm. Directors change it on the
// Firm settings page. Nothing here is shared between firms.
import { createContext, useContext } from 'react'
import { supabase } from './supabase'

// What a firm starts with until a director sets its own. Deliberately plain.
export const DEFAULT_STAGES = [
  {
    id: 'stage1', label: 'Stage 1: Preliminary advice', shortLabel: 'Stage 1', defaultFee: 0,
    description: 'Initial meeting, site and planning scheme review, advice on the way forward.',
    items: [
      'Meet with the client',
      'Review the site, zoning and overlays',
      'Check the proposal against the planning scheme and state requirements',
      'Advise on development potential, constraints and the application needed',
    ],
  },
  {
    id: 'stage2', label: 'Stage 2: Prepare and lodge the application', shortLabel: 'Stage 2', defaultFee: 0,
    description: 'Coordinate plans and reports, prepare the planning report, lodge with council.',
    items: [
      'Brief the designer and coordinate consultants',
      'Review plans and consultant reports',
      'Obtain owner\'s consent',
      'Prepare the planning report and forms',
      'Lodge the application and confirm it is properly made',
    ],
  },
  {
    id: 'stage3', label: 'Stage 3: After lodgement', shortLabel: 'Stage 3', defaultFee: 0,
    description: 'Manage the application through to the decision notice.',
    items: [
      'Respond to the confirmation notice and any information request',
      'Manage referrals and public notification if required',
      'Negotiate conditions with council',
      'Send the decision notice to the client and advise on conditions and appeal rights',
    ],
  },
]

const STAGE_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700',
]
const OTHER_COLOR = 'bg-gray-100 text-gray-700'

const cleanStage = (s, i) => ({
  id: String(s?.id || `stage${i + 1}`),
  label: String(s?.label || `Stage ${i + 1}`),
  shortLabel: String(s?.shortLabel || `Stage ${i + 1}`),
  defaultFee: Number(s?.defaultFee) || 0,
  description: String(s?.description || ''),
  items: Array.isArray(s?.items) ? s.items.map(String).filter(Boolean) : [],
  color: STAGE_COLORS[i % STAGE_COLORS.length],
})

// Turn a firm_settings row (or nothing) into what the screens use
export function normaliseFirm(row) {
  const ownStages = Array.isArray(row?.stages) && row.stages.length > 0
  const stages = (ownStages ? row.stages : DEFAULT_STAGES).map(cleanStage)
  const label = String(row?.stage_label || '').trim()
  const templates = (Array.isArray(row?.templates) ? row.templates : []).map((cat) => {
    const at = stages.findIndex(s => s.shortLabel === cat.stage)
    return {
      stage: String(cat.stage || 'Other'),
      color: at >= 0 ? stages[at].color : OTHER_COLOR,
      groups: (Array.isArray(cat.groups) ? cat.groups : []).map(g => ({
        name: String(g.name || 'Other'),
        items: (Array.isArray(g.items) ? g.items : []).filter(i => i?.file).map(i => ({ file: String(i.file), label: String(i.label || i.file) })),
      })).filter(g => g.items.length > 0),
    }
  }).filter(cat => cat.groups.length > 0)
  return {
    loaded: !!row,
    companyId: row?.company_id || null,
    stageLabel: label,                                        // "HPC", or "" for a firm that has not named its stages
    stagesTab: label ? `${label} Stages` : 'Service Stages',  // the tab on a job
    stagesName: label ? `${label} stages` : 'Service stages', // in sentences and the job history
    stages,
    ownStages,
    templates,
    allTemplates: templates.flatMap(c => c.groups.flatMap(g => g.items)),
    legacyTemplates: !!row?.legacy_templates,
    setup: row?.setup && typeof row.setup === 'object' ? row.setup : {},
    raw: row || null,
  }
}

export const FirmContext = createContext(normaliseFirm(null))
export const useFirm = () => useContext(FirmContext)

const cacheKey = (companyId) => `qplan_firm_${companyId}`

// The copy kept in the browser from last time, so the right stages show at once
export function cachedFirm(companyId) {
  try { return JSON.parse(localStorage.getItem(cacheKey(companyId)) || 'null') } catch { return null }
}

export async function loadFirm(companyId) {
  if (!companyId) return null
  const { data, error } = await supabase.from('firm_settings').select('*').eq('company_id', companyId).maybeSingle()
  if (error) return cachedFirm(companyId) // offline or a hiccup: keep showing what we had
  try {
    if (data) localStorage.setItem(cacheKey(companyId), JSON.stringify(data))
    else localStorage.removeItem(cacheKey(companyId))
  } catch { /* storage unavailable */ }
  return data || null
}

// Directors only (the database enforces it). Returns the saved row, or throws with a plain message.
export async function saveFirm(companyId, patch, username) {
  const row = { company_id: companyId, ...patch, updated_at: new Date().toISOString(), updated_by: username || null }
  const { data, error } = await supabase.from('firm_settings').upsert(row, { onConflict: 'company_id' }).select('*').single()
  if (error) throw new Error(error.message || 'Could not save')
  try { localStorage.setItem(cacheKey(companyId), JSON.stringify(data)) } catch { /* storage unavailable */ }
  return data
}

// ---- a job's progress through the firm's stages (kept on the job as hpc_stages) ----
const blankStage = (stage) => ({ status: 'pending', fee: stage.defaultFee || 0, notes: '', completedDate: '', checkedItems: [] })

export const initialStageState = (stages) => Object.fromEntries(stages.map(s => [s.id, blankStage(s)]))

// What is saved on the job, laid over the firm's stages. A stage the job has no record of starts blank.
export function mergeStageState(stages, saved) {
  const from = saved && typeof saved === 'object' ? saved : {}
  return Object.fromEntries(stages.map(s => [s.id, {
    ...blankStage(s), ...(from[s.id] && typeof from[s.id] === 'object' ? from[s.id] : {}),
    checkedItems: Array.isArray(from[s.id]?.checkedItems) ? from[s.id].checkedItems : [],
  }]))
}

// Where a firm's template file lives in storage. The first firm's files sit at the top level.
export const newTemplatePath = (companyId, filename) =>
  `${companyId}/${Date.now()}_${String(filename || 'template').replace(/[^\w.\- ]+/g, '_')}`

// The name a downloaded template should carry (without the firm folder and timestamp)
export const templateFileName = (file) => String(file || '').split('/').pop().replace(/^\d{10,}_/, '')
