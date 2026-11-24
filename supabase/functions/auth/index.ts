// supabase/functions/auth/index.ts
// Sign-in for QPlan. People still log in with username + password + company code.
// Behind the scenes each person gets a real Supabase Auth session, which is what the
// database rules check. Passwords and security answers never reach the browser.
//
// Actions: login, register, security_question, verify_answer, reset_password, change_password
//
// Existing accounts are moved across the first time each person signs in. They notice nothing.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Sign-in addresses are internal only. ".invalid" can never receive mail, so nobody
// can ask Supabase to email a reset link for one of these.
const EMAIL_DOMAIN = 'users.qplan.invalid'

const MAX_USER_FAILS = 8      // wrong passwords per account per 15 minutes
const MAX_ANSWER_FAILS = 5    // wrong security answers per account per 15 minutes
const MAX_IP_FAILS = 40       // failures per network address per 15 minutes
const MAX_IP_REGISTERS = 10   // sign-ups per network address per 15 minutes
const WINDOW_MIN = 15
const MIN_PASSWORD = 6

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const enc = new TextEncoder()
const str = (v: unknown, max = 200) => String(v ?? '').slice(0, max)

function b64(bytes: Uint8Array) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
function unb64(s: string) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}
async function sha256(text: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}
async function sha256Hex(text: string) {
  return Array.from(await sha256(text)).map(b => b.toString(16).padStart(2, '0')).join('')
}
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// What Supabase Auth stores is a fixed-length value worked out from the password, so
// short or old passwords are never refused, and Supabase hashes it again with bcrypt.
async function authPassword(password: string) {
  return 'q1.' + b64(await sha256('qplan.v1|' + password)).replace(/=+$/, '')
}
// Passwords created before the move were not case sensitive. That is kept for those accounts.
const oldStyle = (password: string) => password.toLowerCase().trim()

const normAnswer = (answer: string) => answer.toLowerCase().trim()
async function hashAnswer(answer: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', enc.encode(normAnswer(answer)), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256)
  return `pbkdf2$100000$${b64(salt)}$${b64(new Uint8Array(bits))}`
}
async function answerMatches(answer: string, stored: string | null) {
  if (!stored) return false
  const parts = stored.split('$')
  if (parts[0] === 'sha256') return sameText(await sha256Hex(normAnswer(answer)), parts[1] || '')
  if (parts[0] === 'pbkdf2') {
    const key = await crypto.subtle.importKey('raw', enc.encode(normAnswer(answer)), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: unb64(parts[2] || ''), iterations: Number(parts[1]) || 100000 }, key, 256)
    return sameText(b64(new Uint8Array(bits)), parts[3] || '')
  }
  return false
}

// ---- slowing down guessing ----
async function tooMany(key: string, max: number) {
  const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString()
  const { count } = await db.from('auth_attempts').select('id', { count: 'exact', head: true }).eq('key', key).gte('created_at', since)
  return (count || 0) >= max
}
async function note(...keys: string[]) {
  await db.from('auth_attempts').insert(keys.map(key => ({ key })))
  if (Math.random() < 0.02) {
    await db.from('auth_attempts').delete().lt('created_at', new Date(Date.now() - 24 * 3600000).toISOString())
  }
}
const TOO_MANY = `Too many attempts. Please wait ${WINDOW_MIN} minutes and try again.`

// ---- lookups ----
async function findCompany(companyCode: string) {
  if (!companyCode) return null
  const { data } = await db.from('companies').select('id, name, company_code, director_code, director_emails').eq('company_code', companyCode).maybeSingle()
  return data || null
}
// Usernames are not case sensitive. Compared here rather than with a database pattern, so "%" and "*" mean nothing special.
async function findUser(companyId: string, username: string) {
  const { data } = await db.from('app_users')
    .select('id, username, role, company_id, company_code, is_approved, is_active')
    .eq('company_id', companyId)
  const wanted = username.toLowerCase()
  const found = (data || []).find((u: any) => String(u.username).toLowerCase() === wanted)
  if (found) return found
  // The QPlan master account signs in with its home firm's code, whichever firm it is looking at
  const { data: masters } = await db.from('app_users')
    .select('id, username, role, company_id, company_code, is_approved, is_active')
    .eq('is_platform_admin', true).eq('home_company_id', companyId)
  return (masters || []).find((u: any) => String(u.username).toLowerCase() === wanted) || null
}
async function getSecrets(userId: string) {
  const { data } = await db.from('user_secrets').select('*').eq('user_id', userId).maybeSingle()
  return data || null
}
const emailFor = (userId: string) => `${userId}@${EMAIL_DOMAIN}`

