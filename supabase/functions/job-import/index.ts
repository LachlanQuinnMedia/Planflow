// supabase/functions/job-import/index.ts
// Reads the names of a firm's job folders from its Microsoft 365, so old jobs can be brought
// into QPlan in one go. Directors only. It only reads folder names. It never changes anything
// in Microsoft 365, and it creates no jobs: the app shows a preview first and the director
// confirms.
//
// Action: scan_folders { drive_id, folder_id, next } -> one page of folders, and where to carry on from

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLIENT_ID = Deno.env.get('OUTLOOK_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('OUTLOOK_CLIENT_SECRET')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH = 'https://graph.microsoft.com/v1.0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// The firm's Microsoft 365 sign-in, refreshed if it is about to run out
async function getValidToken(company_id: string): Promise<string | null> {
  const { data } = await supabase.from('msgraph_tokens').select('*').eq('company_id', company_id).maybeSingle()
  if (!data || !data.access_token) return null
  if (new Date(data.expires_at).getTime() - Date.now() > 5 * 60 * 1000) return data.access_token
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: data.refresh_token, grant_type: 'refresh_token' }),
  })
  const refreshed = await res.json()
  if (!refreshed.access_token) return null
  await supabase.from('msgraph_tokens').update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || data.refresh_token,
    expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
  }).eq('company_id', company_id)
  return refreshed.access_token
}

// Who is calling, from their QPlan sign-in. Never from what the browser sends.
async function getCaller(req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: u } = await supabase.from('app_users')
    .select('id, username, role, company_id, is_approved, is_active, is_platform_admin')
    .eq('id', data.user.id).maybeSingle()
  if (!u || !u.is_approved || u.is_active === false) return null
  return u
}

function cleanPath(parentPath?: string | null, name?: string | null) {
  const base = (parentPath || '').replace(/^\/drives\/[^/]+\/root:?/, '').replace(/^\/drive\/root:?/, '')
  return decodeURIComponent([base.replace(/^\//, ''), name || ''].filter(Boolean).join('/'))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Not found' }, 404)
  try {
    const caller = await getCaller(req)
    if (!caller) return json({ success: false, error: 'Please sign in to QPlan again.' }, 401)
    if (caller.role !== 'director' && caller.is_platform_admin !== true) return json({ success: false, error: 'Only a director can import jobs.' }, 403)
    const action = new URL(req.url).searchParams.get('action')
    const body = await req.json().catch(() => ({}))

    if (action === 'scan_folders') {
      const token = await getValidToken(caller.company_id)
      if (!token) return json({ success: false, connected: false, error: 'Microsoft 365 is not connected.' })

      // Carry on from where the last page stopped. Only ever a Microsoft Graph address.
      let url: string
      const next = typeof body.next === 'string' ? body.next : ''
      if (next) {
        if (!next.startsWith(`${GRAPH}/`)) return json({ success: false, error: 'That page could not be loaded.' }, 400)
        url = next
      } else {
        const drive = body.drive_id ? `/drives/${encodeURIComponent(String(body.drive_id))}` : '/me/drive'
        const where = body.folder_id ? `${drive}/items/${encodeURIComponent(String(body.folder_id))}/children` : `${drive}/root/children`
        url = `${GRAPH}${where}?$top=200&$select=id,name,folder,webUrl,parentReference,createdDateTime,lastModifiedDateTime`
      }
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) return json({ success: false, error: data?.error?.message || 'Microsoft 365 did not answer.' })

      const folders = (data.value || []).filter((i: any) => !!i.folder).map((i: any) => ({
        id: i.id, name: i.name, childCount: i.folder?.childCount ?? null, webUrl: i.webUrl ?? null,
        driveId: i.parentReference?.driveId ?? null, path: cleanPath(i.parentReference?.path, i.name),
        created: i.createdDateTime ?? null, modified: i.lastModifiedDateTime ?? null,
      }))
      return json({ success: true, folders, next: data['@odata.nextLink'] || null })
    }

    return json({ success: false, error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('job-import error', e)
    return json({ success: false, error: 'Something went wrong. Please try again.' }, 500)
  }
})
