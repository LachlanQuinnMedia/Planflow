const templates = [
  {
    category: 'MCU — Material Change of Use',
    color: 'bg-blue-100 text-blue-700',
    items: [
      { name: 'MCU Planning Report', desc: 'Full planning report template — code & impact assessable' },
      { name: 'MCU IR Response (Code assessable)', desc: 'Information request response for code assessable MCU' },
      { name: 'MCU IR Response (Impact assessable)', desc: 'Information request response for impact assessable MCU' },
      { name: 'MCU Client Engagement Letter', desc: 'Initial engagement letter with fee estimate' },
    ]
  },
  {
    category: 'ROL — Reconfiguration of a Lot',
    color: 'bg-amber-100 text-amber-700',
    items: [
      { name: 'ROL Planning Report', desc: 'Full planning report for lot reconfiguration' },
      { name: 'ROL IR Response', desc: 'Information request response template' },
      { name: 'ROL Engagement Letter', desc: 'Client engagement letter for subdivision work' },
    ]
  },
  {
    category: 'RAA — Referral Agency Assessment',
    color: 'bg-pink-100 text-pink-700',
    items: [
      { name: 'RAA Response Report', desc: 'Referral agency assessment response' },
      { name: 'Referral Agency Submission', desc: 'Formal submission to referral agency' },
    ]
  },
  {
    category: 'OW — Operational Works',
    color: 'bg-green-100 text-green-700',
    items: [
      { name: 'OW Planning Report', desc: 'Operational works planning report' },
      { name: 'OW Compliance Report', desc: 'Compliance report for operational works' },
    ]
  },
  {
    category: 'SPS — Superseded Planning Scheme',
    color: 'bg-purple-100 text-purple-700',
    items: [
      { name: 'SPS Request Report', desc: 'Request to assess under superseded planning scheme' },
      { name: 'SPS Supporting Statement', desc: 'Supporting statement for SPS request' },
    ]
  },
  {
    category: 'General templates',
    color: 'bg-gray-100 text-gray-700',
    items: [
      { name: 'Preliminary Enquiry Response', desc: 'Response to preliminary planning enquiry' },
      { name: 'Tax Invoice', desc: 'Standard tax invoice — auto-fills job and client details' },
      { name: 'Fee Estimate Letter', desc: 'Fee estimate for new or existing clients' },
      { name: 'Client Engagement Letter', desc: 'General client engagement and scope of works letter' },
      { name: 'Decision Notice Response', desc: 'Response to council decision notice' },
      { name: 'Fee Variation Letter', desc: 'Letter advising client of fee variation' },
    ]
  },
]

export default function Templates() {
  return (
    <div>
      {/* Info banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
        <div className="text-xs font-medium text-emerald-700 mb-0.5">Auto-fill variables</div>
        <div className="text-xs text-emerald-600">All templates automatically fill in: client name, address, lot/RP reference, council, zone, application type, assessment level, referral agencies, planner name and date when a job is created.</div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-4">
        {templates.map(group => (
          <div key={group.category} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group.color}`}>
                {group.category.split('—')[0].trim()}
              </span>
              <div className="text-xs font-semibold text-gray-600">{group.category}</div>
            </div>
            {group.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-600 flex-shrink-0">
                  W
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{item.name}</div>
                  <div className="text-xs text-gray-400 truncate">{item.desc}</div>
                </div>
                <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 flex-shrink-0">
                  Edit
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}