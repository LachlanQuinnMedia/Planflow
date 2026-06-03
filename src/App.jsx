import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { loadSession, clearSession } from './auth'
import Login from './Login'
import Register from './Register'
import ForgotPassword from './ForgotPassword'
import Dashboard from './Dashboard'
import Jobs from './Jobs'
import NewJob from './NewJob'
import JobDetail from './JobDetail'
import Workload from './Workload'
import Bookings from './Bookings'
import Calendar from './Calendar'
import Templates from './Templates'
import Documents from './Documents'
import TimeBudget from './TimeBudget'
import Planners from './Planners'
import Xero from './XeroPage'
import qplanLogo from './assets/plan_logo.PNG'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', section: 'main' },
  { id: 'jobs', label: 'Jobs', section: 'main' },
  { id: 'newjob', label: 'New Job', section: 'main' },
  { id: 'docs', label: 'Documents', section: 'tools' },
  { id: 'time', label: 'Time & Budget', section: 'tools' },
  { id: 'calendly', label: 'Bookings', section: 'tools', directorOnly: true },
  { id: 'calendar', label: 'Calendar', section: 'tools' },
  { id: 'workload', label: 'Workloads', section: 'tools', directorOnly: true },
  { id: 'xero', label: 'Xero', section: 'tools' },
  { id: 'templates', label: 'Templates', section: 'settings' },
  { id: 'planners', label: 'Planners', section: 'settings' },
]

const pageTitles = {
  dashboard: 'Dashboard', jobs: 'All Jobs', newjob: 'New Job',
  docs: 'Documents', time: 'Time & Budget', calendly: 'Bookings',
  calendar: 'Calendar', workload: 'Team Workloads', xero: 'Xero',
  templates: 'Templates', planners: 'Planners', jobdetail: 'Job Detail',
}

