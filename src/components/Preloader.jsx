import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const BOOT_LINES = [
  '> mount /dev/duck',
  '> loading debug core .......... ok',
  '> calibrating led optics ...... ok',
  '> rubber integrity check ...... ok',
];

export default function Preloader({ onDone }) {
  const [pct, setPct] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // preload both hero renders while the boot sequence plays
    ['/duck/intact-2000.webp', '/duck/exploded-2000.webp'].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    const start = performance.now();
    const DURATION = 1900;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(Math.round(eased * 100));
      setLineCount(Math.min(BOOT_LINES.length, Math.floor(t * (BOOT_LINES.length + 1))));
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        setLeaving(true);
        setTimeout(onDone, 750);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          key="preloader"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{
            position: 'fixed', inset: 0, zIndex: 4000, background: 'var(--bg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 34,
          }}
        >
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            <motion.svg viewBox="0 0 100 100" width="120" height="120" style={{ position: 'absolute', inset: 0 }}>
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" strokeWidth="1" />
              <motion.circle
                cx="50" cy="50" r="44" fill="none" stroke="url(#pl-grad)" strokeWidth="2"
                strokeDasharray="276.5" strokeLinecap="square"
                style={{ rotate: -90, transformOrigin: '50% 50%' }}
                animate={{ strokeDashoffset: 276.5 - (276.5 * pct) / 100 }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
              <defs>
                <linearGradient id="pl-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3fd4ff" />
                  <stop offset="100%" stopColor="#38e8a0" />
                </linearGradient>
              </defs>
            </motion.svg>
            <div
              className="mono"
              style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700,
              }}
            >
              {pct}%
            </div>
          </div>

          <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.06em', minHeight: 84, textAlign: 'left', width: 300 }}>
            {BOOT_LINES.slice(0, lineCount).map((l) => (
              <motion.div key={l} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 4 }}>
                {l}
              </motion.div>
            ))}
          </div>

          <div className="eyebrow">THE_STACK · BOOT SEQUENCE</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
