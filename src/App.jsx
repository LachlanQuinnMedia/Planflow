import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase, callFunction } from './supabase'
import { loadSession, clearSession, hasLiveSignIn } from './auth'
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
import Microsoft365 from './Microsoft365'
import Logo from './Logo'
import { timerLabel } from './jobMeta'
import { IconPlay, IconStop, IconSun, IconMoon, IconSparkle, IconRefresh, IconChevronDown } from './icons'
import { getThemeChoice, setThemeChoice, watchSeason } from './theme'
import { InstallAppButton } from './install'
import Landing from './Landing'
import Tour from './Tour'
import { SeasonStrip, SeasonSticker, SeasonParticles } from './Seasonal'
import { tourSeen } from './tourState'

// Light / Dark / Seasonal. Seasonal changes its look each month by itself. Remembered on this device.
function ThemeSwitch() {
  const [choice, setChoice] = useState(getThemeChoice)
  useEffect(() => watchSeason(), [])
  const options = [
    { id: 'light', label: 'Light', icon: <IconSun size={12} /> },
    { id: 'dark', label: 'Dark', icon: <IconMoon size={12} /> },
    { id: 'seasonal', label: 'Seasonal', icon: <IconSparkle size={12} /> },
  ]
  return (
    <div role="radiogroup" aria-label="Theme" className="flex bg-gray-100 rounded-lg p-0.5">
        {options.map(({ id, label, icon }) => (
          <button key={id} type="button" role="radio" aria-checked={choice === id}
            title={id === 'seasonal' ? 'A new look every month. It changes by itself.' : `${label} theme`}
            onClick={() => { setChoice(id); setThemeChoice(id) }}
            className={`flex-auto flex items-center justify-center gap-1 px-1 py-1 rounded-md text-[11px] whitespace-nowrap transition-colors ${choice === id ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {icon}
            <span>{label}</span>
          </button>
        ))}
    </div>
  )
}

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
  { id: 'microsoft', label: 'Microsoft 365', section: 'settings', directorOnly: true },
  // Staff do not see the firm's Microsoft 365 set-up, but each person can still connect their own Outlook
  { id: 'connectoutlook', label: 'Connect my Outlook', section: 'settings', staffOnly: true },
]

const pageTitles = {
  dashboard: 'Dashboard', jobs: 'All Jobs', newjob: 'New Job',
  docs: 'Documents', time: 'Time & Budget', calendly: 'Bookings',
  calendar: 'Calendar', workload: 'Team Workloads', xero: 'Xero',
  templates: 'Templates', planners: 'Planners', jobdetail: 'Job Detail', microsoft: 'Microsoft 365',
}

// Where this person was last, so a refresh (or the phone reopening the app) lands on the same page.
const LAST_PAGE_KEY = 'qplan_last_page'
const LAST_PAGE_MAX_AGE = 4 * 60 * 60 * 1000 // after four hours away, start on the dashboard again

function readLastPage(userId, role) {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_PAGE_KEY) || 'null')
    if (!v || !userId || v.userId !== userId || !pageTitles[v.page]) return null
    if (role !== 'director' && navItems.some(i => i.id === v.page && i.directorOnly)) return null
    if (Date.now() - (v.at || 0) > LAST_PAGE_MAX_AGE) return null
    if (v.page === 'jobdetail' && !v.jobId) return null
    return v
  } catch {
    return null
  }
}

function writeLastPage(userId, page, jobId) {
  try {
    localStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ userId, page, jobId: jobId || null, at: Date.now() }))
  } catch { /* storage unavailable */ }
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

function GlobalTimer({ jobs, currentUser, activeJob, onRunningChange }) {
  const [isRunning, setIsRunning] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('qplan_timer_collapsed') === '1' } catch { return false }
  })
  const [displaySeconds, setDisplaySeconds] = useState(0)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [taskName, setTaskName] = useState('')
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)
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
  const busyRef = useRef(false) // true while a start or stop is being saved, so double clicks do nothing
  const runningJobIdRef = useRef(null) // the job the running timer belongs to
  const activeJobIdRef = useRef(null) // the job page that is open, if any
  const quietSwitchUntilRef = useRef(0) // just after a refresh, do not ask to switch the timer
  const plannerName = currentUser?.username || 'Unknown'

  useEffect(() => { jobsRef.current = jobs }, [jobs])
  useEffect(() => { activeTimerIdRef.current = activeTimerId }, [activeTimerId])
  useEffect(() => { selectedJobIdRef.current = selectedJobId }, [selectedJobId])
  useEffect(() => { taskNameRef.current = taskName }, [taskName])
  useEffect(() => { onRunningChange?.(isRunning) }, [isRunning, onRunningChange])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      try { localStorage.setItem('qplan_timer_collapsed', prev ? '0' : '1') } catch { /* storage unavailable */ }
      return !prev
    })
  }

  const saveElapsedToSupabase = async () => {
    if (!activeTimerIdRef.current) return
    await supabase.from('active_timers').update({ elapsed_seconds: elapsedRef.current }).eq('id', activeTimerIdRef.current)
  }

  // Elapsed is calculated from the real start time so background tabs do not under-count
  const beginTicking = () => {
    intervalRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAtRef.current) / 1000)
      elapsedRef.current = secs
      setDisplaySeconds(secs)
    }, 1000)
    saveIntervalRef.current = setInterval(saveElapsedToSupabase, 5000)
  }

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
      const totalSeconds = record.elapsed_seconds || 0
      const job = jobsRef.current.find(j => String(j.id) === String(record.job_id))
      // A timer that was still ticking a moment ago (the page was refreshed, or the app reopened)
      // carries straight on. The timer saves its progress every 5 seconds, so a short gap means it was live.
      const gapMs = Date.now() - (new Date(record.created_at).getTime() + totalSeconds * 1000)
      if (job && !intervalRef.current && !busyRef.current && Number.isFinite(gapMs) && Math.abs(gapMs) <= 120000) {
        const secs = totalSeconds + Math.max(0, Math.round(gapMs / 1000))
        quietSwitchUntilRef.current = Date.now() + 8000
        runningJobIdRef.current = String(job.id)
        activeTimerIdRef.current = record.id
        elapsedRef.current = secs
        startedAtRef.current = Date.now() - secs * 1000
        setSelectedJobId(String(job.id))
        setTaskName(record.task || '')
        setDisplaySeconds(secs)
        setActiveTimerId(record.id)
        setIsRunning(true)
        beginTicking()
        return
      }
      await supabase.from('active_timers').delete().eq('id', record.id)
      if (totalSeconds < 10) return
      if (!job) return
      const shouldSave = window.confirm(`You have an unfinished timer for ${record.job_code}: "${record.task}" (${formatTimer(totalSeconds)}). Save it to the time log?`)
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
    activeJobIdRef.current = activeJob?.id ? String(activeJob.id) : null
    if (!activeJob?.id) return
    const openedId = String(activeJob.id)
    if (busyRef.current) return
    if (!intervalRef.current) {
      setSelectedJobId(openedId)
      return
    }
    if (String(runningJobIdRef.current) === openedId) return
    if (declinedSwitchRef.current === openedId) return
    // The page has just been refreshed with the timer running: keep it where it was, without asking
    if (Date.now() < quietSwitchUntilRef.current) { declinedSwitchRef.current = openedId; return }
    setSwitchTask(taskNameRef.current || '')
    setSwitchPrompt(activeJob)
  }, [activeJob?.id])

  const startTimerFor = async (job, task) => {
    if (intervalRef.current || busyRef.current) return false
    busyRef.current = true
    setStarting(true)
    let data, error
    try {
      ({ data, error } = await supabase.from('active_timers').insert({
        job_id: job.id, job_code: job.code, planner: plannerName, user_id: currentUser?.id || null,
        task, elapsed_seconds: 0, rate: job.planner_rate || 0,
      }).select().single())
    } finally {
      busyRef.current = false
      setStarting(false)
    }
    if (error || !data) { alert('Could not start timer.'); return false }
    runningJobIdRef.current = String(job.id)
    setSelectedJobId(String(job.id))
    elapsedRef.current = 0
    startedAtRef.current = Date.now()
    setDisplaySeconds(0)
    setActiveTimerId(data.id)
    setIsRunning(true)
    beginTicking()
    return true
  }

  const startTimer = async () => {
    if (busyRef.current || intervalRef.current) return
    if (!selectedJobId) { alert('Please select a job first.'); return }
    if (!taskName.trim()) { alert('Please enter what you are working on.'); return }
    const job = jobsRef.current.find(j => String(j.id) === String(selectedJobId))
    if (!job) { alert('Job not found.'); return }
    await startTimerFor(job, taskName.trim())
  }

  const stopTimer = async () => {
    if (busyRef.current || !intervalRef.current) return
    busyRef.current = true
    clearInterval(intervalRef.current)
    clearInterval(saveIntervalRef.current)
    intervalRef.current = null
    saveIntervalRef.current = null
    setIsRunning(false)
    setSaving(true)
    const totalSeconds = elapsedRef.current
    const timerId = activeTimerIdRef.current
    const jobId = runningJobIdRef.current || selectedJobIdRef.current
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
    startedAtRef.current = null
    elapsedRef.current = 0
    declinedSwitchRef.current = null
    runningJobIdRef.current = null
    setDisplaySeconds(0)
    setActiveTimerId(null)
    setTaskName('')
    // Back to the job that is open on screen, so the next start logs to it
    if (activeJobIdRef.current) setSelectedJobId(activeJobIdRef.current)
    setSaving(false)
    busyRef.current = false
  }

  // Switch: save the time so far on the current job, then start the timer on the job just opened
  const confirmSwitch = async () => {
    const target = jobsRef.current.find(j => String(j.id) === String(switchPrompt?.id)) || switchPrompt
    const task = switchTask.trim()
    if (!target || !task) return
    setSwitchPrompt(null)
    await stopTimer()
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
  const busy = saving || starting

  return (
    <div data-tour="timer" className={`px-3 border-t border-gray-100 ${collapsed ? 'py-2' : 'py-3'}`}>
      {/* Rendered on the page body: the sidebar slides with a transform, which would trap a fixed dialog inside it */}
      {switchPrompt && isRunning && createPortal(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 w-full max-w-sm">
            <div className="text-sm font-semibold mb-2">Switch the timer to this job?</div>
            <div className="text-xs text-gray-600 leading-relaxed mb-3">
              Your timer is running on <span className="font-medium text-gray-700">{selectedJob ? timerLabel(selectedJob) : 'another job'}</span> ({formatTimer(displaySeconds)}).
              You have opened <span className="font-medium text-gray-700">{timerLabel(switchPrompt)}</span>.
            </div>
            <label className="block text-xs text-gray-600 mb-1">What are you working on for {switchPrompt.code}?</label>
            <input type="text" value={switchTask} onChange={e => setSwitchTask(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') confirmSwitch() }}
              placeholder="e.g. IR response"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 mb-1" />
            <div className="text-xs text-gray-500 mb-4">Switching saves the time so far to {selectedJob?.code || 'the current job'} and starts a new entry.</div>
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

      <button type="button" onClick={toggleCollapsed} aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show time tracker' : 'Hide time tracker'}
        title={collapsed ? (isRunning && selectedJob ? `Recording ${selectedJob.code}. Show time tracker` : 'Show time tracker') : 'Hide time tracker'}
        className="w-full flex items-center gap-2 text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-gray-50">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold whitespace-nowrap">{collapsed && isRunning ? 'Timer' : 'Time tracker'}</span>
        {isRunning && <span className="qp-rec" data-testid="timer-rec" role="img" aria-label="Recording" />}
        {isRunning && collapsed && <span className="font-mono text-xs font-semibold text-gray-700">{formatTimer(displaySeconds)}</span>}
        <IconChevronDown size={14} className={`ml-auto text-gray-500 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>
      {!collapsed && (
      <div className="mt-2">
      <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} disabled={isRunning || busy}
        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400 mb-2 disabled:bg-gray-50 disabled:text-gray-400">
        <option value="">Select job...</option>
        {jobs.map(j => <option key={j.id} value={j.id}>{timerLabel(j)}</option>)}
      </select>
      <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="What are you working on?"
        disabled={isRunning || busy} onKeyDown={e => { if (e.key === 'Enter' && !isRunning && !e.repeat) startTimer() }}
        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-emerald-400 mb-2 disabled:bg-gray-50 disabled:text-gray-400" />
      <div className="flex items-center gap-2">
        <div className={`font-mono text-sm font-bold flex-1 text-center py-1.5 rounded-lg ${isRunning ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
          {formatTimer(displaySeconds)}
        </div>
        {!isRunning ? (
          <button onClick={startTimer} disabled={busy} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50" title="Start timer" aria-label="Start timer">{starting ? '...' : <IconPlay size={12} />}</button>
        ) : (
          <button onClick={stopTimer} disabled={saving} className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium disabled:opacity-50" title="Stop and save" aria-label="Stop timer and save">
            {saving ? '...' : <IconStop size={12} />}
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
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-100">✕ Close</button>
      </div>
      {notifications.length === 0 ? (
        <div className="px-3 py-6 text-xs text-gray-500 text-center">No notifications</div>
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
              <div className="text-xs text-gray-500 mb-2">
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
                  className="w-full py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
  // Someone new sees the front page. Anyone who has used QPlan on this device, opened /login,
  // or is coming back from a Microsoft or Xero sign-in goes straight to the login screen.
  const [authPage, setAuthPage] = useState(() => {
    try {
      const known = localStorage.getItem('qplan_known_user') || localStorage.getItem('pf_remember_username') || localStorage.getItem('qplanLastSeenNotifications')
      const returning = /[?&](code|state|admin_consent|error)=/.test(window.location.search)
      const standalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
      return known || returning || standalone || window.location.pathname === '/login' ? 'login' : 'landing'
    } catch {
      return 'login'
    }
  })
  const [currentUser, setCurrentUser] = useState(null)
  // The page this person was on before a refresh, if this browser still knows who they are
  const [restored] = useState(() => {
    const s = loadSession()
    return s && s.id ? readLastPage(s.id, s.role) : null
  })
  const [activePage, setActivePage] = useState(() => restored?.page || 'dashboard')
  const [selectedJob, setSelectedJob] = useState(null)
  const [restoreJobId, setRestoreJobId] = useState(() => (restored?.page === 'jobdetail' ? restored.jobId : null))
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [isMaster, setIsMaster] = useState(false) // the QPlan master account, not a planner at the firm
  const [jobCount, setJobCount] = useState(0)
  const [jobs, setJobs] = useState([])
  const [jobsLoaded, setJobsLoaded] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [processingNotificationId, setProcessingNotificationId] = useState(null)
  const [lastSeenAt, setLastSeenAt] = useState(() => {
    return localStorage.getItem('qplanLastSeenNotifications') || '1970-01-01T00:00:00.000Z'
  })
  const [history, setHistory] = useState(() => [restored?.page || 'dashboard'])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCalendarConnect, setPendingCalendarConnect] = useState(false)
  const [msNotice, setMsNotice] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const saved = loadSession()
    // Only trust a saved profile that has the fields the app relies on
    const session = saved && saved.id && saved.username && saved.company_id ? saved : null
    if (saved && !session) clearSession()
    if (session) {
      // ...and only if this browser also holds a live sign-in for that person
      hasLiveSignIn(session.id).then(live => {
        if (live) setCurrentUser(session)
        else clearSession()
        setAuthReady(true)
      })
    } else {
      setAuthReady(true)
    }

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    // Microsoft 365 admin approval (Settings > Microsoft 365, step 1). Microsoft sends the admin
    // back with admin_consent=True, or with an error. This works even if the admin is not logged in to QPlan.
    if (params.get('admin_consent') || (params.get('error') && state && !code)) {
      window.history.replaceState({}, '', '/')
      let st = {}
      try { st = JSON.parse(atob(state || '')) } catch { st = {} }
      if (st.provider === 'msadmin' && st.company_id) {
        const ok = String(params.get('admin_consent')).toLowerCase() === 'true'
        const loggedIn = !!(session && session.id)
        // Logged in: show the result on the Microsoft 365 page. Not logged in (often the firm's
        // admin): say so now, and keep it for the Microsoft 365 page after login.
        const finish = (notice) => {
          if (loggedIn) { setMsNotice(notice); return }
          sessionStorage.setItem('ms_notice', JSON.stringify(notice))
          alert(notice.text)
        }
        if (ok) {
          // Recorded with the one-off code the approval link carries, so it works for an admin who has no QPlan login
          supabase.rpc('record_ms_admin_consent', {
            p_company_id: st.company_id,
            p_nonce: st.nonce || '',
            p_tenant: params.get('tenant') || '',
            p_by: st.username || '',
          }).then(({ data, error }) => {
            finish(!error && data === true
              ? { ok: true, text: 'Done. QPlan is approved for the whole firm. Nobody will be asked for Microsoft permissions again.' }
              : { ok: false, text: 'Microsoft approved QPlan, but QPlan could not record it. In QPlan, open Settings > Microsoft 365, copy a fresh link and open that one.' })
            if (loggedIn) setActivePage('microsoft')
          })
        } else {
          const desc = params.get('error_description') || params.get('error') || 'Unknown error'
          finish({ ok: false, text: 'Microsoft did not approve QPlan. ' + (/AADSTS90094|admin/i.test(desc)
            ? 'This needs to be done by a Microsoft 365 Global Administrator. Copy the link and send it to your admin.'
            : desc) })
          if (loggedIn) setActivePage('microsoft')
        }
      }
      return
    }

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
      callFunction('ms-graph', 'callback', { code: callback.code }).then(data => {
        if (data.success) {
          setMsNotice({ ok: true, text: `Microsoft 365 connected (${data.email || 'signed in'}).` })
          setActivePage(callback.returnTo || 'docs')
        } else {
          alert('Microsoft 365 connection failed: ' + (data.error || 'Unknown error'))
          if (callback.returnTo) setActivePage(callback.returnTo)
        }
      })
      return
    }

    if (callback.type === 'calendar') {
      callFunction(`calendar-${callback.provider}`, 'callback', { code: callback.code }).then(data => {
        if (data.success) {
          if (callback.returnTo) {
            setMsNotice({ ok: true, text: `Your calendar is connected${data.email ? ` (${data.email})` : ''}.` })
            setActivePage(callback.returnTo)
          } else {
            setActivePage('calendar')
            setPendingCalendarConnect(true)
          }
        } else {
          alert('Calendar connection failed: ' + (data.error || 'Unknown error'))
          if (callback.returnTo) setActivePage(callback.returnTo)
        }
      })
    }
  }, [currentUser])

  // If the sign-in ends (it expired, or was signed out elsewhere in this browser), go back to the login screen
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return
      localStorage.removeItem('pf_session')
      sessionStorage.removeItem('pf_session')
      setTourOpen(false)
      setCurrentUser(null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Result of a Microsoft 365 admin approval, shown on the Microsoft 365 page
  useEffect(() => {
    if (!currentUser) return
    const stored = sessionStorage.getItem('ms_notice')
    if (!stored) return
    sessionStorage.removeItem('ms_notice')
    if (currentUser.role !== 'director') return
    try { setMsNotice(JSON.parse(stored)) } catch { /* ignore */ }
    setActivePage('microsoft')
  }, [currentUser])

  // First time this person uses QPlan on this device: show the tutorial once the screen has settled
  // (the job list has to be in first: the tutorial opens a real job to explain its tabs)
  useEffect(() => {
    if (!currentUser?.id || !jobsLoaded || tourSeen(currentUser.id, currentUser.role)) return
    // Not on the way back from a Microsoft, Google, Calendly or Xero sign-in. That screen comes first.
    if (sessionStorage.getItem('oauth_callback') || sessionStorage.getItem('ms_notice')) return
    const t = setTimeout(() => setTourOpen(true), 700)
    return () => clearTimeout(t)
  }, [currentUser?.id, currentUser?.role, jobsLoaded])

  // Remember the page for the next refresh. Also stamped when the app goes to the background,
  // so a phone that closes the app behind the scenes reopens it in the same place.
  useEffect(() => {
    if (!currentUser?.id) return
    if (activePage === 'jobdetail' && !selectedJob?.id) return
    const save = () => writeLastPage(currentUser.id, activePage, activePage === 'jobdetail' ? selectedJob.id : null)
    save()
    const onHide = () => { if (document.visibilityState === 'hidden') save() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [currentUser?.id, activePage, selectedJob?.id])

  // After a refresh on a job page, load that job again
  useEffect(() => {
    if (!currentUser?.id || !restoreJobId) return
    let cancelled = false
    supabase.from('jobs').select('*').eq('id', restoreJobId).maybeSingle().then(({ data }) => {
      if (cancelled) return
      if (data) setSelectedJob(data)
      else setActivePage(p => (p === 'jobdetail' ? 'jobs' : p))
      setRestoreJobId(null)
    })
    return () => { cancelled = true }
  }, [currentUser?.id, restoreJobId])

  // Job list for the timer and sidebar count. Refreshes on every page change so new jobs appear straight away.
  useEffect(() => {
    if (!currentUser) return
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, code, name, address, planner, planner_rate, budget_hours, client_type, client_company, client_first_name, client_last_name')
        .order('created_at', { ascending: false })
      if (data) { setJobs(data); setJobCount(data.length) }
      setJobsLoaded(true)
    }
    fetchJobs()
  }, [currentUser, activePage, refreshKey])

  // If a director deactivates or rejects this account, log the user out on their next load.
  useEffect(() => {
    if (!currentUser?.id) return
    const checkAccount = async () => {
      const { data, error } = await supabase.from('app_users').select('is_approved, is_platform_admin').eq('id', currentUser.id).maybeSingle()
      if (error) return
      if (!data || data.is_approved === false) { handleLogout(); return }
      setIsMaster(data.is_platform_admin === true)
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
    try { localStorage.setItem('qplan_known_user', '1') } catch { /* storage unavailable */ }
    // Back to where this person was if they were signed out part way through; otherwise the dashboard
    const last = readLastPage(user.id, user.role)
    setActivePage(last?.page || 'dashboard')
    setHistory([last?.page || 'dashboard'])
    setHistoryIndex(0)
    setSelectedJob(null)
    setRestoreJobId(last?.page === 'jobdetail' ? last.jobId : null)
    setCurrentUser({
      id: user.id,
      username: user.username,
      role: user.role,
      company_id: user.company_id,
      company_code: user.company_code,
      companyName: user.companyName || user.companies?.name || '',
    })
  }

  const handleLogout = () => {
    clearSession()
    try { localStorage.removeItem(LAST_PAGE_KEY) } catch { /* storage unavailable */ }
    setIsMaster(false)
    setTourOpen(false)
    setCurrentUser(null)
    setSelectedJob(null)
    setRestoreJobId(null)
    setActivePage('dashboard')
    setHistory(['dashboard'])
    setHistoryIndex(0)
    setJobs([])
    setJobsLoaded(false)
    setNotifications([])
    setPendingCalendarConnect(false)
    sessionStorage.removeItem('oauth_callback')
  }

  const handleNavigate = (page, job = null) => {
    // Not a page of its own: it opens the Calendar with the connect box showing
    if (page === 'connectoutlook') { setPendingCalendarConnect(true); page = 'calendar' }
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

  // Reloads what is on screen without leaving the page or stopping the timer
  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    if (activePage === 'jobdetail' && selectedJob?.id) {
      const { data } = await supabase.from('jobs').select('*').eq('id', selectedJob.id).maybeSingle()
      if (data) setSelectedJob(data)
    }
    setRefreshKey(k => k + 1)
    setTimeout(() => setRefreshing(false), 700)
  }

  // The tutorial opens a real job to explain its tabs: the one it was pointing at, or the newest
  const openJobForTour = async (jobId) => {
    const id = jobId || jobs[0]?.id
    if (!id) return
    const { data } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle()
    if (!data) return
    handleNavigate('jobdetail', data)
  }

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < history.length - 1
  const isDirector = currentUser?.role === 'director'

  // Wait for the sign-in check before showing anything, so nobody sees a flash of the wrong screen
  if (!authReady) return <div className="min-h-screen bg-gray-50" />

  if (!currentUser) {
    if (authPage === 'landing') return <Landing onLogin={() => setAuthPage('login')} />
    if (authPage === 'register') return <Register onBack={() => setAuthPage('login')} onSuccess={() => setAuthPage('login')} />
    if (authPage === 'forgot') return <ForgotPassword onBack={() => setAuthPage('login')} />
    return <Login onLogin={handleLogin} onRegister={() => setAuthPage('register')} onForgotPassword={() => setAuthPage('forgot')} onAbout={() => setAuthPage('landing')} />
  }

  const visibleNavItems = navItems.filter(item => (!item.directorOnly || isDirector) && (!item.staffOnly || !isDirector))

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} currentUser={currentUser} />
      case 'jobs': return <Jobs onNavigate={handleNavigate} onJobCountChange={setJobCount} currentUser={currentUser} />
      case 'newjob': return <NewJob onNavigate={handleNavigate} currentUser={currentUser} />
      case 'jobdetail':
        if (selectedJob) return <JobDetail job={selectedJob} onNavigate={handleNavigate} currentUser={currentUser} />
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
            {restoreJobId ? 'Loading job...' : (
              <>That job is not open any more. <button onClick={() => handleNavigate('jobs')} className="text-emerald-600 hover:underline font-medium">Go to All Jobs</button></>
            )}
          </div>
        )
      case 'workload': return isDirector ? <Workload currentUser={currentUser} /> : <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">Access restricted to directors.</div>
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
      case 'microsoft': return !isDirector
        ? <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">Microsoft 365 is set up by a director. To connect your own Outlook, open Calendar and choose Connect calendar.</div>
        : <Microsoft365 currentUser={currentUser} notice={msNotice} onNoticeShown={() => setMsNotice(null)} />
      default: return <div className="bg-white rounded-xl border border-gray-200 p-6"><p className="text-sm text-gray-500">This page is coming soon.</p></div>
    }
  }

  const initials = currentUser.username.slice(0, 2).toUpperCase()

  return (
    <div className="isolate flex h-dvh bg-gray-100 dark:bg-[var(--qp-page)] font-sans overflow-hidden qp-safe-x qp-safe-bottom">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`
        fixed lg:relative z-40 h-full w-52 bg-white border-r border-gray-200 flex flex-col flex-shrink-0
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex items-center px-3 py-2 border-b border-gray-200 gap-2">
          <Logo className="h-6 w-auto" />
          <SeasonSticker />
          <div className="flex items-center gap-0.5 ml-auto">
            <button onClick={goBack} disabled={!canGoBack}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${canGoBack ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' : 'text-gray-200 cursor-not-allowed'}`}
              style={{ fontSize: '22px', lineHeight: 1 }}>‹</button>
            <button onClick={goForward} disabled={!canGoForward}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${canGoForward ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' : 'text-gray-200 cursor-not-allowed'}`}
              style={{ fontSize: '22px', lineHeight: 1 }}>›</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {['main', 'tools', 'settings'].map(section => (
            <div key={section} data-tour={`nav-section-${section}`} className="px-2 mb-2">
              <div className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1">{section}</div>
              {visibleNavItems.filter(i => i.section === section).map(item => (
                <button key={item.id} data-tour={`nav-${item.id}`} onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors ${activePage === item.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}>
                  {item.label}
                  {item.id === 'jobs' && jobCount > 0 && (
                    <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full">{jobCount}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        <GlobalTimer jobs={jobs} currentUser={currentUser} activeJob={activePage === 'jobdetail' && !tourOpen ? selectedJob : null} onRunningChange={setTimerRunning} />

        <div className="p-3 border-t border-gray-200 space-y-2">
          <ThemeSwitch />
          <InstallAppButton />
          {isDirector && (
            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 text-xs text-gray-600 transition-colors"
              >
                <span>Notifications</span>
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
              <div className="text-xs text-gray-500 capitalize">{isMaster ? 'Master account' : currentUser.role}</div>
            </div>
          </div>

          <button onClick={handleLogout}
            className="w-full py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors">
            Log out
          </button>
        </div>
      </div>

      <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Seasonal snow, petals and so on drift behind the page: above the page colour, below everything else.
            Nothing here is given its own layer, so pop-up boxes on a page still cover the menu. */}
        <SeasonParticles />
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden relative p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 flex-shrink-0"
            aria-label={timerRunning ? 'Open menu (timer recording)' : 'Open menu'}
          >
            {timerRunning && <span className="qp-rec absolute top-0.5 right-0.5" aria-hidden="true" />}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4" width="14" height="1.5" rx="1" fill="currentColor"/>
              <rect x="2" y="8.25" width="14" height="1.5" rx="1" fill="currentColor"/>
              <rect x="2" y="12.5" width="14" height="1.5" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <div className="flex-1 text-sm font-medium truncate">{pageTitles[activePage]}</div>
          {isDirector && currentUser.companyName && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg hidden sm:block">{currentUser.companyName}</span>
          )}
          <button onClick={() => setTourOpen(true)} title="Show the tutorial" aria-label="Show the tutorial" data-tour="help-button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 flex-shrink-0 text-sm font-semibold">
            ?
          </button>
          {activePage !== 'newjob' && (
            <button onClick={handleRefresh} disabled={refreshing} title="Refresh this page" aria-label="Refresh this page"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 flex-shrink-0 disabled:opacity-60">
              <IconRefresh size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}
          <button onClick={() => handleNavigate('newjob')} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex-shrink-0">+ New Job</button>
        </div>

        <div key={refreshKey} className="flex-1 overflow-y-auto p-4 md:p-5">
          <SeasonStrip />
          <div data-tour="page">{renderPage()}</div>
        </div>
      </div>
      {tourOpen && (
        <Tour currentUser={currentUser} isDirector={isDirector} activePage={activePage} hasJobs={jobs.length > 0}
          onNavigate={handleNavigate} onOpenJob={openJobForTour} setSidebarOpen={setSidebarOpen}
          onClose={() => { setTourOpen(false); setSidebarOpen(false); if (activePage !== 'dashboard') handleNavigate('dashboard') }} />
      )}
    </div>
  )
}