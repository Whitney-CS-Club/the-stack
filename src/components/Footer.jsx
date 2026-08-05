import { motion } from 'framer-motion';

const JOKES = [
  "there are 10 types of people: those who understand binary and those who don't",
  'it works on my machine // status: unresolved since 2019',
  '99 little bugs in the code — take one down, patch it around, 127 little bugs in the code',
  'why do programmers prefer dark mode? because light attracts bugs',
  'TODO: write better TODOs',
  'the duck has heard things it can never unhear',
];

export default function Footer() {
  const line = JOKES.join('  ///  ');
  return (
    <footer style={{ borderTop: '1px solid var(--line)', overflow: 'hidden' }}>
      <div style={{ padding: '18px 0', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>
        <motion.div
          className="mono"
          style={{ display: 'inline-block', fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.08em' }}
          animate={{ x: ['0%', '-50%'] }}
          transition={{ repeat: Infinity, duration: 60, ease: 'linear' }}
        >
          <span style={{ paddingRight: 60 }}>{line}</span>
          <span style={{ paddingRight: 60 }}>{line}</span>
        </motion.div>
      </div>
      <div
        className="container"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12, padding: '28px clamp(20px, 4vw, 48px)',
        }}
      >
        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
          WHITNEY CS CLUB © {new Date().getFullYear()} · BUILT WITH TOO MUCH COFFEE
        </span>
        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
          UNIT-01 IS LISTENING <span style={{ color: 'var(--red)' }}>●</span>
        </span>
      </div>
    </footer>
  );
}
