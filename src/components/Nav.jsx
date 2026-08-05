import { useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#events', label: 'Events' },
  { href: '#play', label: 'Arcade' },
  { href: '#join', label: 'Join' },
];

export default function Nav() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (y < 120) setHidden(false);
    else setHidden(y > prev && !open);
  });

  return (
    <>
      <motion.header
        animate={{ y: hidden ? '-100%' : '0%' }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
          background: 'rgba(5,7,12,0.72)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <nav
          className="container"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}
        >
          <a href="#home" className="mono" style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 9 }}>
            <motion.span
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{ repeat: Infinity, duration: 1.1, times: [0, 0.5, 0.5, 1] }}
              style={{ width: 8, height: 8, background: 'var(--green)', display: 'inline-block' }}
            />
            Whitney HS
          </a>

          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="nav-link mono">{l.label}</a>
            ))}
            <a href="#cabinet" className="btn primary sm brackets" data-cursor="AUTH"><i /><i /><i /><i />Cabinet</a>
          </div>

          <button
            className="nav-burger mono"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
            style={{ display: 'none', fontSize: '0.8rem', letterSpacing: '0.14em' }}
          >
            {open ? 'CLOSE' : 'MENU'}
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 850, background: 'rgba(5,7,12,0.96)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8vw',
            }}
          >
            {[...LINKS, { href: '#cabinet', label: 'Cabinet' }].map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.06 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 8vw, 3.4rem)',
                  textTransform: 'uppercase', fontWeight: 600, padding: '10px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                {l.label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .nav-link { font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); position: relative; transition: color 0.2s; }
        .nav-link::after { content: ''; position: absolute; left: 0; right: 0; bottom: -6px; height: 1px; background: var(--green); transform: scaleX(0); transform-origin: left; transition: transform 0.25s; }
        .nav-link:hover { color: var(--ink); }
        .nav-link:hover::after { transform: scaleX(1); }
        @media (max-width: 820px) {
          .nav-desktop { display: none !important; }
          .nav-burger { display: block !important; }
        }
      `}</style>
    </>
  );
}
