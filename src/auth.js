import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, setStayLoggedIn } from './supabase'

// Signing in, signing up and password resets all go through the "auth" server function.
// Passwords and security answers are checked on the server. The browser never sees them stored.
async function callAuth(action, payload) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/auth?action=${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload || {}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok && !data.error) return { error: 'Something went wrong. Please try again.' }
    return data
  } catch {
    return { error: 'Could not reach QPlan. Check your internet connection and try again.' }
  }
}

export async function registerUser({ username, password, companyCode, directorCode, securityQuestion, securityAnswer }) {
  const data = await callAuth('register', {
    username: (username || '').trim(),
    password,
    companyCode: (companyCode || '').trim(),
    directorCode: (directorCode || '').trim(),
    securityQuestion,
    securityAnswer,
  })
  if (data.error) return { error: data.error }
  return { user: data.user, role: data.role, isApproved: data.isApproved }
}

export async function loginUser({ username, password, companyCode, stayLoggedIn }) {
  const data = await callAuth('login', {
    username: (username || '').trim(),
    password,
    companyCode: (companyCode || '').trim(),
  })
  if (data.error) return { error: data.error }
  if (!data.user || !data.session) return { error: 'Could not sign in. Please try again.' }

  setStayLoggedIn(!!stayLoggedIn)
  const { error } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
  if (error) return { error: 'Could not sign in. Please try again.' }
  return { user: data.user }
}

export async function getSecurityQuestion({ username, companyCode }) {
  const data = await callAuth('security_question', { username: (username || '').trim(), companyCode: (companyCode || '').trim() })
  if (data.error || !data.question) return { error: data.error || 'User not found.' }
  return { question: data.question }
}

export async function verifySecurityAnswer({ username, companyCode, answer }) {
  const data = await callAuth('verify_answer', { username: (username || '').trim(), companyCode: (companyCode || '').trim(), answer })
  if (data.error || !data.success) return { error: data.error || 'Incorrect answer.' }
  return { success: true }
}

// The answer is sent again with the new password, so the server can check it in the same step
export async function resetPassword({ username, companyCode, answer, newPassword }) {
  const data = await callAuth('reset_password', {
    username: (username || '').trim(), companyCode: (companyCode || '').trim(), answer, newPassword,
  })
  if (data.error || !data.success) return { error: data.error || 'Could not reset password.' }
  return { success: true }
}

// Who is signed in (name, role, company), kept next to the sign-in itself
export function saveSession(user, stayLoggedIn, rememberMe) {
  const sessionData = JSON.stringify({
    id: user.id,
    username: user.username,
    role: user.role,
    company_id: user.company_id,
    company_code: user.company_code,
    companyName: user.companyName || user.companies?.name || '',
  })

  if (stayLoggedIn) {
    localStorage.setItem('pf_session', sessionData)
  } else {
    sessionStorage.setItem('pf_session', sessionData)
    if (rememberMe) {
      localStorage.setItem('pf_remember_username', user.username)
      localStorage.setItem('pf_remember_company', user.company_code)
    }
  }
}

export function loadSession() {
  try {
    const stored = localStorage.getItem('pf_session') || sessionStorage.getItem('pf_session')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

// True only if this browser also holds a live sign-in for that person
export async function hasLiveSignIn(userId) {
  try {
    const { data } = await supabase.auth.getSession()
    return !!data?.session && data.session.user?.id === userId
  } catch {
    return false
  }
}

export function clearSession() {
  localStorage.removeItem('pf_session')
  sessionStorage.removeItem('pf_session')
  // Ends the sign-in in this browser only. Other devices stay signed in.
  supabase.auth.signOut({ scope: 'local' }).catch(() => {})
}
