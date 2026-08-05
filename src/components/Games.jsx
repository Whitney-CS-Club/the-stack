import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  codingChallenges, triviaQuestions, bigOQuestions, bigOOptions,
  debugSnippets, memoryPairs, typeSnippets, regexBank,
} from '../lib/gameData.js';

const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);

function GamePanel({ title, tag, children, onClose }) {
  return (
    <motion.div
      className="panel brackets lit"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 26 }}
    >
      <i /><i /><i /><i />
      <div className="panel-title">
        {title} <span className="tag">{tag}</span>
        <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={onClose}>close</button>
      </div>
      {children}
    </motion.div>
  );
}

function Summary({ heading, detail, pts, onBack }) {
  return (
    <div style={{ textAlign: 'left' }}>
      <h3 style={{ textTransform: 'uppercase', marginBottom: 8 }}>{heading}</h3>
      <p className="mono" style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 18 }}>
        {detail} · <span style={{ color: 'var(--green)' }}>+{pts} pts</span>
      </p>
      <button className="btn primary" onClick={onBack}>back to arcade</button>
    </div>
  );
}

/* ---------- 1. Daily Coding Challenge ---------- */
export function DailyChallenge({ onAward, onClose }) {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const ch = codingChallenges[dayIndex % codingChallenges.length];
  const [code, setCode] = useState(ch.starter);
  const [results, setResults] = useState(null);
  const awarded = useRef(false);

  const run = async () => {
    let fn;
    try {
      fn = new Function(`${code}\nreturn ${ch.fnName};`)();
      if (typeof fn !== 'function') throw new Error(`could not find a function named ${ch.fnName}`);
    } catch (err) {
      setResults({ rows: [{ ok: false, label: 'syntax error', detail: err.message }], passCount: 0 });
      return;
    }
    let passCount = 0;
    const rows = ch.tests.map((t, i) => {
      let actual, ok;
      try {
        actual = fn(...t.args);
        ok = JSON.stringify(actual) === JSON.stringify(t.expected);
      } catch (err) {
        actual = 'error: ' + err.message;
        ok = false;
      }
      if (ok) passCount++;
      return {
        ok,
        label: `test ${i + 1}: ${JSON.stringify(t.args)}`,
        detail: ok ? '✔ pass' : `✘ got ${JSON.stringify(actual)}, expected ${JSON.stringify(t.expected)}`,
      };
    });
    setResults({ rows, passCount });
    if (passCount === ch.tests.length && !awarded.current) {
      awarded.current = true;
      await onAward(20, 'Daily Challenge', 'daily');
    }
  };

  return (
    <GamePanel title={ch.title} tag="daily challenge · +20" onClose={onClose}>
      <p style={{ color: 'var(--muted)', marginBottom: 14 }}>{ch.prompt}</p>
      <textarea className="code-editor" spellCheck="false" value={code} onChange={(e) => setCode(e.target.value)} />
      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
        <button className="btn primary" onClick={run}>run tests</button>
      </div>
      {results && (
        <div style={{ marginTop: 16 }}>
          {results.rows.map((r, i) => (
            <div
              key={i}
              className="mono"
              style={{
                display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 12px',
                fontSize: '0.76rem', marginBottom: 6,
                background: r.ok ? 'rgba(56,232,160,0.07)' : 'rgba(255,59,48,0.07)',
                color: r.ok ? 'var(--green)' : 'var(--red)',
              }}
            >
              <span>{r.label}</span><span>{r.detail}</span>
            </div>
          ))}
          <div className="mono" style={{ marginTop: 10, fontSize: '0.8rem', color: results.passCount === ch.tests.length ? 'var(--green)' : 'var(--muted)' }}>
            {results.passCount}/{ch.tests.length} tests passed {results.passCount === ch.tests.length ? '— +20 pts, today marked as played.' : ''}
          </div>
        </div>
      )}
    </GamePanel>
  );
}

