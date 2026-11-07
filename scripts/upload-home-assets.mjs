// Uploads the home-page photos to Supabase Storage (public bucket `meal-images`, folder `home/`).
// Usage: node scripts/upload-home-assets.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local. Safe to re-run (upsert).
import { readFileSync } from 'node:fs';

const BUCKET = 'meal-images';
const FOLDER = 'home';

// name -> Unsplash photo id. Keep in sync with src/lib/home-assets.ts.
const PHOTOS = {
  'smart-1': '1544025162-d76694265947',
  'smart-2': '1546069901-ba9599a7e63c',
  'smart-3': '1512621776951-a57141f2eefd',
  'smart-4': '1598515214211-89d3c73ae83b',
  'menu-1': '1562967914-608f82629710',
  'menu-2': '1529006557810-274b9b2fc783',
  'menu-3': '1568901346375-23c9450c58cd',
  'menu-4': '1555939594-58d7cb561ad1',
  'float-1': '1509722747041-616f39b57569',
  'float-2': '1585937421612-70a008356fbe',
  'float-3': '1551183053-bf91a1d81141',
  'float-4': '1504674900247-0877df9cc836',
  'float-5': '1541544741938-0af808871cc0',
  'float-6': '1546173159-315724a31696',
};

function loadEnv() {
  const env = {};
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

const env = loadEnv();
const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!base || !key) throw new Error('Missing Supabase credentials in .env.local');

let failed = 0;
for (const [name, id] of Object.entries(PHOTOS)) {
  try {
    const src = `https://images.unsplash.com/photo-${id}?w=1400&auto=format&fit=crop&q=80`;
    const res = await fetch(src);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const up = await fetch(`${base}/storage/v1/object/${BUCKET}/${FOLDER}/${name}.jpg`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
        'cache-control': 'max-age=31536000',
      },
      body: buf,
    });
    const text = await up.text();
    if (!up.ok) throw new Error(`upload ${up.status} ${text.slice(0, 160)}`);
    console.log(`ok   ${name}.jpg  ${(buf.length / 1024).toFixed(0)} KB`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${e.message}`);
  }
}
console.log(failed ? `${failed} failed` : 'all uploaded');
process.exit(failed ? 1 : 0);
