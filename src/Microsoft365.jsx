// src/Microsoft365.jsx
// Settings > Microsoft 365. The one place the firm connects Microsoft 365:
//   Step 1  Approve QPlan for the firm (Microsoft 365 admin, once)
//   Step 2  Connect the firm's OneDrive or SharePoint (director, once) and pick the jobs folder
//   Step 3  Connect my Outlook calendar (each person, once)
import { useState, useEffect } from 'react'
import { notify } from './notify'
import { supabase, callFunction } from './supabase'
import { callGraph, OneDriveFolderPicker } from './OneDriveBrowser'
import { adminConsentUrl, startAdminConsent, connectFirmDrive, connectMyCalendar, isPersonalMicrosoftEmail } from './microsoft'


async function callCalendar(action, payload) {
  return callFunction('calendar-outlook', action, payload)
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', year: 'numeric' })
}

function StepCard({ number, title, done, warn, children }) {
  const badge = done
    ? 'bg-emerald-100 text-emerald-700'
    : warn ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
  return (
    <div className={`bg-white rounded-xl border p-5 ${warn ? 'border-amber-300' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${badge}`}>
          {done ? '✓' : warn ? '!' : number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-800 mb-1">{title}</div>
          {children}
        </div>
      </div>
    </div>
  )
}

function Button({ onClick, children, tone = 'blue', disabled }) {
  const tones = {
    blue: 'bg-blue-700 text-white hover:bg-blue-800',
    outline: 'border border-gray-200 text-gray-600 hover:bg-gray-50',
    red: 'border border-red-100 text-red-500 hover:bg-red-50',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-1.5 text-xs rounded-lg font-medium disabled:opacity-50 ${tones[tone]}`}>
      {children}
    </button>
  )
}

export default function Microsoft365({ currentUser, notice, onNoticeShown }) {
  const isDirector = currentUser?.role === 'director'
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [drive, setDrive] = useState({ connected: false })
  const [myCalendar, setMyCalendar] = useState({ connected: false })
  const [team, setTeam] = useState([])
  const [teamCalendars, setTeamCalendars] = useState([])
  const [picker, setPicker] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(notice || null)

  useEffect(() => {
    if (notice) { setMessage(notice); onNoticeShown?.() }
  }, [notice])

  const load = async () => {
    setLoading(true)
    const companyId = currentUser.company_id
    const [companyRes, driveRes, calRes] = await Promise.all([
      supabase.from('companies').select('name, ms_tenant_id, ms_admin_consent_at, ms_admin_consent_by, ms_consent_nonce').eq('id', companyId).maybeSingle(),
      callGraph('status', { company_id: companyId }).catch(() => ({ connected: false })),
      callCalendar('status', { company_id: companyId, username: currentUser.username }).catch(() => ({ connected: false })),
    ])
    let companyRow = companyRes.data || null
    // The approval link carries a one-off code, so the result can be recorded even when the
    // Microsoft admin who opens it has no QPlan login. A director creates the code once.
    if (isDirector && companyRow && !companyRow.ms_consent_nonce) {
      const nonce = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
      const { error } = await supabase.from('companies').update({ ms_consent_nonce: nonce }).eq('id', companyId)
      if (!error) companyRow = { ...companyRow, ms_consent_nonce: nonce }
    }
    setCompany(companyRow)
    setDrive(driveRes || { connected: false })
    setMyCalendar(calRes || { connected: false })
    if (isDirector) {
      const [usersRes, teamRes] = await Promise.all([
        supabase.from('app_users').select('username, role').eq('company_id', companyId).eq('is_approved', true).not('is_platform_admin', 'is', true).order('username'),
        callCalendar('team_status', { company_id: companyId }).catch(() => ({ connections: [] })),
      ])
      setTeam(usersRes.data || [])
      setTeamCalendars(teamRes?.connections || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [currentUser.company_id, currentUser.username])

  const firmName = company?.name || currentUser.companyName || 'the firm'
  const approved = !!company?.ms_admin_consent_at
  const personalDrive = drive.connected && isPersonalMicrosoftEmail(drive.email)
  const jobsFolder = drive.jobsFolder

  const copyAdminLink = async () => {
    try {
      await navigator.clipboard.writeText(adminConsentUrl(currentUser, company?.ms_consent_nonce))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copy this link and send it to your Microsoft 365 admin:', adminConsentUrl(currentUser, company?.ms_consent_nonce))
    }
  }

  const switchDrive = async () => {
    const warning = drive.connected
      ? `This disconnects ${drive.email} and asks you to sign in with ${firmName}'s Microsoft 365 work account.\n\nFolders already linked to jobs stay linked to the old account until you relink them from each job's Documents tab.\n\nContinue?`
      : null
    if (warning && !window.confirm(warning)) return
    setBusy(true)
    if (drive.connected) await callGraph('disconnect', { company_id: currentUser.company_id })
    connectFirmDrive(currentUser)
  }

  const disconnectDrive = async () => {
    if (!window.confirm(`Disconnect Microsoft 365 (${drive.email}) for everyone at ${firmName}?`)) return
    setBusy(true)
    await callGraph('disconnect', { company_id: currentUser.company_id })
    setBusy(false)
    load()
  }

  const pickJobsFolder = async (folder) => {
    setBusy(true)
    const res = await callGraph('set_jobs_folder', {
      company_id: currentUser.company_id,
      drive_id: folder.driveId || null,
      folder_id: folder.folderId || null,
      name: folder.name,
      path: [folder.driveName && folder.driveName !== 'OneDrive' ? folder.driveName : '', folder.path].filter(Boolean).join(' / ') || folder.name,
      web_url: folder.webUrl || null,
      username: currentUser.username,
    })
    setBusy(false)
    if (!res.success) { notify.error('Could not save the jobs folder: ' + (res.error || 'Unknown error')); return }
    setPicker(false)
    setDrive(prev => ({ ...prev, jobsFolder: res.jobsFolder }))
  }

  const disconnectCalendar = async () => {
    if (!window.confirm('Disconnect your Outlook calendar from QPlan?')) return
    setBusy(true)
    await callCalendar('disconnect', { company_id: currentUser.company_id, username: currentUser.username })
    setBusy(false)
    load()
  }

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-xs text-gray-500">Checking Microsoft 365...</div>
  }

  const calendarFor = (username) => teamCalendars.find(c => c.username === username)
  const connectedCount = team.filter(u => { const c = calendarFor(u.username); return c && !c.needs_reconnect }).length

  return (
    <div data-tour="ms-main" className="max-w-3xl space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-sm font-semibold text-gray-800 mb-1">Microsoft 365</div>
        <div className="text-xs text-gray-600 leading-relaxed">
          Connect {firmName}'s Microsoft 365 so planners can open and co-edit Word files from QPlan, and meetings appear in their own Outlook calendars.
          Each step is done once. {isDirector ? 'Steps 1 and 2 are for the firm. Step 3 is for each person.' : 'A director looks after steps 1 and 2. Step 3 is yours.'}
        </div>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-xs flex items-start justify-between gap-3 ${message.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="leading-relaxed">{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Step 1: admin approval */}
      <StepCard number={1} title={`Approve QPlan for ${firmName}`} done={approved}>
        {approved ? (
          <div className="text-xs text-gray-600">
            Approved {formatDate(company.ms_admin_consent_at)}{company.ms_admin_consent_by ? ` by ${company.ms_admin_consent_by}` : ''}. Nobody at {firmName} will be asked for Microsoft permissions again.
            {isDirector && <> <button onClick={() => startAdminConsent(currentUser, company?.ms_consent_nonce)} className="text-blue-700 hover:underline ml-1">Approve again</button></>}
          </div>
        ) : isDirector ? (
          <>
            <div className="text-xs text-gray-600 leading-relaxed mb-3">
              Your Microsoft 365 admin approves QPlan once for the whole firm. After that, nobody sees a "Permissions requested" screen.
              The admin signs in with their work account and clicks <span className="font-medium">Accept</span>.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => startAdminConsent(currentUser, company?.ms_consent_nonce)}>I'm the admin: approve now</Button>
              <Button tone="outline" onClick={copyAdminLink}>{copied ? '✓ Link copied' : 'Copy link to send to our admin'}</Button>
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-600">Not done yet. A director sends the approval link to {firmName}'s Microsoft 365 admin.</div>
        )}
      </StepCard>

      {/* Step 2: the firm's OneDrive / SharePoint */}
      <StepCard number={2} title="Connect the firm's OneDrive or SharePoint" done={drive.connected && !personalDrive && !!jobsFolder} warn={personalDrive}>
        {!drive.connected ? (
          isDirector ? (
            <>
              <div className="text-xs text-gray-600 leading-relaxed mb-3">
                Sign in with your <span className="font-medium">{firmName} work account</span> (your work email), not a personal Outlook or Hotmail account. This connects the firm's files for everyone.
              </div>
              <Button onClick={() => connectFirmDrive(currentUser)} disabled={busy}>Connect Microsoft 365</Button>
            </>
          ) : (
            <div className="text-xs text-gray-600">Not connected yet. A director connects this once for the firm.</div>
          )
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-gray-600">
              Connected to <span className="font-medium">{drive.email || 'Microsoft 365'}</span>{drive.connected_by ? ` by ${drive.connected_by}` : ''}.
            </div>
            {personalDrive && (
              <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                This is a personal Microsoft account, not {firmName}'s Microsoft 365. That is why Word keeps asking the team for permission: the files belong to this personal account.
                {isDirector ? ' Click "Switch to our work account" and sign in with your work email.' : ' Ask a director to switch it to the firm\'s work account.'}
              </div>
            )}
            <div className="text-xs text-gray-600">
              Jobs folder: {jobsFolder
                ? <span className="font-medium text-gray-700">{jobsFolder.path || jobsFolder.name}</span>
                : <span className="text-amber-700">not set. New jobs cannot create their own folder until it is.</span>}
            </div>
            {isDirector && (
              <div className="flex flex-wrap gap-2">
                {personalDrive && <Button onClick={switchDrive} disabled={busy}>Switch to our work account</Button>}
                <Button tone={personalDrive ? 'outline' : 'blue'} onClick={() => setPicker(true)} disabled={busy}>
                  {jobsFolder ? 'Change jobs folder' : 'Choose jobs folder'}
                </Button>
                {!personalDrive && <Button tone="outline" onClick={switchDrive} disabled={busy}>Use a different account</Button>}
                <Button tone="red" onClick={disconnectDrive} disabled={busy}>Disconnect</Button>
              </div>
            )}
          </div>
        )}
      </StepCard>

      {/* Step 3: my calendar */}
      <StepCard number={3} title="Connect my Outlook calendar" done={myCalendar.connected && !myCalendar.needs_reconnect} warn={myCalendar.needs_reconnect}>
        {myCalendar.connected && !myCalendar.needs_reconnect ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-gray-600">Connected{myCalendar.email ? <> to <span className="font-medium">{myCalendar.email}</span></> : ''}. Meetings made in QPlan go into your Outlook calendar.</div>
            <Button tone="red" onClick={disconnectCalendar} disabled={busy}>Disconnect</Button>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-600 leading-relaxed mb-3">
              {myCalendar.needs_reconnect
                ? 'Microsoft signed you out of this connection. Click below and sign in again. It takes a few seconds.'
                : 'Sign in with your work email. Meetings you make in QPlan then appear in your own Outlook calendar.'}
            </div>
            <Button onClick={() => connectMyCalendar(currentUser)}>{myCalendar.needs_reconnect ? 'Reconnect my calendar' : 'Connect my calendar'}</Button>
          </>
        )}
      </StepCard>

      {isDirector && team.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Team calendars</div>
            <div className="text-xs text-gray-500">{connectedCount} of {team.length} connected</div>
          </div>
          <div className="divide-y divide-gray-100">
            {team.map(u => {
              const c = calendarFor(u.username)
              return (
                <div key={u.username} className="flex items-center justify-between py-2">
                  <div className="text-xs font-medium text-gray-700">{u.username}{u.role === 'director' ? <span className="text-gray-500 font-normal"> · Director</span> : ''}</div>
                  <div className="text-xs">
                    {!c ? <span className="text-gray-500">Not connected</span>
                      : c.needs_reconnect ? <span className="text-amber-700">Needs to reconnect</span>
                      : <span className="text-emerald-600">● {c.email || 'Connected'}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="text-xs text-gray-500 mt-3">Staff connect their own calendar from Calendar &gt; Connect calendar, or "Connect my Outlook" in the menu.</div>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 text-xs text-gray-600 leading-relaxed">
        <span className="font-medium text-gray-700">Opening Word files:</span> stay signed in to your {firmName} Microsoft account in this browser. Word then opens files straight away with no sign-in or permission request.
      </div>

      {picker && (
        <OneDriveFolderPicker
          currentUser={currentUser}
          title="Choose the jobs folder"
          subtitle="Browse to the folder that holds all job folders, then click &quot;Use this folder&quot;. New job folders are created inside it."
          onPick={pickJobsFolder}
          onClose={() => setPicker(false)}
        />
      )}
    </div>
  )
}