/* ---------- 2. Trivia Blitz ---------- */
export function Trivia({ onAward, onClose }) {
  const [questions] = useState(() => shuffle(triviaQuestions).slice(0, 8));
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [done, setDone] = useState(false);
  const awarded = useRef(false);

  const q = questions[qIndex];

  const pick = (i) => {
    if (chosen !== null) return;
    setChosen(i);
    const correct = i === q.answer;
    if (correct) setScore((s) => s + 1);
    setTimeout(async () => {
      if (qIndex + 1 >= questions.length) {
        setDone(true);
        const finalScore = score + (correct ? 1 : 0);
        const pts = finalScore * 5;
        if (pts > 0 && !awarded.current) {
          awarded.current = true;
          await onAward(pts, 'Trivia Blitz', 'trivia', finalScore === questions.length ? ['🎯 Perfect Score'] : []);
        }
      } else {
        setQIndex((x) => x + 1);
        setChosen(null);
      }
    }, 900);
  };

  if (done) {
    return (
      <GamePanel title="Trivia complete" tag={`${score} / ${questions.length} correct`} onClose={onClose}>
        <Summary heading="Blitz finished" detail={`${score} of ${questions.length} correct`} pts={score * 5} onBack={onClose} />
      </GamePanel>
    );
  }

  return (
    <GamePanel title="CS Trivia Blitz" tag={`question ${qIndex + 1} / ${questions.length}`} onClose={onClose}>
      <p style={{ marginBottom: 16, fontSize: '1.02rem' }}>{q.q}</p>
      {q.options.map((opt, i) => (
        <button
          key={i}
          className={`quiz-option ${chosen !== null && i === q.answer ? 'correct' : ''} ${chosen === i && i !== q.answer ? 'wrong' : ''}`}
          disabled={chosen !== null}
          onClick={() => pick(i)}
        >
          {opt}
        </button>
      ))}
    </GamePanel>
  );
}

/* ---------- shared timed-round hook ---------- */
function useCountdown(seconds, onExpire, key) {
  const [left, setLeft] = useState(seconds);
  const cb = useRef(onExpire);
  cb.current = onExpire;
  useEffect(() => {
    setLeft(seconds);
    const h = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) { clearInterval(h); cb.current(); return 0; }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(h);
  }, [key, seconds]);
  return left;
}

