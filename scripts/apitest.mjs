/* End-to-end + adversarial test of the club API against the local file store. */
import handler from '../netlify/functions/api.mjs';

const BASE = 'http://localhost/api/';
let pass = 0, fail = 0;

function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

async function call(path, { method = 'GET', body, token, headers = {} } = {}) {
  const req = new Request(BASE + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const res = await handler(req);
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  return { status: res.status, data };
}

console.log('\n=== PUBLIC ===');
let r = await call('public');
check('public endpoint returns events + leaderboard', r.status === 200 && Array.isArray(r.data.events));
check('public payload carries no password material', !JSON.stringify(r.data).toLowerCase().includes('password'));

console.log('\n=== PLAYER SIGNUP / LOGIN ===');
r = await call('player/signup', { method: 'POST', body: { name: 'Ada Test', username: 'adatest', password: 'duckduck9' } });
check('signup succeeds', r.status === 200 && !!r.data.token, JSON.stringify(r.data));
const playerToken = r.data.token;
check('signup response has no password hash', !JSON.stringify(r.data.player).includes('passwordHash'));

r = await call('player/signup', { method: 'POST', body: { name: 'X', username: 'adatest', password: 'another9' } });
check('duplicate username rejected', r.status === 400);

r = await call('player/signup', { method: 'POST', body: { name: 'Weak', username: 'weakuser', password: '123' } });
check('short password rejected', r.status === 400);

r = await call('player/login', { method: 'POST', body: { username: 'adatest', password: 'wrongpass' } });
check('wrong password rejected', r.status === 401);

r = await call('player/login', { method: 'POST', body: { username: 'adatest', password: 'duckduck9' } });
check('correct password accepted', r.status === 200 && !!r.data.token);

console.log('\n=== SCORE INTEGRITY (anti-cheat) ===');
r = await call('player/award', { method: 'POST', token: playerToken, body: { gameKey: 'trivia', points: 999999 } });
check('absurd score clamped to game max (40)', r.data.points === 40, `got ${r.data?.points}`);

r = await call('player/award', { method: 'POST', token: playerToken, body: { gameKey: 'trivia', points: 40 } });
check('second play allowed within daily cap', r.data.points === 40, `got ${r.data?.points}`);

r = await call('player/award', { method: 'POST', token: playerToken, body: { gameKey: 'trivia', points: 40 } });
check('daily cap (80) blocks further trivia points', r.data.points === 0 && r.data.capped === true, JSON.stringify(r.data));

r = await call('player/award', { method: 'POST', token: playerToken, body: { gameKey: 'notagame', points: 50 } });
check('unknown game rejected', r.status === 400);

r = await call('player/award', { method: 'POST', token: playerToken, body: { gameKey: 'memory', points: 20, badges: ['👑 Hall of Famer', '🧠 Memory Master'] } });
check('badge from another game is ignored', !r.data.newBadges.includes('👑 Hall of Famer'), JSON.stringify(r.data.newBadges));
check('own-game badge is granted', r.data.newBadges.includes('🧠 Memory Master'));

console.log('\n=== TOKEN FORGERY ===');
r = await call('player/award', { method: 'POST', body: { gameKey: 'trivia', points: 40 } });
check('award without token rejected', r.status === 401);

const forged = Buffer.from(JSON.stringify({ kind: 'player', id: 'someone-else', exp: Date.now() + 99999 })).toString('base64url') + '.fakesignature';
r = await call('player/award', { method: 'POST', token: forged, body: { gameKey: 'trivia', points: 40 } });
check('forged token rejected', r.status === 401);

const [payload] = playerToken.split('.');
const tampered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), kind: 'cabinet', role: 'president' })).toString('base64url') + '.' + playerToken.split('.')[1];
r = await call('cabinet/state', { token: tampered });
check('privilege-escalated token rejected', r.status === 401);

console.log('\n=== CABINET BOOTSTRAP / ROLES ===');
r = await call('cabinet/bootstrap', { method: 'POST', body: { name: 'Grace Hopper', username: 'ghopper', password: 'presidentpass' } });
check('first president created', r.status === 200 && !!r.data.token, JSON.stringify(r.data));
const presToken = r.data.token;

r = await call('cabinet/bootstrap', { method: 'POST', body: { name: 'Impostor', username: 'hacker', password: 'hackerpass' } });
check('second bootstrap blocked (no self-made presidents)', r.status === 409);

r = await call('cabinet/members', { method: 'POST', token: presToken, body: { name: 'Alan Turing', position: 'VP of Events', username: 'aturing' } });
check('president can add a member', r.status === 200);

r = await call('cabinet/login', { method: 'POST', body: { username: 'aturing', password: '1234' } });
check('new member logs in with default password', r.status === 200);
check('new member is forced to change password', r.data.mustSetPassword === true);
const officerToken = r.data.token;

console.log('\n=== AUTHORIZATION (officer vs president) ===');
r = await call('cabinet/members', { method: 'POST', token: officerToken, body: { name: 'Sneaky', position: 'Boss', username: 'sneaky' } });
check('officer CANNOT add members', r.status === 403);

r = await call('cabinet/tasks', { method: 'POST', token: officerToken, body: { title: 'Self-assigned', assignedTo: 'aturing' } });
check('officer CANNOT assign tasks', r.status === 403);

r = await call('cabinet/events', { method: 'POST', token: officerToken, body: { name: 'Fake event', date: '2026-09-01' } });
check('officer CANNOT post events', r.status === 403);

r = await call('cabinet/members/xyz', { method: 'DELETE', token: officerToken });
check('officer CANNOT remove members', r.status === 403);

r = await call('cabinet/state', { token: playerToken });
check('arcade player token CANNOT read cabinet data', r.status === 401);

console.log('\n=== TASK OWNERSHIP ===');
r = await call('cabinet/tasks', { method: 'POST', token: presToken, body: { title: 'Book the room', assignedTo: 'aturing', dueDate: '2026-07-01', priority: 'high' } });
check('president assigns a task', r.status === 200);
const taskId = r.data.tasks.find((t) => t.title === 'Book the room').id;

r = await call('cabinet/state', { token: officerToken });
check('officer sees only their own tasks', r.data.tasks.every((t) => t.assignedTo === 'aturing'));
check('officer never receives password hashes', !JSON.stringify(r.data).includes('passwordHash'));

r = await call(`cabinet/tasks/${taskId}`, { method: 'PATCH', token: officerToken, body: { status: 'done' } });
check('assignee can update their own task', r.status === 200);

r = await call(`cabinet/tasks/${taskId}`, { method: 'PATCH', token: officerToken, body: { status: 'banana' } });
check('invalid status rejected', r.status === 400);

r = await call(`cabinet/tasks/${taskId}`, { method: 'DELETE', token: officerToken });
check('officer CANNOT delete tasks', r.status === 403);

console.log('\n=== INPUT VALIDATION ===');
r = await call('join', { method: 'POST', body: { name: 'Bot', email: 'not-an-email' } });
check('invalid email rejected', r.status === 400);

r = await call('join', { method: 'POST', body: { name: 'A'.repeat(5000), email: 'a@b.com' } });
check('oversized field rejected', r.status === 400);

r = await call('cabinet/members', { method: 'POST', token: presToken, body: { name: 'Bad', position: 'X', username: '../../etc/passwd' } });
check('path-ish username rejected', r.status === 400);

r = await call('admin/migrate', { method: 'POST', body: { source: 'https://evil.firebaseio.com' } });
check('migration endpoint hidden without secret', r.status === 404);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
