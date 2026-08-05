// Shared club data lives in a Firebase Realtime Database (REST, no SDK).
// Falls back to localStorage when the URL is blank so the site still runs offline.
const FIREBASE_DB_URL = 'https://cs-club-bd555-default-rtdb.firebaseio.com';

export const hasFirebase = !!FIREBASE_DB_URL;

export async function storeGet(key) {
  if (hasFirebase) {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/${key}.json`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function storeSet(key, value) {
  if (hasFirebase) {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/${key}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
