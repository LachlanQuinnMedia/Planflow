import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const typeColors = {
  client: 'bg-blue-100 text-blue-700',
  internal: 'bg-purple-100 text-purple-700',
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

function formatDateShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

// ── STAFF VIEW — simple clean list ─────────────────────────────
function StaffBookings({ bookings, loading, onNavigate }) {
  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter(b => b.date >= today)
  const past = bookings.filter(b => b.date < today).reverse()

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-4">
      {/* Upcoming */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming meetings</div>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">No upcoming meetings.</div>
        ) : upcoming.map((b, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
            {/* Date block */}
            <div className="w-10 text-center flex-shrink-0">
              <div className="text-xs text-gray-400">{new Date(b.date).toLocaleDateString('en-AU', { month: 'short' })}</div>
              <div className="text-lg font-bold text-gray-700 leading-none">{new Date(b.date).getDate()}</div>
            </div>
            <div className={`w-0.5 h-8 rounded-full flex-shrink-0 ${b.type === 'client' ? 'bg-blue-400' : 'bg-purple-400'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-800 truncate">{b.title}</div>
              <div className="text-xs text-gray-400">
                {b.start_time?.slice(0, 5)} · {b.duration_minutes}min
                {b.client_name && ` · ${b.client_name}`}
                {b.attendees?.length > 1 && ` · ${b.attendees.length} attendees`}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {b.job_code && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{b.job_code}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[b.type] || 'bg-gray-100 text-gray-500'}`}>
                {b.type === 'client' ? 'Client' : 'Internal'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Past meetings</div>
          </div>
          {past.map((b, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 opacity-50">
              <div className="w-10 text-center flex-shrink-0">
                <div className="text-xs text-gray-400">{new Date(b.date).toLocaleDateString('en-AU', { month: 'short' })}</div>
                <div className="text-lg font-bold text-gray-500 leading-none">{new Date(b.date).getDate()}</div>
              </div>
              <div className={`w-0.5 h-8 rounded-full flex-shrink-0 ${b.type === 'client' ? 'bg-blue-300' : 'bg-purple-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-600 truncate">{b.title}</div>
                <div className="text-xs text-gray-400">
                  {formatDateShort(b.date)} · {b.start_time?.slice(0, 5)} · {b.duration_minutes}min
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[b.type] || 'bg-gray-100 text-gray-500'}`}>
                {b.type === 'client' ? 'Client' : 'Internal'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── DIRECTOR VIEW — full tabbed view with staff dropdown ────────
function DirectorBookings({ currentUser, onNavigate }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [viewingAs, setViewingAs] = useState(currentUser?.username || '')
  const [staffList, setStaffList] = useState([])

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [viewingAs])

  const fetchBookings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    if (data) {
      setBookings(viewingAs === '__all__'
        ? data
        : data.filter(b => b.attendees?.includes(viewingAs) || b.created_by === viewingAs)
      )
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

  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter(b => b.date >= today)
  const past = bookings.filter(b => b.date < today).reverse()
  const clientBookings = bookings.filter(b => b.type === 'client')
  const internalMeetings = bookings.filter(b => b.type === 'internal')

  const tabs = ['upcoming', 'client', 'internal', 'past']

  const BookingRow = ({ b, showAttendees = false, faded = false }) => (
    <div className={`flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 ${faded ? 'opacity-60' : ''}`}>
      <div className="w-10 text-center flex-shrink-0">
        <div className="text-xs text-gray-400">{new Date(b.date).toLocaleDateString('en-AU', { month: 'short' })}</div>
        <div className={`text-lg font-bold leading-none ${faded ? 'text-gray-400' : 'text-gray-700'}`}>{new Date(b.date).getDate()}</div>
      </div>
      <div className={`w-0.5 h-8 rounded-full flex-shrink-0 ${b.type === 'client' ? (faded ? 'bg-blue-200' : 'bg-blue-400') : (faded ? 'bg-purple-200' : 'bg-purple-400')}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-gray-800 truncate">{b.title}</div>
        <div className="text-xs text-gray-400">
          {faded ? formatDateShort(b.date) : formatDate(b.date)} · {b.start_time?.slice(0, 5)} · {b.duration_minutes}min
          {b.client_name && ` · ${b.client_name}`}
          {showAttendees && b.attendees?.length > 0 && ` · ${b.attendees.join(', ')}`}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {b.job_code && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{b.job_code}</span>
        )}
        {b.type === 'client' && !b.job_code && !faded && (
          <button onClick={() => onNavigate('newjob')}
            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            → Job
          </button>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[b.type] || 'bg-gray-100 text-gray-500'}`}>
          {b.type === 'client' ? 'Client' : 'Internal'}
        </span>
      </div>
    </div>
  )

  return (
    <div>
      {/* Director controls */}
      <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border border-gray-200 p-3">
        <div className="text-xs font-medium text-gray-500">Viewing:</div>
        <select value={viewingAs} onChange={e => setViewingAs(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
          <option value="__all__">All staff</option>
          {staffList.map(s => (
            <option key={s.username} value={s.username}>
              {s.username} {s.role === 'director' ? '(Director)' : ''}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-3 text-xs text-gray-400">
          <span>{upcoming.length} upcoming</span>
          <span>·</span>
          <span>{clientBookings.length} client</span>
          <span>·</span>
          <span>{internalMeetings.length} internal</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab}
            {tab === 'upcoming' && upcoming.length > 0 && (
              <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{upcoming.length}</span>
            )}
            {tab === 'client' && clientBookings.length > 0 && (
              <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{clientBookings.length}</span>
            )}
            {tab === 'internal' && internalMeetings.length > 0 && (
              <span className="ml-1.5 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{internalMeetings.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Loading bookings...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {activeTab === 'upcoming' && (
            <>
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Upcoming — {viewingAs === '__all__' ? 'All staff' : viewingAs}
                </div>
              </div>
              {upcoming.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">No upcoming meetings.</div>
              ) : (
                <div className="px-4">
                  {upcoming.map((b, i) => <BookingRow key={i} b={b} showAttendees={viewingAs === '__all__'} />)}
                </div>
              )}
            </>
          )}

          {activeTab === 'client' && (
            <>
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client bookings</div>
              </div>
              {clientBookings.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">No client bookings.</div>
              ) : (
                <div className="px-4">
                  {clientBookings.map((b, i) => <BookingRow key={i} b={b} />)}
                </div>
              )}
            </>
          )}

          {activeTab === 'internal' && (
            <>
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Internal meetings</div>
              </div>
              {internalMeetings.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">No internal meetings.</div>
              ) : (
                <div className="px-4">
                  {internalMeetings.map((b, i) => <BookingRow key={i} b={b} showAttendees />)}
                </div>
              )}
            </>
          )}

          {activeTab === 'past' && (
            <>
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Past meetings</div>
              </div>
              {past.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">No past meetings.</div>
              ) : (
                <div className="px-4">
                  {past.map((b, i) => <BookingRow key={i} b={b} faded showAttendees={viewingAs === '__all__'} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── MAIN EXPORT ─────────────────────────────────────────────────
export default function Bookings({ onNavigate, currentUser }) {
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const isDirector = currentUser?.role === 'director'

  useEffect(() => {
    if (!isDirector) fetchMyBookings()
  }, [])

  const fetchMyBookings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    if (data) {
      setMyBookings(data.filter(b =>
        b.attendees?.includes(currentUser.username) || b.created_by === currentUser.username
      ))
    }
    setLoading(false)
  }

  if (isDirector) {
    return <DirectorBookings currentUser={currentUser} onNavigate={onNavigate} />
  }

  return <StaffBookings bookings={myBookings} loading={loading} onNavigate={onNavigate} />
}