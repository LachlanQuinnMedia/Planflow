// supabase/functions/leads/index.ts
// Takes "Request access" forms from the public sales page and saves them in signup_requests.
// Open to the public by design, so it only accepts a small, checked set of fields and
// limits how many requests one network address can send.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const NOTIFY_EMAIL = Deno.env.get('LEADS_NOTIFY_EMAIL') // optional: where new requests are emailed

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max)
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Not found' }, 404)

  try {
    const body = await req.json().catch(() => ({}))
    // A hidden field people never see. Only automated form-fillers complete it.
    if (clean(body.website, 200)) return json({ success: true })

    const firm_name = clean(body.firmName, 120)
    const contact_name = clean(body.contactName, 120)
    const email = clean(body.email, 200).toLowerCase()
    const phone = clean(body.phone, 40)
    const team_size = clean(body.teamSize, 20)
    const message = clean(body.message, 1500)

    if (!firm_name || !contact_name) return json({ error: 'Please enter your name and your firm.' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: 'Please enter a valid email address.' })

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    const key = `lead|${ip}`
    const since = new Date(Date.now() - 60 * 60000).toISOString()
    const { count } = await db.from('auth_attempts').select('id', { count: 'exact', head: true }).eq('key', key).gte('created_at', since)
    if ((count || 0) >= 5) return json({ error: 'Too many requests. Please try again in an hour.' })
    await db.from('auth_attempts').insert({ key })

    const { error } = await db.from('signup_requests').insert({
      firm_name, contact_name, email, phone: phone || null, team_size: team_size || null, message: message || null,
    })
    if (error) return json({ error: 'Could not send your request. Please try again.' }, 500)

    if (RESEND_API_KEY && NOTIFY_EMAIL) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'QPlan <onboarding@resend.dev>',
          to: NOTIFY_EMAIL,
          subject: `QPlan access request: ${firm_name}`,
          html: `<p><strong>${esc(firm_name)}</strong></p><p>${esc(contact_name)}<br>${esc(email)}${phone ? '<br>' + esc(phone) : ''}${team_size ? '<br>Team size: ' + esc(team_size) : ''}</p>${message ? '<p>' + esc(message) + '</p>' : ''}`,
        }),
      }).catch(() => {})
    }

    return json({ success: true })
  } catch (e) {
    console.error('leads error', e)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
