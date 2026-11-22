import { Router } from 'express';
import { prisma } from '../models/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes, randomInt } from 'node:crypto'; // hardening:mfa-imports
import { currentTenant } from '../middleware/tenantContext';
import { requireMfa } from '../middleware/auth'; // hardening:mfa-gate-import
import { sendMfaSecurityAlertEmail, sendMfaEmailOtpEmail } from '../services/email'; // Added email import
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const router = Router();
const rpName = 'TrustBridge';
const rpID = process.env.NODE_ENV === 'production' ? 'trustbridgeke-iota.vercel.app' : 'localhost';
const origin = process.env.NODE_ENV === 'production' ? 'https://trustbridgeke-iota.vercel.app' : 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET as string; // hardening:mfa-secret
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');

const issueMfaToken = (userId: string) => {
  return jwt.sign({ sub: userId, aal: 'aal2' }, JWT_SECRET, { expiresIn: '12h' });
};

// Helper for Audit Logs
const logAudit = async (userId: string, action: string, outcome: string = 'SUCCESS') => {
  try {
    await prisma.auditEvent.create({
      data: { tenantId: currentTenant().tenantId, actorUserId: userId, action, resourceType: 'MFA', outcome } // hardening:mfa-audit
    });
  } catch (e) { console.error('Audit log failed', e); }
};

