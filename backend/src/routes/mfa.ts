import { Router } from 'express';
import { prisma } from '../models/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

const issueMfaToken = (userId: string) => {
  return jwt.sign({ sub: userId, aal: 'aal2' }, JWT_SECRET, { expiresIn: '12h' });
};

router.post('/passkey/generate-registration-options', async (req, res) => {
  const userId = req.header('x-user-id')!;
  const user = await prisma.userIdentity.findUnique({ where: { id: userId }, include: { passkeys: true } });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(userId), // FIX: Convert string to Uint8Array
    userName: user?.email || 'user',
    attestationType: 'none',
    excludeCredentials: user?.passkeys.map(pk => ({
      id: pk.credentialID, // FIX: Buffer -> string
    })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });

  res.json(options);
});

router.post('/passkey/verify-registration', async (req, res) => {
  const userId = req.header('x-user-id')!;
  const body = req.body;
  
  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: body.challenge, 
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (verification.verified && verification.registrationInfo) {
    // FIX: Properties are now nested under `credential`
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    
    await prisma.passkeyCredential.create({
      data: {
        userId,
        credentialID: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
      }
    });
    return res.json({ verified: true });
  }
  res.status(400).json({ verified: false });
});

router.post('/passkey/generate-authentication-options', async (req, res) => {
  const userId = req.header('x-user-id')!;
  const user = await prisma.userIdentity.findUnique({ where: { id: userId }, include: { passkeys: true } });

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user?.passkeys.map(pk => ({
      id: pk.credentialID, // FIX: Buffer -> string
    })),
    userVerification: 'preferred',
  });

  res.json(options);
});

router.post('/passkey/verify-authentication', async (req, res) => {
  const userId = req.header('x-user-id')!;
  const body = req.body;
  
  const passkey = await prisma.passkeyCredential.findUnique({
    where: { credentialID: body.id }
  });

  if (!passkey || passkey.userId !== userId) return res.status(404).json({ error: 'Passkey not found' });

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge: body.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: { // FIX: `authenticator` renamed to `credential`
      id: passkey.credentialID,
      publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
      counter: passkey.counter,
    },
  });

  if (verification.verified) {
    await prisma.passkeyCredential.update({
      where: { id: passkey.id },
      data: { counter: verification.authenticationInfo.newCounter }
    });
    const mfaToken = issueMfaToken(userId);
    return res.json({ verified: true, mfaToken });
  }
  res.status(400).json({ verified: false });
});

router.post('/recovery/generate', async (req, res) => {
  const userId = req.header('x-user-id')!;
  
  await prisma.recoveryCode.deleteMany({ where: { userId, used: false } });

  const plainCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < 8; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase(); 
    plainCodes.push(code);
    hashedCodes.push(await bcrypt.hash(code, 10));
  }

  await prisma.recoveryCode.createMany({
    data: hashedCodes.map(hash => ({ userId, codeHash: hash }))
  });

  res.json({ codes: plainCodes });
});

router.post('/recovery/verify', async (req, res) => {
  const userId = req.header('x-user-id')!;
  const { code } = req.body;

  const codes = await prisma.recoveryCode.findMany({ where: { userId, used: false } });

  for (const dbCode of codes) {
    const match = await bcrypt.compare(code, dbCode.codeHash);
    if (match) {
      await prisma.recoveryCode.update({ where: { id: dbCode.id }, data: { used: true } });
      const mfaToken = issueMfaToken(userId);
      return res.json({ verified: true, mfaToken });
    }
  }

  res.status(400).json({ error: 'Invalid or already used recovery code.' });
});

export const mfaRouter = router;