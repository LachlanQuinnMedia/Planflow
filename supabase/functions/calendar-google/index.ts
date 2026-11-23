import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const REDIRECT_URI = 'https://planflow-beige.vercel.app'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY')

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
    const body = req.method === 'POST' ? await req.json() : {}
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

    const caller = await getCaller(req, supabase)
    if (!caller) return new Response(JSON.stringify({ success: false, connected: false, error: 'Please sign in to QPlan again.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    // The company and the person always come from the sign-in, never from the request
    body.company_id = caller.company_id
    body.username = caller.username

    if (action === 'callback') {
      const { code, company_id, username } = body

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
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

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      })
      const userInfo = await userRes.json()

      await supabase.from('calendar_connections').upsert({
        company_id,
        username,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        email: userInfo.email,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      }, { onConflict: 'company_id,username,provider' })

      return new Response(JSON.stringify({ success: true, email: userInfo.email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'sync_booking') {
      const { company_id, username, booking } = body

      const { data: conn } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('company_id', company_id)
        .eq('username', username)
        .eq('provider', 'google')
        .single()

      if (!conn) return new Response(JSON.stringify({ success: false, error: 'Not connected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

      let accessToken = conn.access_token
      if (new Date(conn.expires_at) < new Date()) {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: conn.refresh_token,
            grant_type: 'refresh_token',
          }),
        })
        const refreshed = await refreshRes.json()
        accessToken = refreshed.access_token
        await supabase.from('calendar_connections').update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        }).eq('id', conn.id)
      }

      const startDate = new Date(`${booking.date}T${booking.start_time}:00`)
      const endDate = new Date(startDate.getTime() + booking.duration_minutes * 60000)

      const event = {
        summary: booking.client_name ? `${booking.client_name} — ${booking.title}` : booking.title,
        description: booking.notes || '',
        start: { dateTime: startDate.toISOString(), timeZone: 'Australia/Brisbane' },
        end: { dateTime: endDate.toISOString(), timeZone: 'Australia/Brisbane' },
      }

      const eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      const createdEvent = await eventRes.json()

      await supabase.from('bookings').update({
        external_id: createdEvent.id,
        external_source: 'google',
      }).eq('id', booking.id)

      return new Response(JSON.stringify({ success: true, event_id: createdEvent.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'status') {
      const { company_id, username } = body
      const { data } = await supabase
        .from('calendar_connections')
        .select('email, provider')
        .eq('company_id', company_id)
        .eq('username', username)
        .eq('provider', 'google')
        .single()

      return new Response(JSON.stringify({ connected: !!data, email: data?.email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'disconnect') {
      const { company_id, username } = body
      await supabase.from('calendar_connections')
        .delete()
        .eq('company_id', company_id)
        .eq('username', username)
        .eq('provider', 'google')

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})