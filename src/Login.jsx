import { useState } from 'react'
import { loginUser, saveSession } from './auth'
import qplanLogo from './assets/plan_logo.PNG'

export default function Login({ onLogin, onRegister, onForgotPassword }) {
  const [username, setUsername] = useState(localStorage.getItem('pf_remember_username') || '')
  const [password, setPassword] = useState('')
  const [companyCode, setCompanyCode] = useState(localStorage.getItem('pf_remember_company') || '')
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('pf_remember_username'))
  const [stayLoggedIn, setStayLoggedIn] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim() || !companyCode.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError('')
    const { user, error: loginError } = await loginUser({ username, password, companyCode })
    if (loginError) {
      setError(loginError)
      setLoading(false)
      return
    }
    saveSession(user, stayLoggedIn, rememberMe)
    if (!rememberMe) {
      localStorage.removeItem('pf_remember_username')
      localStorage.removeItem('pf_remember_company')
    }
    onLogin(user)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={qplanLogo} alt="QPlan" className="w-12 h-12 object-contain" />
          <span className="text-2xl font-semibold text-gray-800">QPlan</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="text-base font-semibold mb-1">Welcome back</div>
          <div className="text-xs text-gray-400 mb-6">Sign in to your account</div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Your username"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company code</label>
              <input
                type="text"
                value={companyCode}
                onChange={e => setCompanyCode(e.target.value)}
                placeholder="e.g. 0000"
                autoCapitalize="none"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 accent-emerald-600"
                  />
                  <span className="text-xs text-gray-500">Remember me</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stayLoggedIn}
                    onChange={e => setStayLoggedIn(e.target.checked)}
                    className="w-3.5 h-3.5 accent-emerald-600"
                  />
                  <span className="text-xs text-gray-500">Stay logged in</span>
                </label>
              </div>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-emerald-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <span className="text-xs text-gray-400">Don't have an account? </span>
            <button onClick={onRegister} className="text-xs text-emerald-600 font-medium hover:underline">
              Create account
            </button>
          </div>
        </div>

        <div className="text-center mt-4 text-xs text-gray-300">
          QPlan · Less process. More progress.
        </div>
      </div>
    </div>
  )
}