router.post('/passkey/generate-registration-options', requireMfa, async (req, res) => { // hardening:mfa-gate-regopts
  const userId = req.header('x-user-id')!;
  const user = await prisma.userIdentity.findUnique({ where: { id: userId }, include: { passkeys: true } });

  const options = await generateRegistrationOptions({
    rpName, rpID, userID: new TextEncoder().encode(userId), userName: user?.email || 'user', attestationType: 'none',
    excludeCredentials: user?.passkeys.map(pk => ({ id: pk.credentialID })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });
  res.json(options);
});

router.post('/passkey/verify-registration', requireMfa, async (req, res) => { // hardening:mfa-gate-regverify
  const userId = req.header('x-user-id')!;
  const body = req.body;
  
  const verification = await verifyRegistrationResponse({
    response: body, expectedChallenge: body.challenge, expectedOrigin: origin, expectedRPID: rpID,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await prisma.passkeyCredential.create({
      data: { userId, credentialID: credential.id, publicKey: Buffer.from(credential.publicKey).toString('base64url'), counter: credential.counter, deviceType: credentialDeviceType, backedUp: credentialBackedUp }
    });
    
    // Log and Alert
    await logAudit(userId, 'PASSKEY_REGISTERED');
    const user = await prisma.userIdentity.findUnique({ where: { id: userId } });
    if (user?.email) await sendMfaSecurityAlertEmail(user.email, 'New Passkey Registered');

    return res.json({ verified: true });
  }
  res.status(400).json({ verified: false });
});

router.post('/passkey/generate-authentication-options', async (req, res) => {
  const userId = req.header('x-user-id')!;
  const user = await prisma.userIdentity.findUnique({ where: { id: userId }, include: { passkeys: true } });
  const options = await generateAuthenticationOptions({
    rpID, allowCredentials: user?.passkeys.map(pk => ({ id: pk.credentialID })), userVerification: 'preferred',
  });
  res.json(options);
});

router.post('/passkey/verify-authentication', async (req, res) => {
  const userId = req.header('x-user-id')!;
  const body = req.body;
  const passkey = await prisma.passkeyCredential.findUnique({ where: { credentialID: body.id } });

  if (!passkey || passkey.userId !== userId) {
    await logAudit(userId, 'PASSKEY_LOGIN_FAILED', 'FAILURE');
    return res.status(404).json({ error: 'Passkey not found' });
  }

  const verification = await verifyAuthenticationResponse({
    response: body, expectedChallenge: body.challenge, expectedOrigin: origin, expectedRPID: rpID,
    credential: { id: passkey.credentialID, publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')), counter: passkey.counter },
  });

  if (verification.verified) {
    await prisma.passkeyCredential.update({ where: { id: passkey.id }, data: { counter: verification.authenticationInfo.newCounter } });
    await logAudit(userId, 'PASSKEY_LOGIN_SUCCESS');
    return res.json({ verified: true, mfaToken: issueMfaToken(userId) });
  }
  res.status(400).json({ verified: false });
});

router.post('/recovery/generate', requireMfa, async (req, res) => { // hardening:mfa-gate-recovery
  const userId = req.header('x-user-id')!;
  await prisma.recoveryCode.deleteMany({ where: { userId, used: false } });

  const plainCodes = [];
  const hashedCodes = [];
  for (let i = 0; i < 8; i++) {
    const code = randomBytes(6).toString('hex').toUpperCase(); // hardening:mfa-codes 
    plainCodes.push(code);
    hashedCodes.push(await bcrypt.hash(code, 10));
  }

  await prisma.recoveryCode.createMany({ data: hashedCodes.map(hash => ({ userId, codeHash: hash })) });

  // Log and Alert
  await logAudit(userId, 'RECOVERY_CODES_GENERATED');
  const user = await prisma.userIdentity.findUnique({ where: { id: userId } });
  if (user?.email) await sendMfaSecurityAlertEmail(user.email, 'New Recovery Codes Generated');

  res.json({ codes: plainCodes });
});

router.post('/recovery/verify', async (req, res) => {
  const userId = req.header('x-user-id')!;
  const { code } = req.body;
  if (typeof code !== 'string' || code.length < 6 || code.length > 64) { res.status(400).json({ error: 'Invalid or already used recovery code.' }); return; } // hardening:mfa-code-type
  const codes = await prisma.recoveryCode.findMany({ where: { userId, used: false } });

  for (const dbCode of codes) {
    const match = await bcrypt.compare(code, dbCode.codeHash);
    if (match) {
      await prisma.recoveryCode.update({ where: { id: dbCode.id }, data: { used: true } });
      await logAudit(userId, 'RECOVERY_CODE_USED');
      return res.json({ verified: true, mfaToken: issueMfaToken(userId) });
    }
  }

  await logAudit(userId, 'RECOVERY_CODE_FAILED', 'FAILURE');
  res.status(400).json({ error: 'Invalid or already used recovery code.' });
});


// ---------- Email OTP ----------
const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_OTP_MAX_ATTEMPTS = 5;

router.post('/email/send', async (req, res) => {
  const userId = req.header('x-user-id')!;
  const user = await prisma.userIdentity.findUnique({ where: { id: userId } });
  if (!user?.email) return res.status(400).json({ error: 'no_email_on_account' });

  // rate-limit: max 1 send per 60s
  const recent = await prisma.emailOtp.findFirst({
    where: { userId, used: false, createdAt: { gte: new Date(Date.now() - 60_000) } },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) return res.status(429).json({ error: 'email_otp_rate_limited', retryAfterSeconds: 60 });

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.emailOtp.deleteMany({ where: { userId, used: false } });
  await prisma.emailOtp.create({
    data: { userId, codeHash, expiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS) },
  });

  const result = await sendMfaEmailOtpEmail(user.email, code);
  if (result.skipped) req.log?.warn({ userId, reason: result.skipped }, 'email_otp_send_skipped');

  await logAudit(userId, 'EMAIL_OTP_SENT');
  res.json({ sent: true, expiresInSeconds: EMAIL_OTP_TTL_MS / 1000 });
});

router.post('/email/verify', async (req, res) => {
  const userId = req.header('x-user-id')!;
  const { code } = req.body ?? {};
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'invalid_code_format' });
  }

  const otp = await prisma.emailOtp.findFirst({
    where: { userId, used: false },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) return res.status(400).json({ error: 'no_active_email_otp' });
  if (otp.expiresAt < new Date()) {
    await prisma.emailOtp.update({ where: { id: otp.id }, data: { used: true } });
    return res.status(400).json({ error: 'email_otp_expired' });
  }
  if (otp.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'email_otp_too_many_attempts' });
  }

  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) {
    await prisma.emailOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    await logAudit(userId, 'EMAIL_OTP_FAILED', 'FAILURE');
    return res.status(400).json({ error: 'invalid_email_otp' });
  }

  await prisma.emailOtp.update({ where: { id: otp.id }, data: { used: true } });
  await logAudit(userId, 'EMAIL_OTP_VERIFIED');

  const user = await prisma.userIdentity.findUnique({ where: { id: userId } });
  if (user?.email) await sendMfaSecurityAlertEmail(user.email, 'Email OTP used to sign in');

  return res.json({ verified: true, mfaToken: issueMfaToken(userId) });
});
export const mfaRouter = router;