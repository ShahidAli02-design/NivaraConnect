import nodemailer, { type Transporter } from 'nodemailer';
import dns from 'dns';

// Render's (and many container hosts') outbound network only supports IPv4,
// but Node's default DNS resolution can still hand back smtp.gmail.com's
// IPv6 address first, and the connection then fails with ENETUNREACH. This
// forces IPv4 to be tried first for every outbound connection in this
// process — safe globally, since nothing else here needs IPv6.
dns.setDefaultResultOrder('ipv4first');

// Primary path: Gmail SMTP via an App Password (GMAIL_USER / GMAIL_APP_PASSWORD).
// Unlike a transactional API's free tier (Resend, SendGrid, ...), Gmail SMTP
// can deliver to ANY recipient without needing a verified sending domain —
// which is what this app needs, since residents/secretary/security all have
// different, real email addresses and there's no owned domain to verify.
//
// Falls back to the Resend HTTP API (RESEND_API_KEY) if Gmail isn't
// configured, purely as a secondary option — note Resend's free tier is
// sandbox-restricted to the account owner's own email until a domain is
// verified there.
//
// If neither is configured, email sending is silently skipped — the app
// keeps working, it just won't mail anyone. Mirrors the same "optional
// integration" pattern as server/gemini.ts.
let transporter: Transporter | null = null;
let warnedMissingConfig = false;

function getTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }
  return transporter;
}

async function sendViaGmail(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  await t.sendMail({
    from: `"NivaraConnect" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
  return true;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM_EMAIL || 'NivaraConnect <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API error: ${res.status} ${body}`);
  }
  return true;
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    if (await sendViaGmail(to, subject, html)) return;
    if (await sendViaResend(to, subject, html)) return;
    if (!warnedMissingConfig) {
      console.warn('No email provider configured (GMAIL_USER/GMAIL_APP_PASSWORD or RESEND_API_KEY) — email notifications are disabled.');
      warnedMissingConfig = true;
    }
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
