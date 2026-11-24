// src/daStages.js
// The statutory stages of a development application (Queensland), with their periods in business days.
// service_stage is the firm service stage each one usually falls under.
export const DA_STAGES = [
  { id: 'application', label: 'Application stage', description: 'Application lodged, confirmation notice issued', statutory_days: 5, service_stage: 'Stage 2', color: 'bg-blue-100 text-blue-700' },
  { id: 'referral', label: 'Referral stage', description: 'Referral to state government / Energex / other agencies', statutory_days: 10, service_stage: 'Stage 3', color: 'bg-purple-100 text-purple-700' },
  { id: 'information', label: 'Information request stage', description: 'Council information request and response window', statutory_days: 10, service_stage: 'Stage 3', color: 'bg-amber-100 text-amber-700' },
  { id: 'notification', label: 'Public notification stage', description: 'Public notification & submissions period', statutory_days: 15, service_stage: 'Stage 3', color: 'bg-pink-100 text-pink-700' },
  { id: 'decision', label: 'Decision stage', description: 'Assessment and decision by Council', statutory_days: 20, service_stage: 'Stage 3', color: 'bg-emerald-100 text-emerald-700' },
]
