// src/GenerateTemplateModal.jsx
// In-job document picker. Planner ticks exactly the documents they need and hits
// Generate — each downloads, auto-filled from this job + the planner's profile,
// with everything else left as editable {placeholders} in the Word file.
//
// Usage in JobDetail:
//   const [showGen, setShowGen] = useState(false);
//   <button onClick={() => setShowGen(true)}>Generate docs</button>
//   {showGen && (
//     <GenerateTemplateModal
//       job={job}
//       planner={currentPlanner}   // logged-in planner_profiles row
//       onClose={() => setShowGen(false)}
//     />
//   )}

import { useState } from 'react';
import { generateFromTemplate } from './templateFiller';

// Stage 1 only for now — more categories get added as their templates arrive.
const CATEGORIES = [
  {
    stage: 'Stage 1',
    groups: [
      {
        name: 'Fee Proposals',
        items: [
          { file: 'Fee_Proposal_Code.docx',         label: 'Code Assessable' },
          { file: 'Fee_Proposal_Impact.docx',       label: 'Impact Assessable' },
          { file: 'Fee_Proposal_Minor_Change.docx', label: 'Minor Change' },
          { file: 'Fee_Proposal_RAA.docx',          label: 'Referral Agency Assessment' },
        ],
      },
      {
        name: "Owner's Consent",
        items: [
          { file: 'Consent_Individual.docx', label: 'Individual' },
          { file: 'Consent_Company.docx',    label: 'Company' },
        ],
      },
    ],
  },
];

export default function GenerateTemplateModal({ job, planner, onClose }) {
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (file) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(file) ? next.delete(file) : next.add(file);
      return next;
    });

  async function handleGenerate() {
    if (selected.size === 0) return;
    setBusy(true);
    setError('');
    const failures = [];
    for (const file of selected) {
      try {
        await generateFromTemplate(file, job, planner);
      } catch (e) {
        failures.push(`${file}: ${e.message}`);
      }
    }
    setBusy(false);
    if (failures.length) setError(failures.join(' | '));
    else onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1B2A4A]">Generate docs</h2>
            <p className="text-xs text-gray-500">
              {job?.code ? `${job.code} · ` : ''}Filled from this job &amp; {planner?.full_name || 'your profile'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">✕</button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {CATEGORIES.map((cat) => (
            <div key={cat.stage}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{cat.stage}</p>
              <div className="space-y-4">
                {cat.groups.map((group) => (
                  <div key={group.name}>
                    <p className="mb-1.5 text-sm font-medium text-[#1B2A4A]">{group.name}</p>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <label
                          key={item.file}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-[#B87333] hover:bg-orange-50/30"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(item.file)}
                            onChange={() => toggle(item.file)}
                            className="h-4 w-4 accent-[#B87333]"
                          />
                          <span className="text-gray-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-4">
          <span className="text-xs text-gray-500">{selected.size} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={busy || selected.size === 0}
              className="rounded-lg bg-[#1B2A4A] px-4 py-2 text-sm font-medium text-white hover:bg-[#16223c] disabled:opacity-50"
            >
              {busy ? 'Generating…' : `Generate ${selected.size || ''}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
