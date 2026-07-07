// supabase/functions/ms-graph/index.ts
// Microsoft 365 / OneDrive integration for QPlan.
// Actions: callback, status, disconnect, list, search
// Reuses OUTLOOK_CLIENT_ID / OUTLOOK_CLIENT_SECRET secrets (same Azure app, expanded scopes).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLIENT_ID = Deno.env.get('OUTLOOK_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('OUTLOOK_CLIENT_SECRET')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const REDIRECT_URI = 'https://planflow-beige.vercel.app'
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH = 'https://graph.microsoft.com/v1.0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: 'Files.ReadWrite.All offline_access User.Read',
    }),
  })
  return res.json()
}

async function refreshToken(refresh_token: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
      scope: 'Files.ReadWrite.All offline_access User.Read',
    }),
  })
  return res.json()
}

// Returns a valid access token for the company, refreshing if within 5 min of expiry.
async function getValidToken(company_id: string): Promise<string | null> {
  const { data } = await supabase
    .from('msgraph_tokens')
    .select('*')
    .eq('company_id', company_id)
    .maybeSingle()
  if (!data) return null

  const expiresAt = new Date(data.expires_at).getTime()
  if (expiresAt - Date.now() > 5 * 60 * 1000) return data.access_token

  const refreshed = await refreshToken(data.refresh_token)
  if (!refreshed.access_token) return null

  await supabase.from('msgraph_tokens').update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || data.refresh_token,
    expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
  }).eq('company_id', company_id)

  return refreshed.access_token
}

async function graphGet(token: string, path: string) {
  const res = await fetch(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

function mapItems(value: any[]) {
  return (value || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    isFolder: !!item.folder,
    childCount: item.folder?.childCount ?? null,
    size: item.size ?? null,
    webUrl: item.webUrl ?? null,
    lastModified: item.lastModifiedDateTime ?? null,
    lastModifiedBy: item.lastModifiedBy?.user?.displayName ?? null,
    mimeType: item.file?.mimeType ?? null,
    parentId: item.parentReference?.id ?? null,
  }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  let body: any = {}
  try { body = await req.json() } catch { /* no body */ }
  const { company_id } = body

  try {
    // ---- OAuth callback: exchange code, store tokens per company ----
    if (action === 'callback') {
      const { code, username } = body
      if (!code || !company_id) return json({ success: false, error: 'Missing code or company_id' }, 400)

      const tokens = await exchangeCode(code)
      if (!tokens.access_token) {
        return json({ success: false, error: tokens.error_description || 'Token exchange failed' }, 400)
      }

      const me = await graphGet(tokens.access_token, '/me')
      const email = me.mail || me.userPrincipalName || ''

      await supabase.from('msgraph_tokens').upsert({
        company_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        email,
        connected_by: username || null,
      }, { onConflict: 'company_id' })

      return json({ success: true, email })
    }

    // ---- Connection status ----
    if (action === 'status') {
      if (!company_id) return json({ connected: false })
      const { data } = await supabase
        .from('msgraph_tokens')
        .select('email, connected_by')
        .eq('company_id', company_id)
        .maybeSingle()
      return json({ connected: !!data, email: data?.email || null, connected_by: data?.connected_by || null })
    }

    // ---- Disconnect ----
    if (action === 'disconnect') {
      if (!company_id) return json({ success: false }, 400)
      await supabase.from('msgraph_tokens').delete().eq('company_id', company_id)
      return json({ success: true })
    }

    // ---- List folder contents (root if no folder_id) ----
    if (action === 'list') {
      const token = await getValidToken(company_id)
      if (!token) return json({ success: false, error: 'Not connected' }, 401)

      const folderId = body.folder_id
      const path = folderId
        ? `/me/drive/items/${folderId}/children?$top=200&$orderby=name`
        : '/me/drive/root/children?$top=200&$orderby=name'
      const result = await graphGet(token, path)
      if (result.error) return json({ success: false, error: result.error.message }, 400)

      return json({ success: true, items: mapItems(result.value) })
    }

    // ---- Search whole drive ----
    if (action === 'search') {
      const token = await getValidToken(company_id)
      if (!token) return json({ success: false, error: 'Not connected' }, 401)

      const q = (body.query || '').replace(/'/g, "''")
      if (!q) return json({ success: true, items: [] })

      const result = await graphGet(token, `/me/drive/root/search(q='${encodeURIComponent(q)}')?$top=100`)
      if (result.error) return json({ success: false, error: result.error.message }, 400)

      return json({ success: true, items: mapItems(result.value) })
    }

    return json({ success: false, error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ success: false, error: String(e) }, 500)
  }
})