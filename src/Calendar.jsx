import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { supabase, SUPABASE_URL, fnHeaders, callFunction } from './supabase'
import { jobTitle } from './jobMeta'
import { holidayName } from './businessDays'
import { connectMyCalendar } from './microsoft'
import { IconCalendar, IconPeople, IconFolder, IconLink, IconRefresh } from './icons'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


const typeColors = {
  client: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  internal: 'bg-purple-100 border-purple-300 text-purple-800',
  outlook: 'bg-blue-100 border-blue-300 text-blue-800',
}

// Turn this person's Outlook events into the same shape as a QPlan meeting, so the week grid can
// draw them. They are read live from Outlook and are not saved in QPlan.
function outlookToItems(events, weekDates, skipIds) {
  const days = new Set(weekDates.map(toLocalISODate))
  const items = []
  for (const e of events || []) {
    if (!e.start || skipIds.has(e.id)) continue // meetings QPlan put into Outlook are already shown
    const base = {
      id: `outlook-${e.id}`, type: 'outlook', outlook: true, title: e.subject, subject: e.subject, client_name: null,
      notes: e.location || '', location: e.location || '', webLink: e.webLink,
      // Older replies from the server do not list attendees or a description
      attendees: Array.isArray(e.attendees) ? e.attendees : null, organizer: e.organizer || '', purpose: e.preview || '',
    }
    if (e.allDay) {
      // An all-day event runs from its start day up to, but not including, its end day
      const day = new Date(`${e.start.slice(0, 10)}T00:00:00`)
      const last = new Date(`${(e.end || e.start).slice(0, 10)}T00:00:00`)
      let guard = 0
      do {
        const iso = toLocalISODate(day)
        if (days.has(iso)) items.push({ ...base, id: `${base.id}-${iso}`, date: iso, start_time: '07:00', duration_minutes: 30, title: `All day: ${e.subject}`, allDay: true, allDayFrom: e.start.slice(0, 10), allDayTo: (e.end || e.start).slice(0, 10) })
        day.setDate(day.getDate() + 1)
      } while (day < last && ++guard < 14)
      continue
    }
    const minutes = Math.max(15, Math.round((Date.parse(`${e.end}Z`) - Date.parse(`${e.start}Z`)) / 60000) || 30)
    items.push({ ...base, date: e.start.slice(0, 10), start_time: e.start.slice(11, 16), duration_minutes: minutes })
  }
  return items
}

// Format a JS Date as YYYY-MM-DD using LOCAL date parts (no timezone shift).
function toLocalISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

// "13:00" -> "1:00pm", "09:30" -> "9:30am"
function formatTime12(hhmm) {
  if (!hhmm) return ''
  const [h, m] = String(hhmm).split(':').map(Number)
  if (isNaN(h)) return hhmm
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m || 0).padStart(2, '0')}${suffix}`
}

function formatDuration(mins) {
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}hr` : `${h}hr ${m}min`
}

