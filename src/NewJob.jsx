import { useState } from 'react'

export default function NewJob({ onNavigate }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    appType: 'MCU — Material Change of Use',
    assessment: 'Code Assessable',
    address: '', lot: '', council: 'Toowoomba Regional',
    zone: '', proposedUse: '', referrals: '',
    planner: 'Sarah Barnes — Principal ($185/hr)',
    budget: '', lodgement: '', decisionDue: '',
  })

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.address) {
      alert('Please fill in client name and address before creating the job.')
      return
    }
    alert(`Job created successfully!\n\nClient: ${form.firstName} ${form.lastName}\nType: ${form.appType.split('—')[0].trim()}\nAddress: ${form.address}`)
    onNavigate('jobs')
  }

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold mb-5">Create new job</h2>

        {/* Client details */}
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client details</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">First name</label>
            <input value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="Jonas" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Last name / company</label>
            <input value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Hartmann" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email</label>
            <input value={form.email} onChange={e => update('email', e.target.value)} placeholder="client@email.com.au" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Phone</label>
            <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="04XX XXX XXX" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
        </div>

        <div className="border-t border-gray-100 mb-5" />

        {/* Application details */}
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Application details</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Application type</label>
            <select value={form.appType} onChange={e => update('appType', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              <option>MCU — Material Change of Use</option>
              <option>ROL — Reconfiguration of a Lot</option>
              <option>RAA — Referral Agency Assessment</option>
              <option>OW — Operational Works</option>
              <option>SPS — Superseded Planning Scheme</option>
              <option>PE — Preliminary Enquiry</option>
              <option>PDA — Priority Development Area</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Assessment level</label>
            <select value={form.assessment} onChange={e => update('assessment', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              <option>Code Assessable</option>
              <option>Impact Assessable</option>
              <option>Accepted Development</option>
              <option>Exempt</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Site address</label>
            <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="44 Ridge St, Toowoomba QLD 4350" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Lot / RP reference</label>
            <input value={form.lot} onChange={e => update('lot', e.target.value)} placeholder="Lot 7 SP123456" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Council / LGA</label>
            <select value={form.council} onChange={e => update('council', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              <option>Toowoomba Regional</option>
              <option>Brisbane City</option>
              <option>Gold Coast City</option>
              <option>Sunshine Coast</option>
              <option>Ipswich City</option>
              <option>Lockyer Valley</option>
              <option>Southern Downs</option>
              <option>Scenic Rim</option>
              <option>Somerset</option>
              <option>Gympie</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Planning zone</label>
            <input value={form.zone} onChange={e => update('zone', e.target.value)} placeholder="Medium Density Residential" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Proposed use</label>
            <input value={form.proposedUse} onChange={e => update('proposedUse', e.target.value)} placeholder="Mixed-use — retail GF + 12 units" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Referral agencies</label>
            <input value={form.referrals} onChange={e => update('referrals', e.target.value)} placeholder="DTMR, TRC Engineering..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
        </div>

        <div className="border-t border-gray-100 mb-5" />

        {/* Assign & budget */}
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Assign & budget</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Lead planner</label>
            <select value={form.planner} onChange={e => update('planner', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
              <option>Sarah Barnes — Principal ($185/hr)</option>
              <option>James Thompson — Senior ($155/hr)</option>
              <option>Priya Mehta — Senior ($160/hr)</option>
              <option>Luke Rawlings — Associate ($135/hr)</option>
              <option>Amy Chen — Associate ($140/hr)</option>
              <option>Ben Okafor — Graduate ($110/hr)</option>
              <option>Rachel Kim — Graduate ($115/hr)</option>
              <option>Tom Walsh — Graduate ($110/hr)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Budget (hours)</label>
            <input type="number" value={form.budget} onChange={e => update('budget', e.target.value)} placeholder="60" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Lodgement date</label>
            <input type="date" value={form.lodgement} onChange={e => update('lodgement', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Decision due date</label>
            <input type="date" value={form.decisionDue} onChange={e => update('decisionDue', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400" />
          </div>
        </div>

        <div className="border-t border-gray-100 mb-5" />

        {/* Auto-generate */}
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Auto-generate on creation</div>
        <div className="flex flex-wrap gap-2 mb-6">
          {['Planning report template', 'Invoice template', 'Client engagement letter', 'Fee estimate', 'IR response template'].map(item => (
            <span key={item} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200 cursor-pointer hover:bg-emerald-100">
              {item}
            </span>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button onClick={() => onNavigate('jobs')} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Create job & generate docs
          </button>
        </div>
      </div>
    </div>
  )
}