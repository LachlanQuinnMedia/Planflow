// src/tourState.js
// Remembers, on this device, whether a person has already been shown their tutorial.
// Directors and staff have different tutorials, so each is remembered separately.
const seenKey = (userId, role) => `qplan_tour_${role === 'director' ? 'director' : 'staff'}_${userId}`

export function tourSeen(userId, role) {
  // If the device cannot remember, do not show it on every single login
  try { return localStorage.getItem(seenKey(userId, role)) === '1' } catch { return true }
}

export function markTourSeen(userId, role) {
  try { localStorage.setItem(seenKey(userId, role), '1') } catch { /* storage unavailable */ }
}