/* ---------- 3. Big-O Speed Round ---------- */
export function BigO({ onAward, onClose }) {
  const [rounds] = useState(() => shuffle(bigOQuestions));
  const [rIndex, setRIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [done, setDone] = useState(false);
  const awarded = useRef(false);
  const r = rounds[rIndex];

  const lock = (opt) => {
    if (chosen !== null) return;
    setChosen(opt ?? '__none__');
    const correct = opt === r.answer;
    if (correct) setScore((s) => s + 1);
    setTimeout(async () => {
      if (rIndex + 1 >= rounds.length) {
        setDone(true);
        const finalScore = score + (correct ? 1 : 0);
        const pts = finalScore * 8;
        if (pts > 0 && !awarded.current) {
          awarded.current = true;
          await onAward(pts, 'Big-O Speed Round', 'bigo', finalScore === rounds.length ? ['⚡ Speed Demon'] : []);
        }
      } else {
        setRIndex((x) => x + 1);
        setChosen(null);
      }
    }, 900);
  };

  const left = useCountdown(15, () => lock(null), rIndex);

  if (done) {
    return (
      <GamePanel title="Speed round complete" tag={`${score} / ${rounds.length} correct`} onClose={onClose}>
        <Summary heading="Clock stopped" detail={`${score} of ${rounds.length} correct`} pts={score * 8} onBack={onClose} />
      </GamePanel>
    );
  }

  return (
    <GamePanel title="Big-O Speed Round" tag={`round ${rIndex + 1} / ${rounds.length}`} onClose={onClose}>
      <div className="timer-track"><div className="timer-fill" style={{ width: `${(left / 15) * 100}%` }} /></div>
      <div className="code-block">{r.snippet}</div>
      {bigOOptions.map((opt) => (
        <button
          key={opt}
          className={`quiz-option ${chosen !== null && opt === r.answer ? 'correct' : ''} ${chosen === opt && opt !== r.answer ? 'wrong' : ''}`}
          disabled={chosen !== null}
          onClick={() => lock(opt)}
        >
          {opt}
        </button>
      ))}
    </GamePanel>
  );
}

/* ---------- 4. Debug Hunt ---------- */
export function DebugHunt({ onAward, onClose }) {
  const [rounds] = useState(() => shuffle(debugSnippets));
  const [rIndex, setRIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [done, setDone] = useState(false);
  const awarded = useRef(false);
  const r = rounds[rIndex];

  const pick = (i) => {
    if (chosen !== null) return;
    setChosen(i);
    const correct = i === r.buggy;
    if (correct) setScore((s) => s + 1);
    setTimeout(async () => {
      if (rIndex + 1 >= rounds.length) {
        setDone(true);
        const finalScore = score + (correct ? 1 : 0);
        const pts = finalScore * 15;
        if (pts > 0 && !awarded.current) {
          awarded.current = true;
          await onAward(pts, 'Debug Hunt', 'debug', finalScore === rounds.length ? ['🐛 Bug Squasher'] : []);
        }
      } else {
        setRIndex((x) => x + 1);
        setChosen(null);
      }
    }, 1700);
  };

  if (done) {
    return (
      <GamePanel title="Debug Hunt complete" tag={`${score} / ${rounds.length} correct`} onClose={onClose}>
        <Summary heading="Hunt over" detail={`${score} of ${rounds.length} bugs found`} pts={score * 15} onBack={onClose} />
      </GamePanel>
    );
  }

  return (
    <GamePanel title="Debug Hunt" tag={`round ${rIndex + 1} / ${rounds.length} · click the buggy line`} onClose={onClose}>
      <div className="code-block" style={{ cursor: chosen === null ? 'pointer' : 'default', padding: 10 }}>
        {r.lines.map((l, i) => (
          <div
            key={i}
            onClick={() => pick(i)}
            style={{
              padding: '3px 8px',
              background: chosen !== null && i === r.buggy ? 'rgba(56,232,160,0.16)'
                : chosen === i ? 'rgba(255,59,48,0.16)' : 'transparent',
            }}
          >
            {l}
          </div>
        ))}
      </div>
      {chosen !== null && (
        <div className="mono" style={{ fontSize: '0.76rem', color: chosen === r.buggy ? 'var(--green)' : 'var(--red)', padding: '10px 12px', border: '1px solid var(--line)' }}>
          {chosen === r.buggy ? '✔ correct — ' : '✘ not quite — '}{r.why}
        </div>
      )}
    </GamePanel>
  );
}

/* ---------- 5. Memory Match ---------- */
export function MemoryMatch({ onAward, onClose }) {
  const [cards] = useState(() => shuffle(memoryPairs.flatMap((p, i) => [
    { ...p, pairId: i, cardId: i + 'a' },
    { ...p, pairId: i, cardId: i + 'b' },
  ])));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const awarded = useRef(false);

  const flip = (cardId) => {
    if (busy || done || matched.has(cardId) || flipped.includes(cardId)) return;
    const next = [...flipped, cardId];
    setFlipped(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    setBusy(true);
    const [a, b] = next.map((id) => cards.find((c) => c.cardId === id));
    setTimeout(async () => {
      let newMatched = matched;
      if (a.pairId === b.pairId) {
        newMatched = new Set([...matched, a.cardId, b.cardId]);
        setMatched(newMatched);
      }
      setFlipped([]);
      setBusy(false);
      if (newMatched.size === cards.length && !awarded.current) {
        awarded.current = true;
        setDone(true);
        const finalMoves = moves + 1;
        const pts = Math.max(70 - finalMoves * 3, 15);
        await onAward(pts, 'Memory Match', 'memory', finalMoves <= 8 ? ['🧠 Memory Master'] : []);
      }
    }, 700);
  };

  if (done) {
    const pts = Math.max(70 - moves * 3, 15);
    return (
      <GamePanel title="All matched" tag={`${moves} moves`} onClose={onClose}>
        <Summary heading="Board cleared" detail={`${moves} moves`} pts={pts} onBack={onClose} />
      </GamePanel>
    );
  }

  return (
    <GamePanel title="Memory Match" tag={`${matched.size / 2} / ${memoryPairs.length} pairs · ${moves} moves`} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, maxWidth: 440, margin: '0 auto' }}>
        {cards.map((c) => {
          const up = flipped.includes(c.cardId) || matched.has(c.cardId);
          return (
            <div key={c.cardId} onClick={() => flip(c.cardId)} style={{ aspectRatio: '1', perspective: 600, cursor: 'pointer' }}>
              <motion.div
                animate={{ rotateY: up ? 180 : 0 }}
                transition={{ duration: 0.45 }}
                style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}
              >
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-2)', border: '1px solid var(--line)',
                  fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: '1.2rem',
                }}>?</div>
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  background: 'var(--bg-1)',
                  border: `1px solid ${matched.has(c.cardId) ? 'var(--green)' : 'var(--line-bright)'}`,
                  color: matched.has(c.cardId) ? 'var(--green)' : 'var(--ink)',
                  fontSize: '0.66rem', textAlign: 'center', padding: 4, fontFamily: 'var(--font-mono)',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{c.icon}</span>
                  {c.label}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </GamePanel>
  );
}

/* ---------- 6. Type Racer ---------- */
export function TypeRacer({ onAward, onClose }) {
  const [target] = useState(() => typeSnippets[Math.floor(Math.random() * typeSnippets.length)]);
  const [val, setVal] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [now, setNow] = useState(null);
  const [final, setFinal] = useState(null);
  const awarded = useRef(false);

  useEffect(() => {
    if (startTime === null || final) return;
    const h = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(h);
  }, [startTime, final]);

  const correctChars = (s) => {
    let c = 0;
    for (let i = 0; i < s.length; i++) if (s[i] === target[i]) c++;
    return c;
  };

  const finish = async (value) => {
    if (awarded.current) return;
    awarded.current = true;
    const elapsedMin = Math.max((performance.now() - (startTime || performance.now())) / 60000, 0.02);
    const acc = value.length ? Math.round((correctChars(value) / value.length) * 100) : 0;
    const wpm = Math.round((target.length / 5) / elapsedMin);
    const pts = Math.max(Math.round((wpm / 2) * (acc / 100)), 5);
    setFinal({ wpm, acc, pts });
    await onAward(pts, 'Type Racer', 'typerace', wpm >= 60 ? ['⌨️ Fast Fingers'] : []);
  };

  const onChange = (e) => {
    const v = e.target.value;
    if (final) return;
    if (startTime === null) setStartTime(performance.now());
    setVal(v);
    if (v === target) finish(v);
  };

  const elapsed = startTime && now ? (now - startTime) / 1000 : 0;
  const liveAcc = val.length ? Math.round((correctChars(val) / val.length) * 100) : 100;
  const liveWpm = startTime ? Math.round((val.length / 5) / Math.max(elapsed / 60, 0.02)) : 0;

  return (
    <GamePanel title="Type Racer" tag="type it exactly" onClose={onClose}>
      <div className="code-block">{target}</div>
      <textarea
        className="code-editor"
        style={{ minHeight: 74 }}
        spellCheck="false"
        placeholder="start typing to begin the clock…"
        value={val}
        onChange={onChange}
        disabled={!!final}
      />
      <div style={{ display: 'flex', gap: 28, margin: '16px 0', flexWrap: 'wrap' }} className="mono">
        {[
          [final ? final.wpm : liveWpm, 'WPM'],
          [`${final ? final.acc : liveAcc}%`, 'ACCURACY'],
          [`${elapsed.toFixed(1)}s`, 'TIME'],
        ].map(([n, l]) => (
          <div key={l}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--green)' }}>{n}</div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', color: 'var(--muted)' }}>{l}</div>
          </div>
        ))}
      </div>
      {final
        ? <Summary heading="Race finished" detail={`${final.wpm} WPM at ${final.acc}% accuracy`} pts={final.pts} onBack={onClose} />
        : <button className="btn ghost" onClick={() => finish(val)}>finish early</button>}
    </GamePanel>
  );
}

