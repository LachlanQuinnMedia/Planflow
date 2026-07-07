import { supabase } from './supabase'

// Simple hash function for passwords and security answers
// In production you'd use bcrypt but this works for local/demo use
export async function hashString(str) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function registerUser({ username, password, companyCode, directorCode, securityQuestion, securityAnswer }) {
  // Check company code exists
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('company_code', companyCode)
    .single()

  if (companyError || !company) {
    return { error: 'Invalid company code. Please check with your manager.' }
  }

  // Check if username already exists in this company
  const { data: existing } = await supabase
    .from('app_users')
    .select('id')
    .eq('username', username)
    .eq('company_code', companyCode)
    .single()

  if (existing) {
    return { error: 'Username already taken for this company.' }
  }

  // Determine role based on director code
  const isDirector = directorCode && directorCode === company.director_code
  const role = isDirector ? 'director' : 'employee'
  const isApproved = isDirector ? true : false

  const passwordHash = await hashString(password)
  const answerHash = await hashString(securityAnswer)

  const { data: newUser, error: insertError } = await supabase
    .from('app_users')
    .insert({
      username,
      password_hash: passwordHash,
      company_id: company.id,
      company_code: companyCode,
      role,
      security_question: securityQuestion,
      security_answer_hash: answerHash,
      is_approved: isApproved,
    })
    .select()
    .single()

  if (insertError) {
    return { error: 'Could not create account. Please try again.' }
  }

  // Add in-app notification for directors
  await supabase.from('notifications').insert({
    company_id: company.id,
    type: 'new_user',
    message: `New ${role} account created: ${username}. ${!isApproved ? 'Awaiting your approval.' : ''}`,
  })

  // Send email to directors if employee (not director)
  if (!isDirector && company.director_emails?.length > 0) {
    for (const email of company.director_emails) {
      await supabase.functions.invoke('send-email', {
        body: {
          template: 'account_approval',
          to: email,
          params: { username, companyName: company.name },
        },
      }).catch(() => {}) // fail silently if email doesn't send
    }
  }

  return { user: newUser, role, isApproved }
}

export async function loginUser({ username, password, companyCode }) {
  const passwordHash = await hashString(password)

  const { data: user, error } = await supabase
    .from('app_users')
    .select('*, companies(*)')
    .eq('username', username)
    .eq('company_code', companyCode)
    .eq('password_hash', passwordHash)
    .single()

  if (error || !user) {
    return { error: 'Incorrect username, password, or company code.' }
  }

  if (!user.is_approved) {
    return { error: 'Your account is pending approval from a director. Please check back soon.' }
  }

  return { user }
}

export async function verifySecurityAnswer({ username, companyCode, answer }) {
  const answerHash = await hashString(answer)

  const { data: user, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('username', username)
    .eq('company_code', companyCode)
    .eq('security_answer_hash', answerHash)
    .single()

  if (error || !user) {
    return { error: 'Incorrect answer.' }
  }

  return { user }
}

export async function resetPassword({ userId, newPassword }) {
  const passwordHash = await hashString(newPassword)

  const { error } = await supabase
    .from('app_users')
    .update({ password_hash: passwordHash })
    .eq('id', userId)

  if (error) return { error: 'Could not reset password.' }
  return { success: true }
}

export async function getSecurityQuestion({ username, companyCode }) {
  const { data: user, error } = await supabase
    .from('app_users')
    .select('security_question')
    .eq('username', username)
    .eq('company_code', companyCode)
    .single()

  if (error || !user) {
    return { error: 'User not found.' }
  }

  return { question: user.security_question }
}

export function saveSession(user, stayLoggedIn, rememberMe) {
  const sessionData = JSON.stringify({
    id: user.id,
    username: user.username,
    role: user.role,
    company_id: user.company_id,
    company_code: user.company_code,
    companyName: user.companies?.name || '',
  })

  if (stayLoggedIn) {
    localStorage.setItem('pf_session', sessionData)
  } else if (rememberMe) {
    sessionStorage.setItem('pf_session', sessionData)
    localStorage.setItem('pf_remember_username', user.username)
    localStorage.setItem('pf_remember_company', user.company_code)
  } else {
    sessionStorage.setItem('pf_session', sessionData)
  }
}

export function loadSession() {
  const local = localStorage.getItem('pf_session')
  if (local) return JSON.parse(local)
  const session = sessionStorage.getItem('pf_session')
  if (session) return JSON.parse(session)
  return null
}

export function clearSession() {
  localStorage.removeItem('pf_session')
  sessionStorage.removeItem('pf_session')
}