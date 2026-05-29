import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

const AVATAR_COLORS = [
  { hex: '#059669', label: 'Green', tailwind: 'bg-emerald-100 text-emerald-700' },
  { hex: '#0284c7', label: 'Blue', tailwind: 'bg-blue-100 text-blue-700' },
  { hex: '#7c3aed', label: 'Purple', tailwind: 'bg-violet-100 text-violet-700' },
  { hex: '#db2777', label: 'Pink', tailwind: 'bg-pink-100 text-pink-700' },
  { hex: '#d97706', label: 'Amber', tailwind: 'bg-amber-100 text-amber-700' },
  { hex: '#dc2626', label: 'Red', tailwind: 'bg-red-100 text-red-700' },
  { hex: '#65a30d', label: 'Lime', tailwind: 'bg-lime-100 text-lime-700' },
  { hex: '#0891b2', label: 'Cyan', tailwind: 'bg-cyan-100 text-cyan-700' },
  { hex: '#9333ea', label: 'Violet', tailwind: 'bg-purple-100 text-purple-700' },
  { hex: '#ea580c', label: 'Orange', tailwind: 'bg-orange-100 text-orange-700' },
]

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getColorStyle(hexColor) {
  const found = AVATAR_COLORS.find(c => c.hex === hexColor)
  return found ? found.tailwind : 'bg-emerald-100 text-emerald-700'
}

