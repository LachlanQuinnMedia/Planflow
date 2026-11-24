// supabase/functions/weekly-digest/index.ts
// The Monday email: the week's deadlines, sent to a firm's directors at 7am Brisbane time.
// A firm only gets it if a director has switched it on (Firm settings). Off by default.
//
// Actions:
//   preview    a director sees what this week's email would say, and who would get it
//   send_test  a director sends it to their own email address now
//   run        the Monday schedule (database cron). Needs the schedule's key. Sends to every
//              firm that has switched it on and has something due.
//
// Sent through Resend. Until a sending domain is verified there, Resend only delivers to the
// account owner's own address. Set the EMAIL_FROM secret once the domain is verified,
// for example:  QPlan <notices@qplan.net.au>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'QPlan <onboarding@resend.dev>'
const APP_URL = 'https://planflow-beige.vercel.app'
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

async function getCaller(req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data, error } = await db.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: u } = await db.from('app_users')
    .select('id, username, role, company_id, is_approved, is_active, is_platform_admin')
    .eq('id', data.user.id).maybeSingle()
  if (!u || !u.is_approved || u.is_active === false) return null
  return u
}

// Today's date in Brisbane (UTC+10, no daylight saving), as YYYY-MM-DD
function brisbaneToday() {
  return new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10)
}
const dayNumber = (iso: string) => Math.floor(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / 86400000)
function niceDate(iso: string) {
  return new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso.slice(0, 10) + 'T00:00:00Z'))
}

const STAGE_LABELS: Record<string, string> = {
  application: 'Application stage ends', referral: 'Referral stage ends', information: 'Information request stage ends',
  notification: 'Public notification ends', decision: 'Decision stage ends',
}

// Everything due at a firm from yesterday to seven days ahead, soonest first
async function deadlinesFor(companyId: string) {
  const today = brisbaneToday()
  const { data: jobs } = await db.from('jobs')
    .select('code, name, address, planner, status, decision_due_date, date_ir_response, date_referral, date_public_notice_start, date_public_notice_end, date_decision, da_stages')
    .eq('company_id', companyId).neq('status', 'Complete').limit(5000)
  const items: any[] = []
  for (const j of jobs || []) {
    const add = (what: string, date: unknown) => {
      const iso = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : ''
      if (!iso) return
      const days = dayNumber(iso) - dayNumber(today)
      if (days < -1 || days > 7) return
      items.push({ code: j.code, job: j.name || j.address || j.code, planner: j.planner || '', what, date: iso, when: niceDate(iso), days })
    }
    add('Decision due', j.decision_due_date)
    add('IR response due', j.date_ir_response)
    add('Referral response', j.date_referral)
    add('Public notice starts', j.date_public_notice_start)
    add('Public notice ends', j.date_public_notice_end)
    add('Decision', j.date_decision)
    const stages = j.da_stages && typeof j.da_stages === 'object' ? j.da_stages : {}
    for (const [id, s] of Object.entries(stages as Record<string, any>)) {
      if (s && s.status === 'active' && !s.isStopped) add(STAGE_LABELS[id] || 'Stage ends', s.endDate)
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date) || String(a.code).localeCompare(String(b.code)))
  return items
}

