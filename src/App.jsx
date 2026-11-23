import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
import { timerLabel } from './jobMeta'

const SUPABASE_URL = 'https://sltaaiumviyzgdsdkkbe.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdGFhaXVtdml5emdkc2Rra2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTYyNTMsImV4cCI6MjA5MDQ5MjI1M30.xqWqvx8vdofj119nXDpasQ8xVD67YJU0RrjTrxycTGo'

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

// Today's date as YYYY-MM-DD in Brisbane time (not UTC)
function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function GlobalTimer({ jobs, currentUser, activeJob }) {
  const [isRunning, setIsRunning] = useState(false)
  const [displaySeconds, setDisplaySeconds] = useState(0)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [taskName, setTaskName] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTimerId, setActiveTimerId] = useState(null)
  const [switchPrompt, setSwitchPrompt] = useState(null) // the job the user just opened while the timer runs on another
  const [switchTask, setSwitchTask] = useState('')
  const recoveryDoneRef = useRef(false)
  const intervalRef = useRef(null)
  const saveIntervalRef = useRef(null)
  const elapsedRef = useRef(0)
  const activeTimerIdRef = useRef(null)
  const selectedJobIdRef = useRef('')
  const taskNameRef = useRef('')
  const jobsRef = useRef([])
  const startedAtRef = useRef(null)
  const declinedSwitchRef = useRef(null) // job id the user chose not to switch to, until the timer stops
  const plannerName = currentUser?.username || 'Unknown'

  useEffect(() => { jobsRef.current = jobs }, [jobs])
  useEffect(() => { activeTimerIdRef.current = activeTimerId }, [activeTimerId])
  useEffect(() => { selectedJobIdRef.current = selectedJobId }, [selectedJobId])
  useEffect(() => { taskNameRef.current = taskName }, [taskName])

  // Recover this user's own unfinished timer only (never another planner's)
  useEffect(() => {
    if (jobs.length === 0 || recoveryDoneRef.current || !currentUser?.id) return
    recoveryDoneRef.current = true
    const recoverTimer = async () => {
      const { data, error } = await supabase.from('active_timers').select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false }).limit(1)
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
          job_id: job.id, job_code: job.code, planner: plannerName,
          task: record.task, hours: parseFloat((totalSeconds / 3600).toFixed(4)),
          duration_seconds: totalSeconds, rate: job.planner_rate || 0,
          log_date: todayLocal(),
        })
      }
    }
    recoverTimer()
  }, [jobs, currentUser])

  // When a job is opened: pick it in the tracker, or offer to switch if the timer is on another job
  useEffect(() => {
    if (!activeJob?.id) return
    const openedId = String(activeJob.id)
    if (!intervalRef.current) {
      if (!saving) setSelectedJobId(openedId)
      return
    }
    if (String(selectedJobIdRef.current) === openedId) return
    if (declinedSwitchRef.current === openedId) return
    setSwitchTask(taskNameRef.current || '')
    setSwitchPrompt(activeJob)
  }, [activeJob?.id])

  const saveElapsedToSupabase = async () => {
    if (!activeTimerIdRef.current) return
    await supabase.from('active_timers').update({ elapsed_seconds: elapsedRef.current }).eq('id', activeTimerIdRef.current)
  }

  const startTimerFor = async (job, task) => {
    if (intervalRef.current) return false
    const { data, error } = await supabase.from('active_timers').insert({
      job_id: job.id, job_code: job.code, planner: plannerName, user_id: currentUser?.id || null,
      task, elapsed_seconds: 0, rate: job.planner_rate || 0,
    }).select().single()
    if (error) { alert('Could not start timer.'); return false }
    elapsedRef.current = 0
    startedAtRef.current = Date.now()
    setDisplaySeconds(0)
    setActiveTimerId(data.id)
    setIsRunning(true)
    // Elapsed is calculated from the real start time so background tabs do not under-count
    intervalRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAtRef.current) / 1000)
      elapsedRef.current = secs
      setDisplaySeconds(secs)
    }, 1000)
    saveIntervalRef.current = setInterval(saveElapsedToSupabase, 5000)
    return true
  }

  const startTimer = async () => {
    if (!selectedJobId) { alert('Please select a job first.'); return }
    if (!taskName.trim()) { alert('Please enter what you are working on.'); return }
    const job = jobsRef.current.find(j => String(j.id) === String(selectedJobId))
    if (!job) { alert('Job not found.'); return }
    await startTimerFor(job, taskName.trim())
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
      const { error } = await supabase.from('time_logs').insert({
        job_id: job.id, job_code: job.code, planner: plannerName,
        task: task || 'General work', hours: parseFloat((totalSeconds / 3600).toFixed(4)),
        duration_seconds: totalSeconds, rate: job.planner_rate || 0,
        log_date: todayLocal(),
      })
      if (error) alert('Timer stopped but the time could not be saved: ' + error.message)
    }
    setSaving(false)
    startedAtRef.current = null
    elapsedRef.current = 0
    declinedSwitchRef.current = null
    setDisplaySeconds(0)
    setActiveTimerId(null)
    setTaskName('')
  }

  // Switch: save the time so far on the current job, then start the timer on the job just opened
  const confirmSwitch = async () => {
    const target = jobsRef.current.find(j => String(j.id) === String(switchPrompt?.id)) || switchPrompt
    const task = switchTask.trim()
    if (!target || !task) return
    setSwitchPrompt(null)
    await stopTimer()
    setSelectedJobId(String(target.id))
    setTaskName(task)
    await startTimerFor(target, task)
  }

  const declineSwitch = () => {
    if (switchPrompt?.id) declinedSwitchRef.current = String(switchPrompt.id)
    setSwitchPrompt(null)
  }

  useEffect(() => {
    return () => { clearInterval(intervalRef.current); clearInterval(saveIntervalRef.current) }
  }, [])

  const selectedJob = jobs.find(j => String(j.id) === String(selectedJobId))

  return (
    <div className="px-3 py-3 border-t border-gray-100">
      {/* Rendered on the page body: the sidebar slides with a transform, which would trap a fixed dialog inside it */}
      {switchPrompt && isRunning && createPortal(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 w-full max-w-sm">
            <div className="text-sm font-semibold mb-2">Switch the timer to this job?</div>
            <div className="text-xs text-gray-500 leading-relaxed mb-3">
              Your timer is running on <span className="font-medium text-gray-700">{selectedJob ? timerLabel(selectedJob) : 'another job'}</span> ({formatTimer(displaySeconds)}).
              You have opened <span className="font-medium text-gray-700">{timerLabel(switchPrompt)}</span>.
            </div>
            <label className="block text-xs text-gray-500 mb-1">What are you working on for {switchPrompt.code}?</label>
            <input type="text" value={switchTask} onChange={e => setSwitchTask(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') confirmSwitch() }}
              placeholder="e.g. IR response"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 mb-1" />
            <div className="text-xs text-gray-400 mb-4">Switching saves the time so far to {selectedJob?.code || 'the current job'} and starts a new entry.</div>
            <div className="flex gap-2">
              <button onClick={declineSwitch} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Keep current timer</button>
              <button onClick={confirmSwitch} disabled={!switchTask.trim()}
                className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50">
                Switch to {switchPrompt.code}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Time tracker</div>
      <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} disabled={isRunning}
        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400 mb-2 disabled:bg-gray-50 disabled:text-gray-400">
        <option value="">Select job...</option>
        {jobs.map(j => <option key={j.id} value={j.id}>{timerLabel(j)}</option>)}
      </select>
      <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="What are you working on?"
        disabled={isRunning} onKeyDown={e => { if (e.key === 'Enter' && !isRunning) startTimer() }}
        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400 mb-2 disabled:bg-gray-50 disabled:text-gray-400" />
      <div className="flex items-center gap-2">
        <div className={`font-mono text-sm font-bold flex-1 text-center py-1.5 rounded-lg ${isRunning ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}>
          {formatTimer(displaySeconds)}
        </div>
        {!isRunning ? (
          <button onClick={startTimer} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium" title="Start timer">▶</button>
        ) : (
          <button onClick={stopTimer} disabled={saving} className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium disabled:opacity-50" title="Stop and save">
            {saving ? '...' : '⏹'}
          </button>
        )}
      </div>
      {isRunning && selectedJob && (
        <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1.5 leading-tight">
          <span className="font-medium">● {selectedJob.code}</span>
          {selectedJob.address && <><br /><span className="text-emerald-600">{selectedJob.address}</span></>}
          <br /><span className="text-emerald-500">{taskName}</span>
        </div>
      )}
    </div>
  )
}

function NotificationPanel({ notifications, lastSeenAt, onClose, onApprove, onReject, onDismiss, processingId }) {
  const extractUsername = (message) => {
    const match = message.match(/created:\s*(.+?)\.\s*Awaiting/)
    return match ? match[1].trim() : null
  }

  const lastSeenDate = new Date(lastSeenAt)

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
          const isProcessing = processingId === n.id
          const isNew = new Date(n.created_at) > lastSeenDate
          return (
            <div key={n.id} className={`px-3 py-3 border-b border-gray-100 last:border-0 ${isNew ? 'bg-blue-50' : ''}`}>
              {isNew && (
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
                  <button
                    onClick={() => onApprove(n, username)}
                    disabled={isProcessing}
                    className="flex-1 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
                  >
                    {isProcessing ? '...' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => onReject(n, username)}
                    disabled={isProcessing}
                    className="flex-1 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium disabled:opacity-50"
                  >
                    {isProcessing ? '...' : '✕ Reject'}
                  </button>
                </div>
              )}
              {!(isNewUser && username) && (
                <button
                  onClick={() => onDismiss(n)}
                  disabled={isProcessing}
                  className="w-full py-1 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {isProcessing ? '...' : 'Dismiss'}
                </button>
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
  const [showNotifications, setShowNotifications] = useState(false)
  const [processingNotificationId, setProcessingNotificationId] = useState(null)
  const [lastSeenAt, setLastSeenAt] = useState(() => {
    return localStorage.getItem('qplanLastSeenNotifications') || '1970-01-01T00:00:00.000Z'
  })
  const [history, setHistory] = useState(['dashboard'])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCalendarConnect, setPendingCalendarConnect] = useState(false)

  useEffect(() => {
    const session = loadSession()
    // Only trust a session that has the fields the app relies on
    if (session && session.id && session.username && session.company_id) {
      setCurrentUser(session)
    } else if (session) {
      clearSession()
    }

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code) return

    window.history.replaceState({}, '', '/')

    if (!state) return

    let stateData
    try {
      stateData = JSON.parse(atob(state))
    } catch (e) {
      return
    }

    if (stateData.provider) {
      sessionStorage.setItem('oauth_callback', JSON.stringify({ type: 'calendar', ...stateData, code }))
    } else if (stateData.company_id) {
      sessionStorage.setItem('oauth_callback', JSON.stringify({ type: 'xero', ...stateData, code }))
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return

    const stored = sessionStorage.getItem('oauth_callback')
    if (!stored) return
    sessionStorage.removeItem('oauth_callback')

    const callback = JSON.parse(stored)

    if (callback.type === 'xero') {
      import('./xero').then(({ handleXeroCallback }) => {
        handleXeroCallback(callback.code, callback.company_id).then(result => {
          if (result.success) setActivePage('xero')
        })
      })
      return
    }

    // Microsoft 365 / OneDrive connection (Files scopes)
    if (callback.type === 'calendar' && callback.provider === 'msgraph') {
      fetch(`${SUPABASE_URL}/functions/v1/ms-graph?action=callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          code: callback.code,
          company_id: callback.company_id,
          username: callback.username,
        }),
      }).then(res => res.json()).then(data => {
        if (data.success) {
          setActivePage('docs')
        } else {
          alert('Microsoft 365 connection failed: ' + (data.error || 'Unknown error'))
        }
      })
      return
    }

    if (callback.type === 'calendar') {
      fetch(`${SUPABASE_URL}/functions/v1/calendar-${callback.provider}?action=callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          code: callback.code,
          company_id: callback.company_id,
          username: callback.username,
        }),
      }).then(res => res.json()).then(data => {
        if (data.success) {
          setActivePage('calendar')
          setPendingCalendarConnect(true)
        }
      })
    }
  }, [currentUser])

  // Job list for the timer and sidebar count. Refreshes on every page change so new jobs appear straight away.
  useEffect(() => {
    if (!currentUser) return
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, code, name, address, planner, planner_rate, budget_hours, client_type, client_company, client_first_name, client_last_name')
        .order('created_at', { ascending: false })
      if (data) { setJobs(data); setJobCount(data.length) }
    }
    fetchJobs()
  }, [currentUser, activePage])

  // If a director deactivates or rejects this account, log the user out on their next load.
  useEffect(() => {
    if (!currentUser?.id) return
    const checkAccount = async () => {
      const { data, error } = await supabase.from('app_users').select('is_approved').eq('id', currentUser.id).maybeSingle()
      if (error) return
      if (!data || data.is_approved === false) handleLogout()
    }
    checkAccount()
    const interval = setInterval(checkAccount, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentUser?.id])

  // Poll notifications every 20s for directors
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'director' || !currentUser.company_id) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 20000)
    return () => clearInterval(interval)
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

  // Unread = anything created after the last time the panel was opened.
  const unreadCount = notifications.filter(n => new Date(n.created_at) > new Date(lastSeenAt)).length

  const handleOpenNotifications = async () => {
    const opening = !showNotifications
    setShowNotifications(opening)
    if (opening && currentUser?.company_id) {
      fetchNotifications()
      const now = new Date().toISOString()
      setLastSeenAt(now)
      localStorage.setItem('qplanLastSeenNotifications', now)
      supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('company_id', currentUser.company_id)
        .eq('is_read', false)
        .then(() => {})
    }
  }

  const handleApprove = async (notification, username) => {
    setProcessingNotificationId(notification.id)
    const { data, error } = await supabase
      .from('app_users')
      .update({ is_approved: true })
      .eq('username', username)
      .eq('company_id', currentUser.company_id)
      .select()

    if (error) {
      alert(`Could not approve ${username}: ${error.message}`)
      setProcessingNotificationId(null)
      return
    }
    if (!data || data.length === 0) {
      alert(`Could not find an unapproved account for "${username}". They may have already been processed.`)
    }

    await supabase.from('notifications').delete().eq('id', notification.id)
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
    setProcessingNotificationId(null)
  }

  const handleReject = async (notification, username) => {
    setProcessingNotificationId(notification.id)
    const { error } = await supabase
      .from('app_users')
      .delete()
      .eq('username', username)
      .eq('company_id', currentUser.company_id)
      .eq('is_approved', false)

    if (error) {
      alert(`Could not reject ${username}: ${error.message}`)
      setProcessingNotificationId(null)
      return
    }

    await supabase.from('notifications').delete().eq('id', notification.id)
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
    setProcessingNotificationId(null)
  }

  const handleDismiss = async (notification) => {
    setProcessingNotificationId(notification.id)
    await supabase.from('notifications').delete().eq('id', notification.id)
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
    setProcessingNotificationId(null)
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
    setPendingCalendarConnect(false)
    sessionStorage.removeItem('oauth_callback')
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
      case 'jobs': return <Jobs onNavigate={handleNavigate} onJobCountChange={setJobCount} currentUser={currentUser} />
      case 'newjob': return <NewJob onNavigate={handleNavigate} currentUser={currentUser} />
      case 'jobdetail': return <JobDetail job={selectedJob} onNavigate={handleNavigate} currentUser={currentUser} />
      case 'workload': return isDirector ? <Workload currentUser={currentUser} /> : <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">Access restricted to directors.</div>
      case 'xero': return <Xero currentUser={currentUser} />
      case 'calendly': return <Bookings onNavigate={handleNavigate} currentUser={currentUser} />
      case 'calendar': return (
        <Calendar
          currentUser={currentUser}
          showConnectOnMount={pendingCalendarConnect}
          onConnectShown={() => setPendingCalendarConnect(false)}
        />
      )
      case 'templates': return <Templates currentUser={currentUser} />
      case 'docs': return <Documents currentUser={currentUser} />
      case 'time': return <TimeBudget currentUser={currentUser} />
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

        <GlobalTimer jobs={jobs} currentUser={currentUser} activeJob={activePage === 'jobdetail' ? selectedJob : null} />

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
                  lastSeenAt={lastSeenAt}
                  onClose={() => setShowNotifications(false)}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onDismiss={handleDismiss}
                  processingId={processingNotificationId}
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