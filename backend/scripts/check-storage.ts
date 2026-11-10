import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env: Record<string, string> = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
}
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
console.log('URL:', url, '| key length:', key?.length, '| key prefix:', key?.slice(0, 10));

async function main() {
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: buckets, error: lerr } = await sb.storage.listBuckets();
  if (lerr) { console.log('LIST BUCKETS FAILED:', lerr.message); return; }
  console.log('Buckets:', buckets.map((b) => `${b.name} (public=${b.public})`));

  if (!buckets.some((b) => b.name === 'patient-documents')) {
    console.log('Bucket missing, creating private bucket patient-documents...');
    const { error: cerr } = await sb.storage.createBucket('patient-documents', {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    });
    console.log(cerr ? 'CREATE FAILED: ' + cerr.message : 'Bucket created (private).');
  }

  const testKey = `diagnostic/${Date.now()}.txt`;
  const up = await sb.storage.from('patient-documents').upload(testKey, Buffer.from('ok'), { contentType: 'application/pdf' });
  console.log('Test upload:', up.error ? 'FAILED: ' + up.error.message : 'OK');
  if (!up.error) {
    await sb.storage.from('patient-documents').remove([testKey]);
    console.log('Test file cleaned up.');
  }
}
main().catch((e) => console.log('ERROR:', e.message));