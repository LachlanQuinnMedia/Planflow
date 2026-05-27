import { useState } from 'react'
import { getSecurityQuestion, verifySecurityAnswer, resetPassword } from './auth'

export default function ForgotPassword({ onBack }) {
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [companyCode, setCompanyCode] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [userId, setUserId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFindUser = async () => {
    if (!username.trim() || !companyCode.trim()) { setError('Please fill in all fields.'); return }
    setLoading(true)
    setError('')
    const { question: q, error: err } = await getSecurityQuestion({ username, companyCode })
    if (err) { setError(err); setLoading(false); return }
    setQuestion(q)
    setStep(2)
    setLoading(false)
  }

  const handleVerifyAnswer = async () => {
    if (!answer.trim()) { setError('Please enter your answer.'); return }
    setLoading(true)
    setError('')
    const { user, error: err } = await verifySecurityAnswer({ username, companyCode, answer })
    if (err) { setError(err); setLoading(false); return }
    setUserId(user.id)
    setStep(3)
    setLoading(false)
  }

  const handleReset = async () => {
    if (!newPassword.trim()) { setError('Please enter a new password.'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await resetPassword({ userId, newPassword })
    if (err) { setError(err); setLoading(false); return }
    setStep(4)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">PF</div>
          <span className="text-xl font-semibold">PlanFlow</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
            <div className="text-base font-semibold">
              {step === 4 ? 'Password reset' : 'Forgot password'}
            </div>
          </div>

          {step !== 4 && (
            <div className="text-xs text-gray-400 mb-6">
              {step === 1 && 'Enter your details to find your account.'}
              {step === 2 && 'Answer your security question to verify your identity.'}
              {step === 3 && 'Choose a new password.'}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your username" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company code</label>
                <input type="text" value={companyCode} onChange={e => setCompanyCode(e.target.value)} placeholder="e.g. 0000" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <button onClick={handleFindUser} disabled={loading} className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {loading ? 'Looking up...' : 'Find my account'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-600 font-medium">
                {question}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your answer</label>
                <input type="text" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Not case sensitive" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <button onClick={handleVerifyAnswer} disabled={loading} className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify answer'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <button onClick={handleReset} disabled={loading} className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-2xl mx-auto mb-4">✓</div>
              <div className="text-xs text-gray-500 mb-6">Your password has been reset. You can now sign in with your new password.</div>
              <button onClick={onBack} className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}