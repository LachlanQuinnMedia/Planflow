// src/notifications.js
// Email notifications now go through the send-email Edge Function.
// The Resend API key lives ONLY on the server as a Supabase secret.
// Exported function signatures are unchanged, so no other file needs editing.

const SUPABASE_URL = 'https://sltaaiumviyzgdsdkkbe.supabase.co'
const ANON_KEY = 'sb_publishable_I9Pp2VrXhap55nkaJPa3FA_hZbuD-dX'

async function sendTemplatedEmail(template, to, params) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ template, to, params }),
    })
    const data = await res.json()
    if (!data.success) {
      console.error('Email error:', data.error)
      return { success: false, error: data.error }
    }
    return { success: true }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error }
  }
}

export const sendIRDeadlineAlert = async ({ plannerEmail, plannerName, jobCode, jobName, irDeadline, council }) => {
  return sendTemplatedEmail('ir_deadline', plannerEmail, { plannerName, jobCode, jobName, irDeadline, council })
}

export const sendOverBudgetAlert = async ({ plannerEmail, plannerName, jobCode, jobName, budgetPct }) => {
  return sendTemplatedEmail('over_budget', plannerEmail, { plannerName, jobCode, jobName, budgetPct })
}

export const sendNewBookingAlert = async ({ plannerEmail, plannerName, clientName, bookingTime, bookingType }) => {
  return sendTemplatedEmail('new_booking', plannerEmail, { plannerName, clientName, bookingTime, bookingType })
}