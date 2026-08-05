/*
 * Whitney CS Club — server API.
 *
 * Everything that touches stored data happens here, behind signed sessions and
 * role checks. The browser never holds a database URL, a key, or another
 * member's password hash; it can only ask this function to do things, and this
 * function decides whether the caller is allowed.
 */
import {
  clearAttempts, hashPassword, initSecret, noteFailure, signToken, tooManyAttempts, verifyPassword, verifyToken,
} from './lib/auth.mjs';
import { KEYS, read, uid, write } from './lib/store.mjs';
import {
  BADGE_BY_GAME, GAME_RULES, levelOf, mondayOf, recomputeBadges, todayStr, yesterdayStr,
} from './lib/rules.mjs';

export const config = { path: '/api/*' };

/* ---------------- helpers ---------------- */
const json = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });

const ok = (data = {}) => json(200, data);
const bad = (msg, status = 400) => json(status, { error: msg });

/** Trim + length-limit any user-supplied string. Rejects non-strings. */
function str(value, { max = 200, min = 1 } = {}) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v.length < min || v.length > max) return null;
  return v;
}

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const PRIORITIES = new Set(['low', 'med', 'high']);
const STATUSES = new Set(['todo', 'in-progress', 'done']);

/* Never let a password hash leave the server. */
const publicPlayer = (p) => ({
  id: p.id, name: p.name, username: p.username, points: p.points || 0,
  weekPoints: p.weekPoints || 0, weekStart: p.weekStart, streak: p.streak || 0,
  lastPlayedDate: p.lastPlayedDate, badges: p.badges || [],
  gamesTried: p.gamesTried || [], activity: p.activity || [],
});

const publicMember = (m) => ({
  id: m.id, name: m.name, username: m.username, position: m.position,
  role: m.role, mustSetPassword: !!m.mustSetPassword,
});

function auth(req, expected) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = verifyToken(token);
  if (!session) return null;
  if (expected === 'player' && session.kind !== 'player') return null;
  if (expected === 'cabinet' && session.kind !== 'cabinet') return null;
  return session;
}

