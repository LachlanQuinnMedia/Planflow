import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://sltaaiumviyzgdsdkkbe.supabase.co'
// The public key. It only identifies the project. What a person can see is decided by
// their sign-in and the database rules, not by this key.
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdGFhaXVtdml5emdkc2Rra2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTYyNTMsImV4cCI6MjA5MDQ5MjI1M30.xqWqvx8vdofj119nXDpasQ8xVD67YJU0RrjTrxycTGo'

// "Stay logged in" keeps the sign-in in this browser. Without it, the sign-in ends when the tab is closed.
const STAY_FLAG = 'pf_stay'

export function setStayLoggedIn(stay) {
  try {
    if (stay) localStorage.setItem(STAY_FLAG, '1')
    else localStorage.removeItem(STAY_FLAG)
  } catch { /* storage unavailable */ }
}

const sessionStore = {
  getItem: (key) => sessionStorage.getItem(key) ?? localStorage.getItem(key),
  setItem: (key, value) => {
    if (localStorage.getItem(STAY_FLAG) === '1') {
      localStorage.setItem(key, value)
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, value)
      localStorage.removeItem(key)
    }
  },
  removeItem: (key) => {
    sessionStorage.removeItem(key)
    localStorage.removeItem(key)
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: sessionStore,
    persistSession: true,
    autoRefreshToken: true,
    // QPlan's own Microsoft and Xero sign-ins come back with ?code=. Supabase must leave those alone.
    detectSessionInUrl: false,
  },
})

// Headers for calling QPlan's server functions as the signed-in person
export async function fnHeaders() {
  let token = SUPABASE_ANON_KEY
  try {
    const { data } = await supabase.auth.getSession()
    if (data?.session?.access_token) token = data.session.access_token
  } catch { /* not signed in */ }
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
}

// POST to a server function and return its JSON (plus ok and status)
export async function callFunction(name, action, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}?action=${action}`, {
    method: 'POST',
    headers: await fnHeaders(),
    body: JSON.stringify(payload || {}),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, ...data }
}

// Uploaded documents are private. This makes a short-lived link for the signed-in person.
export async function openDocument(doc, { download = false } = {}) {
  // Open the tab straight away so the browser does not treat it as a pop-up
  const tab = download ? null : window.open('', '_blank')
  const { data, error } = await supabase.storage.from('documents')
    .createSignedUrl(doc.file_path, 300, download ? { download: doc.name || true } : undefined)
  if (error || !data?.signedUrl) {
    if (tab) tab.close()
    alert('Could not open this document: ' + (error?.message || 'Unknown error'))
    return
  }
  if (tab) { tab.location.href = data.signedUrl; return }
  const a = document.createElement('a')
  a.href = data.signedUrl
  a.download = doc.name || ''
  document.body.appendChild(a)
  a.click()
  a.remove()
}
