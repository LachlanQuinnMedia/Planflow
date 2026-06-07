// src/templateFiller.js
// Fetches a .docx template from Supabase Storage, fills {placeholders} the job
// and planner profile already know, and leaves everything else as its literal
// {placeholder} tag for the planner to overwrite in Word. Headers/footers are
// filled automatically, so {site_address} in the running header works.
//
// Requires: npm install docxtemplater pizzip

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { supabase } from './supabase'; // adjust path/named-export if yours differs

const STORAGE_BUCKET = 'templates';

// Brisbane is UTC+10 with no DST — the IANA zone handles this correctly.
function brisbaneDates(d = new Date()) {
  const tz = { timeZone: 'Australia/Brisbane' };
  return {
    date: new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', ...tz }).format(d), // "7 June 2026"
    month_year: new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric', ...tz }).format(d),           // "June 2026"
    year: new Intl.DateTimeFormat('en-AU', { year: 'numeric', ...tz }).format(d),                                // "2026"
  };
}

// Only the fields the job + planner profile already hold are supplied here.
// Anything not returned (client_street, owner_name, council_address, planning_context, fees, …)
// falls through to nullGetter below and stays as a visible {placeholder}.
export function buildTemplateData(job = {}, planner = {}) {
  const d = brisbaneDates();
  const data = {
    // dates
    date: d.date,
    month_year: d.month_year,
    year: d.year,
    // auto-filled from the job
    hpc_ref: job.code,
    site_address: job.address,
    lot_reference: job.lot_reference,
    app_type: job.app_type,
    proposed_use: job.proposed_use,
    council: job.council,
    client_name: [job.client_first_name, job.client_last_name].filter(Boolean).join(' ').trim() || undefined,
    client_first_name: job.client_first_name,
    client_email: job.client_email,
    // auto-filled from the logged-in planner's profile
    planner_name: planner.full_name,
    planner_position: planner.position,
    planner_email: planner.email,
  };
  // Strip empty/undefined so they pass through to nullGetter and remain as {tags}.
  Object.keys(data).forEach((k) => {
    if (data[k] === undefined || data[k] === null || data[k] === '') delete data[k];
  });
  return data;
}

/**
 * Generate one filled .docx from a Storage template and download it.
 * @param {string} templateFile  e.g. "Fee_Proposal_Code.docx"
 * @param {object} job           the job record
 * @param {object} planner       the logged-in planner_profiles row
 * @returns {{ blob: Blob, filename: string }}
 */
export async function generateFromTemplate(templateFile, job, planner) {
  // 1. download the template from Supabase Storage
  const { data: file, error } = await supabase.storage.from(STORAGE_BUCKET).download(templateFile);
  if (error) throw new Error(`Could not download template "${templateFile}": ${error.message}`);
  const arrayBuffer = await file.arrayBuffer();

  // 2. load and fill
  const zip = new PizZip(arrayBuffer);
  let doc;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
      // Any field we didn't supply renders as its own {tag} again, so the planner
      // can see exactly what to type over in Word (instead of it vanishing).
      nullGetter(part) {
        if (!part.module) return `{${part.value}}`;
        if (part.module === 'rawxml') return '';
        return '';
      },
    });
    doc.render(buildTemplateData(job, planner)); // docxtemplater >= 3.31
  } catch (e) {
    const detail = e?.properties?.errors
      ?.map((x) => x?.properties?.explanation)
      .filter(Boolean)
      .join('; ');
    throw new Error(`Template fill failed${detail ? `: ${detail}` : ''}`);
  }

  // 3. produce the .docx blob
  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  // 4. trigger a browser download
  const safe = (s) => (s || '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
  const base = templateFile.replace(/\.docx$/i, '');
  const filename = `${safe(job?.code) || 'HPC'}_${base}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { blob, filename };
}
