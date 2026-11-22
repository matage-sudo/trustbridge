
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

// =====================================================================
// GENERIC EMAIL FUNCTION
// Added for system notifications (documents, assignments, representatives)
// =====================================================================
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ sent: boolean; error?: string }> {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.warn('[EMAIL] BREVO_API_KEY not configured. Skipping send.');
      return { sent: false, error: 'missing_api_key' };
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@trustbridge.co.ke';
    const senderName = process.env.BREVO_SENDER_NAME || 'TrustBridge';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        subject: subject,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1e40af; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">TrustBridge</h1>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
              ${htmlContent}
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              This is an automated notification from TrustBridge. Please do not reply.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[EMAIL] Brevo API error:', response.status, errText);
      return { sent: false, error: `brevo_${response.status}` };
    }

    console.log(`[EMAIL] Sent successfully to ${to}: ${subject}`);
    return { sent: true };
  } catch (err: any) {
    console.error('[EMAIL] Failed to send:', err?.message);
    return { sent: false, error: err?.message };
  }
}

// =====================================================================
// REPRESENTATIVE ACCESS EMAIL
// Tries Supabase invite first (new user), falls back to password-reset
// link (existing user). Never throws — logs warnings and returns status.
// =====================================================================
export async function sendRepresentativeAccessEmail(
  email: string
): Promise<{ sent: boolean; mode: 'invite' | 'recovery' | 'skipped'; error?: string }> {
  const normalized = String(email).trim().toLowerCase();
  const admin = supabaseAdmin();
  const redirectTo = `${FRONTEND_URL}/reset-password`;

  // Try invite (new user)
  try {
    const { error } = await admin.auth.admin.inviteUserByEmail(normalized, { redirectTo });
    if (!error) {
      console.log(`[EMAIL] Representative invite sent to ${normalized}`);
      return { sent: true, mode: 'invite' };
    }

    // User already exists? Fall back to recovery link.
    const msg = (error.message || '').toLowerCase();
    const isAlreadyRegistered = msg.includes('already') || msg.includes('registered') || msg.includes('exists');
    if (!isAlreadyRegistered) {
      console.warn(`[EMAIL] Invite failed for ${normalized}: ${error.message}`);
      return { sent: false, mode: 'invite', error: error.message };
    }
  } catch (err: any) {
    console.warn(`[EMAIL] Invite threw for ${normalized}: ${err?.message}`);
    // fall through to recovery
  }

  // Recovery path (existing user)
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: normalized,
      options: { redirectTo },
    });
    if (error || !data?.properties?.action_link) {
      console.warn(`[EMAIL] Recovery link failed for ${normalized}: ${error?.message}`);
      return { sent: false, mode: 'recovery', error: error?.message || 'no_action_link' };
    }

    // Send the recovery link via Brevo so branding/content matches the rest of the app
    const { sendEmail } = await import('./email');
    await sendEmail(
      normalized,
      'Set Your TrustBridge Password',
      `<p>Hello,</p>
       <p>Hospital administration has authorized you as a representative on TrustBridge.</p>
       <p>Click the button below to set your password and access the portal. This link expires in 1 hour.</p>
       <p><a href="${data.properties.action_link}" style="display:inline-block;background:#1e40af;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Set Password</a></p>
       <p>If the button doesn't work, copy this link into your browser:<br/><span style="color:#64748b;font-size:12px;">${data.properties.action_link}</span></p>`
    );
    console.log(`[EMAIL] Representative recovery link sent to ${normalized}`);
    return { sent: true, mode: 'recovery' };
  } catch (err: any) {
    console.warn(`[EMAIL] Recovery threw for ${normalized}: ${err?.message}`);
    return { sent: false, mode: 'recovery', error: err?.message };
  }
}

export async function sendMfaEmailOtpEmail(to: string, code: string): Promise<{ sent: boolean; skipped?: string }> {
  const subject = "Your TrustBridge verification code";
  const body = 
    <p>Your TrustBridge two-factor verification code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:6px;text-align:center;padding:12px 0;">${code}</p>
    <p>This code expires in <strong>10 minutes</strong>. If you did not request it, change your password immediately.</p>
  ;
  return sendEmail({ to, subject, html: wrapHtml(subject, body) });
}
