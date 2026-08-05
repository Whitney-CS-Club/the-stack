import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { storeGet, storeSet, uid, todayStr, yesterdayStr, mondayOf } from '../lib/storage.js';
import { streakBadges, pointBadges, ALL_BADGE_DEFS, levelOf, xpPctOf } from '../lib/gameData.js';
import { useToast } from './Toaster.jsx';
import { Reveal, WordReveal } from './Reveal.jsx';
import { Tilt } from './Interactive.jsx';
import { DailyChallenge, Trivia, BigO, DebugHunt, MemoryMatch, TypeRacer, RegexRumble } from './Games.jsx';

const GAME_DEFS = [
  { key: 'daily', icon: '🧩', title: 'Daily Coding Challenge', desc: 'One function-writing puzzle, same for everyone, new every day.', pts: '+20 pts', Comp: DailyChallenge },
  { key: 'trivia', icon: '🧠', title: 'CS Trivia Blitz', desc: '8 rapid-fire questions on CS fundamentals.', pts: '+5 / correct', Comp: Trivia },
  { key: 'bigo', icon: '⏱️', title: 'Big-O Speed Round', desc: 'Guess the time complexity before the clock runs out.', pts: '+8 / correct', Comp: BigO },
  { key: 'debug', icon: '🐞', title: 'Debug Hunt', desc: "Click the line that's actually causing the bug.", pts: '+15 / correct', Comp: DebugHunt },
  { key: 'memory', icon: '🃏', title: 'Memory Match', desc: 'Match CS data-structure pairs. Fewer moves, more points.', pts: 'up to 70', Comp: MemoryMatch },
  { key: 'typerace', icon: '⌨️', title: 'Type Racer', desc: 'Type a code snippet as fast and accurately as you can.', pts: 'scales w/ WPM', Comp: TypeRacer },
  { key: 'regex', icon: '🔍', title: 'Regex Rumble', desc: 'Match or no match? Decide before the timer runs out.', pts: '+8 / correct', Comp: RegexRumble },
];

function checkNewBadges(player, extra = []) {
  const before = new Set(player.badges || []);
  const earned = new Set(before);
  streakBadges.forEach((b) => { if ((player.streak || 0) >= b.days) earned.add(b.label); });
  pointBadges.forEach((b) => { if ((player.points || 0) >= b.pts) earned.add(b.label); });
  extra.forEach((b) => earned.add(b));
  if ((player.gamesTried || []).length >= 7) earned.add('🎮 All-Rounder');
  player.badges = Array.from(earned);
  return player.badges.filter((b) => !before.has(b));
}

/* ---------- auth forms ---------- */
function AuthGate({ onLogin }) {
  const [msg, setMsg] = useState(null);

  const login = async (e) => {
    e.preventDefault();
    const username = e.target.user.value.trim().toLowerCase();
    const password = e.target.pass.value;
    const players = (await storeGet('club-players')) || [];
    const match = players.find((p) => p.username.toLowerCase() === username && p.password === password);
    if (match) onLogin(match);
    else setMsg({ type: 'err', text: '> invalid username or password.' });
  };

  const signup = async (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    const username = e.target.user.value.trim().toLowerCase();
    const password = e.target.pass.value;
    const players = (await storeGet('club-players')) || [];
    if (players.some((p) => p.username.toLowerCase() === username)) {
      setMsg({ type: 'err', text: '> that username is taken, try another.' });
      return;
    }
    const newPlayer = { id: uid(), name, username, password, points: 0, weekPoints: 0, weekStart: mondayOf(new Date()), streak: 0, lastPlayedDate: null, badges: [], gamesTried: [], activity: [] };
    players.push(newPlayer);
    const ok = await storeSet('club-players', players);
    if (ok) onLogin(newPlayer, true);
    else setMsg({ type: 'err', text: '> signup failed, try again.' });
  };

  return (
    <Reveal>
      <div className="panel brackets" style={{ maxWidth: 460, margin: '0 auto' }}>
        <i /><i /><i /><i />
        <div className="eyebrow" style={{ marginBottom: 14 }}>Members only</div>
        <h3 style={{ textTransform: 'uppercase', marginBottom: 8 }}>Sign in to play</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 20 }}>
          Any club member can make an account. No approval needed, that's only for games and the leaderboard.
        </p>
        <form onSubmit={login}>
          <div className="field"><label>Username</label><input name="user" required /></div>
          <div className="field"><label>Password</label><input name="pass" type="password" required /></div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}>Sign in</button>
        </form>
        <div className="mono" style={{ textAlign: 'center', margin: '18px 0', color: 'var(--muted)', fontSize: '0.72rem' }}>— OR —</div>
        <form onSubmit={signup}>
          <div className="field"><label>Name</label><input name="name" required /></div>
          <div className="form-grid">
            <div className="field"><label>Username</label><input name="user" required /></div>
            <div className="field"><label>Password</label><input name="pass" type="password" minLength={4} required /></div>
          </div>
          <button className="btn ghost brackets" style={{ width: '100%', justifyContent: 'center' }}><i /><i /><i /><i />Create account</button>
        </form>
        {msg && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}
      </div>
    </Reveal>
  );
}

