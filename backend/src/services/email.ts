import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const APP_NAME = 'TrustBridge';

let _supabaseAdmin: SupabaseClient | null = null;
function supabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    _supabaseAdmin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return _supabaseAdmin;
}

function wrapHtml(headline: string, blurb: string, cta: string, url: string, footnote: string): string {
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:32px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.05);">
<h1 style="color:#0f172a;margin:0 0 16px;font-size:20px;">${headline}</h1>
<p style="color:#334155;font-size:14px;line-height:1.6;">${blurb}</p>
<p style="text-align:center;margin:28px 0;">
<a href="${url}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">${cta}</a></p>
<p style="color:#64748b;font-size:12px;line-height:1.5;">If the button doesn't work, paste this link into your browser:</p>
<p style="color:#2563eb;font-size:11px;word-break:break-all;">${url}</p>
<p style="color:#94a3b8;font-size:11px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">${footnote}</p>
</div></body></html>`;
}

async function sendViaKeplars(to: string, subject: string, html: string) {
  const KEPLARS_API_KEY = process.env.KEPLARS_API_KEY;
  if (!KEPLARS_API_KEY) {
    console.warn('[email] KEPLARS_API_KEY not set — email skipped. Link:', html.match(/href="([^"]+)"/)?.[1]);
    return false;
  }

  const res = await fetch('https://api.keplars.com/api/v1/send-email/instant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEPLARS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: [to], subject, body: html }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Keplars API error: ${err.error?.message || err.message || res.statusText}`);
  }
  return true;
}

export type InviteResult = { userId: string | null; emailSent: boolean; skipped?: string };

export async function sendInviteEmail(email: string, kind: 'patient' | 'staff' = 'staff'): Promise<InviteResult> {
  const admin = supabaseAdmin();
  const redirectTo = `${FRONTEND_URL}/reset-password`;

  let linkRes = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } });
  if (linkRes.error && /already|exist/i.test(linkRes.error.message)) {
    linkRes = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } });
  }
  if (linkRes.error || !linkRes.data?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${linkRes.error?.message ?? 'no_token'}`);
  }
  
  // Build the URL explicitly using the hashed_token
  const url = `${FRONTEND_URL}/reset-password?token_hash=${linkRes.data.properties.hashed_token}&type=recovery`;
  const userId = linkRes.data.user?.id ?? null;

  const blurb = kind === 'patient'
    ? 'Your hospital has created a secure patient portal account for you. Click below to set your password and access your medical records.'
    : 'Your hospital has created a secure TrustBridge account for you. Click below to set your password and access your clinical portal.';

  const html = wrapHtml('Welcome to TrustBridge — Activate Your Account', blurb, 'Set My Password', url,
    'If you didn’t expect this email, you can safely ignore it. The link expires in 12 hours.');

  const sent = await sendViaKeplars(email, `Activate your ${APP_NAME} account`, html);
  return { userId, emailSent: sent };
}

export async function sendResetEmail(email: string): Promise<{ emailSent: boolean; skipped?: string }> {
  const admin = supabaseAdmin();
  const redirectTo = `${FRONTEND_URL}/reset-password`;
  const linkRes = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } });
  
  if (linkRes.error || !linkRes.data?.properties?.hashed_token) {
    return { emailSent: false, skipped: 'user_not_found_or_link_failed' };
  }
  
  // Build the URL explicitly using the hashed_token
  const url = `${FRONTEND_URL}/reset-password?token_hash=${linkRes.data.properties.hashed_token}&type=recovery`;

  const html = wrapHtml(`Reset your ${APP_NAME} password`,
    'We received a request to reset your password. Click below to choose a new password.',
    'Reset Password', url,
    'If you didn\'t request this, ignore this email — your password won\'t change. The link expires in 12 hours.');

  const sent = await sendViaKeplars(email, `Reset your ${APP_NAME} password`, html);
  return { emailSent: sent };
}
export async function sendMfaSecurityAlertEmail(email: string, action: string): Promise<void> {
  const html = wrapHtml(
    'Security Alert: MFA Updated',
    `A new security method was added or used on your ${APP_NAME} account: <strong>${action}</strong>. If you did not authorize this, please contact support immediately.`,
    'Review Account Security',
    `${FRONTEND_URL}/patient/security`,
    'This is an automated security notification.'
  );
  await sendViaKeplars(email, `Security Alert: ${action}`, html);
}