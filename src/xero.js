import { callFunction } from './supabase'
import { notify } from './notify'

const XERO_CLIENT_ID = import.meta.env.VITE_XERO_CLIENT_ID
const REDIRECT_URI = 'https://planflow-beige.vercel.app/xero/callback'

const XERO_SCOPES = [
  'openid',
  'offline_access',
  'accounting.invoices',
  'accounting.contacts'
].join(' ')

// Every Xero call runs on the server as the signed-in person. Xero's own keys never reach the browser.
async function callFn(action, payload) {
  return callFunction('xero-auth', action, payload)
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
    notify.error(`Xero connection failed: ${data.error || data.msg || `HTTP ${data.status}`}`)
  }
  return data
}

export async function disconnectXero(companyId) {
  return callFn('disconnect', { company_id: companyId })
}

export async function isXeroConnected() {
  const data = await callFn('status')
  return data.connected ? { connected: true, tenantName: data.tenant_name } : { connected: false }
}

export async function getXeroContacts(companyId) {
  const data = await callFn('contacts', { company_id: companyId })
  if (!data.success) { console.error('Xero contacts:', data.error); return [] }
  return data.contacts || []
}

export async function createXeroContact(companyId, { name, firstName, lastName, email, phone }) {
  const data = await callFn('create_contact', { company_id: companyId, name, firstName, lastName, email, phone })
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
  // A company client is invoiced as the company, with the contact person on the Xero contact
  const company = job.client_type === 'company' ? norm(job.client_company) : ''
  const fullName = company || [first, last].filter(Boolean).join(' ')
  const email = norm(job.client_email)

  // Company client: match the company by name only, so the invoice never lands on the contact person's own record.
  // Individual: match by email, then by full name, then by first + last name (case and spacing insensitive).
  let contact = company
    ? contacts.find(c => norm(c.Name) === company)
    : contacts.find(c => email && norm(c.EmailAddress) === email)
      || contacts.find(c => fullName && norm(c.Name) === fullName)
      || contacts.find(c => fullName && [norm(c.FirstName), norm(c.LastName)].filter(Boolean).join(' ') === fullName)

  if (!contact) {
    contact = await createXeroContact(companyId, {
      name: company ? String(job.client_company).trim() : undefined,
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