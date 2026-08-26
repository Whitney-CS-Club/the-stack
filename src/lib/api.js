/*
 * Client side of the API. Holds nothing sensitive: no database URL, no keys —
 * just a signed session token the server issued, kept in sessionStorage so it
 * disappears when the tab closes.
 */
const PLAYER_TOKEN = 'wcs.player.token';
const CABINET_TOKEN = 'wcs.cabinet.token';

const readToken = (key) => {
  try { return sessionStorage.getItem(key); } catch { return null; }
};
const writeToken = (key, value) => {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch { /* private browsing — session just won't persist */ }
};

export const playerToken = () => readToken(PLAYER_TOKEN);
export const cabinetToken = () => readToken(CABINET_TOKEN);
export const setPlayerToken = (t) => writeToken(PLAYER_TOKEN, t);
export const setCabinetToken = (t) => writeToken(CABINET_TOKEN, t);

async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`/api/${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection.');
  }

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  if (!isJson) {
    // Usually means the API route isn't running (e.g. `vite` alone instead of `netlify dev`).
    throw new Error('The club API is not running. Start the site with `npm run dev` (Netlify dev).');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export const api = {
  /* public */
  publicData: () => request('public'),
  leaderboard: () => request('leaderboard'),
  join: (payload) => request('join', { method: 'POST', body: payload }),

  /* arcade */
  playerSignup: async (payload) => {
    const data = await request('player/signup', { method: 'POST', body: payload });
    setPlayerToken(data.token);
    return data.player;
  },
  playerLogin: async (payload) => {
    const data = await request('player/login', { method: 'POST', body: payload });
    setPlayerToken(data.token);
    return data.player;
  },
  playerMe: async () => {
    const token = playerToken();
    if (!token) return null;
    try {
      const data = await request('player/me', { token });
      return data.player;
    } catch {
      setPlayerToken(null);
      return null;
    }
  },
  playerLogout: () => setPlayerToken(null),
  award: (gameKey, points, badges = []) =>
    request('player/award', { method: 'POST', token: playerToken(), body: { gameKey, points, badges } }),

  /* cabinet */
  cabinetBootstrap: async (payload) => {
    const data = await request('cabinet/bootstrap', { method: 'POST', body: payload });
    setCabinetToken(data.token);
    return data.me;
  },
  cabinetLogin: async (payload) => {
    const data = await request('cabinet/login', { method: 'POST', body: payload });
    setCabinetToken(data.token);
    return data;
  },
  cabinetSetPassword: (password) =>
    request('cabinet/password', { method: 'POST', token: cabinetToken(), body: { password } }),
  cabinetState: () => request('cabinet/state', { token: cabinetToken() }),
  cabinetLogout: () => setCabinetToken(null),

  addMember: (payload) => request('cabinet/members', { method: 'POST', token: cabinetToken(), body: payload }),
  removeMember: (id) => request(`cabinet/members/${id}`, { method: 'DELETE', token: cabinetToken() }),
  setMemberRole: (id, role) =>
    request(`cabinet/members/${id}`, { method: 'PATCH', token: cabinetToken(), body: { role } }),

  createTask: (payload) => request('cabinet/tasks', { method: 'POST', token: cabinetToken(), body: payload }),
  setTaskStatus: (id, status) =>
    request(`cabinet/tasks/${id}`, { method: 'PATCH', token: cabinetToken(), body: { status } }),
  deleteTask: (id) => request(`cabinet/tasks/${id}`, { method: 'DELETE', token: cabinetToken() }),

  saveEvent: (payload) => request('cabinet/events', { method: 'POST', token: cabinetToken(), body: payload }),
  deleteEvent: (id) => request(`cabinet/events/${id}`, { method: 'DELETE', token: cabinetToken() }),
};
