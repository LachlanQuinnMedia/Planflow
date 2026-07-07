// supabase/functions/send-email/index.ts
// Sends templated emails via Resend. The API key lives ONLY here as a secret,
// never in the browser. Only known templates can be sent, so the anon key
// can't be abused to send arbitrary email from your account.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const APP_URL = 'https://planflow-beige.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

function wrap(headerColor: string, headerText: string, inner: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: ${headerColor}; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 18px;">QPlan — ${headerText}</h1>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5;">
        ${inner}
        <a href="${APP_URL}" style="display: inline-block; background: #1B2A4A; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 8px;">Open QPlan</a>
        <p style="margin: 24px 0 0; color: #888; font-size: 12px;">This is an automated notification from QPlan.</p>
      </div>
    </div>`
}

const templates: Record<string, (p: any) => { subject: string; html: string }> = {
  ir_deadline: (p) => ({
    subject: `⚑ IR Response due in 7 days — ${esc(p.jobCode)}`,
    html: wrap('#1D9E75', 'Deadline Alert', `
      <p style="margin: 0 0 16px;">Hi ${esc(p.plannerName)},</p>
      <p style="margin: 0 0 16px;">This is a reminder that an Information Request response is due in <strong>7 days</strong>.</p>
      <div style="background: #FEF9C3; border: 1px solid #FDE047; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Job:</strong> ${esc(p.jobCode)} — ${esc(p.jobName)}</p>
        <p style="margin: 0 0 8px;"><strong>Council:</strong> ${esc(p.council)}</p>
        <p style="margin: 0;"><strong>IR Response due:</strong> ${esc(p.irDeadline)}</p>
      </div>
      <p style="margin: 16px 0;">Please log in to QPlan to review and complete your IR response.</p>`),
  }),
  over_budget: (p) => ({
    subject: `⚠️ Over budget alert — ${esc(p.jobCode)}`,
    html: wrap('#E24B4A', 'Budget Alert', `
      <p style="margin: 0 0 16px;">Hi ${esc(p.plannerName)},</p>
      <p style="margin: 0 0 16px;">A job has exceeded its budget allocation.</p>
      <div style="background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Job:</strong> ${esc(p.jobCode)} — ${esc(p.jobName)}</p>
        <p style="margin: 0;"><strong>Budget used:</strong> ${esc(p.budgetPct)}%</p>
      </div>
      <p style="margin: 16px 0;">Please review this job and consider advising the client of a potential fee variation.</p>`),
  }),
  new_booking: (p) => ({
    subject: `📅 New booking — ${esc(p.clientName)}`,
    html: wrap('#185FA5', 'New Booking', `
      <p style="margin: 0 0 16px;">Hi ${esc(p.plannerName)},</p>
      <p style="margin: 0 0 16px;">You have a new booking via Calendly.</p>
      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Client:</strong> ${esc(p.clientName)}</p>
        <p style="margin: 0 0 8px;"><strong>Time:</strong> ${esc(p.bookingTime)}</p>
        <p style="margin: 0;"><strong>Type:</strong> ${esc(p.bookingType)}</p>
      </div>`),
  }),
  account_approval: (p) => ({
    subject: `New QPlan account pending approval — ${esc(p.username)}`,
    html: wrap('#1B2A4A', 'New Account Request', `
      <p style="margin: 0 0 16px;">A new employee has created an account and is awaiting your approval.</p>
      <div style="background: #f0f0f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Username:</strong> ${esc(p.username)}</p>
        <p style="margin: 0 0 8px;"><strong>Company:</strong> ${esc(p.companyName)}</p>
        <p style="margin: 0;"><strong>Role:</strong> Employee</p>
      </div>
      <p style="margin: 16px 0;">Log in to QPlan to approve or reject this account.</p>`),
  }),
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { template, to, params } = await req.json()

    if (!to || typeof to !== 'string') return json({ success: false, error: 'Missing recipient' }, 400)
    const build = templates[template]
    if (!build) return json({ success: false, error: 'Unknown template' }, 400)

    const { subject, html } = build(params || {})

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'QPlan <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) return json({ success: false, error: data?.message || 'Send failed' }, 400)
    return json({ success: true, id: data?.id })
  } catch (e) {
    return json({ success: false, error: String(e) }, 500)
  }
})
