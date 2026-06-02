import { supabase } from './supabase'

const XERO_CLIENT_ID = import.meta.env.VITE_XERO_CLIENT_ID
const REDIRECT_URI = 'https://planflow-beige.vercel.app/xero/callback'
const EDGE_FUNCTION_URL = 'https://sltaaiumviyzgdsdkkbe.supabase.co/functions/v1/xero-auth'

const XERO_SCOPES = [
  'openid', 'profile', 'email',
  'accounting.transactions',
  'accounting.contacts',
  'accounting.settings',
  'offline_access'
].join(' ')

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
  const res = await fetch(`${EDGE_FUNCTION_URL}?action=callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, company_id: companyId }),
  })
  return res.json()
}

export async function getXeroToken(companyId) {
  const res = await fetch(`${EDGE_FUNCTION_URL}?action=get_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: companyId }),
  })
  return res.json()
}

export async function disconnectXero(companyId) {
  const res = await fetch(`${EDGE_FUNCTION_URL}?action=disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: companyId }),
  })
  return res.json()
}

export async function isXeroConnected(companyId) {
  const { data } = await supabase
    .from('xero_tokens')
    .select('id, tenant_name')
    .eq('company_id', companyId)
    .single()
  return data ? { connected: true, tenantName: data.tenant_name } : { connected: false }
}

export async function getXeroContacts(companyId) {
  const { access_token, tenant_id } = await getXeroToken(companyId)
  const res = await fetch('https://api.xero.com/api.xro/2.0/Contacts?where=IsCustomer%3D%3Dtrue', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Xero-tenant-id': tenant_id,
      'Accept': 'application/json',
    }
  })
  const data = await res.json()
  return data.Contacts || []
}

export async function createXeroContact(companyId, { firstName, lastName, email, phone }) {
  const { access_token, tenant_id } = await getXeroToken(companyId)
  const res = await fetch('https://api.xero.com/api.xro/2.0/Contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Xero-tenant-id': tenant_id,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      Contacts: [{
        FirstName: firstName,
        LastName: lastName,
        EmailAddress: email,
        Phones: phone ? [{ PhoneType: 'DEFAULT', PhoneNumber: phone }] : [],
        IsCustomer: true,
      }]
    })
  })
  const data = await res.json()
  return data.Contacts?.[0]
}

export async function pushInvoiceToXero(companyId, job, timeLogs) {
  const { access_token, tenant_id } = await getXeroToken(companyId)

  const contacts = await getXeroContacts(companyId)
  let contact = contacts.find(c =>
    c.EmailAddress?.toLowerCase() === job.client_email?.toLowerCase() ||
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
      Description: `${log.task} — ${job.code}`,
      Quantity: hours,
      UnitAmount: log.rate || job.planner_rate || 0,
      AccountCode: '200',
      TaxType: 'OUTPUT2',
    }
  })

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14)

  const res = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Xero-tenant-id': tenant_id,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      Invoices: [{
        Type: 'ACCREC',
        Contact: { ContactID: contact.ContactID },
        LineItems: lineItems,
        Date: new Date().toISOString().split('T')[0],
        DueDate: dueDate.toISOString().split('T')[0],
        Reference: job.code,
        Status: 'DRAFT',
        LineAmountTypes: 'EXCLUSIVE',
        CurrencyCode: 'AUD',
      }]
    })
  })

  const data = await res.json()
  return data.Invoices?.[0]
}

export async function getXeroInvoices(companyId) {
  const { access_token, tenant_id } = await getXeroToken(companyId)
  const res = await fetch('https://api.xero.com/api.xro/2.0/Invoices?where=Type%3D%3D%22ACCREC%22&order=Date DESC', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Xero-tenant-id': tenant_id,
      'Accept': 'application/json',
    }
  })
  const data = await res.json()
  return data.Invoices || []
}

export async function getInvoiceStatus(companyId, invoiceId) {
  const { access_token, tenant_id } = await getXeroToken(companyId)
  const res = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}`, {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Xero-tenant-id': tenant_id,
      'Accept': 'application/json',
    }
  })
  const data = await res.json()
  return data.Invoices?.[0]
}