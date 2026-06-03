import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const typeColors = {
  client: 'bg-blue-100 text-blue-700',
  internal: 'bg-purple-100 text-purple-700',
}

export default function Bookings({ onNavigate, currentUser }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [viewingAs, setViewingAs] = useState(currentUser?.username || '')
  const [staffList, setStaffList] = useState([])
  const isDirector = currentUser?.role === 'director'

  useEffect(() => {
    fetchBookings()
    if (isDirector) fetchStaff()
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

  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter(b => b.date >= today)
  const past = bookings.filter(b => b.date < today)
  const clientBookings = bookings.filter(b => b.type === 'client')
  const internalMeetings = bookings.filter(b => b.type === 'internal')

  return (
    <div>
      {/* Director dropdown */}
      {isDirector && (
        <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border border-gray-200 p-3">
          <div className="text-xs font-medium text-gray-500">Viewing:</div>
          <select value={viewingAs} onChange={e => setViewingAs(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
            {staffList.map(s => (
              <option key={s.username} value={s.username}>{s.username} {s.role === 'director' ? '(Director)' : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {['upcoming', 'client bookings', 'internal meetings', 'past'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Loading bookings...</div>
      ) : (
        <>
          {activeTab === 'upcoming' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Upcoming — {viewingAs}</div>
              {upcoming.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8">No upcoming meetings.</div>
              ) : upcoming.map((b, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.type === 'client' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{b.title}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(b.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · {b.start_time?.slice(0, 5)} · {b.duration_minutes}min
                    </div>
                  </div>
                  {b.job_code && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{b.job_code}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[b.type] || 'bg-gray-100 text-gray-500'}`}>
                    {b.type === 'client' ? 'Client' : 'Internal'}
                  </span>
                  <button onClick={() => onNavigate('calendly')} className="text-xs text-gray-400 hover:text-gray-600">→</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'client bookings' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client bookings</div>
              {clientBookings.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8">No client bookings.</div>
              ) : clientBookings.map((b, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{b.title}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(b.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · {b.start_time?.slice(0, 5)} · {b.client_name || '—'}
                    </div>
                  </div>
                  {b.job_code ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Linked: {b.job_code}</span>
                  ) : (
                    <button onClick={() => onNavigate('newjob')} className="px-2 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">→ Create job</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'internal meetings' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Internal meetings</div>
              {internalMeetings.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8">No internal meetings.</div>
              ) : internalMeetings.map((b, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{b.title}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(b.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · {b.start_time?.slice(0, 5)}
                      {b.attendees?.length > 0 && ` · ${b.attendees.join(', ')}`}
                    </div>
                  </div>
                  {b.job_code && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{b.job_code}</span>}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'past' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Past meetings</div>
              {past.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8">No past meetings.</div>
              ) : past.reverse().map((b, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 opacity-60">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.type === 'client' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{b.title}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(b.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} · {b.start_time?.slice(0, 5)}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[b.type] || 'bg-gray-100 text-gray-500'}`}>
                    {b.type === 'client' ? 'Client' : 'Internal'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}