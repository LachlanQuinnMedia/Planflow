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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function refreshWithXero(refresh_token: string) {
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token }),
  })
  return res.json()
}

// Returns { access_token, tenant_id } for the company, refreshing if near expiry.
async function getValidToken(supabase: any, company_id: string) {
  const { data: tokenData } = await supabase
    .from('xero_tokens')
    .select('*')
    .eq('company_id', company_id)
    .maybeSingle()
  if (!tokenData) return null

  const expiry = new Date(tokenData.token_expiry).getTime()
  if (expiry - Date.now() > 5 * 60 * 1000) {
    return { access_token: tokenData.access_token, tenant_id: tokenData.tenant_id }
  }

  const tokens = await refreshWithXero(tokenData.refresh_token)
  if (!tokens.access_token) return null
  await supabase.from('xero_tokens').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('company_id', company_id)
  return { access_token: tokens.access_token, tenant_id: tokenData.tenant_id }
}

async function xeroApi(auth: { access_token: string; tenant_id: string }, path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`https://api.xero.com/api.xro/2.0${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${auth.access_token}`,
      'Xero-tenant-id': auth.tenant_id,
      'Accept': 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data: any = {}
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { ok: res.ok, status: res.status, data }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    let body: any = {}
    try { body = await req.json() } catch { /* no body */ }
    const { company_id } = body

    if (action === 'callback') {
      const { code } = body

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
        return json({ success: false, error: err }, 400)
      }

      const tokens = await tokenRes.json()
      const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

      const connectionsRes = await fetch('https://api.xero.com/connections', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` }
      })
      const connections = await connectionsRes.json()
      const tenant = connections[0]

      const { error } = await supabase.from('xero_tokens').upsert({
        company_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiry,
        tenant_id: tenant?.tenantId,
        tenant_name: tenant?.tenantName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' })

      if (error) return json({ success: false, error: `Could not save tokens: ${error.message}` }, 500)
      return json({ success: true, tenant_name: tenant?.tenantName })
    }

    if (action === 'refresh') {
      const { data: tokenData } = await supabase
        .from('xero_tokens').select('*').eq('company_id', company_id).maybeSingle()
      if (!tokenData) return json({ error: 'No token found' }, 404)

      const tokens = await refreshWithXero(tokenData.refresh_token)
      await supabase.from('xero_tokens').update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('company_id', company_id)

      return json({ access_token: tokens.access_token })
    }

    if (action === 'get_token') {
      const auth = await getValidToken(supabase, company_id)
      if (!auth) return json({ error: 'Not connected' }, 404)
      return json(auth)
    }

    if (action === 'disconnect') {
      await supabase.from('xero_tokens').delete().eq('company_id', company_id)
      return json({ success: true })
    }

    // ---- Server-side proxies (browser can't call api.xero.com directly) ----

    if (action === 'invoices') {
      const auth = await getValidToken(supabase, company_id)
      if (!auth) return json({ success: false, error: 'Not connected' }, 401)
      const r = await xeroApi(auth, `/Invoices?where=${encodeURIComponent('Type=="ACCREC"')}&order=${encodeURIComponent('Date DESC')}&page=1`)
      if (!r.ok) return json({ success: false, error: r.data?.Message || r.data?.Detail || `Xero ${r.status}` }, 400)
      return json({ success: true, invoices: r.data.Invoices || [] })
    }

    if (action === 'contacts') {
      const auth = await getValidToken(supabase, company_id)
      if (!auth) return json({ success: false, error: 'Not connected' }, 401)
      const r = await xeroApi(auth, `/Contacts?where=${encodeURIComponent('IsCustomer==true')}`)
      if (!r.ok) return json({ success: false, error: r.data?.Message || r.data?.Detail || `Xero ${r.status}` }, 400)
      return json({ success: true, contacts: r.data.Contacts || [] })
    }

    if (action === 'create_contact') {
      const auth = await getValidToken(supabase, company_id)
      if (!auth) return json({ success: false, error: 'Not connected' }, 401)
      const { firstName, lastName, email, phone } = body
      const r = await xeroApi(auth, '/Contacts', 'POST', {
        Contacts: [{
          Name: `${firstName || ''} ${lastName || ''}`.trim() || email || 'Client',
          FirstName: firstName,
          LastName: lastName,
          EmailAddress: email,
          Phones: phone ? [{ PhoneType: 'DEFAULT', PhoneNumber: phone }] : [],
          IsCustomer: true,
        }]
      })
      if (!r.ok) return json({ success: false, error: r.data?.Message || r.data?.Elements?.[0]?.ValidationErrors?.[0]?.Message || `Xero ${r.status}` }, 400)
      return json({ success: true, contact: r.data.Contacts?.[0] })
    }

    if (action === 'create_invoice') {
      const auth = await getValidToken(supabase, company_id)
      if (!auth) return json({ success: false, error: 'Not connected' }, 401)
      const { invoice } = body
      const r = await xeroApi(auth, '/Invoices', 'POST', { Invoices: [invoice] })
      if (!r.ok) return json({ success: false, error: r.data?.Message || r.data?.Elements?.[0]?.ValidationErrors?.[0]?.Message || `Xero ${r.status}` }, 400)
      return json({ success: true, invoice: r.data.Invoices?.[0] })
    }

    return json({ error: 'Unknown action' }, 400)

  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})