import nodemailer, { type Transporter } from 'nodemailer';

// Uses the account's own Gmail (with an App Password, not the normal login
// password) via SMTP. If GMAIL_USER / GMAIL_APP_PASSWORD aren't set, email
// sending is silently skipped — the app keeps working, it just won't mail
// anyone. Mirrors the same "optional integration" pattern as server/gemini.ts.
let transporter: Transporter | null = null;
let warnedMissingConfig = false;

function getTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    if (!warnedMissingConfig) {
      console.warn('GMAIL_USER / GMAIL_APP_PASSWORD not set — email notifications are disabled.');
      warnedMissingConfig = true;
    }
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }
  return transporter;
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  try {
    await t.sendMail({
      from: `"NivaraConnect" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Never let a failed email break the actual app action (approval, bill
    // creation, etc.) — just log it.
    console.error(`Failed to send email to ${to}:`, err);
  }
}

const wrapper = (bodyHtml: string) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #FAF8F3; padding: 32px 24px; border-radius: 16px;">
  <div style="text-align:center; margin-bottom: 24px;">
    <span style="font-size: 20px; font-weight: 800; color: #1e293b;">Nivara<span style="color:#c8860a;">Connect</span></span>
    <div style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #b8860b; font-weight: 700; margin-top: 2px;">Smart Society Platform</div>
  </div>
  <div style="background: #ffffff; border: 1px solid #f0dfb3; border-radius: 14px; padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
    ${bodyHtml}
  </div>
  <div style="text-align:center; margin-top: 20px; font-size: 11px; color: #94a3b8;">
    Sunrise Heights CHS &middot; This is an automated message from NivaraConnect.
  </div>
</div>`;

export async function sendAccountApprovedEmail(to: string, name: string, role: string): Promise<void> {
  const roleLabel = role === 'admin' ? 'Secretary' : role === 'security' ? 'Security Guard' : 'Resident';
  const html = wrapper(`
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:18px;">Welcome aboard, ${name}! 🎉</h2>
    <p>Your NivaraConnect account has been <strong style="color:#059669;">approved</strong> by the Society Secretary. You now have full <strong>${roleLabel}</strong> access to the portal.</p>
    <p>Thanks for being a part of Sunrise Heights CHS — we're glad to have you on the platform.</p>
    <p style="margin-top:20px;">You can log in anytime with the email and password you registered with.</p>
  `);
  await sendMail(to, 'Your NivaraConnect account has been approved!', html);
}

export async function sendMaintenanceBillEmail(to: string, name: string, bill: {
  month?: string;
  billingMonth?: string;
  totalAmount: number;
  dueDate: string;
  apartmentId: string;
}): Promise<void> {
  const period = bill.month || bill.billingMonth || '';
  const html = wrapper(`
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:18px;">New Maintenance Bill</h2>
    <p>Dear ${name},</p>
    <p>A new maintenance bill has been generated for Flat <strong>${bill.apartmentId}</strong>${period ? ` (${period})` : ''}.</p>
    <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding:6px 0; color:#64748b;">Amount Due</td><td style="padding:6px 0; text-align:right; font-weight:700; color:#b8860b; font-size:16px;">₹${bill.totalAmount}</td></tr>
      <tr><td style="padding:6px 0; color:#64748b;">Due Date</td><td style="padding:6px 0; text-align:right; font-weight:600;">${bill.dueDate}</td></tr>
    </table>
    <p>Please log in to NivaraConnect to view the full breakdown and pay before the due date.</p>
  `);
  await sendMail(to, `New Maintenance Bill — ₹${bill.totalAmount} due ${bill.dueDate}`, html);
}
