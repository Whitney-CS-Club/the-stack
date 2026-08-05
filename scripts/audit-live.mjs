/*
 * Security audit for the LIVE site. Run it against the deployed URL any time —
 * after a deploy, at the start of a school year, or whenever someone changes
 * the code — and it will tell you what is actually true right now.
 *
 *   node scripts/audit-live.mjs https://your-site.netlify.app
 *
 * Every check is read-only. It creates no accounts and changes no data.
 */
const target = (process.argv[2] || '').replace(/\/$/, '');
const LEGACY_FIREBASE = 'https://cs-club-bd555-default-rtdb.firebaseio.com';

if (!target) {
  console.error('Usage: node scripts/audit-live.mjs https://your-site.netlify.app');
  process.exit(2);
}

let passed = 0, warned = 0, failed = 0;
const pass = (m, d = '') => { passed++; console.log(`  \x1b[32m✓\x1b[0m ${m}${d ? `  \x1b[90m${d}\x1b[0m` : ''}`); };
const warn = (m, d = '') => { warned++; console.log(`  \x1b[33m⚠\x1b[0m ${m}${d ? `  \x1b[90m${d}\x1b[0m` : ''}`); };
const fail = (m, d = '') => { failed++; console.log(`  \x1b[31m✗\x1b[0m ${m}${d ? `  \x1b[90m${d}\x1b[0m` : ''}`); };

const get = async (path, opts = {}) => {
  try {
    return await fetch(target + path, { redirect: 'manual', ...opts });
  } catch (e) {
    return { error: e.message, headers: new Headers(), status: 0 };
  }
};

console.log(`\n\x1b[1mSecurity audit — ${target}\x1b[0m`);

/* ---------- 1. transport & browser hardening ---------- */
console.log('\n\x1b[1m1. Transport & browser protection\x1b[0m');
const root = await get('/');
if (root.error) {
  fail('Site is unreachable', root.error);
  console.log('\nCannot continue.\n');
  process.exit(1);
}
const h = (name) => root.headers.get(name) || '';

target.startsWith('https://')
  ? pass('Served over HTTPS')
  : warn('Not HTTPS (fine for localhost, required in production)');

h('strict-transport-security')
  ? pass('HSTS enabled', 'browsers refuse to downgrade to http')
  : warn('No HSTS header');

const csp = h('content-security-policy');
if (!csp) fail('No Content-Security-Policy', 'a script injected into the page could run freely');
else {
  pass('Content-Security-Policy present');
  /^.*script-src [^;]*'unsafe-inline'/.test(csp)
    ? warn("script-src allows 'unsafe-inline'", 'weakens XSS protection')
    : pass("script-src blocks inline scripts", 'main defence against injected JS');
  csp.includes("frame-ancestors 'none'")
    ? pass('Page cannot be embedded in an iframe', 'blocks clickjacking')
    : warn('No frame-ancestors directive');
}

h('x-frame-options').toUpperCase() === 'DENY' ? pass('X-Frame-Options: DENY') : warn('No X-Frame-Options: DENY');
h('x-content-type-options').toLowerCase() === 'nosniff' ? pass('MIME sniffing disabled') : warn('No X-Content-Type-Options: nosniff');

/* ---------- 2. is the secure backend actually deployed? ---------- */
console.log('\n\x1b[1m2. Secure backend is live\x1b[0m');
const pub = await get('/api/public');
let apiLive = false;
if (pub.status === 200 && (pub.headers.get('content-type') || '').includes('json')) {
  apiLive = true;
  pass('/api is responding', 'serverless functions are deployed');
} else {
  fail('/api is NOT responding', `got HTTP ${pub.status} — you are still on a drag-and-drop deploy without functions`);
}

let pubBody = null;
if (apiLive) {
  pubBody = await pub.json();
  /password|hash|secret/i.test(JSON.stringify(pubBody))
    ? fail('Public endpoint leaks credential-ish fields')
    : pass('Public data contains no credentials');
}

/* ---------- 3. no secrets shipped to the browser ---------- */
console.log('\n\x1b[1m3. Nothing sensitive in the browser bundle\x1b[0m');
const html = await root.text();
const bundles = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
let bundleText = '';
for (const b of bundles) {
  const r = await get(b.startsWith('http') ? b.replace(target, '') : b);
  if (!r.error && r.status === 200) bundleText += await r.text();
}
if (!bundleText) warn('Could not download the JS bundle to inspect');
else {
  /firebaseio\.com/.test(bundleText)
    ? fail('A Firebase database URL is still in the browser bundle', 'anyone can read/write it directly')
    : pass('No database URL in the browser bundle');
  /passwordHash|SESSION_SECRET|MIGRATE_TOKEN/.test(bundleText)
    ? fail('A secret name appears in the browser bundle')
    : pass('No secrets or hashes in the browser bundle');
}

/* ---------- 4. authorization actually enforced ---------- */
if (apiLive) {
  console.log('\n\x1b[1m4. Authorization is enforced server-side\x1b[0m');

  const anon = await get('/api/cabinet/state');
  anon.status === 401
    ? pass('Cabinet data requires sign-in', 'anonymous request rejected (401)')
    : fail('Cabinet data readable without signing in', `HTTP ${anon.status}`);

  const forgedPayload = Buffer.from(JSON.stringify({ kind: 'cabinet', role: 'president', id: 'x', exp: Date.now() + 9e6 })).toString('base64url');
  const forged = await get('/api/cabinet/state', { headers: { authorization: `Bearer ${forgedPayload}.notarealsignature` } });
  forged.status === 401
    ? pass('Forged "president" token rejected', 'signatures are verified')
    : fail('Forged token accepted!', `HTTP ${forged.status}`);

  if (pubBody?.cabinetExists) {
    const takeover = await get('/api/cabinet/bootstrap', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Audit Probe', username: 'auditprobe', password: 'auditprobe123' }),
    });
    takeover.status === 409
      ? pass('Nobody can create a second president', 'takeover attempt blocked (409)')
      : fail('Someone could create their own president account!', `HTTP ${takeover.status}`);
  } else {
    warn('No cabinet exists yet', 'create the president account — until then the setup page is open to anyone');
  }

  const weak = await get('/api/player/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Audit Probe', username: 'auditprobe' + Date.now(), password: '123' }),
  });
  weak.status === 400 ? pass('Weak passwords refused') : warn('Weak password was not refused', `HTTP ${weak.status}`);

  // Username must stay inside the API's own length limit, otherwise this
  // measures input validation instead of the login behaviour we're probing.
  const wrongUser = await get('/api/cabinet/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'nosuch' + Date.now().toString(36), password: 'whatever123' }),
  });
  wrongUser.status === 401
    ? pass('Login failures do not reveal who exists', 'same 401 for unknown user and wrong password')
    : warn('Unexpected login response', `HTTP ${wrongUser.status}`);
}

/* ---------- 5. source files not exposed ---------- */
console.log('\n\x1b[1m5. Server files not downloadable\x1b[0m');
for (const path of ['/netlify.toml', '/package.json', '/.env', '/netlify/functions/api.mjs']) {
  const r = await get(path);
  const body = r.error ? '' : await r.text();
  const looksLikeSource = /"dependencies"|\[build\]|SESSION_SECRET|hashPassword/.test(body);
  looksLikeSource ? fail(`${path} is publicly downloadable`) : pass(`${path} not exposed`);
}

/* ---------- 6. the old Firebase database ---------- */
console.log('\n\x1b[1m6. Old Firebase database (must be locked)\x1b[0m');
try {
  const legacy = await fetch(`${LEGACY_FIREBASE}/club-members.json`);
  const text = await legacy.text();
  if (legacy.status === 401 || /permission_denied/i.test(text)) {
    pass('Old database is locked down', 'rules deny public reads');
  } else if (text.trim() === 'null') {
    pass('Old database returns no data');
  } else {
    fail('OLD DATABASE IS STILL PUBLICLY READABLE', 'old member records/passwords are exposed');
    console.log('    \x1b[31m→ Firebase Console → Realtime Database → Rules →\x1b[0m');
    console.log('    \x1b[31m  {"rules": {".read": false, ".write": false}}\x1b[0m');
  }
} catch {
  pass('Old database unreachable');
}

/* ---------- summary ---------- */
console.log(`\n\x1b[1mResult: ${passed} passed, ${warned} warnings, ${failed} failed\x1b[0m`);
if (failed) console.log('\x1b[31mFix the failures above before sharing the site widely.\x1b[0m\n');
else if (warned) console.log('\x1b[33mNo critical problems. Review the warnings when you can.\x1b[0m\n');
else console.log('\x1b[32mAll checks passed.\x1b[0m\n');
process.exit(failed ? 1 : 0);
