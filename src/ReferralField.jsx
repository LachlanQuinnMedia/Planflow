// src/ReferralField.jsx
// Referral agencies as tick boxes, so the common ones are one click. "Other" takes anything else.
// The job still stores one line of text ("SARA, Energex"), so documents and the client
// summary read exactly as before.
import { useState } from 'react'
import { REFERRAL_AGENCIES, splitReferrals, joinReferrals } from './newJobHelp'

export default function ReferralField({ value, onChange, inputClass }) {
  const { ticked, other } = splitReferrals(value)
  // What is being typed in the Other box, kept as typed (commas and spaces included) while typing
  const [draft, setDraft] = useState(other)
  const toggle = (agency) => onChange(joinReferrals(ticked.includes(agency) ? ticked.filter(a => a !== agency) : [...ticked, agency], draft))
  return (
    <div data-testid="referrals">
      <div className="flex flex-wrap gap-1.5">
        {REFERRAL_AGENCIES.map(a => {
          const on = ticked.includes(a)
          return (
            <button key={a} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(a)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${on ? 'bg-emerald-600 border-emerald-600 text-white font-medium' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {on ? '✓ ' : ''}{a}
            </button>
          )
        })}
      </div>
      <input value={draft} onChange={e => { setDraft(e.target.value); onChange(joinReferrals(ticked, e.target.value)) }}
        aria-label="Other referral agencies" placeholder="Any others, separated by commas" className={`${inputClass} mt-2`} />
    </div>
  )
}
