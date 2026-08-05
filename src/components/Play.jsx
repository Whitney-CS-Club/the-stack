import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../lib/api.js';
import { ALL_BADGE_DEFS, levelOf, xpPctOf } from '../lib/gameData.js';
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

/* ---------- auth forms ---------- */
function AuthGate({ onLogin }) {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const player = await api.playerLogin({
        username: e.target.user.value.trim().toLowerCase(),
        password: e.target.pass.value,
      });
      onLogin(player);
    } catch (err) {
      setMsg({ type: 'err', text: `> ${err.message.toLowerCase()}` });
    } finally {
      setBusy(false);
    }
  };

  const signup = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const player = await api.playerSignup({
        name: e.target.name.value.trim(),
        username: e.target.user.value.trim().toLowerCase(),
        password: e.target.pass.value,
      });
      onLogin(player, true);
    } catch (err) {
      setMsg({ type: 'err', text: `> ${err.message.toLowerCase()}` });
    } finally {
      setBusy(false);
    }
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
          <div className="field"><label>Username</label><input name="user" autoComplete="username" required /></div>
          <div className="field"><label>Password</label><input name="pass" type="password" autoComplete="current-password" required /></div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </form>
        <div className="mono" style={{ textAlign: 'center', margin: '18px 0', color: 'var(--muted)', fontSize: '0.72rem' }}>— OR —</div>
        <form onSubmit={signup}>
          <div className="field"><label>Name</label><input name="name" required /></div>
          <div className="form-grid">
            <div className="field"><label>Username</label><input name="user" autoComplete="username" required /></div>
            <div className="field"><label>Password</label><input name="pass" type="password" autoComplete="new-password" minLength={6} required /></div>
          </div>
          <button className="btn ghost brackets" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}><i /><i /><i /><i />Create account</button>
        </form>
        <p className="mono" style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: 14, lineHeight: 1.6 }}>
          6+ characters. Please don't reuse your school or email password.
        </p>
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
    api.leaderboard()
      .then((data) => setPlayers(data.leaderboard || []))
      .catch(() => setPlayers([]));
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
  const played = player.lastPlayedDate === new Date().toISOString().slice(0, 10);
  const r = 27;
  const circ = 2 * Math.PI * r;

  /* The server is the scorekeeper: we report the result, it decides the points. */
  const award = useCallback(async (pts, label, gameKey, extraBadges = []) => {
    try {
      const result = await api.award(gameKey, pts, extraBadges);
      setPlayer(result.player);
      setRefreshKey((k) => k + 1);
      if (result.points > 0) toast(`+${result.points} pts — ${label}`);
      else toast(`Daily limit reached for ${label}`, 'err');
      if (result.leveledTo) toast(`🎉 Level ${result.leveledTo} reached!`);
      (result.newBadges || []).forEach((b) => toast(`Badge unlocked: ${b}`));
    } catch (err) {
      toast(err.message, 'err');
    }
  }, [setPlayer, toast]);

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

  /* Resume an existing session on load — the token is validated server-side. */
  useEffect(() => {
    let live = true;
    api.playerMe().then((p) => { if (live && p) setPlayer(p); });
    return () => { live = false; };
  }, []);

  const logout = () => {
    api.playerLogout();
    setPlayer(null);
  };

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
          <PlayHub player={player} setPlayer={setPlayer} onLogout={logout} />
        ) : (
          <AuthGate onLogin={(p, isNew) => { setPlayer(p); if (isNew) toast(`Welcome to Whitney CS Club, ${p.name.split(' ')[0]}!`); }} />
        )}
      </div>
    </section>
  );
}
