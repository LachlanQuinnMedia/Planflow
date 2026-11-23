// supabase/functions/calendar-outlook/index.ts
// Each person's own Outlook calendar. Actions: callback, sync_booking, events, status, team_status, disconnect.
//
// Microsoft replaces the refresh token every time it is used. The new one is saved each
// time, so the connection stays alive instead of dropping. If Microsoft refuses the refresh
// (password changed, access removed), the row is flagged needs_reconnect and QPlan asks that
// person to reconnect.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OUTLOOK_CLIENT_ID = Deno.env.get('OUTLOOK_CLIENT_ID')
const OUTLOOK_CLIENT_SECRET = Deno.env.get('OUTLOOK_CLIENT_SECRET')
const REDIRECT_URI = 'https://planflow-beige.vercel.app'
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

    const caller = await getCaller(req, supabase)
    if (!caller) return json({ success: false, connected: false, error: 'Please sign in to QPlan again.' }, 401)
    // The company and the person always come from the sign-in, never from the request
    body.company_id = caller.company_id
    body.username = caller.username

    if (action === 'callback') {
      const { code, company_id, username } = body
      if (!code || !company_id || !username) return json({ success: false, error: 'Missing code, company or user' }, 400)

      const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: OUTLOOK_CLIENT_ID!,
          client_secret: OUTLOOK_CLIENT_SECRET!,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      })

      const tokens = await tokenRes.json()
      if (!tokens.access_token) {
        return json({ success: false, error: tokens.error_description || 'Microsoft did not return a sign-in token' })
      }

      let email: string | null = null
      try {
        const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        const userInfo = await userRes.json()
        email = userInfo.mail || userInfo.userPrincipalName || null
      } catch { /* email is optional */ }

      const { error } = await supabase.from('calendar_connections').upsert({
        company_id,
        username,
        provider: 'outlook',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        email,
        expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        needs_reconnect: false,
      }, { onConflict: 'company_id,username,provider' })
      if (error) return json({ success: false, error: `Could not save the connection: ${error.message}` }, 500)

      return json({ success: true, email })
    }

    if (action === 'sync_booking') {
      const { company_id, username, booking } = body

      const { data: conn } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('company_id', company_id)
        .eq('username', username)
        .eq('provider', 'outlook')
        .maybeSingle()

      if (!conn) return json({ success: false, error: 'Not connected' })
      if (conn.needs_reconnect) return json({ success: false, error: 'reconnect', message: 'Reconnect your calendar from Calendar > Connect calendar.' })

      let accessToken = conn.access_token
      // Refresh a few minutes early so a token never expires mid-request
      if (new Date(conn.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
        const refreshRes = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: OUTLOOK_CLIENT_ID!,
            client_secret: OUTLOOK_CLIENT_SECRET!,
            refresh_token: conn.refresh_token,
            grant_type: 'refresh_token',
          }),
        })
        const refreshed = await refreshRes.json()
        if (!refreshed.access_token) {
          await supabase.from('calendar_connections').update({ needs_reconnect: true }).eq('id', conn.id)
          return json({ success: false, error: 'reconnect', message: 'Microsoft signed this calendar out. Reconnect it from Calendar > Connect calendar.' })
        }
        accessToken = refreshed.access_token
        await supabase.from('calendar_connections').update({
          access_token: accessToken,
          // Microsoft issues a new refresh token each time. Keep it, or the next refresh fails.
          refresh_token: refreshed.refresh_token || conn.refresh_token,
          expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
          needs_reconnect: false,
        }).eq('id', conn.id)
      }

      // Times are sent as Brisbane wall-clock times. The start time can arrive as "09:00" or "09:00:00".
      const hhmm = String(booking.start_time || '09:00').slice(0, 5)
      const [y, mo, d] = String(booking.date).split('-').map(Number)
      const [h, mi] = hhmm.split(':').map(Number)
      const minutes = Number(booking.duration_minutes) || 60
      const wall = (ms: number) => new Date(ms).toISOString().slice(0, 19)
      const startMs = Date.UTC(y, mo - 1, d, h, mi)
      if (Number.isNaN(startMs)) return json({ success: false, error: 'The meeting has no valid date or time' })

      const event = {
        subject: booking.client_name ? `${booking.client_name} - ${booking.title}` : booking.title,
        body: { contentType: 'text', content: booking.notes || '' },
        start: { dateTime: wall(startMs), timeZone: 'Australia/Brisbane' },
        end: { dateTime: wall(startMs + minutes * 60000), timeZone: 'Australia/Brisbane' },
      }

      const eventRes = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      const createdEvent = await eventRes.json()
      if (createdEvent?.error) return json({ success: false, error: createdEvent.error.message })

      await supabase.from('bookings').update({
        external_id: createdEvent.id,
        external_source: 'outlook',
      }).eq('id', booking.id).eq('company_id', company_id)

      return json({ success: true, event_id: createdEvent.id })
    }

    // This person's own Outlook events for a range of days, read live from Microsoft.
    // Nothing is copied into QPlan's database.
    if (action === 'events') {
      const { company_id, username } = body
      const start = String(body.start || ''), end = String(body.end || '')
      const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
      if (!isDay(start) || !isDay(end)) return json({ success: false, error: 'Missing dates' }, 400)

      const { data: conn } = await supabase
        .from('calendar_connections').select('*')
        .eq('company_id', company_id).eq('username', username).eq('provider', 'outlook').maybeSingle()
      if (!conn) return json({ success: true, connected: false, events: [] })
      if (conn.needs_reconnect) return json({ success: false, connected: true, error: 'reconnect', events: [] })

      let accessToken = conn.access_token
      if (new Date(conn.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
        const refreshRes = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: OUTLOOK_CLIENT_ID!, client_secret: OUTLOOK_CLIENT_SECRET!,
            refresh_token: conn.refresh_token, grant_type: 'refresh_token',
          }),
        })
        const refreshed = await refreshRes.json()
        if (!refreshed.access_token) {
          await supabase.from('calendar_connections').update({ needs_reconnect: true }).eq('id', conn.id)
          return json({ success: false, connected: true, error: 'reconnect', events: [] })
        }
        accessToken = refreshed.access_token
        await supabase.from('calendar_connections').update({
          access_token: accessToken,
          refresh_token: refreshed.refresh_token || conn.refresh_token,
          expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
          needs_reconnect: false,
        }).eq('id', conn.id)
      }

      // Brisbane has no daylight saving, so +10:00 is right all year
      const query = new URLSearchParams({
        startDateTime: `${start}T00:00:00+10:00`,
        endDateTime: `${end}T23:59:59+10:00`,
        $select: 'id,subject,start,end,isAllDay,isCancelled,location,webLink,showAs,attendees,organizer,bodyPreview',
        $orderby: 'start/dateTime',
        $top: '200',
      })
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${query}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="E. Australia Standard Time"' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) return json({ success: false, connected: true, error: data.error?.message || `Microsoft returned ${res.status}`, events: [] })

      const events = (data.value || []).filter((e: any) => !e.isCancelled).map((e: any) => ({
        id: e.id,
        subject: e.subject || '(No title)',
        start: String(e.start?.dateTime || '').slice(0, 19),
        end: String(e.end?.dateTime || '').slice(0, 19),
        allDay: !!e.isAllDay,
        location: e.location?.displayName || '',
        webLink: e.webLink || null,
        showAs: e.showAs || null,
        // For the meeting summary box: names only, and a short plain-text preview of the description
        attendees: (e.attendees || []).map((a: any) => a.emailAddress?.name || a.emailAddress?.address || '').filter(Boolean).slice(0, 40),
        organizer: e.organizer?.emailAddress?.name || e.organizer?.emailAddress?.address || '',
        preview: String(e.bodyPreview || '').trim().slice(0, 500),
      }))
      return json({ success: true, connected: true, events })
    }

    if (action === 'status') {
      const { company_id, username } = body
      const { data } = await supabase
        .from('calendar_connections')
        .select('email, provider, needs_reconnect')
        .eq('company_id', company_id)
        .eq('username', username)
        .eq('provider', 'outlook')
        .maybeSingle()

      return json({ connected: !!data, email: data?.email || null, needs_reconnect: !!data?.needs_reconnect })
    }

    // Who at the firm has connected their Outlook calendar (no tokens returned)
    if (action === 'team_status') {
      if (caller.role !== 'director') return json({ connections: [] }, 403)
      const { company_id } = body
      if (!company_id) return json({ connections: [] })
      const { data } = await supabase
        .from('calendar_connections')
        .select('username, email, needs_reconnect')
        .eq('company_id', company_id)
        .eq('provider', 'outlook')
      return json({ connections: data || [] })
    }

    if (action === 'disconnect') {
      const { company_id, username } = body
      await supabase.from('calendar_connections')
        .delete()
        .eq('company_id', company_id)
        .eq('username', username)
        .eq('provider', 'outlook')

      return json({ success: true })
    }

    return json({ error: 'Unknown action' })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
