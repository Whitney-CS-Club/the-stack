/*
 * Server-only data store.
 *
 * In production this is Netlify Blobs: reachable only from inside a function,
 * never from a browser, with no URL or key that could leak into the client
 * bundle. Locally (plain `node`, tests) it falls back to a gitignored JSON file
 * so the same code runs without cloud credentials.
 *
 * The fallback is deliberately NOT allowed to happen on a deployed site: a
 * serverless filesystem is read-only and per-instance, so falling back there
 * silently would look like it saved and then lose the data.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LOCAL_DIR = path.resolve(process.cwd(), '.data');
let blobStore;
let blobsChecked = false;
let blobsError = null;

/** True when running on deployed Netlify infrastructure (not local dev/tests). */
function isDeployed() {
  return !!(process.env.NETLIFY && !process.env.NETLIFY_DEV) || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

async function getBlobStore() {
  if (blobsChecked) return blobStore || null;
  blobsChecked = true;

  try {
    const { getStore } = await import('@netlify/blobs');
    const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
    const token = process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

    // Prefer the runtime-injected context; fall back to explicit credentials so
    // the site keeps working on deploys where that context isn't provided.
    blobStore = (siteID && token)
      ? getStore({ name: 'club', siteID, token, consistency: 'strong' })
      : getStore({ name: 'club', consistency: 'strong' });

    // Probe now so a broken configuration surfaces here rather than halfway
    // through someone's sign-up.
    await blobStore.get('__probe__');
    return blobStore;
  } catch (err) {
    blobsError = err;
    blobStore = null;
    return null;
  }
}

export function storageStatus() {
  return {
    backend: blobStore ? 'netlify-blobs' : (isDeployed() ? 'unavailable' : 'local-file'),
    deployed: isDeployed(),
    hasBlobsContext: !!process.env.NETLIFY_BLOBS_CONTEXT,
    hasSiteId: !!(process.env.NETLIFY_SITE_ID || process.env.SITE_ID),
    hasApiToken: !!(process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN),
    error: blobsError ? String(blobsError.message || blobsError).slice(0, 200) : null,
  };
}

async function localPath(key) {
  await mkdir(LOCAL_DIR, { recursive: true });
  return path.join(LOCAL_DIR, `${key}.json`);
}

export async function read(key, fallback) {
  const store = await getBlobStore();
  if (store) {
    try {
      const value = await store.get(key, { type: 'json' });
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }
  if (isDeployed()) {
    // Don't pretend the store is simply empty — that is how data loss hides.
    throw new Error(`Storage unavailable: ${blobsError?.message || 'Netlify Blobs is not configured'}`);
  }
  try {
    return JSON.parse(await readFile(await localPath(key), 'utf8'));
  } catch {
    return fallback;
  }
}

export async function write(key, value) {
  const store = await getBlobStore();
  if (store) {
    await store.setJSON(key, value);
    return true;
  }
  if (isDeployed()) {
    throw new Error(`Storage unavailable: ${blobsError?.message || 'Netlify Blobs is not configured'}`);
  }
  await writeFile(await localPath(key), JSON.stringify(value, null, 2));
  return true;
}

export const KEYS = {
  members: 'members',
  players: 'players',
  tasks: 'tasks',
  events: 'events',
  joinRequests: 'join-requests',
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
