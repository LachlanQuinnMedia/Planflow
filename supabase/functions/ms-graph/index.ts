// supabase/functions/ms-graph/index.ts
// Microsoft 365 / OneDrive / SharePoint integration for QPlan.
// Actions: callback, status, disconnect, drives, list, search, preview, item
//
// Every file action accepts an optional drive_id. Without it, the connected
// user's own OneDrive (/me/drive) is used. With it, any drive the connected
// user can reach is used (another person's OneDrive or a SharePoint library).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLIENT_ID = Deno.env.get('OUTLOOK_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('OUTLOOK_CLIENT_SECRET')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const REDIRECT_URI = 'https://planflow-beige.vercel.app'
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH = 'https://graph.microsoft.com/v1.0'
const SCOPES = 'Files.ReadWrite.All Sites.Read.All offline_access User.Read'

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
      scope: SCOPES,
    }),
  })
  return res.json()
}

// No scope on refresh: Microsoft reuses whatever was consented at connect time.
async function refreshToken(refresh_token: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

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

async function graphPost(token: string, path: string, body: unknown) {
  const res = await fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  return res.json()
}

// Base path for a drive: the connected user's own OneDrive, or a specific drive by id
function driveBase(driveId?: string | null) {
  return driveId ? `/drives/${encodeURIComponent(driveId)}` : '/me/drive'
}

// Human-readable folder path from Graph's parentReference ("/drive/root:/Jobs/2026" -> "Jobs/2026")
function cleanPath(parentPath?: string | null, name?: string | null) {
  const base = (parentPath || '').replace(/^\/drives\/[^/]+\/root:?/, '').replace(/^\/drive\/root:?/, '')
  const parts = [base.replace(/^\//, ''), name || ''].filter(Boolean)
  return decodeURIComponent(parts.join('/'))
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
    driveId: item.parentReference?.driveId ?? null,
    path: cleanPath(item.parentReference?.path, item.name),
  }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  let body: any = {}
  try { body = await req.json() } catch { /* no body */ }
  const { company_id } = body
  const driveId: string | null = body.drive_id || null

  try {
    if (action === 'callback') {
      const { code, username } = body
      if (!code || !company_id) return json({ success: false, error: 'Missing code or company_id' }, 400)

      const tokens = await exchangeCode(code)
      if (!tokens.access_token) {
        return json({ success: false, error: tokens.error_description || 'Token exchange failed' }, 400)
      }

      const me = await graphGet(tokens.access_token, '/me')
      const email = me.mail || me.userPrincipalName || ''

      const { error } = await supabase.from('msgraph_tokens').upsert({
        company_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        email,
        connected_by: username || null,
      }, { onConflict: 'company_id' })

      if (error) return json({ success: false, error: `Could not save connection: ${error.message}` }, 500)
      return json({ success: true, email })
    }

    if (action === 'status') {
      if (!company_id) return json({ connected: false })
      const { data } = await supabase
        .from('msgraph_tokens')
        .select('email, connected_by')
        .eq('company_id', company_id)
        .maybeSingle()
      return json({ connected: !!data, email: data?.email || null, connected_by: data?.connected_by || null })
    }

    if (action === 'disconnect') {
      if (!company_id) return json({ success: false }, 400)
      await supabase.from('msgraph_tokens').delete().eq('company_id', company_id)
      return json({ success: true })
    }

    // All the places files can live: the connected user's OneDrive plus any SharePoint
    // document libraries they can reach. SharePoint lookup failing (e.g. personal
    // Microsoft account) is not an error: the OneDrive entry is always returned.
    if (action === 'drives') {
      const token = await getValidToken(company_id)
      if (!token) return json({ success: false, error: 'Not connected' }, 401)

      const drives: any[] = []
      const me = await graphGet(token, '/me/drive?$select=id,name,owner,webUrl')
      if (me?.id) {
        drives.push({ id: me.id, name: 'OneDrive', kind: 'onedrive', owner: me.owner?.user?.displayName || null, webUrl: me.webUrl || null })
      }

      let sharepointError: string | null = null
      const sites = await graphGet(token, '/sites?search=*&$select=id,displayName,webUrl&$top=25')
      if (sites?.error) {
        sharepointError = sites.error.message
      } else {
        const siteList = (sites.value || []).slice(0, 25)
        const results = await Promise.all(siteList.map((s: any) => graphGet(token, `/sites/${s.id}/drives?$select=id,name,webUrl,driveType`)))
        results.forEach((r: any, i: number) => {
          const site = siteList[i]
          for (const d of r?.value || []) {
            if (d.driveType && d.driveType !== 'documentLibrary') continue
            drives.push({ id: d.id, name: `${site.displayName} / ${d.name}`, kind: 'sharepoint', siteName: site.displayName, webUrl: d.webUrl || null })
          }
        })
      }

      return json({ success: true, drives, sharepointError })
    }

    if (action === 'list') {
      const token = await getValidToken(company_id)
      if (!token) return json({ success: false, error: 'Not connected' }, 401)

      const folderId = body.folder_id
      const base = driveBase(driveId)
      const path = folderId
        ? `${base}/items/${folderId}/children?$top=200&$orderby=name`
        : `${base}/root/children?$top=200&$orderby=name`
      const result = await graphGet(token, path)
      if (result.error) return json({ success: false, error: result.error.message }, 400)

      return json({ success: true, items: mapItems(result.value) })
    }

    if (action === 'search') {
      const token = await getValidToken(company_id)
      if (!token) return json({ success: false, error: 'Not connected' }, 401)

      const q = (body.query || '').replace(/'/g, "''")
      if (!q) return json({ success: true, items: [] })

      // Search inside a specific folder when given, otherwise the whole drive
      const scope = body.folder_id ? `/items/${body.folder_id}` : '/root'
      const result = await graphGet(token, `${driveBase(driveId)}${scope}/search(q='${encodeURIComponent(q)}')?$top=100`)
      if (result.error) return json({ success: false, error: result.error.message }, 400)

      return json({ success: true, items: mapItems(result.value) })
    }

    // Embeddable read-only preview URL for a file (Microsoft allows this one in iframes)
    if (action === 'preview') {
      const token = await getValidToken(company_id)
      if (!token) return json({ success: false, error: 'Not connected' }, 401)
      const itemId = body.item_id
      if (!itemId) return json({ success: false, error: 'Missing item_id' }, 400)

      const result = await graphPost(token, `${driveBase(driveId)}/items/${itemId}/preview`, { viewer: null, chromeless: true })
      if (result.error) return json({ success: false, error: result.error.message }, 400)
      if (!result.getUrl) return json({ success: false, error: 'No preview available for this file' }, 400)

      return json({ success: true, url: result.getUrl })
    }

    // Details for one item (used when linking a folder to a job, and to check a link still works)
    if (action === 'item') {
      const token = await getValidToken(company_id)
      if (!token) return json({ success: false, error: 'Not connected' }, 401)
      const itemId = body.item_id
      const base = driveBase(driveId)
      const path = itemId ? `${base}/items/${itemId}` : `${base}/root`
      const result = await graphGet(token, `${path}?$select=id,name,webUrl,folder,parentReference,lastModifiedDateTime`)
      if (result.error) return json({ success: false, error: result.error.message }, 400)
      const [item] = mapItems([result])
      return json({ success: true, item })
    }

    return json({ success: false, error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ success: false, error: String(e) }, 500)
  }
})
