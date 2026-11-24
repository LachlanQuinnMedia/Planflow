// supabase/functions/platform/index.ts
// For the QPlan master account only: see every firm, add a firm, and move between firms.
// Nobody else can call any of this. The caller is worked out from their sign-in, and must
// carry the is_platform_admin flag, which can only be set in the database.
//
// Actions: list_firms, create_firm, rename_firm, switch_firm
//
// "Moving" to a firm changes which firm the master account's row points at (company_id).
// Every database rule and server function keys off that, so the master account then sees
// exactly what a director of that firm sees, and nothing from any other firm.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function getMaster(req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data, error } = await db.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: u } = await db.from('app_users')
    .select('id, username, role, company_id, home_company_id, is_approved, is_active, is_platform_admin')
    .eq('id', data.user.id).maybeSingle()
  if (!u || !u.is_approved || u.is_active === false || u.is_platform_admin !== true) return null
  return u
}

// Codes people type in by hand: no 0/O or 1/I/L to mix up
function randomCode(length: number, alphabet: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}
const DIGITS = '23456789'
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

async function firmRow(c: any, master: any) {
  const [{ count: staff }, { count: pending }, { count: jobs }] = await Promise.all([
    db.from('app_users').select('id', { count: 'exact', head: true }).eq('company_id', c.id).eq('is_approved', true).not('is_platform_admin', 'is', true),
    db.from('app_users').select('id', { count: 'exact', head: true }).eq('company_id', c.id).not('is_approved', 'is', true).not('is_active', 'is', false),
    db.from('jobs').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
  ])
  return {
    id: c.id, name: c.name, company_code: c.company_code, director_code: c.director_code, created_at: c.created_at,
    staff: staff || 0, pending: pending || 0, jobs: jobs || 0,
    current: c.id === master.company_id, home: c.id === master.home_company_id,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Not found' }, 404)
  try {
    const master = await getMaster(req)
    // The same answer whether the caller is signed out or simply not the master account
    if (!master) return json({ error: 'Not available.' }, 403)
    const action = new URL(req.url).searchParams.get('action')
    const body = await req.json().catch(() => ({}))

    if (action === 'list_firms') {
      const { data: companies, error } = await db.from('companies').select('id, name, company_code, director_code, created_at').order('created_at', { ascending: true })
      if (error) return json({ error: 'Could not load the firms.' }, 500)
      const firms = []
      for (const c of companies || []) firms.push(await firmRow(c, master))
      return json({ firms })
    }

    if (action === 'create_firm') {
      const name = String(body.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
      if (name.length < 2) return json({ error: 'Enter the firm\'s name.' })
      const { data: existing } = await db.from('companies').select('id, name')
      if ((existing || []).some((c: any) => String(c.name || '').trim().toLowerCase() === name.toLowerCase())) {
        return json({ error: 'There is already a firm with that name.' })
      }
      // A company code nobody else has. Six digits, so it is easy to read out over the phone.
      let company: any = null
      for (let attempt = 0; attempt < 8 && !company; attempt++) {
        const company_code = randomCode(6, DIGITS)
        const { data, error } = await db.from('companies')
          .insert({ name, company_code, director_code: randomCode(8, LETTERS) })
          .select('id, name, company_code, director_code, created_at').single()
        if (!error && data) company = data
        else if (error && error.code !== '23505') return json({ error: 'Could not create the firm.' }, 500)
      }
      if (!company) return json({ error: 'Could not create the firm. Please try again.' }, 500)
      // The firm starts with QPlan's plain stages and no templates. Its directors set their own.
      await db.from('firm_settings').insert({ company_id: company.id, updated_by: master.username })
      return json({ firm: await firmRow(company, master) })
    }

    if (action === 'rename_firm') {
      const name = String(body.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
      const id = String(body.company_id ?? '')
      if (name.length < 2 || !id) return json({ error: 'Enter the firm\'s name.' })
      const { data, error } = await db.from('companies').update({ name }).eq('id', id).select('id, name, company_code, director_code, created_at').maybeSingle()
      if (error || !data) return json({ error: 'Could not rename the firm.' })
      return json({ firm: await firmRow(data, master) })
    }

    if (action === 'switch_firm') {
      const id = String(body.company_id ?? '')
      const { data: company } = await db.from('companies').select('id, name, company_code').eq('id', id).maybeSingle()
      if (!company) return json({ error: 'That firm was not found.' })
      if (company.id !== master.company_id) {
        // Usernames are unique within a firm. Do not land on top of someone with the same name.
        const { data: people } = await db.from('app_users').select('id, username').eq('company_id', company.id)
        if ((people || []).some((p: any) => p.id !== master.id && String(p.username).toLowerCase() === String(master.username).toLowerCase())) {
          return json({ error: `${company.name} already has a person called ${master.username}. Rename one of the two first.` })
        }
        // A timer left running belongs to a job at the firm being left
        await db.from('active_timers').delete().eq('user_id', master.id)
        const { error } = await db.from('app_users').update({ company_id: company.id, company_code: company.company_code }).eq('id', master.id)
        if (error) return json({ error: 'Could not open that firm.' }, 500)
      }
      return json({
        user: { id: master.id, username: master.username, role: 'director', company_id: company.id, company_code: company.company_code, companyName: company.name || '' },
      })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('platform error', e)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
