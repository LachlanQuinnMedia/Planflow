// src/notify.js
// Small messages that slide in at the bottom of the screen and go away by themselves, in place
// of the browser's own pop-up boxes. An error stays until it is closed.
//
//   notify('Saved.')                      a plain message
//   notify.error('Could not save: ...')   something went wrong
//   notify.success('Invoice sent.')

let nextId = 1
const listeners = new Set()
let messages = []
const emit = () => listeners.forEach(fn => fn(messages))
const dismiss = (id) => { messages = messages.filter(m => m.id !== id); emit() }

function push(text, kind) {
  const clean = String(text ?? '').trim()
  if (!clean) return
  // The same message twice in a row is shown once
  if (messages.some(m => m.text === clean && m.kind === kind)) return
  const id = nextId++
  messages = [...messages.slice(-3), { id, text: clean, kind }]
  emit()
  if (kind !== 'error') setTimeout(() => dismiss(id), 5000)
}

export function notify(text) { push(text, 'info') }
notify.error = (text) => push(text, 'error')
notify.success = (text) => push(text, 'success')

// For the Notices component: what is showing now, a way to hear about changes, and a way to close one
export const noticeStore = {
  current: () => messages,
  listen: (fn) => { listeners.add(fn); return () => { listeners.delete(fn) } },
  dismiss,
}
