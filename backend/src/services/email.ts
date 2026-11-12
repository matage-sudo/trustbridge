import { Resend } from 'resend';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const EMAIL_FROM = process.env.EMAIL_FROM || 'TrustBridge <onboarding@resend.dev>';
const APP_NAME = 'TrustBridge';

let _resend: Resend | null = null;
function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

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

export type InviteResult = { userId: string | null; emailSent: boolean; skipped?: string };

export async function sendInviteEmail(email: string, kind: 'patient' | 'staff' = 'staff'): Promise<InviteResult> {
  const admin = supabaseAdmin();
  const redirectTo = `${FRONTEND_URL}/reset-password`;

  let linkRes = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } });
  if (linkRes.error && /already|exist/i.test(linkRes.error.message)) {
    linkRes = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } });
  }
  if (linkRes.error || !linkRes.data?.properties?.action_link) {
    throw new Error(`generateLink failed: ${linkRes.error?.message ?? 'no_link'}`);
  }
  const url = linkRes.data.properties.action_link;
  const userId = linkRes.data.user?.id ?? null;

  const resend = resendClient();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — invite skipped. Link:', url);
    return { userId, emailSent: false, skipped: 'no_resend_api_key' };
  }

  const blurb = kind === 'patient'
    ? 'Your hospital has created a secure patient portal account for you. Click below to set your password and access your medical records.'
    : 'Your hospital has created a secure TrustBridge account for you. Click below to set your password and access your clinical portal.';

  const sendRes = await resend.emails.send({
    from: EMAIL_FROM, to: email,
    subject: `Activate your ${APP_NAME} account`,
    html: wrapHtml('Welcome to TrustBridge — Activate Your Account', blurb, 'Set My Password', url,
      'If you didn’t expect this email, you can safely ignore it. The link expires in 1 hour.'),
  });
  if ((sendRes as any).error) throw new Error(`Resend send failed: ${(sendRes as any).error.message}`);
  return { userId, emailSent: true };
}

export async function sendResetEmail(email: string): Promise<{ emailSent: boolean; skipped?: string }> {
  const admin = supabaseAdmin();
  const redirectTo = `${FRONTEND_URL}/reset-password`;
  const linkRes = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } });
  if (linkRes.error || !linkRes.data?.properties?.action_link) {
    return { emailSent: false, skipped: 'user_not_found_or_link_failed' };
  }
  const url = linkRes.data.properties.action_link;
  const resend = resendClient();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — reset skipped. Link:', url);
    return { emailSent: false, skipped: 'no_resend_api_key' };
  }
  const sendRes = await resend.emails.send({
    from: EMAIL_FROM, to: email,
    subject: `Reset your ${APP_NAME} password`,
    html: wrapHtml(`Reset your ${APP_NAME} password`,
      'We received a request to reset your password. Click below to choose a new password.',
      'Reset Password', url,
      "If you didn't request this, ignore this email — your password won't change. The link expires in 1 hour."),
  });
  if ((sendRes as any).error) throw new Error(`Resend send failed: ${(sendRes as any).error.message}`);
  return { emailSent: true };
}