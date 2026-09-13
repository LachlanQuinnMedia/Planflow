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

export async function pushInvoiceToXero(companyId, job, timeLogs) {
  const contacts = await getXeroContacts(companyId)
  let contact = contacts.find(c =>
    (job.client_email && c.EmailAddress?.toLowerCase() === job.client_email.toLowerCase()) ||
    (c.FirstName === job.client_first_name && c.LastName === job.client_last_name)
  )

  if (!contact) {
    contact = await createXeroContact(companyId, {
      firstName: job.client_first_name,
      lastName: job.client_last_name,
      email: job.client_email,
      phone: job.client_phone,
    })
  }

  const lineItems = timeLogs.map(log => {
    const hours = parseFloat(((log.duration_seconds || 0) / 3600).toFixed(2))
    return {
      Description: `${log.task || 'General work'} — ${job.code}`,
      Quantity: hours,
      UnitAmount: log.rate || job.planner_rate || 0,
      AccountCode: '200',
      TaxType: 'OUTPUT2',
    }
  })

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14)

  const invoice = {
    Type: 'ACCREC',
    Contact: { ContactID: contact.ContactID },
    LineItems: lineItems,
    Date: new Date().toISOString().split('T')[0],
    DueDate: dueDate.toISOString().split('T')[0],
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