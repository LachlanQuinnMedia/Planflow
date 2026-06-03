import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const typeColors = {
  client: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  internal: 'bg-purple-100 border-purple-300 text-purple-800',
}

function getWeekDates(date) {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function formatTime(hour) {
  if (hour === 0) return '12am'
  if (hour === 12) return '12pm'
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`
}

function formatDuration(mins) {
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}hr` : `${h}hr ${m}min`
}

function formatDateFull(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

const SLOT_HEIGHT = 56

// ── MEETING REVIEW MODAL ─────────────────────────────────────────
function MeetingReviewModal({ booking, onClose, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm('Delete this meeting?')) return
    setDeleting(true)
    await supabase.from('bookings').delete().eq('id', booking.id)
    setDeleting(false)
    onDelete()
    onClose()
  }

  const notes = booking.notes || ''
  const noteLines = notes.split('\n').filter(Boolean)
  const clientEmail = noteLines.find(l => l.startsWith('Email:'))?.replace('Email:', '').trim()
  const clientPhone = noteLines.find(l => l.startsWith('Phone:'))?.replace('Phone:', '').trim()
  const clientAddress = noteLines.find(l => l.startsWith('Address:'))?.replace('Address:', '').trim()
  const agenda = noteLines.find(l => l.startsWith('Agenda:'))?.replace('Agenda:', '').trim()

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md">
        {/* Header */}
        <div className={`px-6 py-4 rounded-t-2xl ${booking.type === 'client' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-purple-50 border-b border-purple-100'}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${booking.type === 'client' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                  {booking.type === 'client' ? 'Client meeting' : 'Staff meeting'}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-800">{booking.title}</div>
              {booking.client_name && (
                <div className="text-xs text-gray-500 mt-0.5">with {booking.client_name}</div>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-3 flex-shrink-0">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          {/* Date and time */}
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400">📅</div>
            <div>
              <div className="text-xs font-medium text-gray-700">{formatDateFull(booking.date)}</div>
              <div className="text-xs text-gray-500">
                {booking.start_time?.slice(0, 5)} · {formatDuration(booking.duration_minutes)}
              </div>
            </div>
          </div>

          {/* Attendees */}
          {booking.attendees?.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400">👥</div>
              <div className="text-xs text-gray-700">{booking.attendees.join(', ')}</div>
            </div>
          )}

          {/* Linked job */}
          {booking.job_code && (
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400">📁</div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{booking.job_code}</span>
            </div>
          )}

          {/* Client details */}
          {booking.type === 'client' && (clientEmail || clientPhone || clientAddress || agenda) && (
            <div className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client details</div>
              {booking.client_name && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Name</span>
                  <span className="font-medium text-gray-700">{booking.client_name}</span>
                </div>
              )}
              {clientEmail && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Email</span>
                  <span className="font-medium text-gray-700">{clientEmail}</span>
                </div>
              )}
              {clientPhone && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Phone</span>
                  <span className="font-medium text-gray-700">{clientPhone}</span>
                </div>
              )}
              {clientAddress && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Address</span>
                  <span className="font-medium text-gray-700 text-right max-w-[200px]">{clientAddress}</span>
                </div>
              )}
              {agenda && (
                <div className="pt-1 border-t border-gray-50">
                  <div className="text-xs text-gray-400 mb-1">Agenda</div>
                  <div className="text-xs text-gray-700">{agenda}</div>
                </div>
              )}
            </div>
          )}

          {/* Internal notes */}
          {booking.type === 'internal' && booking.notes && (
            <div className="border border-gray-100 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</div>
              <div className="text-xs text-gray-700">{booking.notes}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── NEW MEETING MODAL ─────────────────────────────────────────────
function NewMeetingModal({ onClose, onSave, currentUser, staffList, jobs, defaultDate }) {
  const [type, setType] = useState('client')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState(60)
  const [selectedAttendees, setSelectedAttendees] = useState([currentUser.username])
  const [jobId, setJobId] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [agenda, setAgenda] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleAttendee = (username) => {
    setSelectedAttendees(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    )
  }

  const selectAll = () => setSelectedAttendees(staffList.map(s => s.username))
  const clearAll = () => setSelectedAttendees([currentUser.username])

  const handleSave = async () => {
    if (!title.trim()) { alert('Please enter a title.'); return }
    if (!date) { alert('Please select a date.'); return }
    setSaving(true)
    const selectedJob = jobs.find(j => j.id === jobId)
    const { error } = await supabase.from('bookings').insert({
      company_id: currentUser.company_id,
      title: title.trim(),
      type,
      date,
      start_time: startTime,
      duration_minutes: duration,
      attendees: selectedAttendees,
      job_id: jobId || null,
      job_code: selectedJob?.code || null,
      client_name: clientName || null,
      notes: type === 'client'
        ? `Email: ${clientEmail}\nPhone: ${clientPhone}\nAddress: ${clientAddress}\nAgenda: ${agenda}`
        : notes,
      created_by: currentUser.username,
    })
    if (error) { alert('Failed to save booking.'); setSaving(false); return }
    setSaving(false)
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">New Meeting</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex gap-2">
            {[{ id: 'client', label: 'Client meeting' }, { id: 'internal', label: 'Staff meeting' }].map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`flex-1 py-2 text-xs rounded-lg font-medium transition-colors ${type === t.id ? 'bg-emerald-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={type === 'client' ? 'e.g. Initial consultation — J. Smith' : 'e.g. Weekly team review'}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hrs</option>
                <option value={120}>2 hours</option>
                <option value={150}>2.5 hrs</option>
                <option value={180}>3 hours</option>
                <option value={210}>3.5 hrs</option>
                <option value={240}>4 hours</option>
                <option value={270}>4.5 hrs</option>
                <option value={300}>5 hours</option>
              </select>
            </div>
          </div>

          {type === 'client' && (
            <div className="space-y-3 border border-gray-100 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client details</div>
              <input value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="Client name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                placeholder="Email address" type="email"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <input value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                placeholder="Address / site address"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <textarea value={agenda} onChange={e => setAgenda(e.target.value)}
                placeholder="Agenda / meeting notes" rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link to job (optional)</label>
            <select value={jobId} onChange={e => setJobId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              <option value="">No job linked</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.code} — {j.name}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Attendees</label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-emerald-600 hover:underline">Select all</button>
                <span className="text-gray-300">·</span>
                <button onClick={clearAll} className="text-xs text-gray-400 hover:underline">Clear</button>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
              {staffList.map(s => (
                <label key={s.username} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                  <input type="checkbox" checked={selectedAttendees.includes(s.username)}
                    onChange={() => toggleAttendee(s.username)}
                    className="w-3.5 h-3.5 accent-emerald-600" />
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-700 flex-shrink-0">
                    {s.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium">{s.username}</span>
                  <span className="text-xs text-gray-400 capitalize ml-auto">{s.role}</span>
                </label>
              ))}
            </div>
          </div>

          {type === 'internal' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Meeting agenda or notes..." rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none" />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save meeting'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConnectCalendarModal({ onClose, currentUser }) {
  const [calendlyUrl, setCalendlyUrl] = useState('')
  const [savingCalendly, setSavingCalendly] = useState(false)

  const handleConnectGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) { alert('Google Calendar not configured yet. Add VITE_GOOGLE_CLIENT_ID to your environment variables.'); return }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/calendar/google/callback`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      state: btoa(JSON.stringify({ company_id: currentUser.company_id, username: currentUser.username })),
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const handleConnectOutlook = () => {
    const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID
    if (!clientId) { alert('Outlook not configured yet. Add VITE_OUTLOOK_CLIENT_ID to your environment variables.'); return }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/calendar/outlook/callback`,
      response_type: 'code',
      scope: 'Calendars.ReadWrite offline_access',
      state: btoa(JSON.stringify({ company_id: currentUser.company_id, username: currentUser.username })),
    })
    window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  }

  const handleSaveCalendly = async () => {
    if (!calendlyUrl.trim()) { alert('Please enter your Calendly URL.'); return }
    setSavingCalendly(true)
    await supabase.from('app_users').update({ calendly_url: calendlyUrl.trim() })
      .eq('username', currentUser.username)
      .eq('company_id', currentUser.company_id)
    setSavingCalendly(false)
    alert('Calendly URL saved.')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">Connect Calendar</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="text-xs text-gray-400 mb-4">Connect your calendar so meetings created in QPlan sync automatically.</div>
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">G</div>
                <div>
                  <div className="text-xs font-semibold">Google Calendar</div>
                  <div className="text-xs text-gray-400">Gmail / Google Workspace</div>
                </div>
              </div>
              <button onClick={handleConnectGoogle} className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium">Connect</button>
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white text-sm font-bold">O</div>
                <div>
                  <div className="text-xs font-semibold">Microsoft Outlook</div>
                  <div className="text-xs text-gray-400">Office 365 / Microsoft 365</div>
                </div>
              </div>
              <button onClick={handleConnectOutlook} className="px-3 py-1.5 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">Connect</button>
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">C</div>
              <div>
                <div className="text-xs font-semibold">Calendly</div>
                <div className="text-xs text-gray-400">Paste your Calendly booking URL</div>
              </div>
            </div>
            <div className="flex gap-2">
              <input value={calendlyUrl} onChange={e => setCalendlyUrl(e.target.value)}
                placeholder="https://calendly.com/your-link"
                className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <button onClick={handleSaveCalendly} disabled={savingCalendly}
                className="px-3 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50">
                {savingCalendly ? '...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Done</button>
        </div>
      </div>
    </div>
  )
}

export default function Calendar({ currentUser }) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [staffList, setStaffList] = useState([])
  const [jobs, setJobs] = useState([])
  const [viewingAs, setViewingAs] = useState(currentUser.username)
  const [showNewMeeting, setShowNewMeeting] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const isDirector = currentUser.role === 'director'

  const weekDates = getWeekDates(currentWeek)

  useEffect(() => {
    fetchBookings()
    fetchStaff()
    fetchJobs()
  }, [currentWeek, viewingAs])

  const fetchBookings = async () => {
    setLoading(true)
    const startDate = weekDates[0].toISOString().split('T')[0]
    const endDate = weekDates[6].toISOString().split('T')[0]
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('start_time', { ascending: true })
    if (data) {
      setBookings(data.filter(b =>
        b.attendees?.includes(viewingAs) || b.created_by === viewingAs
      ))
    }
    setLoading(false)
  }

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('username, role')
      .eq('company_id', currentUser.company_id)
      .eq('is_approved', true)
      .order('username', { ascending: true })
    if (data) setStaffList(data)
  }

  const fetchJobs = async () => {
    const { data } = await supabase.from('jobs').select('id, code, name').order('created_at', { ascending: false })
    if (data) setJobs(data)
  }

  const goBack = () => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d) }
  const goForward = () => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d) }
  const goToday = () => setCurrentWeek(new Date())

  const getBookingsForDayAndHour = (date, hour) => {
    const dateStr = date.toISOString().split('T')[0]
    return bookings.filter(b => {
      if (b.date !== dateStr) return false
      const bHour = parseInt(b.start_time?.split(':')[0] || '0')
      return bHour === hour
    })
  }

  const formatDateHeader = (date) => {
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    return { day: DAYS[date.getDay()], num: date.getDate(), isToday }
  }

  const hours = Array.from({ length: 13 }, (_, i) => i + 7)

  return (
    <div>
      {showNewMeeting && (
        <NewMeetingModal
          onClose={() => setShowNewMeeting(false)}
          onSave={fetchBookings}
          currentUser={currentUser}
          staffList={staffList}
          jobs={jobs}
          defaultDate={selectedDate}
        />
      )}
      {showConnect && (
        <ConnectCalendarModal onClose={() => setShowConnect(false)} currentUser={currentUser} />
      )}
      {selectedBooking && (
        <MeetingReviewModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onDelete={fetchBookings}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg">‹</button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Today</button>
          <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg">›</button>
          <span className="text-sm font-semibold ml-2">
            {weekDates[0].toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-400 flex-shrink-0" />
              <span className="text-xs text-gray-500">Client meeting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-purple-400 flex-shrink-0" />
              <span className="text-xs text-gray-500">Staff meeting</span>
            </div>
          </div>
          {isDirector && (
            <select value={viewingAs} onChange={e => setViewingAs(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              {staffList.map(s => (
                <option key={s.username} value={s.username}>{s.username}</option>
              ))}
            </select>
          )}
          <button onClick={() => setShowConnect(true)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
            🔗 Connect calendar
          </button>
          <button onClick={() => { setSelectedDate(null); setShowNewMeeting(true) }}
            className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
            + New meeting
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="border-r border-gray-100" />
          {weekDates.map((date, i) => {
            const { day, num, isToday } = formatDateHeader(date)
            return (
              <div key={i} className={`text-center py-3 border-r border-gray-100 last:border-0 ${isToday ? 'bg-emerald-50' : ''}`}>
                <div className="text-xs text-gray-400">{day}</div>
                <div className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-emerald-600' : 'text-gray-700'}`}>{num}</div>
              </div>
            )
          })}
        </div>

        {/* Time slots */}
        <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-50 last:border-0" style={{ height: `${SLOT_HEIGHT}px` }}>
                <div className="border-r border-gray-100 px-2 pt-1 flex-shrink-0">
                  <span className="text-xs text-gray-400">{formatTime(hour)}</span>
                </div>
                {weekDates.map((date, di) => {
                  const dateStr = date.toISOString().split('T')[0]
                  const isToday = date.toDateString() === new Date().toDateString()
                  const dayBookings = getBookingsForDayAndHour(date, hour)

                  return (
                    <div key={di}
                      onClick={() => { setSelectedDate(dateStr); setShowNewMeeting(true) }}
                      className={`border-r border-gray-100 last:border-0 relative cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-emerald-50/20' : ''}`}>
                      {dayBookings.map((b, bi) => {
                        const [bH, bM] = (b.start_time || '00:00').split(':').map(Number)
                        const topOffset = (bM / 60) * SLOT_HEIGHT
                        const heightPx = (b.duration_minutes / 60) * SLOT_HEIGHT

                        // Build the label shown on the block
                        const clientShort = b.client_name
                          ? `${b.client_name.split(' ')[0]} ${b.client_name.split(' ')[1]?.[0] || ''}.`
                          : null
                        const durationLabel = formatDuration(b.duration_minutes)

                        return (
                          <div
                            key={bi}
                            onClick={e => { e.stopPropagation(); setSelectedBooking(b) }}
                            className={`absolute left-0.5 right-0.5 rounded-md border px-1 py-0.5 overflow-hidden z-10 cursor-pointer ${typeColors[b.type] || 'bg-gray-100 border-gray-200 text-gray-700'}`}
                            style={{
                              top: `${topOffset}px`,
                              height: `${Math.max(heightPx - 2, 22)}px`,
                            }}
                          >
                            <div className="text-xs font-semibold truncate leading-tight">{b.title}</div>
                            <div className="text-xs opacity-75 truncate leading-tight">
                              {b.start_time?.slice(0, 5)} · {durationLabel}
                              {clientShort && ` · ${clientShort}`}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming list */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          This week — {viewingAs}
        </div>
        {loading ? (
          <div className="text-xs text-gray-400 text-center py-4">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">No meetings this week.</div>
        ) : bookings.map((b, i) => (
          <div key={i}
            onClick={() => setSelectedBooking(b)}
            className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.type === 'client' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{b.title}</div>
              <div className="text-xs text-gray-400">
                {new Date(b.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · {b.start_time?.slice(0, 5)} · {formatDuration(b.duration_minutes)}
                {b.client_name && ` · ${b.client_name}`}
                {b.attendees?.length > 1 && ` · ${b.attendees.length} attendees`}
              </div>
            </div>
            {b.job_code && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{b.job_code}</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.type === 'client' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
              {b.type === 'client' ? 'Client' : 'Internal'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}