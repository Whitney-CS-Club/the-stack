import { useRef } from 'react';
import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useVelocity } from 'framer-motion';

const ITEMS = [
  ['BUILD', '( project nights )'],
  ['PLAY', '( the arcade )'],
  ['DEBUG', '( talk to the duck )'],
  ['SHIP', '( demo day )'],
];

function Row({ direction = -1, offsetSets = 0 }) {
  const x = useMotionValue(0);
  const setRef = useRef(null);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(velocity, { stiffness: 60, damping: 30 });

  useAnimationFrame((_, delta) => {
    const setWidth = setRef.current?.offsetWidth || 0;
    if (!setWidth) return;
    const base = 60; // px/s idle drift
    const boost = Math.min(Math.abs(smoothVelocity.get()) * 0.35, 900);
    let next = x.get() + direction * ((base + boost) * delta) / 1000;
    // wrap seamlessly
    if (next <= -setWidth) next += setWidth;
    if (next > 0) next -= setWidth;
    x.set(next);
  });

  const set = (key) => (
    <div key={key} ref={key === 'a' ? setRef : undefined} style={{ display: 'flex', alignItems: 'baseline', flexShrink: 0 }}>
      {ITEMS.map(([big, small]) => (
        <span key={big} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '2vw', paddingRight: '4vw' }}>
          <span className="km-big">{big}</span>
          <span className="km-small mono">{small}</span>
        </span>
      ))}
    </div>
  );

  return (
    <motion.div style={{ display: 'flex', x, willChange: 'transform' }}>
      {['a', 'b', 'c'].map(set)}
    </motion.div>
  );
}

export default function KineticMarquee() {
  return (
    <section
      aria-hidden="true"
      style={{
        overflow: 'hidden', padding: '9vh 0',
        borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
        mixBlendMode: 'difference', position: 'relative', zIndex: 2,
      }}
    >
      <Row direction={-1} />
      <style>{`
        .km-big {
          font-family: var(--font-display); font-weight: 700; text-transform: uppercase;
          font-size: clamp(4rem, 11vw, 10rem); line-height: 0.95; letter-spacing: -0.03em;
          color: var(--ink); white-space: nowrap;
        }
        .km-small {
          font-size: clamp(0.65rem, 1vw, 0.85rem); letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--muted); white-space: nowrap;
        }
      `}</style>
    </section>
  );
}
