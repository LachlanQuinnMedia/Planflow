import { supabase } from './supabase'

const XERO_CLIENT_ID = import.meta.env.VITE_XERO_CLIENT_ID
const REDIRECT_URI = 'https://planflow-beige.vercel.app/xero/callback'
const EDGE_FUNCTION_URL = 'https://sltaaiumviyzgdsdkkbe.supabase.co/functions/v1/xero-auth'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdGFhaXVtdml5emdkc2Rra2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTYyNTMsImV4cCI6MjA5MDQ5MjI1M30.xqWqvx8vdofj119nXDpasQ8xVD67YJU0RrjTrxycTGo'

const XERO_SCOPES = [
  'openid',
  'offline_access',
  'accounting.invoices',
  'accounting.contacts'
].join(' ')

async function callFn(action, payload) {
  const res = await fetch(`${EDGE_FUNCTION_URL}?action=${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify(payload || {}),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, ...data }
}

export function getXeroAuthUrl(companyId) {
  const state = btoa(JSON.stringify({ company_id: companyId }))
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: XERO_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: XERO_SCOPES,
    state,
  })
  return `https://login.xero.com/identity/connect/authorize?${params}`
}

export async function handleXeroCallback(code, companyId) {
  const data = await callFn('callback', { code, company_id: companyId })
  if (!data.success) {
    console.error('Xero callback failed:', data)
    alert(`Xero connection failed: ${data.error || data.msg || `HTTP ${data.status}`}`)
  }
  return data
}

export async function getXeroToken(companyId) {
  return callFn('get_token', { company_id: companyId })
}

export async function disconnectXero(companyId) {
  return callFn('disconnect', { company_id: companyId })
}

export async function isXeroConnected(companyId) {
  const { data } = await supabase
    .from('xero_tokens')
    .select('id, tenant_name')
    .eq('company_id', companyId)
    .maybeSingle()
  return data ? { connected: true, tenantName: data.tenant_name } : { connected: false }
}

export async function getXeroContacts(companyId) {
  const data = await callFn('contacts', { company_id: companyId })
  if (!data.success) { console.error('Xero contacts:', data.error); return [] }
  return data.contacts || []
}

export async function createXeroContact(companyId, { firstName, lastName, email, phone }) {
  const data = await callFn('create_contact', { company_id: companyId, firstName, lastName, email, phone })
  if (!data.success) throw new Error(data.error || 'Could not create contact in Xero')
  return data.contact
}

// Dates as YYYY-MM-DD in Brisbane time (not UTC)
function localISODate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ')

// Xero sales account and GST code. 200 / OUTPUT2 are the Xero Australia defaults.
// Change these if the firm's accountant uses a different revenue account.
export const XERO_SALES_ACCOUNT_CODE = '200'
export const XERO_GST_TAX_TYPE = 'OUTPUT2'

export async function pushInvoiceToXero(companyId, job, timeLogs) {
  const contacts = await getXeroContacts(companyId)
  const first = norm(job.client_first_name)
  const last = norm(job.client_last_name)
  const fullName = [first, last].filter(Boolean).join(' ')
  const email = norm(job.client_email)

  // Match an existing contact by email, then by full name, then by first + last name (case and spacing insensitive)
  let contact = contacts.find(c => email && norm(c.EmailAddress) === email)
    || contacts.find(c => fullName && norm(c.Name) === fullName)
    || contacts.find(c => fullName && [norm(c.FirstName), norm(c.LastName)].filter(Boolean).join(' ') === fullName)

  if (!contact) {
    contact = await createXeroContact(companyId, {
      firstName: (job.client_first_name || '').trim(),
      lastName: (job.client_last_name || '').trim(),
      email: job.client_email || undefined,
      phone: job.client_phone || undefined,
    })
  }

  const lineItems = timeLogs
    .filter(log => (log.duration_seconds || 0) > 0 || (log.hours || 0) > 0)
    .map(log => {
      const seconds = log.duration_seconds || Math.round((log.hours || 0) * 3600)
      const hours = parseFloat((seconds / 3600).toFixed(2))
      return {
        Description: `${log.task || 'General work'} (${job.code}${log.log_date ? `, ${log.log_date}` : ''})`,
        Quantity: hours,
        UnitAmount: log.rate || job.planner_rate || 0,
        AccountCode: XERO_SALES_ACCOUNT_CODE,
        TaxType: XERO_GST_TAX_TYPE,
      }
    })
  if (lineItems.length === 0) throw new Error('No time with a duration has been logged against this job.')

  const today = new Date()
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14)

  const invoice = {
    Type: 'ACCREC',
    Contact: { ContactID: contact.ContactID },
    LineItems: lineItems,
    Date: localISODate(today),
    DueDate: localISODate(dueDate),
    Reference: job.code,
    Status: 'DRAFT',
    LineAmountTypes: 'EXCLUSIVE',
    CurrencyCode: 'AUD',
  }

  const data = await callFn('create_invoice', { company_id: companyId, invoice })
  if (!data.success) throw new Error(data.error || 'Xero rejected the invoice')
  return data.invoice
}

export async function getXeroInvoices(companyId) {
  const data = await callFn('invoices', { company_id: companyId })
  if (!data.success) { console.error('Xero invoices:', data.error); return [] }
  return data.invoices || []
}

export async function getInvoiceStatus(companyId, invoiceId) {
  const invoices = await getXeroInvoices(companyId)
  return invoices.find(i => i.InvoiceID === invoiceId) || null
}