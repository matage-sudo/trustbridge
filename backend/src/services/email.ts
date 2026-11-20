
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const APP_NAME = 'TrustBridge';

let _supabaseAdmin: SupabaseClient | null = null;

function supabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    }

    _supabaseAdmin = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return _supabaseAdmin;
}

function wrapHtml(
  headline: string,
  blurb: string,
  cta: string,
  url: string,
  footnote: string
): string {
  return `<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:32px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.05);">
<h1 style="color:#0f172a;margin:0 0 16px;font-size:20px;">${headline}</h1>
<p style="color:#334155;font-size:14px;line-height:1.6;">${blurb}</p>
<p style="text-align:center;margin:28px 0;">
<a href="${url}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">${cta}</a></p>
<p style="color:#64748b;font-size:12px;line-height:1.5;">If the button doesn't work, paste this link into your browser:</p>
<p style="color:#2563eb;font-size:11px;word-break:break-all;">${url}</p>
<p style="color:#94a3b8;font-size:11px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">${footnote}</p>
</div>
</body>
</html>`;
}

async function sendViaBrevo(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || APP_NAME;

  if (!apiKey) {
    console.warn(
      '[email] BREVO_API_KEY not set - email skipped. Link:',
      html.match(/href="([^"]+)"/)?.[1]
    );
    return false;
  }

  if (!senderEmail) {
    throw new Error('BREVO_SENDER_EMAIL is required');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as
      | { message?: string; code?: string }
      | null;

    throw new Error(
      `Brevo API error (${response.status}): ${
        errorBody?.message || errorBody?.code || response.statusText
      }`
    );
  }

  // Brevo accepted the email request. This does not guarantee inbox delivery.
  return true;
}

export type InviteResult = {
  userId: string | null;
  emailSent: boolean;
  skipped?: string;
};

export async function sendInviteEmail(
  email: string,
  kind: 'patient' | 'staff' = 'staff'
): Promise<InviteResult> {
  const admin = supabaseAdmin();
  const redirectTo = `${FRONTEND_URL}/reset-password`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { kind },
  });

  if (error) {
    throw new Error(`inviteUserByEmail failed: ${error.message}`);
  }

  return { userId: data.user?.id ?? null, emailSent: true };
}

export async function sendResetEmail(
  email: string
): Promise<{ emailSent: boolean; skipped?: string }> {
  const admin = supabaseAdmin();
  const redirectTo = `${FRONTEND_URL}/reset-password`;

  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { emailSent: false, skipped: error.message };
  }

  return { emailSent: true };
}

export async function sendMfaSecurityAlertEmail(
  email: string,
  action: string
): Promise<void> {
  const html = wrapHtml(
    'Security Alert: MFA Updated',
    `A new security method was added or used on your ${APP_NAME} account: <strong>${action}</strong>. If you did not authorize this, please contact support immediately.`,
    'Review Account Security',
    `${FRONTEND_URL}/patient/security`,
    'This is an automated security notification.'
  );

  await sendViaBrevo(
    email,
    `Security Alert: ${action}`,
    html
  );
}
