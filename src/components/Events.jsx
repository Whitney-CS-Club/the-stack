import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { storeGet } from '../lib/storage.js';
import { Reveal, WordReveal } from './Reveal.jsx';

function formatEventDate(dateStr) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
}

export default function Events() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    let live = true;
    storeGet('club-events').then((ev) => { if (live) setEvents(ev || []); });
    return () => { live = false; };
  }, []);

  const sorted = (events || []).slice().sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  return (
    <section id="events" className="block" data-aurora="#38e8a0" style={{ background: 'rgba(10,15,22,0.72)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div className="container">
        <div className="section-head">
          <Reveal><div className="eyebrow">Transmission schedule</div></Reveal>
          <WordReveal text="What's coming up." />
          <Reveal delay={0.15}><p>Posted live by the cabinet; no redeploys or stale flyers.</p></Reveal>
        </div>

        {events === null ? (
          <div className="empty">syncing events…</div>
        ) : sorted.length === 0 ? (
          <div className="empty">No upcoming events posted yet. Please check back soon.</div>
        ) : (
          <div>
            {sorted.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.55, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: 20, alignItems: 'center',
                  padding: '22px 0', borderBottom: '1px solid var(--line)',
                  borderTop: i === 0 ? '1px solid var(--line)' : 'none',
                }}
                className="event-row"
              >
                <div className="mono" style={{ color: 'var(--green)', fontSize: '0.82rem', letterSpacing: '0.08em' }}>
                  {formatEventDate(ev.date)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{ev.name}</div>
                  {ev.description && <div style={{ color: 'var(--muted)', fontSize: '0.87rem', marginTop: 3 }}>{ev.description}</div>}
                </div>
                {ev.tag ? (
                  <div className="mono" style={{ fontSize: '0.64rem', letterSpacing: '0.14em', textTransform: 'uppercase', border: '1px solid var(--line-bright)', padding: '5px 11px', color: 'var(--cyan)' }}>
                    {ev.tag}
                  </div>
                ) : <div />}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 680px) { .event-row { grid-template-columns: 1fr !important; gap: 6px !important; } }
      `}</style>
    </section>
  );
}
