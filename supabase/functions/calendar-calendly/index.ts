import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CALENDLY_CLIENT_ID = Deno.env.get('CALENDLY_CLIENT_ID')
const CALENDLY_CLIENT_SECRET = Deno.env.get('CALENDLY_CLIENT_SECRET')
const REDIRECT_URI = 'https://planflow-beige.vercel.app'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY')

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

    if (action === 'callback') {
      const body = await req.json()
      const { code, company_id, username } = body

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

      await fetch('https://api.calendly.com/webhook_subscriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `${SUPABASE_URL}/functions/v1/calendar-calendly?action=webhook&company_id=${company_id}&username=${username}`,
          events: ['invitee.created', 'invitee.canceled'],
          organization: userData.resource?.current_organization,
          user: userUri,
          scope: 'user',
        }),
      })

      return new Response(JSON.stringify({ success: true, email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'webhook') {
      const company_id = url.searchParams.get('company_id')
      const username = url.searchParams.get('username')
      const rawBody = await req.text()
      const payload = JSON.parse(rawBody)

      if (payload.event === 'invitee.created') {
        const event = payload.payload
        const startTime = new Date(event.scheduled_event?.start_time)
        const endTime = new Date(event.scheduled_event?.end_time)
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

        await supabase.from('bookings').insert({
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
      }

      if (payload.event === 'invitee.canceled') {
        await supabase.from('bookings')
          .delete()
          .eq('external_id', payload.payload?.uri)
          .eq('external_source', 'calendly')
      }

      return new Response('ok', { headers: corsHeaders })
    }

    if (action === 'status') {
      const body = await req.json()
      const { company_id, username } = body
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
      const { company_id, username } = body
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
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})