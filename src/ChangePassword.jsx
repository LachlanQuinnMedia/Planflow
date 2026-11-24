// src/ChangePassword.jsx
// Change your own password while signed in. The current password is checked on the server.
import { useState } from 'react'
import { callFunction } from './supabase'
import { notify } from './notify'

export default function ChangePassword({ onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!current || !next || !again) { setError('Please fill in all three boxes.'); return }
    if (next.length < 6) { setError('The new password must be at least 6 characters.'); return }
    if (next !== again) { setError('The two new passwords do not match.'); return }
    setSaving(true); setError('')
    const res = await callFunction('auth', 'change_password', { currentPassword: current, newPassword: next }).catch(() => ({ error: 'Could not reach QPlan. Check your internet connection and try again.' }))
    setSaving(false)
    if (!res.success) { setError(res.error || 'Could not change the password. Please try again.'); return }
    notify.success('Password changed. Use the new one next time you log in.')
    onClose()
  }

  const field = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400'
  const type = show ? 'text' : 'password'
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" data-testid="change-password">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">Change password</div>
          <div className="text-xs text-gray-500 mt-0.5">You stay logged in on this device. Passwords are case sensitive.</div>
        </div>
        <form className="px-5 py-4 space-y-3" onSubmit={e => { e.preventDefault(); save() }}>
          <div>
            <label className="text-xs text-gray-600 mb-1 block" htmlFor="cp-current">Current password</label>
            <input id="cp-current" type={type} autoComplete="current-password" autoFocus value={current} onChange={e => setCurrent(e.target.value)} className={field} />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block" htmlFor="cp-new">New password</label>
            <input id="cp-new" type={type} autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} className={field} />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block" htmlFor="cp-again">New password again</label>
            <input id="cp-again" type={type} autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)} className={field} />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Show passwords</label>
          {error && <div data-testid="cp-error" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">{saving ? 'Changing...' : 'Change password'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
