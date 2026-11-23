// supabase/functions/ms-graph/index.ts
// Microsoft 365 / OneDrive / SharePoint integration for QPlan.
// Actions: callback, status, disconnect, drives, list, search, preview, item,
//          set_jobs_folder, create_folder, upload_file
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
  if (!data || !data.access_token) return null

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

// Microsoft 365 does not allow these characters in folder names: " * : < > ? / \ |
// (# and % are avoided too). Names also cannot end with a dot or a space.
function safeFolderName(name: string) {
  const cleaned = String(name || '')
    .replace(/["*:<>?/\\|#%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  return cleaned.slice(0, 180)
}

// The firm's "jobs folder": where new job folders are created
function jobsFolderOf(row: any) {
  if (!row || !row.jobs_folder_name) return null
  return {
    driveId: row.jobs_drive_id || null,
    folderId: row.jobs_folder_id || null,
    name: row.jobs_folder_name,
    path: row.jobs_folder_path || '',
    webUrl: row.jobs_folder_url || null,
    setBy: row.jobs_folder_set_by || null,
  }
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  let body: any = {}
  try { body = await req.json() } catch { /* no body */ }
  const caller = await getCaller(req, supabase)
  if (!caller) return json({ success: false, connected: false, error: 'Please sign in to QPlan again.' }, 401)
  // The company and the person always come from the sign-in, never from the request
  const company_id = caller.company_id
  body.username = caller.username
  // Connecting, disconnecting and choosing the firm's jobs folder are for directors
  if (['callback', 'disconnect', 'set_jobs_folder'].includes(action || '') && caller.role !== 'director') {
    return json({ success: false, error: 'Only a director can change the Microsoft 365 connection.' }, 403)
  }
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

      // A different Microsoft account means the saved jobs folder no longer points anywhere useful
      const { data: existing } = await supabase
        .from('msgraph_tokens').select('email').eq('company_id', company_id).maybeSingle()
      const accountChanged = !!existing && (existing.email || '').toLowerCase() !== email.toLowerCase()

      const { error } = await supabase.from('msgraph_tokens').upsert({
        company_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        email,
        connected_by: username || null,
        ...(accountChanged ? {
          jobs_drive_id: null, jobs_folder_id: null, jobs_folder_name: null,
          jobs_folder_path: null, jobs_folder_url: null, jobs_folder_set_by: null,
        } : {}),
      }, { onConflict: 'company_id' })

      if (error) return json({ success: false, error: `Could not save connection: ${error.message}` }, 500)
      return json({ success: true, email })
    }

    if (action === 'status') {
      if (!company_id) return json({ connected: false })
      const { data } = await supabase
        .from('msgraph_tokens')
        .select('email, connected_by, access_token, jobs_drive_id, jobs_folder_id, jobs_folder_name, jobs_folder_path, jobs_folder_url, jobs_folder_set_by')
        .eq('company_id', company_id)
        .maybeSingle()
      return json({
        connected: !!data?.access_token,
        email: data?.access_token ? data.email || null : null,
        connected_by: data?.access_token ? data.connected_by || null : null,
        jobsFolder: data?.access_token ? jobsFolderOf(data) : null,
      })
    }

    // Save (or clear) the folder that new job folders are created in
    if (action === 'set_jobs_folder') {
      if (!company_id) return json({ success: false, error: 'Missing company_id' }, 400)
      const { data: row } = await supabase
        .from('msgraph_tokens').select('company_id, access_token').eq('company_id', company_id).maybeSingle()
      if (!row?.access_token) return json({ success: false, error: 'Not connected' }, 401)

      const clear = body.clear === true
      const update = clear ? {
        jobs_drive_id: null, jobs_folder_id: null, jobs_folder_name: null,
        jobs_folder_path: null, jobs_folder_url: null, jobs_folder_set_by: null,
      } : {
        jobs_drive_id: body.drive_id || null,
        jobs_folder_id: body.folder_id || null,
        jobs_folder_name: String(body.name || 'OneDrive').slice(0, 300),
        jobs_folder_path: String(body.path || '').slice(0, 1000),
        jobs_folder_url: body.web_url || null,
        jobs_folder_set_by: body.username || null,
      }
      const { data: saved, error } = await supabase
        .from('msgraph_tokens').update(update).eq('company_id', company_id).select().maybeSingle()
      if (error) return json({ success: false, error: error.message }, 500)
      return json({ success: true, jobsFolder: jobsFolderOf(saved) })
    }

    // Create a folder. With no parent given, it is created inside the firm's jobs folder.
    // If a folder with that name is already there, that folder is returned instead.
    if (action === 'create_folder') {
      const token = await getValidToken(company_id)
      if (!token) return json({ success: false, error: 'Not connected' }, 401)

      const name = safeFolderName(body.name)
      if (!name) return json({ success: false, error: 'Missing folder name' }, 400)

      let parentDrive: string | null = driveId
      let parentId: string | null = body.parent_id || null
      if (!parentDrive && !parentId) {
        const { data: row } = await supabase
          .from('msgraph_tokens')
          .select('jobs_drive_id, jobs_folder_id, jobs_folder_name')
          .eq('company_id', company_id)
          .maybeSingle()
        if (!row?.jobs_folder_name) return json({ success: false, error: 'No jobs folder has been set yet' }, 400)
        parentDrive = row.jobs_drive_id || null
        parentId = row.jobs_folder_id || null
      }

      const base = driveBase(parentDrive)
      const parentPath = parentId ? `${base}/items/${parentId}` : `${base}/root`
      const created = await graphPost(token, `${parentPath}/children`, {
        name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      })

      if (created?.error) {
        if (created.error.code === 'nameAlreadyExists') {
          const existing = await graphGet(token, `${parentPath}:/${encodeURIComponent(name)}`)
          if (existing?.error) return json({ success: false, error: existing.error.message }, 400)
          if (!existing.folder) return json({ success: false, error: `A file called "${name}" already exists there` }, 400)
          const [item] = mapItems([existing])
          return json({ success: true, existed: true, item })
        }
        return json({ success: false, error: created.error.message }, 400)
      }

      const [item] = mapItems([created])
      return json({ success: true, existed: false, item })
    }

    // Save a file into a folder, for example documents generated when a job is created.
    // Small files only (Word documents are well under the limit). A file with the same name is kept, and the new one is renamed.
    if (action === 'upload_file') {
      const token = await getValidToken(company_id)
      if (!token) return json({ success: false, error: 'Not connected' }, 401)
      const parentId = body.parent_id
      const name = safeFolderName(String(body.name || ''))
      if (!parentId || !name) return json({ success: false, error: 'Missing folder or file name' }, 400)
      let bytes: Uint8Array
      try {
        bytes = Uint8Array.from(atob(String(body.content_base64 || '')), (c) => c.charCodeAt(0))
      } catch {
        return json({ success: false, error: 'The file could not be read' }, 400)
      }
      if (!bytes.length) return json({ success: false, error: 'The file is empty' }, 400)
      if (bytes.length > 4 * 1024 * 1024) return json({ success: false, error: 'The file is larger than 4 MB' }, 400)

      const res = await fetch(
        `${GRAPH}${driveBase(driveId)}/items/${parentId}:/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=rename`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' }, body: bytes },
      )
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.error) return json({ success: false, error: result.error?.message || `Microsoft 365 returned ${res.status}` }, 400)
      const [item] = mapItems([result])
      return json({ success: true, item })
    }

    if (action === 'disconnect') {
      if (!company_id) return json({ success: false }, 400)
      // Keep the row (email and jobs folder) so reconnecting the same account keeps the jobs folder.
      // The tokens are wiped, so nothing can reach Microsoft 365 until someone connects again.
      const { error } = await supabase.from('msgraph_tokens')
        .update({ access_token: '', refresh_token: '', expires_at: new Date(0).toISOString() })
        .eq('company_id', company_id)
      if (error) return json({ success: false, error: error.message }, 500)
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
