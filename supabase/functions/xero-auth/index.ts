import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const XERO_CLIENT_ID = Deno.env.get('XERO_CLIENT_ID')!
const XERO_CLIENT_SECRET = Deno.env.get('XERO_CLIENT_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const REDIRECT_URI = 'https://planflow-beige.vercel.app/xero/callback'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    if (action === 'callback') {
      const body = await req.json()
      const { code, company_id } = body

      const tokenRes = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
        }),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.text()
        return new Response(JSON.stringify({ error: err }), { status: 400, headers: corsHeaders })
      }

      const tokens = await tokenRes.json()
      const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

      const connectionsRes = await fetch('https://api.xero.com/connections', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` }
      })
      const connections = await connectionsRes.json()
      const tenant = connections[0]

      await supabase.from('xero_tokens').upsert({
        company_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiry,
        tenant_id: tenant?.tenantId,
        tenant_name: tenant?.tenantName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' })

      return new Response(JSON.stringify({ success: true, tenant_name: tenant?.tenantName }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'refresh') {
      const body = await req.json()
      const { company_id } = body

      const { data: tokenData } = await supabase
        .from('xero_tokens')
        .select('*')
        .eq('company_id', company_id)
        .single()

      if (!tokenData) {
        return new Response(JSON.stringify({ error: 'No token found' }), { status: 404, headers: corsHeaders })
      }

      const tokenRes = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token,
        }),
      })

      const tokens = await tokenRes.json()
      const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

      await supabase.from('xero_tokens').update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiry,
        updated_at: new Date().toISOString(),
      }).eq('company_id', company_id)

      return new Response(JSON.stringify({ access_token: tokens.access_token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'get_token') {
      const body = await req.json()
      const { company_id } = body

      const { data: tokenData } = await supabase
        .from('xero_tokens')
        .select('*')
        .eq('company_id', company_id)
        .single()

      if (!tokenData) {
        return new Response(JSON.stringify({ error: 'Not connected' }), { status: 404, headers: corsHeaders })
      }

      const expiry = new Date(tokenData.token_expiry)
      const now = new Date()
      const fiveMins = 5 * 60 * 1000

      if (expiry.getTime() - now.getTime() < fiveMins) {
        const tokenRes = await fetch('https://identity.xero.com/connect/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`),
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokenData.refresh_token,
          }),
        })
        const tokens = await tokenRes.json()
        const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        await supabase.from('xero_tokens').update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: newExpiry,
          updated_at: new Date().toISOString(),
        }).eq('company_id', company_id)
        return new Response(JSON.stringify({
          access_token: tokens.access_token,
          tenant_id: tokenData.tenant_id
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        tenant_id: tokenData.tenant_id
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'disconnect') {
      const body = await req.json()
      const { company_id } = body
      await supabase.from('xero_tokens').delete().eq('company_id', company_id)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})