// The firm's directors' email addresses: the list on the firm, plus each director's own profile
async function recipientsFor(companyId: string) {
  const [{ data: company }, { data: directors }] = await Promise.all([
    db.from('companies').select('name, director_emails').eq('id', companyId).maybeSingle(),
    db.from('app_users').select('id').eq('company_id', companyId).eq('role', 'director').eq('is_approved', true).not('is_active', 'is', false).not('is_platform_admin', 'is', true),
  ])
  const ids = (directors || []).map((d: any) => d.id)
  const { data: profiles } = ids.length ? await db.from('planner_profiles').select('email').in('user_id', ids) : { data: [] as any[] }
  const all = [...((company?.director_emails as string[]) || []), ...(profiles || []).map((p: any) => p.email)]
    .map(e => String(e || '').trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
  return { firm: company?.name || 'your firm', to: [...new Set(all)] }
}

function emailFor(firm: string, items: any[]) {
  const rows = items.map(i => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;white-space:nowrap;font-weight:600;color:${i.days < 0 ? '#b91c1c' : '#111'}">${esc(i.when)}${i.days < 0 ? ' (overdue)' : i.days === 0 ? ' (today)' : ''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(i.what)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee"><strong>${esc(i.code)}</strong> ${esc(i.job)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#555">${esc(i.planner)}</td>
    </tr>`).join('')
  const html = `
    <div style="font-family:sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#111">
      <div style="background:#0E5A43;padding:16px 24px;border-radius:8px 8px 0 0"><h1 style="color:#fff;margin:0;font-size:18px">QPlan: this week at ${esc(firm)}</h1></div>
      <div style="background:#f9f9f9;padding:20px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e5e5">
        <p style="margin:0 0 14px;font-size:14px">${items.length} date${items.length === 1 ? '' : 's'} due in the next seven days.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #eee">${rows}</table>
        <p style="margin:18px 0 0;font-size:13px"><a href="${APP_URL}" style="color:#0E5A43">Open QPlan</a></p>
        <p style="margin:14px 0 0;font-size:12px;color:#777">Dates are calendar dates. QPlan shows the business days left on each job. A director can switch this email off in Firm settings.</p>
      </div>
    </div>`
  return { subject: `QPlan: ${items.length} date${items.length === 1 ? '' : 's'} due this week at ${firm}`, html }
}

async function send(to: string[], subject: string, html: string) {
  if (!RESEND_API_KEY) return { ok: false, error: 'Email is not set up on the server.' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  })
  const data = await res.json().catch(() => ({}))
  return res.ok ? { ok: true } : { ok: false, error: data?.message || `The email service answered ${res.status}.` }
}

async function sha256Hex(text: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Not found' }, 404)
  try {
    const action = new URL(req.url).searchParams.get('action')

    // ---- the Monday schedule ----
    if (action === 'run') {
      const key = req.headers.get('x-digest-key') || ''
      const { data: stored } = await db.from('server_settings').select('value').eq('key', 'weekly_digest_key_sha256').maybeSingle()
      if (!key || !stored?.value || (await sha256Hex(key)) !== stored.value) return json({ success: false, error: 'Not available.' }, 403)
      const { data: firms } = await db.from('firm_settings').select('company_id, setup')
      const results: any[] = []
      for (const f of firms || []) {
        if (!(f.setup && (f.setup as any).weekly_email === true)) continue
        const items = await deadlinesFor(f.company_id)
        const { firm, to } = await recipientsFor(f.company_id)
        if (!items.length || !to.length) { results.push({ company_id: f.company_id, sent: false, why: !items.length ? 'nothing due' : 'no addresses' }); continue }
        const mail = emailFor(firm, items)
        const out = await send(to, mail.subject, mail.html)
        results.push({ company_id: f.company_id, sent: out.ok, why: out.ok ? undefined : out.error, dates: items.length, people: to.length })
      }
      console.log('weekly-digest run', JSON.stringify(results))
      return json({ success: true, results })
    }

    // ---- a director looking at, or testing, their own firm's email ----
    const caller = await getCaller(req)
    if (!caller) return json({ success: false, error: 'Please sign in to QPlan again.' }, 401)
    if (caller.role !== 'director' && caller.is_platform_admin !== true) return json({ success: false, error: 'Only a director can do this.' }, 403)

    if (action === 'preview') {
      const [items, who] = await Promise.all([deadlinesFor(caller.company_id), recipientsFor(caller.company_id)])
      return json({ success: true, items, recipients: who.to, from: EMAIL_FROM })
    }

    if (action === 'send_test') {
      const { data: me } = await db.from('planner_profiles').select('email').eq('user_id', caller.id).maybeSingle()
      const to = String(me?.email || '').trim()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ success: false, error: 'Add your email address to your profile first (Planners > Edit my profile).' })
      const [items, who] = await Promise.all([deadlinesFor(caller.company_id), recipientsFor(caller.company_id)])
      const mail = emailFor(who.firm, items)
      const out = await send([to], `[Test] ${mail.subject}`, mail.html)
      return out.ok ? json({ success: true, to, dates: items.length }) : json({ success: false, error: out.error, to })
    }

    return json({ success: false, error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('weekly-digest error', e)
    return json({ success: false, error: 'Something went wrong. Please try again.' }, 500)
  }
})
