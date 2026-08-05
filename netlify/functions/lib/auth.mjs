import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { read, write } from './store.mjs';

/* ---------------- password hashing ----------------
 * scrypt with a per-password random salt. Deliberately slow, so even if the
 * store were ever exposed, offline cracking is expensive. Plaintext passwords
 * are never written anywhere.
 */
const KEYLEN = 64;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(password), salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const [, saltHex, hashHex] = stored.split('$');
  if (!saltHex || !hashHex) return false;
  let expected;
  try {
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  const actual = scryptSync(String(password), Buffer.from(saltHex, 'hex'), KEYLEN);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/* ---------------- session tokens ----------------
 * Compact signed tokens: base64url(payload).base64url(HMAC-SHA256).
 * The signature means a client cannot forge a role or an identity — any
 * tampering changes the payload and the HMAC no longer matches.
 */
let cachedSecret = null;

/*
 * Must run before any token is signed or verified.
 *
 * Netlify runs several function instances in parallel, so a per-instance random
 * secret would make instance A reject instance B's perfectly valid tokens and
 * log people out at random. The secret therefore has to be shared:
 *   1. SESSION_SECRET from the environment (preferred — survives everything), or
 *   2. one generated once and kept in the server-only store.
 */
export async function initSecret() {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  let stored = await read('session-secret', null);
  if (!stored) {
    stored = randomBytes(32).toString('hex');
    await write('session-secret', stored);
    // If another instance wrote first, converge on whichever value landed.
    stored = (await read('session-secret', stored)) || stored;
  }
  cachedSecret = stored;
  return cachedSecret;
}

function sessionSecret() {
  if (!cachedSecret) throw new Error('Session secret not initialised — call initSecret() first.');
  return cachedSecret;
}

const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function signToken(payload) {
  const body = { ...payload, exp: Date.now() + TTL_MS };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = createHmac('sha256', sessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expected = createHmac('sha256', sessionSecret()).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let body;
  try {
    body = JSON.parse(Buffer.from(encoded, 'base64url').toString());
  } catch {
    return null;
  }
  if (!body?.exp || body.exp < Date.now()) return null;
  return body;
}

/* ---------------- brute-force damping ----------------
 * Per-instance counter. Not a distributed rate limiter, but combined with slow
 * scrypt hashing it makes online password guessing impractical.
 */
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function tooManyAttempts(key) {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

export function noteFailure(key) {
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
  } else {
    rec.count += 1;
  }
}

export function clearAttempts(key) {
  attempts.delete(key);
}
