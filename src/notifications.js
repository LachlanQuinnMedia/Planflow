import { Resend } from 'resend'

const resend = new Resend('re_YqKAaVyc_DpPRbWAS1Ng7CxWnPBm9TFwU')

export const sendIRDeadlineAlert = async ({ plannerEmail, plannerName, jobCode, jobName, irDeadline, council }) => {
  try {
    await resend.emails.send({
      from: 'PlanFlow <onboarding@resend.dev>',
      to: plannerEmail,
      subject: `⚑ IR Response due in 7 days — ${jobCode}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: #1D9E75; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 18px;">PlanFlow — Deadline Alert</h1>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5;">
            <p style="margin: 0 0 16px;">Hi ${plannerName},</p>
            <p style="margin: 0 0 16px;">This is a reminder that an Information Request response is due in <strong>7 days</strong>.</p>
            <div style="background: #FEF9C3; border: 1px solid #FDE047; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px;"><strong>Job:</strong> ${jobCode} — ${jobName}</p>
              <p style="margin: 0 0 8px;"><strong>Council:</strong> ${council}</p>
              <p style="margin: 0;"><strong>IR Response due:</strong> ${irDeadline}</p>
            </div>
            <p style="margin: 16px 0;">Please log in to PlanFlow to review and complete your IR response.</p>
            <a href="https://planflow-liej06c3m-lachlan-quinns-projects.vercel.app" style="display: inline-block; background: #1D9E75; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">Open PlanFlow</a>
            <p style="margin: 24px 0 0; color: #888; font-size: 12px;">This is an automated notification from PlanFlow.</p>
          </div>
        </div>
      `
    })
    return { success: true }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error }
  }
}

export const sendOverBudgetAlert = async ({ plannerEmail, plannerName, jobCode, jobName, budgetPct }) => {
  try {
    await resend.emails.send({
      from: 'PlanFlow <onboarding@resend.dev>',
      to: plannerEmail,
      subject: `⚠️ Over budget alert — ${jobCode}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: #E24B4A; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 18px;">PlanFlow — Budget Alert</h1>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5;">
            <p style="margin: 0 0 16px;">Hi ${plannerName},</p>
            <p style="margin: 0 0 16px;">A job has exceeded its budget allocation.</p>
            <div style="background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px;"><strong>Job:</strong> ${jobCode} — ${jobName}</p>
              <p style="margin: 0;"><strong>Budget used:</strong> ${budgetPct}%</p>
            </div>
            <p style="margin: 16px 0;">Please review this job and consider advising the client of a potential fee variation.</p>
            <a href="https://planflow-liej06c3m-lachlan-quinns-projects.vercel.app" style="display: inline-block; background: #E24B4A; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">Open PlanFlow</a>
            <p style="margin: 24px 0 0; color: #888; font-size: 12px;">This is an automated notification from PlanFlow.</p>
          </div>
        </div>
      `
    })
    return { success: true }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error }
  }
}

export const sendNewBookingAlert = async ({ plannerEmail, plannerName, clientName, bookingTime, bookingType }) => {
  try {
    await resend.emails.send({
      from: 'PlanFlow <onboarding@resend.dev>',
      to: plannerEmail,
      subject: `📅 New booking — ${clientName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: #185FA5; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 18px;">PlanFlow — New Booking</h1>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5;">
            <p style="margin: 0 0 16px;">Hi ${plannerName},</p>
            <p style="margin: 0 0 16px;">You have a new booking via Calendly.</p>
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px;"><strong>Client:</strong> ${clientName}</p>
              <p style="margin: 0 0 8px;"><strong>Time:</strong> ${bookingTime}</p>
              <p style="margin: 0;"><strong>Type:</strong> ${bookingType}</p>
            </div>
            <a href="https://planflow-liej06c3m-lachlan-quinns-projects.vercel.app" style="display: inline-block; background: #185FA5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">Open PlanFlow</a>
            <p style="margin: 24px 0 0; color: #888; font-size: 12px;">This is an automated notification from PlanFlow.</p>
          </div>
        </div>
      `
    })
    return { success: true }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error }
  }
}