/* ---------------- handler ---------------- */
export default async function handler(req) {
  const url = new URL(req.url);
  // Tolerate both the pretty route and the raw function route.
  const path = url.pathname
    .replace(/^\/(?:\.netlify\/functions\/api|api)\/?/, '')
    .replace(/\/$/, '');
  const method = req.method.toUpperCase();

  let body = {};
  if (method !== 'GET' && method !== 'DELETE') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    if (typeof body !== 'object' || body === null) return bad('Malformed request body.');
  }

  try {
    // Shared signing key must be ready before any token is issued or checked.
    await initSecret();

    /* ============ public ============ */
    if (path === 'public' && method === 'GET') {
      const [events, players, members] = await Promise.all([
        read(KEYS.events, []), read(KEYS.players, []), read(KEYS.members, []),
      ]);
      return ok({
        events,
        cabinetExists: members.length > 0,
        leaderboard: leaderboardFrom(players),
      });
    }

    if (path === 'leaderboard' && method === 'GET') {
      return ok({ leaderboard: leaderboardFrom(await read(KEYS.players, [])) });
    }

    if (path === 'join' && method === 'POST') {
      const name = str(body.name, { max: 80 });
      const email = str(body.email, { max: 120 });
      if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return bad('Please provide a valid name and email.');
      }
      const year = str(body.year, { max: 40 }) || 'Unspecified';
      const interests = Array.isArray(body.interests)
        ? body.interests.filter((i) => typeof i === 'string').slice(0, 12).map((i) => i.slice(0, 60))
        : [];
      const requests = await read(KEYS.joinRequests, []);
      requests.push({ id: uid(), name, email, year, interests, submittedAt: new Date().toISOString() });
      await write(KEYS.joinRequests, requests.slice(-500));
      return ok({ received: true });
    }

    /* ============ player (arcade) ============ */
    if (path === 'player/signup' && method === 'POST') {
      const name = str(body.name, { max: 60 });
      const username = str(body.username, { max: 30 })?.toLowerCase();
      const password = str(body.password, { max: 200, min: 6 });
      if (!name || !username) return bad('Name and username are required.');
      if (!password) return bad('Password must be at least 6 characters.');
      if (!/^[a-z0-9_.-]+$/.test(username)) return bad('Usernames may use letters, numbers, dot, dash and underscore only.');

      const players = await read(KEYS.players, []);
      if (players.some((p) => p.username === username)) return bad('That username is taken.');

      const player = {
        id: uid(), name, username, passwordHash: hashPassword(password),
        points: 0, weekPoints: 0, weekStart: mondayOf(new Date()), streak: 0,
        lastPlayedDate: null, badges: [], gamesTried: [], activity: [], awards: {},
      };
      players.push(player);
      await write(KEYS.players, players);
      return ok({ token: signToken({ kind: 'player', id: player.id }), player: publicPlayer(player) });
    }

    if (path === 'player/login' && method === 'POST') {
      const username = str(body.username, { max: 30 })?.toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      if (!username || !password) return bad('Username and password are required.');
      const limitKey = `player:${username}`;
      if (tooManyAttempts(limitKey)) return bad('Too many attempts. Wait a few minutes and try again.', 429);

      const players = await read(KEYS.players, []);
      const player = players.find((p) => p.username === username);
      if (!player || !verifyPassword(password, player.passwordHash)) {
        noteFailure(limitKey);
        return bad('Invalid username or password.', 401);
      }
      clearAttempts(limitKey);
      return ok({ token: signToken({ kind: 'player', id: player.id }), player: publicPlayer(player) });
    }

    if (path === 'player/me' && method === 'GET') {
      const session = auth(req, 'player');
      if (!session) return bad('Sign in again.', 401);
      const players = await read(KEYS.players, []);
      const player = players.find((p) => p.id === session.id);
      if (!player) return bad('Account not found.', 401);
      return ok({ player: publicPlayer(player) });
    }

    if (path === 'player/award' && method === 'POST') {
      const session = auth(req, 'player');
      if (!session) return bad('Sign in again.', 401);

      const rule = GAME_RULES[body.gameKey];
      if (!rule) return bad('Unknown game.');

      const players = await read(KEYS.players, []);
      const idx = players.findIndex((p) => p.id === session.id);
      if (idx === -1) return bad('Account not found.', 401);
      const player = { ...players[idx] };
      const today = todayStr();

      // The client proposes a score; the server clamps it to what this game can
      // ever award, then to what is left of today's allowance for that game.
      const proposed = Number.isFinite(body.points) ? Math.floor(body.points) : 0;
      if (proposed <= 0) return bad('Nothing to award.');

      const awards = (player.awards && player.awards.date === today)
        ? player.awards
        : { date: today, byGame: {} };
      const alreadyToday = awards.byGame[body.gameKey] || 0;
      const allowance = Math.max(0, rule.dailyCap - alreadyToday);
      const points = Math.min(proposed, rule.max, allowance);

      if (points <= 0) {
        return ok({ player: publicPlayer(player), points: 0, capped: true, newBadges: [] });
      }

      const prevLevel = levelOf(player.points || 0);
      player.points = (player.points || 0) + points;

      const monday = mondayOf(new Date());
      if (player.weekStart !== monday) { player.weekStart = monday; player.weekPoints = 0; }
      player.weekPoints = (player.weekPoints || 0) + points;

      if (player.lastPlayedDate !== today) {
        player.streak = player.lastPlayedDate === yesterdayStr() ? (player.streak || 0) + 1 : 1;
        player.lastPlayedDate = today;
      }

      player.gamesTried = Array.from(new Set([...(player.gamesTried || []), body.gameKey]));
      player.activity = [
        { ts: new Date().toISOString(), label: rule.label, pts: points },
        ...(player.activity || []),
      ].slice(0, 15);

      awards.byGame[body.gameKey] = alreadyToday + points;
      player.awards = awards;

      // Only this game's own achievement badge may be claimed.
      const allowedBadges = BADGE_BY_GAME[body.gameKey] || [];
      const claimed = Array.isArray(body.badges)
        ? body.badges.filter((b) => allowedBadges.includes(b))
        : [];
      const newBadges = recomputeBadges(player, claimed);

      players[idx] = player;
      await write(KEYS.players, players);

      return ok({
        player: publicPlayer(player),
        points,
        capped: points < proposed,
        newBadges,
        leveledTo: levelOf(player.points) > prevLevel ? levelOf(player.points) : null,
      });
    }

    /* ============ cabinet ============ */
    if (path === 'cabinet/bootstrap' && method === 'POST') {
      const members = await read(KEYS.members, []);
      // Only ever available while no cabinet exists — otherwise anyone could
      // mint themselves a president account.
      if (members.length > 0) return bad('A cabinet already exists. Ask your president for an account.', 409);

      const name = str(body.name, { max: 60 });
      const username = str(body.username, { max: 30 })?.toLowerCase();
      const password = str(body.password, { max: 200, min: 8 });
      if (!name || !username) return bad('Name and username are required.');
      if (!password) return bad('The president password must be at least 8 characters.');

      const president = {
        id: uid(), name, username, position: 'President', role: 'president',
        passwordHash: hashPassword(password), mustSetPassword: false,
      };
      await write(KEYS.members, [president]);
      return ok({
        token: signToken({ kind: 'cabinet', id: president.id, role: 'president' }),
        me: publicMember(president),
      });
    }

    if (path === 'cabinet/login' && method === 'POST') {
      const username = str(body.username, { max: 30 })?.toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      if (!username || !password) return bad('Username and password are required.');
      const limitKey = `cabinet:${username}`;
      if (tooManyAttempts(limitKey)) return bad('Too many attempts. Wait a few minutes and try again.', 429);

      const members = await read(KEYS.members, []);
      const member = members.find((m) => m.username === username);
      if (!member || !verifyPassword(password, member.passwordHash)) {
        noteFailure(limitKey);
        return bad('Invalid username or password.', 401);
      }
      clearAttempts(limitKey);
      return ok({
        token: signToken({ kind: 'cabinet', id: member.id, role: member.role }),
        me: publicMember(member),
        mustSetPassword: !!member.mustSetPassword,
      });
    }

    if (path === 'cabinet/password' && method === 'POST') {
      const session = auth(req, 'cabinet');
      if (!session) return bad('Sign in again.', 401);
      const password = str(body.password, { max: 200, min: 8 });
      if (!password) return bad('Password must be at least 8 characters.');
      if (password === '1234') return bad('Choose something other than the default password.');

      const members = await read(KEYS.members, []);
      const idx = members.findIndex((m) => m.id === session.id);
      if (idx === -1) return bad('Account not found.', 401);
      members[idx] = { ...members[idx], passwordHash: hashPassword(password), mustSetPassword: false };
      await write(KEYS.members, members);
      return ok({ me: publicMember(members[idx]) });
    }

    if (path === 'cabinet/state' && method === 'GET') {
      const session = auth(req, 'cabinet');
      if (!session) return bad('Sign in again.', 401);
      const [members, tasks, events, joinRequests] = await Promise.all([
        read(KEYS.members, []), read(KEYS.tasks, []), read(KEYS.events, []), read(KEYS.joinRequests, []),
      ]);
      const me = members.find((m) => m.id === session.id);
      if (!me) return bad('Account not found.', 401);
      const isPresident = me.role === 'president';
      return ok({
        me: publicMember(me),
        members: members.map(publicMember),
        // A regular officer only ever receives their own tasks.
        tasks: isPresident ? tasks : tasks.filter((t) => t.assignedTo === me.username),
        events,
        joinRequests: isPresident ? joinRequests.slice(-100).reverse() : [],
      });
    }

    if (path.startsWith('cabinet/')) {
      const session = auth(req, 'cabinet');
      if (!session) return bad('Sign in again.', 401);
      const members = await read(KEYS.members, []);
      const me = members.find((m) => m.id === session.id);
      if (!me) return bad('Account not found.', 401);
      const president = me.role === 'president';
      const segments = path.split('/');

      /* ---- roster (president only) ---- */
      if (segments[1] === 'members') {
        if (!president) return bad('Only the president can manage the roster.', 403);

        if (method === 'POST') {
          const name = str(body.name, { max: 60 });
          const username = str(body.username, { max: 30 })?.toLowerCase();
          const position = str(body.position, { max: 60 });
          if (!name || !username || !position) return bad('Name, position and username are required.');
          if (!/^[a-z0-9_.-]+$/.test(username)) return bad('Usernames may use letters, numbers, dot, dash and underscore only.');
          if (members.some((m) => m.username === username)) return bad('That username is already taken.');
          members.push({
            id: uid(), name, username, position, role: 'cabinet',
            passwordHash: hashPassword('1234'), mustSetPassword: true,
          });
          await write(KEYS.members, members);
          return ok({ members: members.map(publicMember) });
        }

        if (method === 'DELETE') {
          const id = segments[2];
          if (id === me.id) return bad('You cannot remove yourself.');
          const next = members.filter((m) => m.id !== id);
          if (next.length === members.length) return bad('Member not found.', 404);
          await write(KEYS.members, next);
          return ok({ members: next.map(publicMember) });
        }
      }

      /* ---- tasks ---- */
      if (segments[1] === 'tasks') {
        const tasks = await read(KEYS.tasks, []);

        if (method === 'POST') {
          if (!president) return bad('Only the president can assign tasks.', 403);
          const title = str(body.title, { max: 140 });
          const assignedTo = str(body.assignedTo, { max: 30 })?.toLowerCase();
          if (!title || !assignedTo) return bad('A title and an assignee are required.');
          if (!members.some((m) => m.username === assignedTo)) return bad('That cabinet member does not exist.');
          const priority = PRIORITIES.has(body.priority) ? body.priority : 'med';
          const dueDate = isDate(body.dueDate) ? body.dueDate : '';
          tasks.push({
            id: uid(), title, description: str(body.description, { max: 1000 }) || '',
            assignedTo, assignedBy: me.name, dueDate, priority,
            status: 'todo', createdAt: new Date().toISOString(),
          });
          await write(KEYS.tasks, tasks);
          return ok({ tasks: president ? tasks : tasks.filter((t) => t.assignedTo === me.username) });
        }

        if (method === 'PATCH') {
          const id = segments[2];
          const idx = tasks.findIndex((t) => t.id === id);
          if (idx === -1) return bad('Task not found.', 404);
          // An officer may only move their own task; the president may move any.
          if (!president && tasks[idx].assignedTo !== me.username) {
            return bad('That task is not assigned to you.', 403);
          }
          if (!STATUSES.has(body.status)) return bad('Unknown status.');
          tasks[idx] = { ...tasks[idx], status: body.status };
          await write(KEYS.tasks, tasks);
          return ok({ tasks: president ? tasks : tasks.filter((t) => t.assignedTo === me.username) });
        }

        if (method === 'DELETE') {
          if (!president) return bad('Only the president can delete tasks.', 403);
          const next = tasks.filter((t) => t.id !== segments[2]);
          if (next.length === tasks.length) return bad('Task not found.', 404);
          await write(KEYS.tasks, next);
          return ok({ tasks: next });
        }
      }

      /* ---- events (president only) ---- */
      if (segments[1] === 'events') {
        if (!president) return bad('Only the president can manage events.', 403);
        const events = await read(KEYS.events, []);

        if (method === 'POST') {
          const name = str(body.name, { max: 140 });
          if (!name) return bad('An event name is required.');
          if (!isDate(body.date)) return bad('A valid date is required.');
          const payload = {
            name, date: body.date,
            tag: str(body.tag, { max: 40 }) || '',
            description: str(body.description, { max: 300 }) || '',
          };
          const editId = typeof body.id === 'string' ? body.id : null;
          let next;
          if (editId) {
            next = events.map((e) => (e.id === editId ? { ...e, ...payload } : e));
          } else {
            next = [...events, { id: uid(), ...payload, createdAt: new Date().toISOString() }];
          }
          await write(KEYS.events, next);
          return ok({ events: next });
        }

        if (method === 'DELETE') {
          const next = events.filter((e) => e.id !== segments[2]);
          await write(KEYS.events, next);
          return ok({ events: next });
        }
      }
    }

    /* ============ one-time import from the old Firebase database ============ */
    if (path === 'admin/migrate' && method === 'POST') {
      const secret = process.env.MIGRATE_TOKEN;
      const provided = req.headers.get('x-migrate-token');
      if (!secret || !provided || provided !== secret) return bad('Not found.', 404);
      const source = str(body.source, { max: 300 });
      if (!source || !/^https:\/\/[\w.-]+\.firebaseio\.com$/.test(source)) {
        return bad('Provide the Firebase database URL as `source`.');
      }
      const grab = async (key) => {
        const res = await fetch(`${source}/${key}.json`);
        if (!res.ok) return [];
        return (await res.json()) || [];
      };
      const [oldMembers, oldPlayers, oldTasks, oldEvents] = await Promise.all([
        grab('club-members'), grab('club-players'), grab('club-tasks'), grab('club-events'),
      ]);
      // Plaintext passwords from the old store are hashed on the way in and the
      // originals are never written down again.
      const members = (Array.isArray(oldMembers) ? oldMembers : []).map((m) => ({
        id: m.id || uid(), name: m.name, username: String(m.username || '').toLowerCase(),
        position: m.position || 'Cabinet', role: m.role === 'president' ? 'president' : 'cabinet',
        passwordHash: hashPassword(m.password ?? '1234'), mustSetPassword: true,
      })).filter((m) => m.name && m.username);
      const players = (Array.isArray(oldPlayers) ? oldPlayers : []).map((p) => ({
        id: p.id || uid(), name: p.name, username: String(p.username || '').toLowerCase(),
        passwordHash: hashPassword(p.password ?? uid()),
        points: p.points || 0, weekPoints: p.weekPoints || 0, weekStart: p.weekStart || mondayOf(new Date()),
        streak: p.streak || 0, lastPlayedDate: p.lastPlayedDate || null,
        badges: p.badges || [], gamesTried: p.gamesTried || [], activity: p.activity || [], awards: {},
      })).filter((p) => p.name && p.username);
      await Promise.all([
        write(KEYS.members, members),
        write(KEYS.players, players),
        write(KEYS.tasks, Array.isArray(oldTasks) ? oldTasks : []),
        write(KEYS.events, Array.isArray(oldEvents) ? oldEvents : []),
      ]);
      return ok({ imported: { members: members.length, players: players.length, tasks: (oldTasks || []).length, events: (oldEvents || []).length } });
    }

    return bad('Not found.', 404);
  } catch (err) {
    // Never leak stack traces or internals to the browser.
    console.error('[api]', path, err);
    return bad('Something went wrong on our end.', 500);
  }
}

function leaderboardFrom(players) {
  return players
    .map((p) => ({ id: p.id, name: p.name, points: p.points || 0, weekPoints: p.weekPoints || 0, streak: p.streak || 0 }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 25);
}
