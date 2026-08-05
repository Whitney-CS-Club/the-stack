import { useState } from 'react';
import { api } from '../lib/api.js';
import { useToast } from './Toaster.jsx';
import { Reveal, WordReveal } from './Reveal.jsx';

const INTERESTS = ['Web Dev', 'AI / ML', 'Competitive Programming', 'Cybersecurity', 'Game Dev', 'Open Source'];
const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad Student'];

export default function Join() {
  const toast = useToast();
  const [picked, setPicked] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const togglePick = (v) =>
    setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const form = e.target;
    const name = form.name.value.trim();
    try {
      await api.join({
        name,
        email: form.email.value.trim(),
        year: form.year.value,
        interests: picked,
      });
      setMsg({ type: 'ok', text: `> welcome aboard, ${name.split(' ')[0]}. keep an eye on your inbox.` });
      form.reset();
      setPicked([]);
      toast(`Welcome, ${name.split(' ')[0]} — application received`);
    } catch (err) {
      setMsg({ type: 'err', text: `> ${err.message}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="join" className="block" data-aurora="#ffb02e">
      <div className="container">
        <div className="section-head">
          <Reveal><div className="eyebrow">Enlistment</div></Reveal>
          <WordReveal text="Join the club." />
          <Reveal delay={0.15}><p>Takes 30 seconds. We'll add you to the group chat and email you before the next event.</p></Reveal>
        </div>

        <Reveal>
          <form onSubmit={submit} className="panel brackets" style={{ maxWidth: 680 }}>
            <i /><i /><i /><i />
            <div className="form-grid">
              <div className="field">
                <label htmlFor="j-name">Name</label>
                <input id="j-name" name="name" required placeholder="Ada Lovelace" />
              </div>
              <div className="field">
                <label htmlFor="j-email">Email</label>
                <input id="j-email" name="email" type="email" required placeholder="you@university.edu" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="j-year">Year</label>
              <select id="j-year" name="year">
                {YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Interests</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
                {INTERESTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => togglePick(v)}
                    className="mono"
                    style={{
                      textAlign: 'left', padding: '11px 13px', fontSize: '0.72rem', letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      background: picked.includes(v) ? 'rgba(56,232,160,0.1)' : 'var(--bg-2)',
                      border: `1px solid ${picked.includes(v) ? 'var(--green)' : 'var(--line)'}`,
                      color: picked.includes(v) ? 'var(--green)' : 'var(--muted)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {picked.includes(v) ? '▪ ' : '▫ '}{v}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn primary" data-cursor="SEND" disabled={busy}>
              {busy ? 'Transmitting…' : 'Submit application'}
            </button>
            {msg && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}
          </form>
        </Reveal>
      </div>
    </section>
  );
}
