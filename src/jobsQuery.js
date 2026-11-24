// src/jobsQuery.js
// How job lists are loaded once a firm has thousands of jobs.
//
// A firm can import its whole back catalogue. Those jobs are "the archive": brought in by an
// import and still Complete. Everyday lists (the Jobs page, the Dashboard, the time tracker,
// the calendar) leave the archive out, so they stay quick. The archive is found by searching.
// Reopen an archived job (change its status) and it joins the everyday lists like any other.
import { supabase } from './supabase'

const WORKING = 'imported_at.is.null,status.neq.Complete' // not imported, or imported and since reopened
const PAGE = 1000 // the database hands back at most this many rows at a time

// Every working job, newest first. Asks again until it has them all, so a long list is never cut short.
export async function fetchWorkingJobs(select = '*') {
  const all = []
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await supabase.from('jobs').select(select).or(WORKING)
      .order('created_at', { ascending: false }).range(from, from + PAGE - 1)
    if (error) return { data: from === 0 ? null : all, error }
    all.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return { data: all, error: null }
}

// Characters that mean something in a search filter are dropped from what the person typed
const safeTerm = (term) => String(term || '').replace(/[,()*%\\"']/g, ' ').replace(/\s+/g, ' ').trim()

// Archived jobs matching what was typed (job number, name, address or client). Newest first.
export async function searchArchive(term, limit = 100) {
  const t = safeTerm(term)
  let q = supabase.from('jobs').select('*').not('imported_at', 'is', null).eq('status', 'Complete')
  if (t) q = q.or(['code', 'name', 'address', 'client_company', 'client_last_name', 'client_first_name'].map(c => `${c}.ilike.*${t}*`).join(','))
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit)
  return { data: data || [], error }
}

export async function countArchive() {
  const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).not('imported_at', 'is', null).eq('status', 'Complete')
  return count || 0
}
