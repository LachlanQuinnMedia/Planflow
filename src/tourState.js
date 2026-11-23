// src/tourState.js
// Remembers, on this device, whether a person has already been shown the tutorial.
const seenKey = (userId) => `qplan_tour_${userId}`

export function tourSeen(userId) {
  // If the device cannot remember, do not show it on every single login
  try { return localStorage.getItem(seenKey(userId)) === '1' } catch { return true }
}

export function markTourSeen(userId) {
  try { localStorage.setItem(seenKey(userId), '1') } catch { /* storage unavailable */ }
}