/* ---------- 7. Regex Rumble ---------- */
export function RegexRumble({ onAward, onClose }) {
  const [rounds] = useState(() => shuffle(regexBank).slice(0, 8));
  const [rIndex, setRIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [done, setDone] = useState(false);
  const awarded = useRef(false);
  const r = rounds[rIndex];

  const lock = (ans) => {
    if (chosen !== null) return;
    setChosen(ans === null ? '__none__' : ans);
    const correct = ans === r.isMatch;
    if (correct) setScore((s) => s + 1);
    setTimeout(async () => {
      if (rIndex + 1 >= rounds.length) {
        setDone(true);
        const finalScore = score + (correct ? 1 : 0);
        const pts = finalScore * 8;
        if (pts > 0 && !awarded.current) {
          awarded.current = true;
          await onAward(pts, 'Regex Rumble', 'regex', finalScore === rounds.length ? ['✅ Regex Master'] : []);
        }
      } else {
        setRIndex((x) => x + 1);
        setChosen(null);
      }
    }, 800);
  };

  const left = useCountdown(12, () => lock(null), rIndex);

  if (done) {
    return (
      <GamePanel title="Regex Rumble complete" tag={`${score} / ${rounds.length} correct`} onClose={onClose}>
        <Summary heading="Rumble settled" detail={`${score} of ${rounds.length} correct`} pts={score * 8} onBack={onClose} />
      </GamePanel>
    );
  }

  return (
    <GamePanel title="Regex Rumble" tag={`round ${rIndex + 1} / ${rounds.length}`} onClose={onClose}>
      <div className="timer-track"><div className="timer-fill" style={{ width: `${(left / 12) * 100}%` }} /></div>
      <div className="code-block">{`pattern: ${r.display}\nstring:  "${r.test}"`}</div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[[true, '✅ It matches'], [false, '❌ No match']].map(([v, label]) => (
          <button
            key={label}
            className={`quiz-option ${chosen !== null && v === r.isMatch ? 'correct' : ''} ${chosen === v && v !== r.isMatch ? 'wrong' : ''}`}
            style={{ textAlign: 'center' }}
            disabled={chosen !== null}
            onClick={() => lock(v)}
          >
            {label}
          </button>
        ))}
      </div>
    </GamePanel>
  );
}
