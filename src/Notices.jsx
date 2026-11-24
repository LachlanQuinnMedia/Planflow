// src/Notices.jsx
// Shows the messages raised with notify() (see notify.js). Mounted once, at the top of the app.
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { noticeStore } from './notify'

const TONES = {
  info: 'bg-gray-900 text-white border-gray-900',
  success: 'bg-emerald-600 text-white border-emerald-600',
  error: 'bg-white text-red-700 border-red-300',
}

export default function Notices() {
  const [list, setList] = useState(noticeStore.current)
  useEffect(() => noticeStore.listen(setList), [])
  if (!list.length) return null
  return createPortal(
    <div data-testid="notices" role="status" aria-live="polite" className="fixed bottom-4 inset-x-0 z-[400] flex flex-col items-center gap-2 px-4 pointer-events-none qp-safe-bottom">
      {list.map(m => (
        <div key={m.id} data-kind={m.kind} className={`pointer-events-auto max-w-md w-full sm:w-auto flex items-start gap-3 rounded-xl border shadow-lg px-4 py-3 text-xs ${TONES[m.kind]}`}>
          <div className="flex-1 whitespace-pre-line">{m.text}</div>
          <button onClick={() => noticeStore.dismiss(m.id)} aria-label="Close" className="opacity-70 hover:opacity-100 flex-shrink-0 leading-none text-sm">✕</button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
