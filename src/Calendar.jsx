import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const SUPABASE_URL = 'https://sltaaiumviyzgdsdkkbe.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdGFhaXVtdml5emdkc2Rra2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTYyNTMsImV4cCI6MjA5MDQ5MjI1M30.xqWqvx8vdofj119nXDpasQ8xVD67YJU0RrjTrxycTGo'

const typeColors = {
  client: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  internal: 'bg-purple-100 border-purple-300 text-purple-800',
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

function formatDuration(mins) {
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}hr` : `${h}hr ${m}min`
}

function formatDateFull(dateStr) {
  // Parse YYYY-MM-DD as a LOCAL date to avoid timezone shift
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

const SLOT_HEIGHT = 64

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
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">‹</button>
          <div className="text-sm font-semibold">{MONTHS[viewMonth]} {viewYear}</div>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">›</button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-xs text-gray-400 py-1 font-medium">{d}</div>
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
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
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

  const handleConnectOutlook = () => {
    const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID
    if (!clientId) { alert('Outlook not configured yet.'); return }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'https://planflow-beige.vercel.app',
      response_type: 'code',
      scope: 'Calendars.ReadWrite offline_access',
      prompt: 'select_account',
      state: btoa(JSON.stringify({ provider: 'outlook', company_id: currentUser.company_id, username: currentUser.username })),
    })
    window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  }

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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="text-xs text-gray-400 mb-2">Connect your calendar so meetings created in QPlan sync automatically — and bookings from your external calendar appear here.</div>
          {loading ? (
            <div className="text-xs text-gray-400 text-center py-4">Checking connections...</div>
          ) : providers.map(p => (
            <div key={p.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${p.color} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>{p.letter}</div>
                  <div>
                    <div className="text-xs font-semibold">{p.label}</div>
                    <div className="text-xs text-gray-400">
                      {connections[p.id] ? (
                        <span className="text-emerald-600">● Connected — {connections[p.id]}</span>
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
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
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client details</div>
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
              {jobs.map(j => <option key={j.id} value={j.id}>{j.code} — {j.name}</option>)}
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
                  <span className="text-xs text-gray-400 capitalize ml-auto">{s.role}</span>
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

function MeetingReviewModal({ booking, onClose, onDelete, onEdit }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm('Delete this meeting?')) return
    setDeleting(true)
    await supabase.from('bookings').delete().eq('id', booking.id)
    setDeleting(false); onDelete(); onClose()
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
        <div className={`px-6 py-4 rounded-t-2xl ${booking.type === 'client' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-purple-50 border-b border-purple-100'}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${booking.type === 'client' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                {booking.type === 'client' ? 'Client meeting' : 'Staff meeting'}
              </span>
              <div className="text-sm font-semibold text-gray-800 mt-1">{booking.title}</div>
              {booking.client_name && <div className="text-xs text-gray-500 mt-0.5">with {booking.client_name}</div>}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-3 flex-shrink-0">✕</button>
          </div>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-gray-400 mt-0.5">📅</span>
            <div>
              <div className="text-xs font-medium text-gray-700">{formatDateFull(booking.date)}</div>
              <div className="text-xs text-gray-500">{booking.start_time?.slice(0, 5)} · {formatDuration(booking.duration_minutes)}</div>
            </div>
          </div>
          {booking.attendees?.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">👥</span>
              <div className="text-xs text-gray-700">{booking.attendees.join(', ')}</div>
            </div>
          )}
          {booking.job_code && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">📁</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{booking.job_code}</span>
            </div>
          )}
          {booking.external_source && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">🔗</span>
              <span className="text-xs text-gray-500 capitalize">Synced from {booking.external_source}</span>
            </div>
          )}
          {booking.type === 'client' && (booking.client_name || clientEmail || clientPhone || clientAddress || agenda) && (
            <div className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client details</div>
              {booking.client_name && <div className="flex justify-between text-xs"><span className="text-gray-400">Name</span><span className="font-medium text-gray-700">{booking.client_name}</span></div>}
              {clientEmail && <div className="flex justify-between text-xs"><span className="text-gray-400">Email</span><span className="font-medium text-gray-700">{clientEmail}</span></div>}
              {clientPhone && <div className="flex justify-between text-xs"><span className="text-gray-400">Phone</span><span className="font-medium text-gray-700">{clientPhone}</span></div>}
              {clientAddress && <div className="flex justify-between text-xs"><span className="text-gray-400">Address</span><span className="font-medium text-gray-700 text-right max-w-[200px]">{clientAddress}</span></div>}
              {agenda && <div className="pt-1 border-t border-gray-50"><div className="text-xs text-gray-400 mb-1">Agenda</div><div className="text-xs text-gray-700">{agenda}</div></div>}
            </div>
          )}
          {booking.type === 'internal' && booking.notes && (
            <div className="border border-gray-100 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</div>
              <div className="text-xs text-gray-700">{booking.notes}</div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button onClick={onEdit} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Edit</button>
          <button onClick={onClose} className="flex-1 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Close</button>
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

    // Notify on new staff meeting
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
          message: `New staff meeting: ${title.trim()} on ${niceDate} at ${startTime} (${attendeeSummary})`,
          is_read: false,
        })
      } catch (e) {
        console.log('Could not create meeting notification:', e)
      }
    }

    if (newBooking) {
      for (const provider of ['google', 'outlook']) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/calendar-${provider}?action=sync_booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
            body: JSON.stringify({ company_id: currentUser.company_id, username: currentUser.username, booking: newBooking }),
          })
        } catch (e) { console.log(`${provider} sync skipped`) }
      }
    }

    setSaving(false); onSave(); onClose()
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
              placeholder={type === 'client' ? 'e.g. Initial consultation' : 'e.g. Weekly team review'}
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
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client details</div>
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
                    onChange={() => toggleAttendee(s.username)} className="w-3.5 h-3.5 accent-emerald-600" />
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
  }, [currentWeek, viewingAs])

  const fetchBookings = async () => {
    setLoading(true)
    const startDate = toLocalISODate(weekDates[0])
    const endDate = toLocalISODate(weekDates[6])
    const { data } = await supabase
      .from('bookings').select('*')
      .eq('company_id', currentUser.company_id)
      .gte('date', startDate).lte('date', endDate)
      .order('start_time', { ascending: true })
    if (data) {
      setBookings(data.filter(b => b.attendees?.includes(viewingAs) || b.created_by === viewingAs))
    }
    setLoading(false)
  }

  const fetchStaff = async () => {
    const { data } = await supabase.from('app_users').select('username, role')
      .eq('company_id', currentUser.company_id).eq('is_approved', true).order('username', { ascending: true })
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
    const dateStr = toLocalISODate(date)
    return bookings.filter(b => {
      if (b.date !== dateStr) return false
      return parseInt(b.start_time?.split(':')[0] || '0') === hour
    })
  }

  const formatDateHeader = (date) => {
    const isToday = date.toDateString() === new Date().toDateString()
    return { day: DAYS[date.getDay()], num: date.getDate(), isToday }
  }

  const hours = Array.from({ length: 13 }, (_, i) => i + 7)

  return (
    <div>
      {showNewMeeting && (
        <NewMeetingModal onClose={() => setShowNewMeeting(false)} onSave={fetchBookings}
          currentUser={currentUser} staffList={staffList} jobs={jobs} defaultDate={selectedDate} />
      )}
      {showConnect && (
        <ConnectCalendarModal onClose={() => setShowConnect(false)} currentUser={currentUser} onConnectionChange={fetchBookings} />
      )}
      {showDatePicker && (
        <DatePickerModal currentDate={currentWeek} onSelect={setCurrentWeek} onClose={() => setShowDatePicker(false)} />
      )}
      {selectedBooking && !editingBooking && (
        <MeetingReviewModal booking={selectedBooking} onClose={() => setSelectedBooking(null)}
          onDelete={fetchBookings} onEdit={() => { setEditingBooking(selectedBooking); setSelectedBooking(null) }} />
      )}
      {editingBooking && (
        <EditMeetingModal booking={editingBooking} onClose={() => setEditingBooking(null)}
          onSave={() => { fetchBookings(); setEditingBooking(null) }} staffList={staffList} jobs={jobs} />
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg">‹</button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Today</button>
          <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg">›</button>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-sm font-semibold">{formatWeekRange(weekDates)}</span>
            <button onClick={() => setShowDatePicker(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Jump to date">
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
              {staffList.map(s => <option key={s.username} value={s.username}>{s.username}</option>)}
            </select>
          )}
          <button onClick={() => setShowConnect(true)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
            🔗 Connect calendar
          </button>
          <button onClick={() => { setSelectedDate(null); setShowNewMeeting(true) }}
            className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
            + New meeting
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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

        <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-50 last:border-0" style={{ height: `${SLOT_HEIGHT}px` }}>
                <div className="border-r border-gray-100 px-2 pt-1 flex-shrink-0">
                  <span className="text-xs text-gray-400">{formatTime(hour)}</span>
                </div>
                {weekDates.map((date, di) => {
                  const dateStr = toLocalISODate(date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  const dayBookings = getBookingsForDayAndHour(date, hour)
                  return (
                    <div key={di}
                      onClick={() => { setSelectedDate(dateStr); setShowNewMeeting(true) }}
                      className={`border-r border-gray-100 last:border-0 relative cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-emerald-50/20' : ''}`}>
                      {dayBookings.map((b, bi) => {
                        const [, bM] = (b.start_time || '00:00').split(':').map(Number)
                        const topOffset = (bM / 60) * SLOT_HEIGHT
                        const heightPx = (b.duration_minutes / 60) * SLOT_HEIGHT
                        const minHeight = Math.max(heightPx - 2, 24)
                        const primaryLabel = b.client_name
                          ? `${b.client_name.split(' ')[0]} ${b.client_name.split(' ')[1]?.[0] || ''}.`
                          : b.title
                        const secondaryLabel = b.client_name ? b.title : null

                        return (
                          <div key={bi}
                            onClick={e => { e.stopPropagation(); setSelectedBooking(b) }}
                            className={`absolute left-0.5 right-0.5 rounded-md border overflow-hidden z-10 cursor-pointer ${typeColors[b.type] || 'bg-gray-100 border-gray-200 text-gray-700'}`}
                            style={{ top: `${topOffset}px`, height: `${minHeight}px` }}>
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${b.type === 'client' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                            <div className="pl-2 pr-1 pt-0.5 pb-0.5 h-full flex flex-col justify-start overflow-hidden">
                              <div className="text-xs font-semibold truncate leading-tight">{primaryLabel}</div>
                              {secondaryLabel && minHeight > 34 && (
                                <div className="text-xs truncate leading-tight opacity-80">{secondaryLabel}</div>
                              )}
                              {minHeight > 48 && (
                                <div className="text-xs opacity-60 truncate leading-tight mt-auto">
                                  {b.start_time?.slice(0, 5)} · {formatDuration(b.duration_minutes)}
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
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          This week — {viewingAs}
        </div>
        {loading ? (
          <div className="text-xs text-gray-400 text-center py-4">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">No meetings this week.</div>
        ) : bookings.map((b, i) => {
          const [by, bm, bd] = (b.date || '').split('-').map(Number)
          const bookingDate = by ? new Date(by, bm - 1, bd) : null
          return (
            <div key={i} onClick={() => setSelectedBooking(b)}
              className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.type === 'client' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {b.client_name ? `${b.client_name} — ${b.title}` : b.title}
                </div>
                <div className="text-xs text-gray-400">
                  {bookingDate && bookingDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · {b.start_time?.slice(0, 5)} · {formatDuration(b.duration_minutes)}
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