function formatTimer(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function GlobalTimer({ jobs, onNavigate }) {
  const [isRunning, setIsRunning] = useState(false)
  const [displaySeconds, setDisplaySeconds] = useState(0)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [taskName, setTaskName] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTimerId, setActiveTimerId] = useState(null)
  const recoveryDoneRef = useRef(false)
  const intervalRef = useRef(null)
  const saveIntervalRef = useRef(null)
  const elapsedRef = useRef(0)
  const activeTimerIdRef = useRef(null)
  const selectedJobIdRef = useRef('')
  const taskNameRef = useRef('')
  const jobsRef = useRef([])

  useEffect(() => { jobsRef.current = jobs }, [jobs])
  useEffect(() => { activeTimerIdRef.current = activeTimerId }, [activeTimerId])
  useEffect(() => { selectedJobIdRef.current = selectedJobId }, [selectedJobId])
  useEffect(() => { taskNameRef.current = taskName }, [taskName])

  useEffect(() => {
    if (jobs.length === 0 || recoveryDoneRef.current) return
    recoveryDoneRef.current = true
    const recoverTimer = async () => {
      const { data, error } = await supabase.from('active_timers').select('*').order('created_at', { ascending: false }).limit(1)
      if (error || !data || data.length === 0) return
      const record = data[0]
      await supabase.from('active_timers').delete().eq('id', record.id)
      const totalSeconds = record.elapsed_seconds || 0
      if (totalSeconds < 10) return
      const job = jobsRef.current.find(j => String(j.id) === String(record.job_id))
      if (!job) return
      const shouldSave = window.confirm(`You have an unfinished timer for ${record.job_code} — "${record.task}" (${formatTimer(totalSeconds)}). Save it to the time log?`)
      if (shouldSave) {
        await supabase.from('time_logs').insert({
          job_id: job.id, job_code: job.code, planner: job.planner || 'Unknown',
          task: record.task, hours: parseFloat((totalSeconds / 3600).toFixed(4)),
          duration_seconds: totalSeconds, rate: job.planner_rate || 0,
          log_date: new Date().toISOString().split('T')[0],
        })
      }
    }
    recoverTimer()
  }, [jobs])

  const saveElapsedToSupabase = async () => {
    if (!activeTimerIdRef.current) return
    await supabase.from('active_timers').update({ elapsed_seconds: elapsedRef.current }).eq('id', activeTimerIdRef.current)
  }

  const startTimer = async () => {
    if (!selectedJobId) { alert('Please select a job first.'); return }
    if (!taskName.trim()) { alert('Please enter what you are working on.'); return }
    if (intervalRef.current) return
    const job = jobsRef.current.find(j => String(j.id) === String(selectedJobId))
    if (!job) { alert('Job not found.'); return }
    const { data, error } = await supabase.from('active_timers').insert({
      job_id: job.id, job_code: job.code, planner: job.planner || 'Unknown',
      task: taskName, elapsed_seconds: 0, rate: job.planner_rate || 0,
    }).select().single()
    if (error) { alert('Could not start timer.'); return }
    elapsedRef.current = 0
    setDisplaySeconds(0)
    setActiveTimerId(data.id)
    setIsRunning(true)
    intervalRef.current = setInterval(() => { elapsedRef.current += 1; setDisplaySeconds(s => s + 1) }, 1000)
    saveIntervalRef.current = setInterval(saveElapsedToSupabase, 5000)
  }

  const stopTimer = async () => {
    clearInterval(intervalRef.current)
    clearInterval(saveIntervalRef.current)
    intervalRef.current = null
    saveIntervalRef.current = null
    setIsRunning(false)
    setSaving(true)
    const totalSeconds = elapsedRef.current
    const timerId = activeTimerIdRef.current
    const jobId = selectedJobIdRef.current
    const task = taskNameRef.current
    const job = jobsRef.current.find(j => String(j.id) === String(jobId))
    if (timerId) await supabase.from('active_timers').delete().eq('id', timerId)
    if (totalSeconds >= 10 && job) {
      await supabase.from('time_logs').insert({
        job_id: job.id, job_code: job.code, planner: job.planner || 'Unknown',
        task: task || 'General work', hours: parseFloat((totalSeconds / 3600).toFixed(4)),
        duration_seconds: totalSeconds, rate: job.planner_rate || 0,
        log_date: new Date().toISOString().split('T')[0],
      })
    }
    setSaving(false)
    elapsedRef.current = 0
    setDisplaySeconds(0)
    setActiveTimerId(null)
    setTaskName('')
  }

  useEffect(() => {
    return () => { clearInterval(intervalRef.current); clearInterval(saveIntervalRef.current) }
  }, [])

  const selectedJob = jobsRef.current.find(j => String(j.id) === String(selectedJobId))

  return (
    <div className="px-3 py-3 border-t border-gray-100">
      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Time tracker</div>
      <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} disabled={isRunning}
        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400 mb-2 disabled:bg-gray-50 disabled:text-gray-400">
        <option value="">Select job...</option>
        {jobs.map(j => <option key={j.id} value={j.id}>{j.code} — {j.name?.split('—')[1]?.trim() || j.name}</option>)}
      </select>
      <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="What are you working on?"
        disabled={isRunning} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400 mb-2 disabled:bg-gray-50 disabled:text-gray-400" />
      <div className="flex items-center gap-2">
        <div className={`font-mono text-sm font-bold flex-1 text-center py-1.5 rounded-lg ${isRunning ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}>
          {formatTimer(displaySeconds)}
        </div>
        {!isRunning ? (
          <button onClick={startTimer} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">▶</button>
        ) : (
          <button onClick={stopTimer} disabled={saving} className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium disabled:opacity-50">
            {saving ? '...' : '⏹'}
          </button>
        )}
      </div>
      {isRunning && selectedJob && (
        <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1.5 leading-tight">
          <span className="font-medium">● {selectedJob.code}</span><br />
          <span className="text-emerald-500">{taskName}</span>
        </div>
      )}
    </div>
  )
}

function NotificationPanel({ notifications, seenIds, onClose, onApprove, onReject }) {
  const extractUsername = (message) => {
    const match = message.match(/created:\s*(.+?)\.\s*Awaiting/)
    return match ? match[1].trim() : null
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="text-xs font-semibold text-gray-600">Notifications</div>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-100">✕ Close</button>
      </div>
      {notifications.length === 0 ? (
        <div className="px-3 py-6 text-xs text-gray-400 text-center">No notifications</div>
      ) : (
        notifications.map(n => {
          const username = extractUsername(n.message)
          const isNewUser = n.type === 'new_user'
          const isUnseen = !seenIds.has(n.id)
          return (
            <div key={n.id} className={`px-3 py-3 border-b border-gray-100 last:border-0 ${isUnseen ? 'bg-blue-50' : ''}`}>
              {isUnseen && (
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-xs text-blue-600 font-medium">New</span>
                </div>
              )}
              <div className="text-xs font-medium text-gray-700 mb-1">{n.message}</div>
              <div className="text-xs text-gray-400 mb-2">
                {new Date(n.created_at).toLocaleString('en-AU', {
                  timeZone: 'Australia/Brisbane',
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit'
                })} AEST
              </div>
              {isNewUser && username && (
                <div className="flex gap-2">
                  <button onClick={() => onApprove(n, username)}
                    className="flex-1 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
                    ✓ Approve
                  </button>
                  <button onClick={() => onReject(n, username)}
                    className="flex-1 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

export default function App() {
  const [authPage, setAuthPage] = useState('login')
  const [currentUser, setCurrentUser] = useState(null)
  const [activePage, setActivePage] = useState('dashboard')
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobCount, setJobCount] = useState(0)
  const [jobs, setJobs] = useState([])
  const [notifications, setNotifications] = useState([])
  const [seenNotificationIds, setSeenNotificationIds] = useState(new Set())
  const [showNotifications, setShowNotifications] = useState(false)
  const [history, setHistory] = useState(['dashboard'])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const session = loadSession()
    if (session) setCurrentUser(session)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (code && state) {
      try {
        const { company_id } = JSON.parse(atob(state))
        import('./xero').then(({ handleXeroCallback }) => {
          handleXeroCallback(code, company_id).then(result => {
            if (result.success) {
              window.history.replaceState({}, '', '/')
              setActivePage('xero')
            }
          })
        })
      } catch (e) {
        console.error('Xero callback error:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, code, name, planner, planner_rate, budget_hours')
        .order('created_at', { ascending: false })
      if (data) { setJobs(data); setJobCount(data.length) }
    }
    fetchJobs()
    if (currentUser.role === 'director') fetchNotifications()
  }, [currentUser])

  const fetchNotifications = async () => {
    if (!currentUser?.company_id) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifications(data)
  }

  const unreadCount = notifications.filter(n => !n.is_read && !seenNotificationIds.has(n.id)).length

  const handleOpenNotifications = () => {
    const opening = !showNotifications
    setShowNotifications(opening)
    if (opening) {
      const unreadIds = new Set(notifications.filter(n => !n.is_read).map(n => n.id))
      setSeenNotificationIds(unreadIds)
      if (unreadIds.size > 0) {
        supabase.from('notifications')
          .update({ is_read: true })
          .eq('company_id', currentUser.company_id)
          .eq('is_read', false)
          .then(() => {})
      }
    }
  }

  const handleApprove = async (notification, username) => {
    await supabase.from('app_users').update({ is_approved: true })
      .eq('username', username).eq('company_id', currentUser.company_id)
    await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id)
    fetchNotifications()
  }

  const handleReject = async (notification, username) => {
    await supabase.from('app_users').delete()
      .eq('username', username).eq('company_id', currentUser.company_id).eq('is_approved', false)
    await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id)
    fetchNotifications()
  }

  const handleLogin = (user) => {
    setCurrentUser({
      id: user.id,
      username: user.username,
      role: user.role,
      company_id: user.company_id,
      company_code: user.company_code,
      companyName: user.companies?.name || '',
    })
  }

  const handleLogout = () => {
    clearSession()
    setCurrentUser(null)
    setActivePage('dashboard')
    setHistory(['dashboard'])
    setHistoryIndex(0)
    setJobs([])
    setNotifications([])
    setSeenNotificationIds(new Set())
  }

  const handleNavigate = (page, job = null) => {
    if (job) setSelectedJob(job)
    setActivePage(page)
    setSidebarOpen(false)
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      return [...newHistory, page]
    })
    setHistoryIndex(prev => prev + 1)
  }

  const goBack = () => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    setActivePage(history[newIndex])
  }

  const goForward = () => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    setActivePage(history[newIndex])
  }

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < history.length - 1
  const isDirector = currentUser?.role === 'director'

  if (!currentUser) {
    if (authPage === 'register') return <Register onBack={() => setAuthPage('login')} onSuccess={() => setAuthPage('login')} />
    if (authPage === 'forgot') return <ForgotPassword onBack={() => setAuthPage('login')} />
    return <Login onLogin={handleLogin} onRegister={() => setAuthPage('register')} onForgotPassword={() => setAuthPage('forgot')} />
  }

  const visibleNavItems = navItems.filter(item => !item.directorOnly || isDirector)

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} currentUser={currentUser} />
      case 'jobs': return <Jobs onNavigate={handleNavigate} onJobCountChange={setJobCount} />
      case 'newjob': return <NewJob onNavigate={handleNavigate} currentUser={currentUser} />
      case 'jobdetail': return <JobDetail job={selectedJob} onNavigate={handleNavigate} currentUser={currentUser} />
      case 'workload': return isDirector ? <Workload /> : <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">Access restricted to directors.</div>
      case 'xero': return <Xero currentUser={currentUser} />
      case 'calendly': return <Bookings onNavigate={handleNavigate} currentUser={currentUser} />
      case 'calendar': return <Calendar currentUser={currentUser} />
      case 'templates': return <Templates />
      case 'docs': return <Documents currentUser={currentUser} />
      case 'time': return <TimeBudget />
      case 'planners': return <Planners currentUser={currentUser} />
      default: return <div className="bg-white rounded-xl border border-gray-200 p-6"><p className="text-sm text-gray-400">This page is coming soon.</p></div>
    }
  }

  const initials = currentUser.username.slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`
        fixed md:relative z-40 h-full w-52 bg-white border-r border-gray-200 flex flex-col flex-shrink-0
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="flex items-center px-3 py-2 border-b border-gray-200 gap-2">
          <img src={qplanLogo} alt="QPlan" className="w-7 h-7 object-contain flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-800">QPlan</span>
          <div className="flex items-center gap-0.5 ml-auto">
            <button onClick={goBack} disabled={!canGoBack}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${canGoBack ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-900' : 'text-gray-200 cursor-not-allowed'}`}
              style={{ fontSize: '22px', lineHeight: 1 }}>‹</button>
            <button onClick={goForward} disabled={!canGoForward}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${canGoForward ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-900' : 'text-gray-200 cursor-not-allowed'}`}
              style={{ fontSize: '22px', lineHeight: 1 }}>›</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {['main', 'tools', 'settings'].map(section => (
            <div key={section} className="px-2 mb-2">
              <div className="text-xs text-gray-400 uppercase tracking-wider px-2 py-1">{section}</div>
              {visibleNavItems.filter(i => i.section === section).map(item => (
                <button key={item.id} onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors ${activePage === item.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
                  {item.label}
                  {item.id === 'jobs' && jobCount > 0 && (
                    <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full">{jobCount}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        <GlobalTimer jobs={jobs} onNavigate={handleNavigate} />

        <div className="p-3 border-t border-gray-200 space-y-2">
          {isDirector && (
            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 text-xs text-gray-500 transition-colors"
              >
                <span>🔔 Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">{unreadCount}</span>
                )}
              </button>
              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  seenIds={seenNotificationIds}
                  onClose={() => setShowNotifications(false)}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-700 flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{currentUser.username}</div>
              <div className="text-xs text-gray-400 capitalize">{currentUser.role}</div>
            </div>
          </div>

          <button onClick={handleLogout}
            className="w-full py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors">
            Log out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4" width="14" height="1.5" rx="1" fill="currentColor"/>
              <rect x="2" y="8.25" width="14" height="1.5" rx="1" fill="currentColor"/>
              <rect x="2" y="12.5" width="14" height="1.5" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <div className="flex-1 text-sm font-medium truncate">{pageTitles[activePage]}</div>
          {isDirector && currentUser.companyName && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg hidden sm:block">{currentUser.companyName}</span>
          )}
          <button onClick={() => handleNavigate('newjob')} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex-shrink-0">+ New Job</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {renderPage()}
        </div>
      </div>
    </div>
  )
}