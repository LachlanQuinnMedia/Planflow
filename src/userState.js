// src/userState.js
// What QPlan remembers about one person, kept on their account so it follows them to any
// device: which tutorials they have finished, and when they last opened Notifications.
//
// It used to live only in the browser, so a new laptop, the installed app and a phone each
// forgot it and showed the tutorial and the same "new" notifications again.
//
// The browser still keeps a copy. That copy is what the app falls back on if the account's
// copy cannot be reached, and it is how a device that already knew something hands it over.
import { supabase } from './supabase'

const SEEN_KEY = 'qplanLastSeenNotifications'
const EPOCH = '1970-01-01T00:00:00.000Z'
export const tourRole = (role) => (role === 'director' ? 'director' : 'staff')
const tourKey = (userId, role) => `qplan_tour_${tourRole(role)}_${userId}`

const later = (a, b) => (new Date(a || EPOCH) >= new Date(b || EPOCH) ? (a || EPOCH) : b)

// ---- what this browser knows ----
export function localTourSeen(userId, role) {
  // If the device cannot remember, do not show the tutorial on every single login
  try { return localStorage.getItem(tourKey(userId, role)) === '1' } catch { return true }
}
function setLocalTourSeen(userId, role) {
  try { localStorage.setItem(tourKey(userId, role), '1') } catch { /* storage unavailable */ }
}
export function localNotificationsSeen() {
  try { return localStorage.getItem(SEEN_KEY) || EPOCH } catch { return EPOCH }
}
function setLocalNotificationsSeen(when) {
  try { localStorage.setItem(SEEN_KEY, when) } catch { /* storage unavailable */ }
}

// ---- what the account knows ----
async function readRow(userId) {
  const { data, error } = await supabase.from('user_state').select('tours_done, notifications_seen').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return { tours_done: data?.tours_done || {}, notifications_seen: data?.notifications_seen || {} }
}
async function writeRow(userId, row) {
  const { error } = await supabase.from('user_state')
    .upsert({ user_id: userId, tours_done: row.tours_done, notifications_seen: row.notifications_seen, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

// Read the account's copy, add anything this device knew that the account did not, and
// return the two together. `synced` is false when the account's copy could not be reached.
export async function syncUserState(user) {
  const local = {
    tours_done: Object.fromEntries(['director', 'staff'].filter(r => localTourSeen(user.id, r)).map(r => [r, true])),
    seen: localNotificationsSeen(),
  }
  try {
    const row = await readRow(user.id)
    const next = { tours_done: { ...row.tours_done }, notifications_seen: { ...row.notifications_seen } }
    let changed = false
    for (const r of Object.keys(local.tours_done)) {
      if (!next.tours_done[r]) { next.tours_done[r] = new Date().toISOString(); changed = true }
    }
    const company = user.company_id
    if (company && local.seen !== EPOCH && later(local.seen, next.notifications_seen[company]) !== (next.notifications_seen[company] || EPOCH)) {
      next.notifications_seen[company] = local.seen; changed = true
    }
    if (changed) await writeRow(user.id, next).catch(() => {})
    // keep this browser's copy in step, so it still knows if the account cannot be reached next time
    for (const r of ['director', 'staff']) if (next.tours_done[r]) setLocalTourSeen(user.id, r)
    return { userId: user.id, synced: true, ...next }
  } catch {
    return { userId: user.id, synced: false, tours_done: local.tours_done, notifications_seen: {} }
  }
}

// The tutorial for this role is finished: remember it here and on the account
export async function markTourDone(userId, role) {
  setLocalTourSeen(userId, role)
  try {
    const row = await readRow(userId)
    if (row.tours_done[tourRole(role)]) return
    row.tours_done[tourRole(role)] = new Date().toISOString()
    await writeRow(userId, row)
  } catch { /* this device still remembers; the account catches up at the next sign-in */ }
}

// Notifications were opened: nothing older than now counts as new, on any device
export async function markNotificationsSeen(userId, companyId, when) {
  setLocalNotificationsSeen(when)
  if (!userId || !companyId) return
  try {
    const row = await readRow(userId)
    row.notifications_seen[companyId] = later(when, row.notifications_seen[companyId])
    await writeRow(userId, row)
  } catch { /* this device still remembers */ }
}

// The moment before which notifications are not new, for this person at this firm
export function notificationsSeenAt(state, companyId, localSeen) {
  const fromAccount = state && companyId ? state.notifications_seen?.[companyId] : null
  return later(localSeen, fromAccount)
}

export function tourDone(state, userId, role) {
  return localTourSeen(userId, role) || !!state?.tours_done?.[tourRole(role)]
}
