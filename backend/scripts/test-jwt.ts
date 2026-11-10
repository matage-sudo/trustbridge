/**
 * Diagnostic: proves the JWT middleware works end-to-end.
 *
 *   1. Mints a real Supabase JWT for alice@example.test
 *   2. Calls /v1/me/profile with the token → expects 200
 *   3. Calls /v1/me/profile with a spoofed x-user-id → depends on env
 *
 * Usage: npx tsx scripts/test-jwt.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../src/models/prisma';

const BASE = process.env.API_BASE || 'http://127.0.0.1:4000/v1';
const TENANT = 'ad0a4777-cee4-4e69-894a-410648d8b22a';
const ALICE_EMAIL = 'alice@example.test';
const ALICE_PASSWORD = process.env.ALICE_PASSWORD || 'password123';

async function main() {
  console.log('=== JWT End-to-End Test ===\n');

  // 1. Mint a real JWT
  console.log('[1] Minting real Supabase JWT for', ALICE_EMAIL, '...');
  const { token, error } = await mintTestJwt(ALICE_EMAIL, ALICE_PASSWORD);
  if (!token) {
    console.error('    ❌ Could not mint token:', error);
    console.error('    Fix: ensure ALICE_PASSWORD matches alice@example.test');
    console.error('    and SUPABASE_ANON_KEY is in .env');
    process.exit(1);
  }
  console.log('    ✅ Token minted, length:', token.length, '\n');

  // 2. Call with real JWT (expect 200)
  console.log('[2] GET /me/profile with real Bearer token...');
  const r1 = await fetch(`${BASE}/me/profile`, {
    headers: {
      'x-tenant-id': TENANT,
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(
    `    ${r1.status === 200 ? '✅' : '❌'} Status:`,
    r1.status,
    '— expected 200\n'
  );

  // 3. Call with spoofed header and NO token
  console.log('[3] GET /me/profile with ONLY spoofed x-user-id header...');
  const r2 = await fetch(`${BASE}/me/profile`, {
    headers: {
      'x-tenant-id': TENANT,
      'x-user-id': '00000000-0000-0000-0000-000000000000',
      'x-role': 'HOSPITAL_ADMIN',
    },
  });
  const devOn = process.env.ALLOW_DEV_HEADERS === 'true';
  console.log(
    `    Status:`,
    r2.status,
    devOn ? '— expected 200 (dev fallback ON)' : '— expected 401 (dev fallback OFF)'
  );

  // 4. Call with invalid token
  console.log('\n[4] GET /me/profile with INVALID Bearer token...');
  const r3 = await fetch(`${BASE}/me/profile`, {
    headers: {
      'x-tenant-id': TENANT,
      Authorization: 'Bearer this-is-not-a-valid-jwt',
    },
  });
  console.log(`    ${r3.status === 401 ? '✅' : '❌'} Status:`, r3.status, '— expected 401\n');

  console.log('=== Done ===');
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});