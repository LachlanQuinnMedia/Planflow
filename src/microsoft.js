// src/microsoft.js
// One place for every Microsoft 365 sign-in QPlan uses:
//   1. Admin approval for the whole firm (once, by the firm's Microsoft 365 admin)
//   2. The firm's OneDrive / SharePoint connection (once, by a director)
//   3. Each person's own Outlook calendar (once per person)
//
// After step 1, nobody at the firm sees a Microsoft "permissions requested" screen again.

import { notify } from './notify'

export const MS_REDIRECT_URI = 'https://planflow-beige.vercel.app'
export const MS_CLIENT_ID = import.meta.env.VITE_OUTLOOK_CLIENT_ID || ''

// Must match SCOPES in supabase/functions/ms-graph
export const MS_FILE_SCOPES = 'Files.ReadWrite.All Sites.Read.All offline_access User.Read'
export const MS_CALENDAR_SCOPES = 'Calendars.ReadWrite offline_access User.Read'

function encodeState(data) {
  return btoa(JSON.stringify(data))
}

function authorizeUrl(scope, state) {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    redirect_uri: MS_REDIRECT_URI,
    response_type: 'code',
    scope,
    prompt: 'select_account',
    state: encodeState(state),
  })
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
}

function requireClientId() {
  if (!MS_CLIENT_ID) { notify('Microsoft 365 is not configured yet.'); return false }
  return true
}

// Step 1. The firm's Microsoft 365 admin approves QPlan for everyone at the firm.
// The link works for whoever opens it, so it can be copied and sent to the admin.
export function adminConsentUrl(currentUser, nonce) {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    scope: 'https://graph.microsoft.com/.default',
    redirect_uri: MS_REDIRECT_URI,
    state: encodeState({ provider: 'msadmin', company_id: currentUser.company_id, username: currentUser.username || '', nonce: nonce || '' }),
  })
  return `https://login.microsoftonline.com/organizations/v2.0/adminconsent?${params}`
}

export function startAdminConsent(currentUser, nonce) {
  if (!requireClientId()) return
  window.location.href = adminConsentUrl(currentUser, nonce)
}

// Step 2. Connect the firm's OneDrive / SharePoint
export function connectFirmDrive(currentUser, returnTo = 'microsoft') {
  if (!requireClientId()) return
  window.location.href = authorizeUrl(MS_FILE_SCOPES, {
    provider: 'msgraph', company_id: currentUser.company_id, username: currentUser.username, returnTo,
  })
}

// Step 3. Connect this person's own Outlook calendar
export function connectMyCalendar(currentUser, returnTo = 'microsoft') {
  if (!requireClientId()) return
  window.location.href = authorizeUrl(MS_CALENDAR_SCOPES, {
    provider: 'outlook', company_id: currentUser.company_id, username: currentUser.username, returnTo,
  })
}

// Personal Microsoft accounts (outlook.com, hotmail and so on) are not the firm's
// Microsoft 365. Files in them make every team member ask for access.
const PERSONAL_DOMAINS = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'outlook.com.au', 'hotmail.com.au', 'live.com.au', 'passport.com']

export function isPersonalMicrosoftEmail(email) {
  const domain = String(email || '').toLowerCase().split('@')[1] || ''
  return PERSONAL_DOMAINS.includes(domain)
}
