import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CALENDLY_CLIENT_ID = Deno.env.get('CALENDLY_CLIENT_ID')
const CALENDLY_CLIENT_SECRET = Deno.env.get('CALENDLY_CLIENT_SECRET')
const REDIRECT_URI = 'https://planflow-beige.vercel.app'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY')
// Calendly signs each booking it sends with this key, so a made-up booking can be told apart
const SIGNING_KEY = Deno.env.get('CALENDLY_WEBHOOK_SECRET') || ''

// Calendly's signature header looks like "t=1700000000,v1=<hex>". The hex is an HMAC-SHA256 of
// "<t>.<body>" made with the signing key. Anything older than five minutes is refused.
async function signatureIsValid(header: string | null, rawBody: string) {
  if (!SIGNING_KEY || !header) return false
  const parts = Object.fromEntries(header.split(',').map(p => { const i = p.indexOf('='); return [p.slice(0, i).trim(), p.slice(i + 1).trim()] }))
  const t = parts['t'], v1 = parts['v1']
  if (!t || !v1) return false
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SIGNING_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${rawBody}`)))
  const expected = Array.from(mac).map(b => b.toString(16).padStart(2, '0')).join('')
  if (expected.length !== v1.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i)
  return diff === 0
}

// Who is calling. Worked out from their QPlan sign-in, never from what the browser sends.
// Returns null unless the caller is an approved, active QPlan user.
async function getCaller(req: Request, supabase: any) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: u } = await supabase.from('app_users')
    .select('id, username, role, company_id, is_approved, is_active')
    .eq('id', data.user.id).maybeSingle()
  if (!u || !u.is_approved || u.is_active === false) return null
  return u
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

    // Everything except Calendly's own webhook needs a signed-in QPlan user
    let caller: any = null
    if (action !== 'webhook') {
      caller = await getCaller(req, supabase)
      if (!caller) return new Response(JSON.stringify({ success: false, connected: false, error: 'Please sign in to QPlan again.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'callback') {
      const body = await req.json()
      const { code } = body
      const company_id = caller.company_id
      const username = caller.username

      console.log('Calendly callback received for:', username)

      const tokenRes = await fetch('https://auth.calendly.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${CALENDLY_CLIENT_ID}:${CALENDLY_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      })

      const tokens = await tokenRes.json()

      if (!tokens.access_token) {
        return new Response(JSON.stringify({ success: false, error: 'No access token', detail: tokens }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const userRes = await fetch('https://api.calendly.com/users/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      })
      const userData = await userRes.json()

      const userUri = userData.resource?.uri
      const email = userData.resource?.email
      const orgUri = userData.resource?.current_organization

      console.log('User URI:', userUri)
      console.log('Org URI:', orgUri)

      await supabase.from('calendar_connections').upsert({
        company_id,
        username,
        provider: 'calendly',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        email,
        external_user_uri: userUri,
        expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      }, { onConflict: 'company_id,username,provider' })

      console.log('Saved connection, registering webhook...')

      // Register webhook
      const webhookUrl = `${SUPABASE_URL}/functions/v1/calendar-calendly?action=webhook&company_id=${company_id}&username=${encodeURIComponent(username)}`

      // An earlier, unsigned registration for this same address is removed first, so the new signed one replaces it
      try {
        const listRes = await fetch(`https://api.calendly.com/webhook_subscriptions?organization=${encodeURIComponent(orgUri)}&user=${encodeURIComponent(userUri)}&scope=user&count=100`, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        const list = await listRes.json()
        for (const sub of list.collection || []) {
          if (sub.callback_url === webhookUrl && sub.uri) {
            await fetch(sub.uri, { method: 'DELETE', headers: { Authorization: `Bearer ${tokens.access_token}` } })
          }
        }
      } catch (e) {
        console.log('Could not tidy old webhook registrations:', e.message)
      }

      const webhookBody: Record<string, unknown> = {
        url: webhookUrl,
        events: ['invitee.created', 'invitee.canceled'],
        organization: orgUri,
        user: userUri,
        scope: 'user',
      }
      if (SIGNING_KEY) webhookBody.signing_key = SIGNING_KEY
      console.log('Registering webhook for', username, SIGNING_KEY ? '(signed)' : '(unsigned)')

      const webhookRes = await fetch('https://api.calendly.com/webhook_subscriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookBody),
      })

      const webhookData = await webhookRes.json()
      console.log('Webhook registration status:', webhookRes.status)
      // Only once Calendly has accepted the signed registration are unsigned bookings refused for this person
      const signed = !!SIGNING_KEY && webhookRes.status === 201
      await supabase.from('calendar_connections').update({ webhook_signed: signed })
        .eq('company_id', company_id).eq('username', username).eq('provider', 'calendly')

      return new Response(JSON.stringify({ success: true, email, webhook: webhookData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'webhook') {
      const company_id = url.searchParams.get('company_id')
      const username = url.searchParams.get('username')
      console.log('Webhook received for:', company_id, username)

      // Only accept bookings for a person who has actually connected Calendly
      const { data: conn } = await supabase.from('calendar_connections').select('id, webhook_signed')
        .eq('company_id', company_id).eq('username', username).eq('provider', 'calendly').maybeSingle()
      if (!conn) return new Response('not found', { status: 404, headers: corsHeaders })

      const rawBody = await req.text()
      // A connection registered with a signing key only accepts bookings Calendly has signed
      if (conn.webhook_signed && !(await signatureIsValid(req.headers.get('Calendly-Webhook-Signature'), rawBody))) {
        console.log('Webhook refused: missing or wrong signature for', username)
        return new Response('forbidden', { status: 403, headers: corsHeaders })
      }
      const payload = JSON.parse(rawBody)

      if (payload.event === 'invitee.created') {
        const event = payload.payload
        const startTime = new Date(event.scheduled_event?.start_time)
        const endTime = new Date(event.scheduled_event?.end_time)
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

        console.log('Creating booking for:', event.name, 'at', startTime)

        const { data, error } = await supabase.from('bookings').insert({
          company_id,
          title: event.scheduled_event?.name || 'Calendly booking',
          type: 'client',
          date: startTime.toISOString().split('T')[0],
          start_time: startTime.toTimeString().slice(0, 5),
          duration_minutes: durationMinutes,
          client_name: event.name,
          notes: `Email: ${event.email}`,
          attendees: [username],
          created_by: username,
          external_id: event.uri,
          external_source: 'calendly',
        })

        if (error) console.log('Booking insert error:', JSON.stringify(error))
        else console.log('Booking created:', JSON.stringify(data))
      }

      if (payload.event === 'invitee.canceled') {
        await supabase.from('bookings')
          .delete()
          .eq('external_id', payload.payload?.uri)
          .eq('external_source', 'calendly')
          .eq('company_id', company_id)
      }

      return new Response('ok', { headers: corsHeaders })
    }

    if (action === 'status') {
      const body = await req.json()
      const company_id = caller.company_id
      const username = caller.username
      const { data } = await supabase
        .from('calendar_connections')
        .select('email, provider')
        .eq('company_id', company_id)
        .eq('username', username)
        .eq('provider', 'calendly')
        .single()

      return new Response(JSON.stringify({ connected: !!data, email: data?.email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'disconnect') {
      const body = await req.json()
      const company_id = caller.company_id
      const username = caller.username
      await supabase.from('calendar_connections')
        .delete()
        .eq('company_id', company_id)
        .eq('username', username)
        .eq('provider', 'calendly')

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.log('Error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})