/* ---------- leaderboard ---------- */
function Leaderboard({ me, refreshKey }) {
  const [tab, setTab] = useState('all');
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    storeGet('club-players').then((p) => setPlayers(p || []));
  }, [refreshKey]);

  const key = tab === 'week' ? 'weekPoints' : 'points';
  const sorted = players.slice().sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, 10);
  const podium = sorted.slice(0, 3);
  const order = [1, 0, 2];

  return (
    <div className="panel" style={{ marginTop: 26 }}>
      <div className="panel-title">Leaderboard <span className="tag">top club players</span></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[['all', 'All-time'], ['week', 'This week']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="mono"
            style={{
              padding: '7px 16px', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              border: `1px solid ${tab === k ? 'var(--green)' : 'var(--line)'}`,
              color: tab === k ? 'var(--green)' : 'var(--muted)',
              background: tab === k ? 'rgba(56,232,160,0.07)' : 'transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="empty">no players yet — be the first to play today.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'end', marginBottom: 24, maxWidth: 560 }}>
            {order.map((idx, col) => {
              const p = podium[idx];
              if (!p) return <div key={col} />;
              const heights = [96, 68, 50];
              return (
                <div key={p.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                  <div className="mono" style={{ color: 'var(--green)', fontSize: '0.72rem', marginBottom: 8 }}>{p[key] || 0} pts</div>
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 * col, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      height: heights[idx], transformOrigin: 'bottom',
                      background: idx === 0 ? 'var(--grad-circuit)' : idx === 1 ? '#3c4656' : '#26303e',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6,
                      fontFamily: 'var(--font-mono)', fontWeight: 700, color: idx === 0 ? 'var(--bg)' : 'var(--ink)',
                    }}
                  >
                    {idx + 1}
                  </motion.div>
                </div>
              );
            })}
          </div>
          {sorted.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: 'grid', gridTemplateColumns: '36px 1fr auto auto', gap: 14, alignItems: 'center',
                padding: '11px 8px', borderBottom: '1px solid var(--line)', fontSize: '0.9rem',
                background: me && p.id === me.id ? 'rgba(56,232,160,0.05)' : 'transparent',
              }}
            >
              <span className="mono" style={{ color: 'var(--green)', textAlign: 'center' }}>#{i + 1}</span>
              <span>{p.name}</span>
              <span className="mono" style={{ color: 'var(--cyan)' }}>{p[key] || 0} pts</span>
              <span className="mono" style={{ color: 'var(--muted)' }}>{p.streak || 0}🔥</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ---------- hub ---------- */
function PlayHub({ player, setPlayer, onLogout }) {
  const toast = useToast();
  const [activeGame, setActiveGame] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const level = levelOf(player.points || 0);
  const xpPct = xpPctOf(player.points || 0);
  const played = player.lastPlayedDate === todayStr();
  const r = 27;
  const circ = 2 * Math.PI * r;

  const award = useCallback(async (pts, label, gameKey, extraBadges = []) => {
    const players = (await storeGet('club-players')) || [];
    const meIdx = players.findIndex((p) => p.id === player.id);
    if (meIdx === -1) return;
    const me = { ...players[meIdx] };
    const prevLevel = levelOf(me.points || 0);
    me.points = (me.points || 0) + pts;
    const mon = mondayOf(new Date());
    if (me.weekStart !== mon) { me.weekStart = mon; me.weekPoints = 0; }
    me.weekPoints = (me.weekPoints || 0) + pts;
    const today = todayStr();
    if (me.lastPlayedDate !== today) {
      me.streak = me.lastPlayedDate === yesterdayStr() ? (me.streak || 0) + 1 : 1;
      me.lastPlayedDate = today;
    }
    me.gamesTried = Array.from(new Set([...(me.gamesTried || []), gameKey]));
    me.activity = [{ ts: new Date().toISOString(), label, pts }, ...(me.activity || [])].slice(0, 15);
    const newBadges = checkNewBadges(me, extraBadges);
    players[meIdx] = me;
    await storeSet('club-players', players);
    setPlayer(me);
    setRefreshKey((k) => k + 1);
    toast(`+${pts} pts — ${label}`);
    if (levelOf(me.points) > prevLevel) toast(`🎉 Level ${levelOf(me.points)} reached!`);
    newBadges.forEach((b) => toast(`Badge unlocked: ${b}`));
  }, [player.id, setPlayer, toast]);

  const ActiveComp = activeGame ? GAME_DEFS.find((g) => g.key === activeGame)?.Comp : null;

  return (
    <div>
      {/* profile strip */}
      <div className="panel brackets lit" style={{ display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
        <i /><i /><i /><i />
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <svg viewBox="0 0 64 64" width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
            <motion.circle
              cx="32" cy="32" r={r} fill="none" stroke="var(--green)" strokeWidth="5" strokeLinecap="butt"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ - (xpPct / 100) * circ }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="mono" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--green)' }}>
            {level}
          </div>
        </div>
        <div style={{ flexGrow: 1, minWidth: 180 }}>
          <h3 style={{ textTransform: 'uppercase', marginBottom: 3 }}>{player.name}</h3>
          <div className="mono" style={{ fontSize: '0.64rem', letterSpacing: '0.12em', color: 'var(--muted)' }}>
            LVL {level} · {Math.round(xpPct)}% TO LVL {level + 1}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }} className="mono">
          {[[player.points || 0, 'POINTS'], [`${player.streak || 0}🔥`, 'DAY STREAK'], [played ? '✓' : '—', 'PLAYED TODAY']].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)' }}>{n}</div>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.16em', color: 'var(--muted)' }}>{l}</div>
            </div>
          ))}
        </div>
        <button className="btn ghost sm" onClick={onLogout}>sign out</button>
      </div>

      {/* game grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, margin: '26px 0' }}>
        {GAME_DEFS.map((g, i) => (
          <motion.div
            key={g.key}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.05 * i }}
          >
            <Tilt max={9} style={{ height: '100%' }}>
              <motion.button
                onClick={() => setActiveGame(g.key)}
                className="panel brackets"
                data-cursor="PLAY"
                whileTap={{ scale: 0.97 }}
                style={{ textAlign: 'left', cursor: 'pointer', padding: 22, width: '100%', height: '100%' }}
              >
                <i /><i /><i /><i />
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: 10 }}>{g.icon}</span>
                <h4 style={{ fontSize: '0.98rem', textTransform: 'uppercase', marginBottom: 6 }}>{g.title}</h4>
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 10 }}>{g.desc}</p>
                <span className="mono" style={{ fontSize: '0.62rem', letterSpacing: '0.14em', color: 'var(--green)' }}>{g.pts}</span>
              </motion.button>
            </Tilt>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {ActiveComp && (
          <ActiveComp key={activeGame} onAward={award} onClose={() => setActiveGame(null)} />
        )}
      </AnimatePresence>

      <Leaderboard me={player} refreshKey={refreshKey} />

      {/* activity + badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 26, marginTop: 26 }}>
        <div className="panel">
          <div className="panel-title">Recent activity <span className="tag">your last plays</span></div>
          {(player.activity || []).length === 0 ? (
            <div className="empty">nothing yet — play a game above.</div>
          ) : (
            (player.activity || []).map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: '0.85rem' }}>
                <span>{a.label}</span>
                <span className="mono" style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                  {new Date(a.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <span className="mono" style={{ color: 'var(--green)', fontWeight: 700 }}>+{a.pts}</span>
              </div>
            ))
          )}
        </div>
        <div className="panel">
          <div className="panel-title">Badge case <span className="tag">{(player.badges || []).length} / {ALL_BADGE_DEFS.length} unlocked</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {ALL_BADGE_DEFS.map((b) => {
              const unlocked = (player.badges || []).includes(b);
              const [icon, ...rest] = b.split(' ');
              return (
                <div
                  key={b}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center',
                    background: 'var(--bg-2)', border: `1px solid ${unlocked ? 'var(--green)' : 'var(--line)'}`,
                    padding: '14px 8px', fontSize: '0.68rem',
                    color: unlocked ? 'var(--green)' : 'var(--muted)', fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span style={{ fontSize: '1.4rem', filter: unlocked ? 'none' : 'grayscale(1)', opacity: unlocked ? 1 : 0.35 }}>{icon}</span>
                  {rest.join(' ')}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Play() {
  const toast = useToast();
  const [player, setPlayer] = useState(null);

  return (
    <section id="play" className="block" data-aurora="#3fd4ff">
      <div className="container">
        <div className="section-head">
          <Reveal><div className="eyebrow">The arcade</div></Reveal>
          <WordReveal text="Play & compete." />
          <Reveal delay={0.15}>
            <p>Seven challenges, levels, streaks, and a weekly leaderboard — because grinding fundamentals should feel a little more like a game.</p>
          </Reveal>
        </div>

        {player ? (
          <PlayHub player={player} setPlayer={setPlayer} onLogout={() => setPlayer(null)} />
        ) : (
          <AuthGate onLogin={(p, isNew) => { setPlayer(p); if (isNew) toast(`Welcome to THE_STACK, ${p.name.split(' ')[0]}!`); }} />
        )}
      </div>
    </section>
  );
}
