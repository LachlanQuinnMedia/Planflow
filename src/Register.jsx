import { useState } from 'react'
import { registerUser } from './auth'

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What was the name of your primary school?",
  "What is your mother's maiden name?",
  "What was the make of your first car?",
  "What city were you born in?",
  "What is the name of your favourite childhood friend?",
]

export default function Register({ onBack, onSuccess }) {
  const [step, setStep] = useState(1) // 1 = details, 2 = security, 3 = success
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    companyCode: '',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: '',
    directorCode: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdRole, setCreatedRole] = useState('')

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const validateStep1 = () => {
    if (!form.username.trim()) return 'Please enter a username.'
    if (form.username.length < 3) return 'Username must be at least 3 characters.'
    if (!form.password.trim()) return 'Please enter a password.'
    if (form.password.length < 6) return 'Password must be at least 6 characters.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    if (!form.companyCode.trim()) return 'Please enter your company code.'
    return null
  }

  const validateStep2 = () => {
    if (!form.securityAnswer.trim()) return 'Please enter an answer to your security question.'
    return null
  }

  const handleNext = () => {
    const err = validateStep1()
    if (err) { setError(err); return }
    setError('')
    setStep(2)
  }

  const handleSubmit = async () => {
    const err = validateStep2()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')

    const { user, role, isApproved, error: regError } = await registerUser({
      username: form.username,
      password: form.password,
      companyCode: form.companyCode,
      directorCode: form.directorCode,
      securityQuestion: form.securityQuestion,
      securityAnswer: form.securityAnswer,
    })

    if (regError) {
      setError(regError)
      setLoading(false)
      return
    }

    setCreatedRole(role)
    setStep(3)
    setLoading(false)
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">PF</div>
            <span className="text-xl font-semibold">PlanFlow</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-2xl mx-auto mb-4">✓</div>
            <div className="text-base font-semibold mb-2">Account created!</div>
            {createdRole === 'director' ? (
              <div className="text-xs text-gray-500 mb-6">Your director account is ready. You can sign in now.</div>
            ) : (
              <div className="text-xs text-gray-500 mb-6">Your account has been created and is pending approval from a director. You'll be able to sign in once approved. The directors have been notified.</div>
            )}
            <button
              onClick={onBack}
              className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
            >
              Go to sign in
            </button>
          </div>
        </div>
      </div>
    )
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
            <button onClick={step === 1 ? onBack : () => setStep(1)} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
            <div className="text-base font-semibold">Create account</div>
          </div>
          <div className="text-xs text-gray-400 mb-2">Step {step} of 2</div>

          {/* Step indicator */}
          <div className="flex gap-1 mb-6">
            <div className="flex-1 h-1 rounded-full bg-emerald-500" />
            <div className={`flex-1 h-1 rounded-full ${step === 2 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                  placeholder="Choose a username"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirm password</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company code</label>
                <input
                  type="text"
                  value={form.companyCode}
                  onChange={e => set('companyCode', e.target.value)}
                  placeholder="Given to you by your manager"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Director code <span className="text-gray-400 font-normal">(optional — directors only)</span>
                </label>
                <input
                  type="text"
                  value={form.directorCode}
                  onChange={e => set('directorCode', e.target.value)}
                  placeholder="Leave blank if you're an employee"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                />
              </div>
              <button
                onClick={handleNext}
                className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 mt-2"
              >
                Next →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Security question</label>
                <select
                  value={form.securityQuestion}
                  onChange={e => set('securityQuestion', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                >
                  {SECURITY_QUESTIONS.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your answer</label>
                <input
                  type="text"
                  value={form.securityAnswer}
                  onChange={e => set('securityAnswer', e.target.value)}
                  placeholder="Your answer (not case sensitive)"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                />
                <div className="text-xs text-gray-400 mt-1">This is used to recover your account if you forget your password.</div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          )}

          <div className="mt-5 text-center">
            <span className="text-xs text-gray-400">Already have an account? </span>
            <button onClick={onBack} className="text-xs text-emerald-600 font-medium hover:underline">
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}