function formatDateFull(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatWeekRange(weekDates) {
  const start = weekDates[0]
  const end = weekDates[6]
  const startDay = start.getDate()
  const endDay = end.getDate()
  const startMonth = start.toLocaleDateString('en-AU', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-AU', { month: 'short' })
  const year = end.getFullYear()
  if (start.getMonth() === end.getMonth()) {
    return `${startDay} – ${endDay} ${endMonth} ${year}`
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`
}

const SLOT_HEIGHT = 64 // tallest an hour row gets. Rows shrink so the whole day fits on screen.
const MIN_SLOT_HEIGHT = 30

// "09:00" plus 90 minutes -> "10:30"
function addMinutes(hhmm, mins) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  const total = (h || 0) * 60 + (m || 0) + (mins || 0)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// A street address gets a map link. "Microsoft Teams Meeting" or a web link does not.
function looksLikeAddress(text) {
  return /\d/.test(text || '') && !/^https?:/i.test(text || '') && !/teams|zoom|online|phone call/i.test(text || '')
}

function DatePickerModal({ currentDate, onSelect, onClose }) {
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const today = new Date()

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const handleSelect = (day) => { onSelect(new Date(viewYear, viewMonth, day)); onClose() }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const isToday = (day) => day && today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear
  const isCurrent = (day) => day && currentDate.getDate() === day && currentDate.getMonth() === viewMonth && currentDate.getFullYear() === viewYear

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 w-72" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">‹</button>
          <div className="text-sm font-semibold">{MONTHS[viewMonth]} {viewYear}</div>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">›</button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-xs text-gray-500 py-1 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => (
            <button key={i} onClick={() => day && handleSelect(day)} disabled={!day}
              className={`h-8 w-full rounded-lg text-xs font-medium transition-colors
                ${!day ? 'invisible' : ''}
                ${isCurrent(day) ? 'bg-emerald-600 text-white' : ''}
                ${isToday(day) && !isCurrent(day) ? 'bg-emerald-100 text-emerald-700' : ''}
                ${day && !isCurrent(day) && !isToday(day) ? 'hover:bg-gray-100 text-gray-700' : ''}
              `}>{day}</button>
          ))}
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          <button onClick={() => { onSelect(new Date()); onClose() }}
            className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Today</button>
          <button onClick={() => { const n = new Date(); n.setMonth(n.getMonth() + 1); onSelect(n); onClose() }}
            className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Next month</button>
        </div>
      </div>
    </div>
  )
}

function ConnectCalendarModal({ onClose, currentUser, onConnectionChange }) {
  const [connections, setConnections] = useState({ google: null, outlook: null, calendly: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => { checkConnections() }, [])

  const checkConnections = async () => {
    setLoading(true)
    const results = {}
    for (const provider of ['google', 'outlook', 'calendly']) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/calendar-${provider}?action=status`, {
          method: 'POST',
          headers: await fnHeaders(),
          body: JSON.stringify({ company_id: currentUser.company_id, username: currentUser.username }),
        })
        const data = await res.json()
        results[provider] = data.connected ? data.email : null
      } catch { results[provider] = null }
    }
    setConnections(results)
    setLoading(false)
  }

  const handleConnectGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) { alert('Google Calendar not configured yet.'); return }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'https://planflow-beige.vercel.app',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state: btoa(JSON.stringify({ provider: 'google', company_id: currentUser.company_id, username: currentUser.username })),
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const handleConnectOutlook = () => connectMyCalendar(currentUser, null)

  const handleConnectCalendly = () => {
    const clientId = import.meta.env.VITE_CALENDLY_CLIENT_ID
    if (!clientId) { alert('Calendly not configured yet.'); return }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'https://planflow-beige.vercel.app',
      response_type: 'code',
      state: btoa(JSON.stringify({ provider: 'calendly', company_id: currentUser.company_id, username: currentUser.username })),
    })
    window.location.href = `https://auth.calendly.com/oauth/authorize?${params}`
  }

  const handleDisconnect = async (provider) => {
    if (!window.confirm(`Disconnect ${provider}?`)) return
    await fetch(`${SUPABASE_URL}/functions/v1/calendar-${provider}?action=disconnect`, {
      method: 'POST',
      headers: await fnHeaders(),
      body: JSON.stringify({ company_id: currentUser.company_id, username: currentUser.username }),
    })
    checkConnections()
    onConnectionChange?.()
  }

  const providers = [
    { id: 'google', label: 'Google Calendar', sub: 'Gmail / Google Workspace', color: 'bg-blue-500', letter: 'G', connect: handleConnectGoogle },
    { id: 'outlook', label: 'Microsoft Outlook', sub: 'Office 365 / Microsoft 365', color: 'bg-blue-700', letter: 'O', connect: handleConnectOutlook },
    { id: 'calendly', label: 'Calendly', sub: 'Booking page sync', color: 'bg-emerald-500', letter: 'C', connect: handleConnectCalendly },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">Connect Calendar</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="text-xs text-gray-500 mb-2">Connect your calendar so meetings created in QPlan sync automatically, and bookings from your external calendar appear here.</div>
          {loading ? (
            <div className="text-xs text-gray-500 text-center py-4">Checking connections...</div>
          ) : providers.map(p => (
            <div key={p.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${p.color} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>{p.letter}</div>
                  <div>
                    <div className="text-xs font-semibold">{p.label}</div>
                    <div className="text-xs text-gray-500">
                      {connections[p.id] ? (
                        <span className="text-emerald-600">● Connected: {connections[p.id]}</span>
                      ) : p.sub}
                    </div>
                  </div>
                </div>
                {connections[p.id] ? (
                  <button onClick={() => handleDisconnect(p.id)}
                    className="px-3 py-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50 font-medium">
                    Disconnect
                  </button>
                ) : (
                  <button onClick={p.connect}
                    className={`px-3 py-1.5 text-xs ${p.color} text-white rounded-lg hover:opacity-90 font-medium`}>
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Done</button>
        </div>
      </div>
    </div>
  )
}

function EditMeetingModal({ booking, onClose, onSave, staffList, jobs }) {
  const [title, setTitle] = useState(booking.title || '')
  const [date, setDate] = useState(booking.date || '')
  const [startTime, setStartTime] = useState(booking.start_time?.slice(0, 5) || '09:00')
  const [duration, setDuration] = useState(booking.duration_minutes || 60)
  const [selectedAttendees, setSelectedAttendees] = useState(booking.attendees || [])
  const [jobId, setJobId] = useState(booking.job_id || '')
  const [clientName, setClientName] = useState(booking.client_name || '')
  const [saving, setSaving] = useState(false)

  const notes = booking.notes || ''
  const noteLines = notes.split('\n').filter(Boolean)
  const [clientEmail, setClientEmail] = useState(noteLines.find(l => l.startsWith('Email:'))?.replace('Email:', '').trim() || '')
  const [clientPhone, setClientPhone] = useState(noteLines.find(l => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '')
  const [clientAddress, setClientAddress] = useState(noteLines.find(l => l.startsWith('Address:'))?.replace('Address:', '').trim() || '')
  const [agenda, setAgenda] = useState(noteLines.find(l => l.startsWith('Agenda:'))?.replace('Agenda:', '').trim() || '')
  const [internalNotes, setInternalNotes] = useState(booking.type === 'internal' ? booking.notes || '' : '')

  const toggleAttendee = (username) => setSelectedAttendees(prev =>
    prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
  )

  const handleSave = async () => {
    if (!title.trim()) { alert('Please enter a title.'); return }
    setSaving(true)
    const selectedJob = jobs.find(j => j.id === jobId)
    const { error } = await supabase.from('bookings').update({
      title: title.trim(), date, start_time: startTime, duration_minutes: duration,
      attendees: selectedAttendees, job_id: jobId || null, job_code: selectedJob?.code || null,
      client_name: clientName || null,
      notes: booking.type === 'client'
        ? `Email: ${clientEmail}\nPhone: ${clientPhone}\nAddress: ${clientAddress}\nAgenda: ${agenda}`
        : internalNotes,
    }).eq('id', booking.id)
    if (error) { alert('Failed to update.'); setSaving(false); return }
    setSaving(false); onSave(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">Edit Meeting</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start time <span className="text-gray-500 font-normal">({formatTime12(startTime)})</span></label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                <option value={15}>15 min</option><option value={30}>30 min</option>
                <option value={45}>45 min</option><option value={60}>1 hour</option>
                <option value={90}>1.5 hrs</option><option value={120}>2 hours</option>
                <option value={150}>2.5 hrs</option><option value={180}>3 hours</option>
                <option value={210}>3.5 hrs</option><option value={240}>4 hours</option>
                <option value={270}>4.5 hrs</option><option value={300}>5 hours</option>
              </select>
            </div>
          </div>
          {booking.type === 'client' && (
            <div className="space-y-3 border border-gray-100 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client details</div>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Phone"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Address"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <textarea value={agenda} onChange={e => setAgenda(e.target.value)} placeholder="Agenda" rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none" />
            </div>
          )}
          {booking.type === 'internal' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link to job (optional)</label>
            <select value={jobId} onChange={e => setJobId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              <option value="">No job linked</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{jobTitle(j)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Attendees</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
              {staffList.map(s => (
                <label key={s.username} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                  <input type="checkbox" checked={selectedAttendees.includes(s.username)}
                    onChange={() => toggleAttendee(s.username)} className="w-3.5 h-3.5 accent-emerald-600" />
                  <span className="text-xs font-medium">{s.username}</span>
                  <span className="text-xs text-gray-500 capitalize ml-auto">{s.role}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, children, muted }) {
  return (
    <div className="grid grid-cols-[76px_1fr] gap-2 text-xs">
      <div className="text-gray-500">{label}</div>
      <div className={`min-w-0 break-words ${muted ? 'text-gray-400' : 'text-gray-800'}`}>{children}</div>
    </div>
  )
}

// The small summary shown when a meeting is clicked. Works for QPlan meetings and Outlook ones.
function MeetingSummaryModal({ booking, jobs, onClose, onDelete, onEdit }) {
  const [deleting, setDeleting] = useState(false)
  const isOutlook = !!booking.outlook

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleDelete = async () => {
    if (!window.confirm('Delete this meeting?')) return
    setDeleting(true)
    await supabase.from('bookings').delete().eq('id', booking.id)
    setDeleting(false); onDelete(); onClose()
  }

  const noteLines = (isOutlook ? '' : booking.notes || '').split('\n').filter(Boolean)
  const noteValue = (key) => noteLines.find(l => l.startsWith(key))?.replace(key, '').trim() || ''
  const clientEmail = noteValue('Email:')
  const clientPhone = noteValue('Phone:')
  const job = !isOutlook && booking.job_code ? (jobs || []).find(j => j.code === booking.job_code) : null

  const title = isOutlook ? (booking.subject || booking.title) : booking.title
  const address = isOutlook ? booking.location : (noteValue('Address:') || job?.address || '')
  const purpose = isOutlook ? booking.purpose
    : booking.type === 'client' ? noteValue('Agenda:') : (booking.notes || '').trim()
  const people = booking.attendees || []
  const attendeesKnown = !isOutlook || Array.isArray(booking.attendees)

  let when
  if (booking.allDay) {
    const last = new Date(`${booking.allDayTo}T00:00:00`); last.setDate(last.getDate() - 1)
    const lastIso = toLocalISODate(last)
    when = booking.allDayFrom && lastIso > booking.allDayFrom
      ? `All day, ${formatDateFull(booking.allDayFrom)} to ${formatDateFull(lastIso)}`
      : `All day, ${formatDateFull(booking.allDayFrom || booking.date)}`
  } else {
    when = `${formatTime12(booking.start_time)} to ${formatTime12(addMinutes(booking.start_time, booking.duration_minutes))} (${formatDuration(booking.duration_minutes)})`
  }

  const tone = isOutlook ? { bar: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700', label: 'Outlook' }
    : booking.type === 'client' ? { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700', label: 'Client meeting' }
    : { bar: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700', label: 'Staff meeting' }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div role="dialog" aria-label="Meeting summary" onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl border border-gray-200 w-full max-w-sm overflow-hidden shadow-lg max-h-[85dvh] flex flex-col">
        <div className={`h-1 ${tone.bar}`} />
        <div className="px-4 pt-3 pb-2 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${tone.chip}`}>{tone.label}</span>
            <div className="text-sm font-semibold text-gray-900 mt-1.5 break-words">{title}</div>
            {booking.client_name && <div className="text-xs text-gray-600 mt-0.5">with {booking.client_name}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-700 flex-shrink-0 -mr-1 px-1">✕</button>
        </div>
        <div className="px-4 pb-3 space-y-2 overflow-y-auto">
          <SummaryRow label="Time">
            {!booking.allDay && <div className="font-medium">{formatDateFull(booking.date)}</div>}
            <div>{when}</div>
          </SummaryRow>
          <SummaryRow label="Address" muted={!address}>
            {!address ? 'Not added' : looksLikeAddress(address) ? (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer"
                className="text-emerald-700 hover:underline" title="Open in Google Maps">{address}</a>
            ) : address}
          </SummaryRow>
          <SummaryRow label="Attendees" muted={!attendeesKnown || (people.length === 0 && !booking.client_name)}>
            {!attendeesKnown ? 'Open it in Outlook to see who is invited'
              : people.length === 0 && !booking.client_name ? 'Just you'
              : [...people, ...(booking.client_name ? [`${booking.client_name} (client)`] : [])].join(', ')}
          </SummaryRow>
          <SummaryRow label="Purpose" muted={!purpose}>
            <div className="whitespace-pre-wrap">{purpose || 'Not added'}</div>
          </SummaryRow>
          {(job || booking.job_code) && (
            <SummaryRow label="Job">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{booking.job_code}</span>
            </SummaryRow>
          )}
          {(clientPhone || clientEmail) && (
            <SummaryRow label="Client">
              {clientPhone && <a href={`tel:${clientPhone.replace(/\s+/g, '')}`} className="text-emerald-700 hover:underline">{clientPhone}</a>}
              {clientPhone && clientEmail && ' · '}
              {clientEmail && <a href={`mailto:${clientEmail}`} className="text-emerald-700 hover:underline">{clientEmail}</a>}
            </SummaryRow>
          )}
          {isOutlook && booking.organizer && <SummaryRow label="Organiser">{booking.organizer}</SummaryRow>}
          {!isOutlook && booking.external_source && (
            <div className="text-[11px] text-gray-500 capitalize">Also in {booking.external_source}</div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          {isOutlook ? (
            <>
              {booking.webLink && (
                <a href={booking.webLink} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Open in Outlook</a>
              )}
              <button onClick={onClose} className="flex-1 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Close</button>
            </>
          ) : (
            <>
              <button onClick={handleDelete} disabled={deleting}
                className="px-3 py-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button onClick={onEdit} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Edit</button>
              <button onClick={onClose} className="flex-1 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Close</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function NewMeetingModal({ onClose, onSave, currentUser, staffList, jobs, defaultDate }) {
  const [type, setType] = useState('client')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate || toLocalISODate(new Date()))
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

  const toggleAttendee = (u) => setSelectedAttendees(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u])
  const selectAll = () => setSelectedAttendees(staffList.map(s => s.username))
  const clearAll = () => setSelectedAttendees([currentUser.username])

  const handleSave = async () => {
    if (!title.trim()) { alert('Please enter a title.'); return }
    setSaving(true)
    const selectedJob = jobs.find(j => j.id === jobId)
    const { data: newBooking, error } = await supabase.from('bookings').insert({
      company_id: currentUser.company_id, title: title.trim(), type, date,
      start_time: startTime, duration_minutes: duration, attendees: selectedAttendees,
      job_id: jobId || null, job_code: selectedJob?.code || null, client_name: clientName || null,
      notes: type === 'client'
        ? `Email: ${clientEmail}\nPhone: ${clientPhone}\nAddress: ${clientAddress}\nAgenda: ${agenda}`
        : notes,
      created_by: currentUser.username,
    }).select().single()

    if (error) { alert('Failed to save.'); setSaving(false); return }

    if (newBooking && type === 'internal') {
      try {
        const [y, m, d] = date.split('-').map(Number)
        const niceDate = new Date(y, m - 1, d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
        const attendeeSummary = selectedAttendees.length === 1
          ? selectedAttendees[0]
          : `${selectedAttendees.length} attendees`
        await supabase.from('notifications').insert({
          company_id: currentUser.company_id,
          type: 'new_meeting',
          message: `New staff meeting: ${title.trim()} on ${niceDate} at ${formatTime12(startTime)} (${attendeeSummary})`,
          is_read: false,
        })
      } catch (e) {
        // The in-app notification is optional; the meeting itself is already saved.
      }
    }

    if (newBooking) {
      for (const provider of ['google', 'outlook']) {
        try {
          const syncRes = await fetch(`${SUPABASE_URL}/functions/v1/calendar-${provider}?action=sync_booking`, {
            method: 'POST',
            headers: await fnHeaders(),
            body: JSON.stringify({ company_id: currentUser.company_id, username: currentUser.username, booking: newBooking }),
          })
          const sync = await syncRes.json().catch(() => ({}))
          if (sync?.error === 'reconnect') alert(`The meeting is saved in QPlan, but it could not be added to your ${provider === 'outlook' ? 'Outlook' : provider} calendar. ${(sync.message || '').replace('Settings > Microsoft 365', 'Calendar > Connect calendar') || 'Reconnect it from Calendar > Connect calendar.'}`)
        } catch { /* external calendar sync is optional */ }
      }
    }

    setSaving(false); onSave(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold">New Meeting</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex gap-2">
            {[{ id: 'client', label: 'Client meeting' }, { id: 'internal', label: 'Staff meeting' }].map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`flex-1 py-2 text-xs rounded-lg font-medium transition-colors ${type === t.id ? 'bg-emerald-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={type === 'client' ? 'e.g. Initial consultation' : 'e.g. Weekly team review'}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start time <span className="text-gray-500 font-normal">({formatTime12(startTime)})</span></label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                <option value={15}>15 min</option><option value={30}>30 min</option>
                <option value={45}>45 min</option><option value={60}>1 hour</option>
                <option value={90}>1.5 hrs</option><option value={120}>2 hours</option>
                <option value={150}>2.5 hrs</option><option value={180}>3 hours</option>
                <option value={210}>3.5 hrs</option><option value={240}>4 hours</option>
                <option value={270}>4.5 hrs</option><option value={300}>5 hours</option>
              </select>
            </div>
          </div>
          {type === 'client' && (
            <div className="space-y-3 border border-gray-100 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client details</div>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email address" type="email"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Phone number"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Address / site address"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              <textarea value={agenda} onChange={e => setAgenda(e.target.value)} placeholder="Agenda / meeting notes" rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link to job (optional)</label>
            <select value={jobId} onChange={e => setJobId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              <option value="">No job linked</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{jobTitle(j)}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Attendees</label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-emerald-600 hover:underline">Select all</button>
                <span className="text-gray-300">·</span>
                <button onClick={clearAll} className="text-xs text-gray-500 hover:underline">Clear</button>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
              {staffList.map(s => (
                <label key={s.username} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                  <input type="checkbox" checked={selectedAttendees.includes(s.username)}
                    onChange={() => toggleAttendee(s.username)} className="w-3.5 h-3.5 accent-emerald-600" />
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-700 flex-shrink-0">
                    {s.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium">{s.username}</span>
                  <span className="text-xs text-gray-500 capitalize ml-auto">{s.role}</span>
                </label>
              ))}
            </div>
          </div>
          {type === 'internal' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Meeting agenda or notes..." rows={3}
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

export default function Calendar({ currentUser, showConnectOnMount, onConnectShown }) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [staffList, setStaffList] = useState([])
  const [jobs, setJobs] = useState([])
  const [viewingAs, setViewingAs] = useState(currentUser.username)
  const [showNewMeeting, setShowNewMeeting] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [editingBooking, setEditingBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [outlookEvents, setOutlookEvents] = useState([])
  const [outlookNote, setOutlookNote] = useState('') // '', 'reconnect' or an error message
  const [refreshing, setRefreshing] = useState(false)
  const [slotH, setSlotH] = useState(SLOT_HEIGHT)
  const [outlookConnected, setOutlookConnected] = useState(null) // null until known
  const [hideConnectHint, setHideConnectHint] = useState(() => {
    try { return sessionStorage.getItem('qplan_hide_connect_hint') === '1' } catch { return false }
  })
  const gridRef = useRef(null)
  const topRef = useRef(null)
  const bookingsReqRef = useRef(0) // only the newest answer is used, so a slow one cannot overwrite a newer week
  const outlookReqRef = useRef(0)
  const refreshRef = useRef(null)
  const lastRefreshRef = useRef(0)
  const isDirector = currentUser.role === 'director'

  const weekDates = getWeekDates(currentWeek)

  useEffect(() => {
    if (showConnectOnMount) {
      setShowConnect(true)
      onConnectShown?.()
    }
  }, [showConnectOnMount])

  useEffect(() => {
    fetchBookings()
    fetchStaff()
    fetchJobs()
    fetchOutlook()
  }, [currentWeek, viewingAs])

  // Keeps the week up to date on its own: every minute while the calendar is on screen,
  // and straight away when you come back to the tab or reopen the app.
  const refresh = async () => {
    lastRefreshRef.current = Date.now()
    setRefreshing(true)
    await Promise.all([fetchBookings(true), fetchOutlook()])
    setRefreshing(false)
  }
  useEffect(() => { refreshRef.current = refresh })
  useEffect(() => {
    const auto = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRefreshRef.current < 10000) return
      refreshRef.current?.()
    }
    const timer = setInterval(auto, 60000)
    document.addEventListener('visibilitychange', auto)
    window.addEventListener('focus', auto)
    window.addEventListener('online', auto)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', auto)
      window.removeEventListener('focus', auto)
      window.removeEventListener('online', auto)
    }
  }, [])

  // Your own Outlook calendar, shown alongside QPlan meetings. Only ever your own:
  // when a director looks at someone else's week, their Outlook is not read.
  const fetchOutlook = async () => {
    const mine = (viewingAs || '').toLowerCase() === (currentUser.username || '').toLowerCase()
    const req = ++outlookReqRef.current
    if (!mine) { setOutlookEvents([]); setOutlookNote(''); return }
    try {
      const res = await callFunction('calendar-outlook', 'events', { start: toLocalISODate(weekDates[0]), end: toLocalISODate(weekDates[6]) })
      if (req !== outlookReqRef.current) return
      setOutlookConnected(res.connected !== false)
      setOutlookEvents(res.success ? (res.events || []) : [])
      setOutlookNote(res.success ? '' : (res.error || 'Could not read Outlook'))
    } catch {
      if (req !== outlookReqRef.current) return
      setOutlookEvents([]); setOutlookNote('Could not read Outlook')
    }
  }

  // quiet: a background update, so the list does not flash "Loading..."
  const fetchBookings = async (quiet = false) => {
    const req = ++bookingsReqRef.current
    if (quiet !== true) setLoading(true)
    const startDate = toLocalISODate(weekDates[0])
    const endDate = toLocalISODate(weekDates[6])
    const { data } = await supabase
      .from('bookings').select('*')
      .eq('company_id', currentUser.company_id)
      .gte('date', startDate).lte('date', endDate)
      .order('start_time', { ascending: true })
    if (req !== bookingsReqRef.current) return
    if (data) {
      const lc = (viewingAs || '').toLowerCase()
      setBookings(data.filter(b => {
        const attendees = (b.attendees || []).map(a => (a || '').toLowerCase())
        const createdBy = (b.created_by || '').toLowerCase()
        return attendees.includes(lc) || createdBy === lc
      }))
    }
    setLoading(false)
  }

  const fetchStaff = async () => {
    const { data } = await supabase.from('app_users').select('username, role')
      .eq('company_id', currentUser.company_id).eq('is_approved', true).not('is_platform_admin', 'is', true).order('username', { ascending: true })
    if (data) setStaffList(data)
  }

  const fetchJobs = async () => {
    const { data } = await supabase.from('jobs').select('id, code, name, address, client_type, client_company, client_first_name, client_last_name').order('created_at', { ascending: false })
    if (data) setJobs(data)
  }

  const goBack = () => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d) }
  const goForward = () => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d) }
  const goToday = () => setCurrentWeek(new Date())

  const outlookItems = outlookToItems(outlookEvents, weekDates, new Set(bookings.map(b => b.external_id).filter(Boolean)))

  const getBookingsForDayAndHour = (date, hour) => {
    const dateStr = toLocalISODate(date)
    return [...bookings, ...outlookItems].filter(b => {
      if (b.date !== dateStr) return false
      return parseInt(b.start_time?.split(':')[0] || '0') === hour
    })
  }

  const formatDateHeader = (date) => {
    const isToday = date.toDateString() === new Date().toDateString()
    return { day: DAYS[date.getDay()], num: date.getDate(), isToday }
  }

  const hours = Array.from({ length: 13 }, (_, i) => i + 7)

  // Hour rows are sized so 7am to 7pm fits in the window without scrolling
  useLayoutEffect(() => {
    const measure = () => {
      const el = gridRef.current
      if (!el) return
      const scroller = el.closest('.overflow-y-auto')
      const box = scroller ? scroller.getBoundingClientRect() : { bottom: window.innerHeight }
      const top = el.getBoundingClientRect().top + (scroller ? scroller.scrollTop : 0)
      const room = box.bottom - top - 22
      setSlotH(Math.max(MIN_SLOT_HEIGHT, Math.min(SLOT_HEIGHT, Math.floor(room / 13))))
    }
    measure()
    // The seasonal garland adds a row above the calendar when the theme is switched
    const onTheme = () => setTimeout(measure, 80)
    window.addEventListener('qplan:theme', onTheme)
    window.addEventListener('resize', measure)
    const watcher = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    if (watcher && topRef.current) watcher.observe(topRef.current)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('qplan:theme', onTheme); watcher?.disconnect() }
  }, [])

  const nowTime = new Date()
  const showConnectHint = outlookConnected === false && !hideConnectHint
    && (viewingAs || '').toLowerCase() === (currentUser.username || '').toLowerCase()

  return (
    <div>
      {showNewMeeting && (
        <NewMeetingModal onClose={() => setShowNewMeeting(false)} onSave={fetchBookings}
          currentUser={currentUser} staffList={staffList} jobs={jobs} defaultDate={selectedDate} />
      )}
      {showConnect && (
        <ConnectCalendarModal onClose={() => setShowConnect(false)} currentUser={currentUser} onConnectionChange={refresh} />
      )}
      {showDatePicker && (
        <DatePickerModal currentDate={currentWeek} onSelect={setCurrentWeek} onClose={() => setShowDatePicker(false)} />
      )}
      {selectedBooking && !editingBooking && (
        <MeetingSummaryModal booking={selectedBooking} jobs={jobs} onClose={() => setSelectedBooking(null)}
          onDelete={fetchBookings} onEdit={() => { setEditingBooking(selectedBooking); setSelectedBooking(null) }} />
      )}
      {editingBooking && (
        <EditMeetingModal booking={editingBooking} onClose={() => setEditingBooking(null)}
          onSave={() => { fetchBookings(); setEditingBooking(null) }} staffList={staffList} jobs={jobs} />
      )}

      <div ref={topRef} data-tour="calendar-tools">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 text-lg">‹</button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Today</button>
          <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 text-lg">›</button>
          <button onClick={refresh} disabled={refreshing} title="Refresh the calendar. It also updates itself every minute." aria-label="Refresh calendar"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-60">
            <IconRefresh size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-sm font-semibold">{formatWeekRange(weekDates)}</span>
            <button onClick={() => setShowDatePicker(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors" title="Jump to date">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                <line x1="1" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1.2"/>
                <line x1="4.5" y1="1" x2="4.5" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="9.5" y1="1" x2="9.5" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-400 flex-shrink-0" />
              <span className="text-xs text-gray-600">Client meeting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-purple-400 flex-shrink-0" />
              <span className="text-xs text-gray-600">Staff meeting</span>
            </div>
            {(outlookEvents.length > 0 || outlookNote) && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-400 flex-shrink-0" />
                <span className="text-xs text-gray-600">Outlook</span>
              </div>
            )}
          </div>
          {isDirector && (
            <select value={viewingAs} onChange={e => setViewingAs(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              {currentUser?.username && !staffList.some(s => s.username === currentUser.username) && (
                <option value={currentUser.username}>{currentUser.username} (you)</option>
              )}
              {staffList.map(s => <option key={s.username} value={s.username}>{s.username}</option>)}
            </select>
          )}
          <button onClick={() => setShowConnect(true)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
            Connect calendar
          </button>
          <button onClick={() => { setSelectedDate(null); setShowNewMeeting(true) }}
            className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
            + New meeting
          </button>
        </div>
      </div>
      {showConnectHint && (
        <div className="mb-3 flex items-center gap-2 flex-wrap bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-900">
          <span className="flex-1 min-w-[180px]">Connect your Outlook so your meetings show here, and QPlan meetings go into your Outlook.</span>
          <button onClick={() => connectMyCalendar(currentUser, null)} className="px-3 py-1 bg-blue-700 text-white rounded-md font-medium hover:opacity-90">Connect Outlook</button>
          <button onClick={() => { setHideConnectHint(true); try { sessionStorage.setItem('qplan_hide_connect_hint', '1') } catch { /* storage unavailable */ } }}
            className="px-2 py-1 text-blue-800 hover:underline">Not now</button>
        </div>
      )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="border-r border-gray-100" />
          {weekDates.map((date, i) => {
            const { day, num, isToday } = formatDateHeader(date)
            // Queensland public holidays, plus the Brisbane and Gold Coast show days
            const dateStr = toLocalISODate(date)
            const holiday = holidayName(dateStr, null) || holidayName(dateStr, 'Brisbane City Council') || holidayName(dateStr, 'City of Gold Coast')
            return (
              <div key={i} className={`text-center py-2 border-r border-gray-100 last:border-0 ${isToday ? 'bg-emerald-50' : holiday ? 'bg-red-50/60' : ''}`}>
                <div className="text-xs text-gray-500">{day}</div>
                <div className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-emerald-600' : holiday ? 'text-red-600' : 'text-gray-700'}`}>{num}</div>
                {holiday && <div className="text-[10px] leading-tight text-red-500 mt-0.5 px-1 truncate" title={`Public holiday: ${holiday}`}>{holiday}</div>}
              </div>
            )
          })}
        </div>

        <div ref={gridRef} data-testid="calendar-grid" data-tour="calendar-grid">
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-50 last:border-0" style={{ height: `${slotH}px` }}>
                <div className="border-r border-gray-100 px-2 pt-0.5 flex-shrink-0">
                  <span className="text-xs text-gray-500 leading-none">{formatTime(hour)}</span>
                </div>
                {weekDates.map((date, di) => {
                  const dateStr = toLocalISODate(date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  const dayBookings = getBookingsForDayAndHour(date, hour)
                  return (
                    <div key={di}
                      onClick={() => { setSelectedDate(dateStr); setShowNewMeeting(true) }}
                      className={`border-r border-gray-100 last:border-0 relative cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-emerald-50/20' : ''}`}>
                      {isToday && nowTime.getHours() === hour && (
                        <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" data-testid="now-line"
                          style={{ top: `${(nowTime.getMinutes() / 60) * slotH}px`, height: 0 }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-0.5" />
                          <span className="flex-1 h-px bg-red-500" />
                        </div>
                      )}
                      {dayBookings.map((b, bi) => {
                        const [, bM] = (b.start_time || '00:00').split(':').map(Number)
                        const topOffset = (bM / 60) * slotH
                        const heightPx = (b.duration_minutes / 60) * slotH
                        const minHeight = Math.max(heightPx - 2, 20)
                        const primaryLabel = b.client_name
                          ? `${b.client_name.split(' ')[0]} ${b.client_name.split(' ')[1]?.[0] || ''}.`
                          : b.title
                        const secondaryLabel = b.client_name ? b.title : null

                        return (
                          <div key={bi}
                            onClick={e => { e.stopPropagation(); setSelectedBooking(b) }}
                            title={`${b.client_name ? `${b.client_name}: ` : ''}${b.title} · ${b.allDay ? 'All day' : formatTime12(b.start_time)}`}
                            className={`absolute left-0.5 right-0.5 rounded-md border overflow-hidden z-10 cursor-pointer ${typeColors[b.type] || 'bg-gray-100 border-gray-200 text-gray-700'}`}
                            style={{ top: `${topOffset}px`, height: `${minHeight}px` }}>
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${b.type === 'client' ? 'bg-emerald-500' : b.outlook ? 'bg-blue-500' : 'bg-purple-500'}`} />
                            <div className="pl-2 pr-1 py-px h-full flex flex-col justify-start overflow-hidden">
                              <div className="text-xs font-semibold truncate leading-tight">{primaryLabel}</div>
                              {secondaryLabel && minHeight > 34 && (
                                <div className="text-xs truncate leading-tight opacity-80">{secondaryLabel}</div>
                              )}
                              {minHeight > 48 && (
                                <div className="text-xs opacity-60 truncate leading-tight mt-auto">
                                  {formatTime12(b.start_time)} · {formatDuration(b.duration_minutes)}
                                </div>
                              )}
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

      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          This week: {viewingAs}
        </div>
        {outlookNote === 'reconnect' && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            Outlook has signed this calendar out, so your Outlook meetings are not showing.{' '}
            <button onClick={() => connectMyCalendar(currentUser, null)} className="underline font-medium">Reconnect Outlook</button>
          </div>
        )}
        {outlookNote && outlookNote !== 'reconnect' && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            Your Outlook meetings could not be loaded: {outlookNote}
          </div>
        )}
        {outlookItems.length > 0 && (
          <div className="mb-3 text-xs text-gray-600">
            {outlookItems.length} from your Outlook calendar this week, shown in blue. Click one for a summary.
          </div>
        )}
        {loading ? (
          <div className="text-xs text-gray-500 text-center py-4">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">No meetings this week.</div>
        ) : bookings.map((b, i) => {
          const [by, bm, bd] = (b.date || '').split('-').map(Number)
          const bookingDate = by ? new Date(by, bm - 1, bd) : null
          return (
            <div key={i} onClick={() => setSelectedBooking(b)}
              className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.type === 'client' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {b.client_name ? `${b.client_name}: ${b.title}` : b.title}
                </div>
                <div className="text-xs text-gray-500">
                  {bookingDate && bookingDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime12(b.start_time)} · {formatDuration(b.duration_minutes)}
                  {b.attendees?.length > 1 && ` · ${b.attendees.length} attendees`}
                  {b.external_source && ` · via ${b.external_source}`}
                </div>
              </div>
              {b.job_code && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{b.job_code}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.type === 'client' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                {b.type === 'client' ? 'Client' : 'Internal'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}