// Create the Supabase Auth sign-in for an account, or set its password if it already has one
async function setAuthPassword(userId: string, password: string) {
  const { error: createError } = await db.auth.admin.createUser({
    id: userId, email: emailFor(userId), password, email_confirm: true,
  })
  if (!createError) return null
  const { error: updateError } = await db.auth.admin.updateUserById(userId, { password })
  return updateError ? (createError.message || updateError.message) : null
}

async function passwordSignIn(userId: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ email: emailFor(userId), password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) return null
  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    expires_in: data.expires_in as number,
    expires_at: data.expires_at as number,
    token_type: data.token_type as string,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Not found' }, 404)

  try {
    const action = new URL(req.url).searchParams.get('action')
    const body = await req.json().catch(() => ({}))
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    const ipKey = `ip|${ip}`

    const username = str(body.username, 80).trim()
    const companyCode = str(body.companyCode, 80).trim()
    const userKey = `user|${companyCode.toLowerCase()}|${username.toLowerCase()}`

    // ---------------- login ----------------
    if (action === 'login') {
      const password = str(body.password, 300)
      const BAD = 'Incorrect username, password, or company code.'
      if (!username || !password || !companyCode) return json({ error: 'Please fill in all fields.' })
      if (await tooMany(userKey, MAX_USER_FAILS) || await tooMany(ipKey, MAX_IP_FAILS)) return json({ error: TOO_MANY })

      const company = await findCompany(companyCode)
      const user = company ? await findUser(company.id, username) : null
      if (!company || !user) { await note(userKey, ipKey); return json({ error: BAD }) }

      const secrets = await getSecrets(user.id)
      let caseInsensitive = !!secrets?.password_ci

      // First sign-in since the move: check the old password record, then hand the password to Supabase Auth
      if (secrets?.legacy_password_sha256) {
        if (!sameText(await sha256Hex(oldStyle(password)), secrets.legacy_password_sha256)) {
          await note(userKey, ipKey)
          return json({ error: BAD })
        }
        const failed = await setAuthPassword(user.id, await authPassword(oldStyle(password)))
        if (failed) return json({ error: 'Could not sign you in. Please try again.' }, 500)
        await db.from('user_secrets')
          .update({ legacy_password_sha256: null, password_ci: true, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
        caseInsensitive = true
      }

      const session = await passwordSignIn(user.id, await authPassword(caseInsensitive ? oldStyle(password) : password))
      if (!session) { await note(userKey, ipKey); return json({ error: BAD }) }

      if (!user.is_approved) {
        await db.auth.admin.signOut(session.access_token).catch(() => {})
        return json({
          error: user.is_active === false
            ? 'Your account has been deactivated. Please speak to a director.'
            : 'Your account is pending approval from a director. Please check back soon.',
        })
      }

      // The master account may be looking at a different firm from the one whose code it signed in with
      let companyName = company.name || ''
      if (user.company_id !== company.id) {
        const { data: viewing } = await db.from('companies').select('name').eq('id', user.company_id).maybeSingle()
        companyName = viewing?.name || ''
      }
      return json({
        user: {
          id: user.id, username: user.username, role: user.role,
          company_id: user.company_id, company_code: user.company_code, companyName,
        },
        session,
      })
    }

    // ---------------- register ----------------
    if (action === 'register') {
      const password = str(body.password, 300)
      const directorCode = str(body.directorCode, 80).trim()
      const securityQuestion = str(body.securityQuestion, 200).trim()
      const securityAnswer = str(body.securityAnswer, 200)
      if (username.length < 3) return json({ error: 'Username must be at least 3 characters.' })
      if (password.length < MIN_PASSWORD) return json({ error: `Password must be at least ${MIN_PASSWORD} characters.` })
      if (!companyCode) return json({ error: 'Please enter your company code.' })
      if (!securityQuestion || !securityAnswer.trim()) return json({ error: 'Please enter an answer to your security question.' })
      if (await tooMany(`reg|${ip}`, MAX_IP_REGISTERS) || await tooMany(ipKey, MAX_IP_FAILS)) return json({ error: TOO_MANY })
      await note(`reg|${ip}`)

      const company = await findCompany(companyCode)
      if (!company) { await note(ipKey); return json({ error: 'Invalid company code. Please check with your manager.' }) }
      if (await findUser(company.id, username)) return json({ error: 'Username already taken for this company.' })

      // A wrong director code is not an error: the account is simply created as an employee awaiting approval
      const isDirector = !!directorCode && !!company.director_code && sameText(directorCode, String(company.director_code))
      const role = isDirector ? 'director' : 'employee'

      const { data: newUser, error: insertError } = await db.from('app_users')
        .insert({ username, company_id: company.id, company_code: company.company_code, role, is_approved: isDirector })
        .select('id, username, role, is_approved').single()
      if (insertError || !newUser) return json({ error: 'Could not create account. Please try again.' })

      const failed = await setAuthPassword(newUser.id, await authPassword(password))
      const { error: secretError } = failed ? { error: null } : await db.from('user_secrets').insert({
        user_id: newUser.id, password_ci: false,
        security_question: securityQuestion, security_answer_hash: await hashAnswer(securityAnswer),
      })
      if (failed || secretError) {
        await db.from('app_users').delete().eq('id', newUser.id)
        return json({ error: 'Could not create account. Please try again.' })
      }

      await db.from('notifications').insert({
        company_id: company.id, type: 'new_user',
        message: `New ${role} account created: ${username}. ${!isDirector ? 'Awaiting your approval.' : ''}`,
      })

      if (!isDirector) {
        for (const email of (company.director_emails || [])) {
          await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({ template: 'account_approval', to: email, params: { username, companyName: company.name } }),
          }).catch(() => {})
        }
      }

      return json({ user: { id: newUser.id, username: newUser.username }, role, isApproved: isDirector })
    }

    // ---------------- forgot password ----------------
    if (action === 'security_question' || action === 'verify_answer' || action === 'reset_password') {
      if (!username || !companyCode) return json({ error: 'Please fill in all fields.' })
      if (await tooMany(ipKey, MAX_IP_FAILS)) return json({ error: TOO_MANY })

      const company = await findCompany(companyCode)
      const user = company ? await findUser(company.id, username) : null
      const secrets = user ? await getSecrets(user.id) : null
      if (!user || !secrets?.security_question) { await note(ipKey); return json({ error: 'User not found.' }) }

      if (action === 'security_question') return json({ question: secrets.security_question })

      const answerKey = `answer|${user.id}`
      if (await tooMany(answerKey, MAX_ANSWER_FAILS)) return json({ error: TOO_MANY })
      const answer = str(body.answer, 200)
      if (!answer.trim() || !(await answerMatches(answer, secrets.security_answer_hash))) {
        await note(answerKey, ipKey)
        return json({ error: 'Incorrect answer.' })
      }

      if (action === 'verify_answer') return json({ success: true })

      const newPassword = str(body.newPassword, 300)
      if (newPassword.length < MIN_PASSWORD) return json({ error: `Password must be at least ${MIN_PASSWORD} characters.` })
      const failed = await setAuthPassword(user.id, await authPassword(newPassword))
      if (failed) return json({ error: 'Could not reset password.' })
      await db.from('user_secrets').update({
        legacy_password_sha256: null, password_ci: false,
        security_answer_hash: await hashAnswer(answer), updated_at: new Date().toISOString(),
      }).eq('user_id', user.id)
      return json({ success: true })
    }

    // ---------------- change password (signed in) ----------------
    if (action === 'change_password') {
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
      const { data: who } = token ? await db.auth.getUser(token) : { data: null as any }
      const userId = who?.user?.id
      if (!userId) return json({ error: 'Please sign in again.' }, 401)
      const { data: me } = await db.from('app_users').select('id, is_approved, is_active').eq('id', userId).maybeSingle()
      if (!me || !me.is_approved || me.is_active === false) return json({ error: 'Please sign in again.' }, 401)

      const current = str(body.currentPassword, 300)
      const next = str(body.newPassword, 300)
      if (!current || !next) return json({ error: 'Please fill in all fields.' })
      if (next.length < MIN_PASSWORD) return json({ error: `The new password must be at least ${MIN_PASSWORD} characters.` })
      if (next === current) return json({ error: 'The new password is the same as the current one.' })
      const pwKey = `pw|${userId}`
      if (await tooMany(pwKey, MAX_USER_FAILS) || await tooMany(ipKey, MAX_IP_FAILS)) return json({ error: TOO_MANY })

      const secrets = await getSecrets(userId)
      const ok = secrets?.legacy_password_sha256
        ? sameText(await sha256Hex(oldStyle(current)), secrets.legacy_password_sha256)
        : !!(await passwordSignIn(userId, await authPassword(secrets?.password_ci ? oldStyle(current) : current)))
      if (!ok) { await note(pwKey, ipKey); return json({ error: 'The current password is not right.' }) }

      const failed = await setAuthPassword(userId, await authPassword(next))
      if (failed) return json({ error: 'Could not change the password. Please try again.' })
      // New passwords are case sensitive
      await db.from('user_secrets').upsert(
        { user_id: userId, legacy_password_sha256: null, password_ci: false, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' })
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('auth error', e)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
