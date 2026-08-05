/*
 * Server-only data store.
 *
 * In production this is Netlify Blobs: reachable only from inside a function,
 * never from a browser, with no URL or key that could leak into the client
 * bundle. Locally (plain `node`, tests) it falls back to a gitignored JSON file
 * so the same code runs without cloud credentials.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LOCAL_DIR = path.resolve(process.cwd(), '.data');
let blobStore;
let blobsUnavailable = false;

async function getBlobStore() {
  if (blobStore) return blobStore;
  if (blobsUnavailable) return null;
  try {
    const { getStore } = await import('@netlify/blobs');
    blobStore = getStore({ name: 'club', consistency: 'strong' });
    return blobStore;
  } catch {
    blobsUnavailable = true;
    return null;
  }
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