function Avatar({ profile, username, size = 'md' }) {
  const sizes = { sm: 'w-9 h-9 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-lg' }
  const sizeClass = sizes[size]
  const name = profile?.full_name || username || ''
  const colorStyle = getColorStyle(profile?.avatar_color)

  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={name} className={`${sizeClass} rounded-full object-cover flex-shrink-0`} />
  }

  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${colorStyle}`}>
      {getInitials(name)}
    </div>
  )
}

function EditProfileModal({ staffUser, profile, currentUser, onSave, onClose }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || staffUser?.username || '',
    position: profile?.position || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    hourly_rate: profile?.hourly_rate || '',
    specialisation: profile?.specialisation || '',
    calendly: profile?.calendly || '',
    sign_off_name: profile?.sign_off_name || '',
    sign_off_position: profile?.sign_off_position || '',
    avatar_color: profile?.avatar_color || '#059669',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const fileRef = useRef(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${staffUser.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl + '?t=' + Date.now())
    }
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      user_id: staffUser.id,
      company_id: currentUser.company_id,
      full_name: form.full_name,
      position: form.position,
      email: form.email,
      phone: form.phone,
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      specialisation: form.specialisation,
      calendly: form.calendly,
      sign_off_name: form.sign_off_name || form.full_name,
      sign_off_position: form.sign_off_position || form.position,
      avatar_color: form.avatar_color,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('planner_profiles')
      .select('id')
      .eq('user_id', staffUser.id)
      .single()

    if (existing) {
      await supabase.from('planner_profiles').update(payload).eq('user_id', staffUser.id)
    } else {
      await supabase.from('planner_profiles').insert(payload)
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold">Edit profile</div>
            <div className="text-xs text-gray-400 mt-0.5">{staffUser?.username}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">

          {/* Avatar */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Profile picture</div>
            <div className="flex items-center gap-4">
              <Avatar profile={{ ...form, avatar_url: avatarUrl }} username={staffUser?.username} size="lg" />
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                <div className="flex gap-2 mb-3">
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    {uploading ? 'Uploading...' : '↑ Upload photo'}
                  </button>
                  {avatarUrl && (
                    <button onClick={() => setAvatarUrl(null)}
                      className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                      Remove
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-400 mb-2">Or pick a colour:</div>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map(c => (
                    <button key={c.hex} onClick={() => set('avatar_color', c.hex)}
                      className={`w-7 h-7 rounded-full transition-all ${form.avatar_color === c.hex ? 'scale-125 ring-2 ring-offset-1 ring-gray-500' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c.hex }} title={c.label} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Personal info */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal info</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Full name</label>
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="Sarah Barnes"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Position / title</label>
                <select value={form.position} onChange={e => set('position', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option value="">Select position...</option>
                  <option>Principal Planner</option>
                  <option>Senior Planner</option>
                  <option>Associate Planner</option>
                  <option>Graduate Planner</option>
                  <option>Director</option>
                  <option>Urban Planner</option>
                  <option>Town Planner</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="sarah@hpcplanning.com.au"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="04XX XXX XXX"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Specialisation</label>
                <input value={form.specialisation} onChange={e => set('specialisation', e.target.value)}
                  placeholder="MCU, RAA, Impact assessable"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Calendly link</label>
                <input value={form.calendly} onChange={e => set('calendly', e.target.value)}
                  placeholder="calendly.com/yourname"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
          </div>

          {/* Rate */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Billing</div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hourly rate ($/hr excl. GST)</label>
              <input type="number" value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)}
                placeholder="185"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
            </div>
          </div>

          {/* Document sign-off */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Document sign-off</div>
            <div className="text-xs text-gray-400 mb-3">How your name appears on letters, reports and quotes — fill this in once and it autofills every document.</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sign-off name</label>
                <input value={form.sign_off_name} onChange={e => set('sign_off_name', e.target.value)}
                  placeholder="Sarah Barnes"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sign-off position</label>
                <input value={form.sign_off_position} onChange={e => set('sign_off_position', e.target.value)}
                  placeholder="Urban Planner"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Planners({ currentUser }) {
  const [staffList, setStaffList] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editingStaff, setEditingStaff] = useState(null)
  const isDirector = currentUser?.role === 'director'

  useEffect(() => {
    if (!currentUser?.company_id) return
    fetchAll()
  }, [currentUser])

  const fetchAll = async () => {
    setLoading(true)
    const { data: staff } = await supabase
      .from('app_users')
      .select('id, username, role')
      .eq('company_id', currentUser.company_id)
      .eq('is_approved', true)
      .order('username', { ascending: true })

    if (staff) setStaffList(staff)

    const { data: profileData } = await supabase
      .from('planner_profiles')
      .select('*')
      .eq('company_id', currentUser.company_id)

    if (profileData) {
      const map = {}
      profileData.forEach(p => { map[p.user_id] = p })
      setProfiles(map)
    }

    setLoading(false)
  }

  const canEdit = (staffId) => isDirector || staffId === currentUser.id

  if (loading) return (
    <div className="text-sm text-gray-400 text-center py-12">Loading planners...</div>
  )

  return (
    <div>
      {editingStaff && (
        <EditProfileModal
          staffUser={editingStaff}
          profile={profiles[editingStaff.id]}
          currentUser={currentUser}
          onSave={() => { fetchAll(); setEditingStaff(null); setSelected(null) }}
          onClose={() => setEditingStaff(null)}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-gray-400">{staffList.length} planner{staffList.length !== 1 ? 's' : ''} in the team</div>
        <button
          onClick={() => setEditingStaff(staffList.find(s => s.id === currentUser.id))}
          className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Edit my profile
        </button>
      </div>

      {/* Planner grid */}
      <div className="grid grid-cols-3 gap-3">
        {staffList.map(staff => {
          const profile = profiles[staff.id]
          const name = profile?.full_name || staff.username
          const colorStyle = getColorStyle(profile?.avatar_color)
          const isMe = staff.id === currentUser.id

          return (
            <div
              key={staff.id}
              onClick={() => setSelected(selected?.id === staff.id ? null : staff)}
              className={`bg-white rounded-xl border cursor-pointer transition-all p-4 ${selected?.id === staff.id ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Avatar profile={profile} username={staff.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-xs font-semibold truncate">{name}</div>
                    {isMe && <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex-shrink-0">You</span>}
                  </div>
                  <div className="text-xs text-gray-400">{profile?.position || staff.role}</div>
                </div>
              </div>
              {profile?.specialisation && (
                <div className="text-xs text-gray-400 mb-2 truncate">{profile.specialisation}</div>
              )}
              {!profile && (
                <div className="text-xs text-gray-300 italic mb-2">Profile not set up yet</div>
              )}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '0%' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>—</span>
                <span>{staff.role}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected planner detail panel */}
      {selected && (() => {
        const profile = profiles[selected.id]
        const name = profile?.full_name || selected.username
        return (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <Avatar profile={profile} username={selected.username} size="md" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">{name}</div>
                  {selected.id === currentUser.id && (
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">You</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {profile?.position || selected.role}
                  {profile?.hourly_rate > 0 ? ` · $${profile.hourly_rate}/hr` : ''}
                </div>
              </div>
              <div className="flex gap-2">
                {canEdit(selected.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingStaff(selected) }}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Edit profile
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2">✕</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                ['Specialisation', profile?.specialisation || '—'],
                ['Email', profile?.email || '—'],
                ['Phone', profile?.phone || '—'],
                ['Hourly rate', profile?.hourly_rate ? `$${profile.hourly_rate}/hr` : '—'],
                ['Sign-off name', profile?.sign_off_name || name],
                ['Sign-off position', profile?.sign_off_position || profile?.position || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs text-gray-400 mb-0.5">{k}</div>
                  <div className="text-xs font-medium">{v}</div>
                </div>
              ))}
              {profile?.calendly && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Calendly</div>
                  <div className="text-xs font-medium text-emerald-600">{profile.calendly}</div>
                </div>
              )}
            </div>

            {!profile && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                {selected.id === currentUser.id
                  ? 'Your profile isn\'t set up yet. Click "Edit profile" to get started — it only takes a minute and will autofill all your documents.'
                  : `${selected.username} hasn't set up their profile yet.`}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}