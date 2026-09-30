// Primary path: the Gmail REST API (HTTPS, OAuth2) — NOT SMTP. Render's
// free-tier network blocks all outbound SMTP ports (confirmed: both 465 and
// 587 time out), so nodemailer-over-SMTP can never work here no matter how
// it's configured. The Gmail API sends the exact same way as SMTP would
// (as the real Gmail account, to any recipient, no domain verification
// needed) but travels over plain HTTPS, which isn't blocked.
//
// Needs three things from Google Cloud Console (one-time OAuth2 setup):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
// plus GMAIL_USER (the Gmail address these were issued for — the "From").
//
// Falls back to the Resend HTTP API (RESEND_API_KEY) if the Gmail API isn't
// configured or a send fails — note Resend's free tier is sandbox-restricted
// to the account owner's own email until a domain is verified there.
//
// If nothing is configured, email sending is silently skipped — the app
// keeps working, it just won't mail anyone. Mirrors the same "optional
// integration" pattern as server/gemini.ts.

let warnedMissingConfig = false;

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getGmailAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 30000) {
    return cachedAccessToken.token;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google OAuth token refresh failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

// RFC 2047 encoded-word, only needed when the subject has non-ASCII chars (₹, etc.)
function encodeSubject(subject: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

async function sendViaGmailApi(to: string, subject: string, html: string): Promise<boolean> {
  const accessToken = await getGmailAccessToken();
  if (!accessToken) return false;

  const from = process.env.GMAIL_USER;
  if (!from) return false;

  const raw = [
    `From: "NivaraConnect" <${from}>`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ].join('\r\n');

  const encoded = Buffer.from(raw, 'utf8').toString('base64url');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gmail API send failed: ${res.status} ${body}`);
  }
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
    // A Gmail API failure (bad/expired refresh token, etc.) should still
    // fall through to Resend if it's configured — not just when the Gmail
    // API is unset entirely.
    try {
      if (await sendViaGmailApi(to, subject, html)) return;
    } catch (gmailErr) {
      console.error(`Gmail API send failed for ${to}, trying Resend fallback:`, gmailErr);
    }
    if (await sendViaResend(to, subject, html)) return;
    if (!warnedMissingConfig) {
      console.warn('No email provider configured (GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN + GMAIL_USER, or RESEND_API_KEY) — email notifications are disabled.');
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
