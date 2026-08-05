import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { Magnetic } from './Interactive.jsx';

/*
 * 480vh scroll-scrubbed teardown.
 * Phase A  [0.00–0.40]  intact duck, HUD frame, dialogue lines
 * Phase B  [0.40–0.58]  chromatic-glitch crossfade to the exploded render
 * Phase C  [0.58–1.00]  exploded anatomy — every callout opens a component dossier
 */

const CALLOUTS = [
  {
    id: 'optics',
    label: 'LED MATRIX OPTICS', sub: '2× 8×8 DOT ARRAY', x: 41, y: 15, at: 0.60, side: 'right',
    field: 'COMPUTER GRAPHICS',
    body: "Every display you've ever used is this, scaled up: a grid of individually addressable lights. Your laptop screen is just ~8 million RGB \"dots\" redrawn from a framebuffer 60–144 times a second — rasterization is the art of deciding which ones to light.",
    tie: 'Game Dev nights — write your own renderer',
  },
  {
    id: 'battery',
    label: 'LI-PO POWER CELL', sub: '3.7V · 1200mAh', x: 64, y: 26, at: 0.64, side: 'right',
    field: 'EMBEDDED SYSTEMS',
    body: 'Power is a compute budget. Chips scale voltage and clock speed on the fly (DVFS) to stretch a battery — the reason your laptop slows down when unplugged, and why data centers care about performance-per-watt as much as raw speed.',
    tie: 'Hardware interest group',
  },
  {
    id: 'bus',
    label: 'RIBBON DATA BUS', sub: 'FLEX · SERIAL LINK', x: 59, y: 37, at: 0.68, side: 'left', hideMobile: true,
    field: 'COMPUTER SYSTEMS',
    body: "These ribbons are buses — shared highways moving bits between chips. Bandwidth (lanes × clock) versus latency (time for the first bit) is one of the great trade-offs in computing, from PCIe 5.0 down to this duck's spine.",
    tie: 'Systems talks — how data actually moves',
  },
  {
    id: 'board',
    label: 'MAIN LOGIC BOARD', sub: 'DEBUG CORE v2', x: 55, y: 49, at: 0.72, side: 'right',
    field: 'COMPUTER ARCHITECTURE',
    body: 'Home of the fetch–decode–execute loop: the CPU pulls an instruction from memory, works out what it means, does it, repeat — billions of times per second. Every language you write eventually compiles down to this loop.',
    tie: 'Project nights — build on microcontrollers',
  },
  {
    id: 'npu',
    label: 'NEURAL COPROCESSOR', sub: 'NPU · 4 TOPS', x: 52, y: 66, at: 0.76, side: 'left', hideMobile: true,
    field: 'AI / MACHINE LEARNING',
    body: 'Dedicated silicon that does one thing absurdly fast: matrix multiplication — the operation behind every neural network. Your phone ships one; every LLM token you have ever generated was billions of multiply-accumulates on hardware like this.',
    tie: 'AI/ML group — train a model on real silicon',
  },
  {
    id: 'input',
    label: 'INPUT MODULE', sub: 'QWERTY · 60%', x: 17, y: 72, at: 0.80, side: 'left', hideMobile: true,
    field: 'HCI / FIRMWARE',
    body: "A keyboard is a live CS problem: firmware scans a row-column switch matrix thousands of times a second, debounces noisy contacts, and fires interrupts. Human–computer interaction starts here — at the exact edge where fingers become bits.",
    tie: 'Firmware workshop — flash your own keyboard',
  },
  {
    id: 'shell',
    label: 'STARBOARD SHELL', sub: 'MATTE PVC HULL', x: 79, y: 54, at: 0.84, side: 'right',
    field: 'SOFTWARE DESIGN',
    body: "The shell is an abstraction: users squeeze a duck, never the PCB. Good software works the same way — clean interfaces hide messy internals. Encapsulation isn't just an OOP keyword; it's the reason anything complex stays usable.",
    tie: 'Code review circles — API design',
  },
];

function Callout({ progress, c, live, active, onSelect }) {
  const opacity = useTransform(progress, [c.at, c.at + 0.05, 0.96, 1], [0, 1, 1, 0]);
  const lineScale = useTransform(progress, [c.at, c.at + 0.07], [0, 1]);
  const textX = useTransform(progress, [c.at + 0.02, c.at + 0.08], [c.side === 'left' ? 14 : -14, 0]);
  return (
    <motion.button
      type="button"
      className={`callout ${c.hideMobile ? 'hide-sm' : ''} ${active ? 'is-active' : ''}`}
      style={{ left: `${c.x}%`, top: `${c.y}%`, opacity, pointerEvents: live ? 'auto' : 'none' }}
      onClick={() => onSelect(c)}
      data-cursor="INSPECT"
      aria-label={`Inspect ${c.label}`}
      tabIndex={live ? 0 : -1}
      whileHover={{ scale: 1.04 }}
    >
      <span className="callout-dot">
        <motion.span
          className="callout-dot-pulse"
          animate={{ scale: [1, 1.9, 1], opacity: [0.9, 0.35, 0.9] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        />
      </span>
      <motion.span
        className="callout-line"
        style={{ scaleX: lineScale, transformOrigin: c.side === 'left' ? 'right center' : 'left center' }}
        data-side={c.side}
      />
      <motion.span className="callout-text" data-side={c.side} style={{ x: textX }}>
        <span className="callout-label">{c.label}</span>
        <span className="callout-sub">{c.sub} · TAP TO INSPECT</span>
      </motion.span>
    </motion.button>
  );
}

function Dossier({ c, onClose }) {
  return (
    <>
      <motion.aside
        className="dossier"
        role="dialog"
        aria-label={c.label}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      >
        <div className="dossier-top">
          <span className="eyebrow">{c.field}</span>
          <button type="button" className="dossier-close mono" onClick={onClose} data-cursor="CLOSE" aria-label="Close">
            [ ESC ]
          </button>
        </div>
        <h3 className="dossier-title">{c.label}</h3>
        <div className="dossier-spec mono">{c.sub}</div>
        <p className="dossier-body">{c.body}</p>
        <div className="dossier-tie">
          <span className="mono dossier-tie-label">IN THE CLUB</span>
          <span>{c.tie}</span>
        </div>
      </motion.aside>
    </>
  );
}

function Dialogue({ progress, range, children }) {
  const [a, b, c, d] = range;
  const opacity = useTransform(progress, [a, b, c, d], [0, 1, 1, 0]);
  const y = useTransform(progress, [a, d], [36, -36]);
  return (
    <motion.div className="hero-dialogue" style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}

export default function DuckHero({ booted }) {
  const ref = useRef(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  /* mouse parallax on the render stack (desktop) — the duck leans away from the cursor */
  const pmx = useMotionValue(0);
  const pmy = useMotionValue(0);
  const parX = useSpring(pmx, { stiffness: 55, damping: 18 });
  const parY = useSpring(pmy, { stiffness: 55, damping: 18 });
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const onMove = (e) => {
      pmx.set((e.clientX / window.innerWidth - 0.5) * -22);
      pmy.set((e.clientY / window.innerHeight - 0.5) * -14);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [pmx, pmy]);

  /* component dossier state — callouts only interactive while the anatomy phase is on screen.
     Gated by a plain scroll listener (not the motion value) so it works even in
     rAF-throttled tabs, e.g. a page restored in the background. */
  const [anatomyLive, setAnatomyLive] = useState(false);
  const [activePart, setActivePart] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const total = el.offsetHeight - window.innerHeight;
      const y = -el.getBoundingClientRect().top;
      setAnatomyLive(total > 0 && y / total > 0.58);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  useEffect(() => {
    if (!anatomyLive) setActivePart(null);
  }, [anatomyLive]);
  useEffect(() => {
    if (!activePart) return;
    const onKey = (e) => { if (e.key === 'Escape') setActivePart(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePart]);

  /* intact render */
  const intactOpacity = useTransform(p, [0, 0.44, 0.54], [1, 1, 0]);
  const intactScale = useTransform(p, [0, 0.54], [1.04, 1.16]);

  /* exploded render */
  const explodedOpacity = useTransform(p, [0.44, 0.56], [0, 1]);
  const explodedScale = useTransform(p, [0.44, 1], [1.2, 1.0]);

  /* glitch burst — triangle peaking mid-transition */
  const burst = useTransform(p, [0.40, 0.49, 0.58], [0, 1, 0]);
  const ghostCyanX = useTransform(burst, (v) => v * -14);
  const ghostRedX = useTransform(burst, (v) => v * 14);
  const ghostOpacity = useTransform(burst, (v) => v * 0.55);
  const jitterX = useTransform(p, (v) => {
    const t = v < 0.4 || v > 0.58 ? 0 : Math.sin(v * 260) * 7;
    return t * Math.max(0, 1 - Math.abs(v - 0.49) / 0.09);
  });
  const scanY = useTransform(p, [0.40, 0.58], ['-6%', '106%']);
  const scanOpacity = useTransform(p, [0.40, 0.42, 0.56, 0.58], [0, 1, 1, 0]);

  /* HUD frame: visible through phase A, gone by mid-transition */
  const hudOpacity = useTransform(p, [0, 0.02, 0.38, 0.48], [0, 1, 1, 0]);
  const hintOpacity = useTransform(p, [0, 0.05], [1, 0]);

  /* phase C heading block */
  const anatomyOpacity = useTransform(p, [0.62, 0.7], [0, 1]);
  const anatomyY = useTransform(p, [0.62, 0.72], [46, 0]);

  /* progress rail */
  const railScale = useTransform(p, [0, 1], [0, 1]);

  return (
    <div id="home" ref={ref} data-aurora="#3fd4ff" style={{ height: '480vh', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* ---- render layers (mouse-parallax group) ---- */}
        <motion.div style={{ position: 'absolute', inset: '-3%', x: parX, y: parY }}>
          <motion.img
            src="/duck/intact-2000.webp"
            alt="THE_STACK debugging duck — assembled"
            className="hero-img"
            style={{ opacity: intactOpacity, scale: intactScale, x: jitterX }}
            draggable="false"
          />
          {/* chromatic ghosts during the teardown burst */}
          <motion.img src="/duck/intact-1000.webp" alt="" aria-hidden="true" className="hero-img ghost cyan"
            style={{ opacity: ghostOpacity, scale: intactScale, x: ghostCyanX }} draggable="false" />
          <motion.img src="/duck/intact-1000.webp" alt="" aria-hidden="true" className="hero-img ghost red"
            style={{ opacity: ghostOpacity, scale: intactScale, x: ghostRedX }} draggable="false" />
          <motion.img
            src="/duck/exploded-2000.webp"
            alt="THE_STACK debugging duck — exploded engineering view"
            className="hero-img"
            style={{ opacity: explodedOpacity, scale: explodedScale, x: jitterX }}
            draggable="false"
          />
          {/* component callouts stay welded to the parallaxing render */}
          {CALLOUTS.map((c) => (
            <Callout
              key={c.id}
              progress={p}
              c={c}
              live={anatomyLive}
              active={activePart?.id === c.id}
              onSelect={setActivePart}
            />
          ))}
        </motion.div>

        {/* ---- component dossier ---- */}
        <AnimatePresence mode="wait">
          {activePart && <Dossier key={activePart.id} c={activePart} onClose={() => setActivePart(null)} />}
        </AnimatePresence>
        {/* scan bar sweep */}
        <motion.div className="hero-scanbar" style={{ top: scanY, opacity: scanOpacity }} aria-hidden="true" />
        {/* grade + legibility */}
        <div className="hero-grade" aria-hidden="true" />

        {/* ---- HUD frame (phase A) ---- */}
        <motion.div className="hero-hud" style={{ opacity: hudOpacity }} aria-hidden="true">
          <div className="hud-frame" />
          <motion.div
            className="hud-corner tl"
            initial={{ opacity: 0, y: -10 }}
            animate={booted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <span className="hud-label">THE_STACK · FIELD MANUAL 01</span>
            <span className="hud-label dim">SUBJECT: RUBBER_DUCK MK.II</span>
          </motion.div>
          <motion.div
            className="hud-corner tr"
            initial={{ opacity: 0, y: -10 }}
            animate={booted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.35, duration: 0.7 }}
          >
            <span className="hud-label"><span className="rec-dot" /> LIVE FEED</span>
          </motion.div>
          <motion.div
            className="hud-corner bl"
            initial={{ opacity: 0, y: 10 }}
            animate={booted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5, duration: 0.7 }}
          >
            <span className="hud-label dim">MATERIAL — MATTE PVC / CU TRACE</span>
            <span className="hud-label dim">OPTICS — 2× LED MATRIX</span>
            <span className="hud-label dim">PURPOSE — LISTENS TO YOUR BUGS</span>
          </motion.div>
        </motion.div>

        {/* ---- dialogues ---- */}
        <Dialogue progress={p} range={[0.03, 0.08, 0.15, 0.21]}>
          <span className="dialogue-line">Every debugger</span>
          <span className="dialogue-line">needs a confidant.</span>
        </Dialogue>
        <Dialogue progress={p} range={[0.23, 0.28, 0.35, 0.41]}>
          <span className="dialogue-line">Meet <em>UNIT-01</em>.</span>
          <span className="dialogue-line">Explain the bug. It listens.</span>
        </Dialogue>

        {/* intro headline, only before scroll */}
        <motion.div
          className="hero-intro"
          initial={{ opacity: 0, y: 30 }}
          animate={booted ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.65, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ opacity: hintOpacity }}
        >
          <div className="eyebrow">Computer Science Club</div>
          <h1>
            We take things apart<br />to learn how they work.
          </h1>
          <div className="scroll-hint mono">
            SCROLL TO DISASSEMBLE
            <motion.span
              animate={{ y: [0, 7, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              style={{ display: 'inline-block', marginLeft: 10 }}
            >
              ↓
            </motion.span>
          </div>
        </motion.div>

        {/* ---- phase C heading ---- */}
        <motion.div className="hero-anatomy" style={{ opacity: anatomyOpacity, y: anatomyY }}>
          <div className="eyebrow red">Engineered, not hatched</div>
          <h2>Anatomy of<br />a debugger.</h2>
          <p>
            Project nights, mentorship, and seven arcade challenges.
            Everything in this club is built to be opened up and understood.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 26 }}>
            <Magnetic><a className="btn primary brackets" data-cursor="JOIN" href="#join"><i /><i /><i /><i />Join the club</a></Magnetic>
            <Magnetic><a className="btn ghost brackets" data-cursor="PLAY" href="#play"><i /><i /><i /><i />Play the arcade</a></Magnetic>
          </div>
        </motion.div>

        {/* ---- progress rail ---- */}
        <div className="hero-rail" aria-hidden="true">
          <div className="rail-track">
            <motion.div className="rail-fill" style={{ scaleY: railScale }} />
          </div>
          <div className="rail-labels">
            <span>01 ASSEMBLED</span>
            <span>02 TEARDOWN</span>
            <span>03 ANATOMY</span>
          </div>
        </div>
      </div>

      <style>{`
        .hero-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center 42%; will-change: transform, opacity;
        }
        .hero-img.ghost { mix-blend-mode: screen; }
        .hero-img.ghost.cyan { filter: sepia(1) hue-rotate(150deg) saturate(4) brightness(0.8); }
        .hero-img.ghost.red { filter: sepia(1) hue-rotate(-40deg) saturate(5) brightness(0.7); }
        .hero-scanbar {
          position: absolute; left: 0; right: 0; height: 2px; z-index: 4;
          background: linear-gradient(90deg, transparent, rgba(63,212,255,0.9), rgba(56,232,160,0.9), transparent);
          box-shadow: 0 0 24px rgba(63,212,255,0.5);
        }
        .hero-grade {
          position: absolute; inset: 0; z-index: 2; pointer-events: none;
          background:
            radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(2,4,8,0.55) 100%),
            linear-gradient(to top, rgba(2,4,8,0.88) 0%, transparent 34%),
            linear-gradient(to bottom, rgba(2,4,8,0.5) 0%, transparent 18%);
        }
        .hero-hud { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
        .hud-frame {
          position: absolute; inset: clamp(14px, 2.5vw, 30px);
          border: 1px solid rgba(232,237,242,0.14);
          mask-image: linear-gradient(to bottom, black 0%, black 12%, transparent 12%, transparent 88%, black 88%, black 100%),
                      linear-gradient(to right, black 0%, black 6%, transparent 6%, transparent 94%, black 94%, black 100%);
          mask-composite: add;
          -webkit-mask-composite: source-over;
        }
        .hud-corner { position: absolute; display: flex; flex-direction: column; gap: 5px; }
        .hud-corner.tl { top: clamp(26px, 4vw, 48px); left: clamp(26px, 4vw, 48px); }
        .hud-corner.tr { top: clamp(26px, 4vw, 48px); right: clamp(26px, 4vw, 48px); text-align: right; }
        .hud-corner.bl { bottom: clamp(26px, 4vw, 48px); left: clamp(26px, 4vw, 48px); }
        .hud-label.dim { color: rgba(232,237,242,0.4); }
        .rec-dot {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          background: var(--red); margin-right: 6px;
          animation: recblink 1.2s steps(1) infinite;
          box-shadow: 0 0 8px var(--red);
        }
        @keyframes recblink { 50% { opacity: 0.15; } }

        .hero-dialogue {
          position: absolute; left: 0; right: 0; top: 16%;
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          text-align: center; z-index: 6; pointer-events: none;
          padding: 0 20px;
        }
        .dialogue-line {
          font-family: var(--font-display); font-weight: 600; text-transform: uppercase;
          font-size: clamp(1.7rem, 4.6vw, 3.5rem); letter-spacing: -0.02em; line-height: 1.12;
          text-shadow: 0 4px 40px rgba(0,0,0,0.85);
        }
        .dialogue-line em { font-style: normal; color: var(--green); }

        .hero-intro {
          position: absolute; left: clamp(26px, 5vw, 64px); bottom: clamp(70px, 12vh, 120px);
          z-index: 6; max-width: 640px;
          pointer-events: none; /* fades out on scroll — must never trap clicks meant for callouts */
        }
        .hero-intro h1 {
          font-size: clamp(2rem, 4.8vw, 3.9rem); text-transform: uppercase;
          margin: 16px 0 22px; text-shadow: 0 4px 40px rgba(0,0,0,0.9);
        }
        .scroll-hint { font-size: 0.68rem; letter-spacing: 0.22em; color: var(--muted); }

        .callout {
          position: absolute; z-index: 6;
          background: none; border: none; padding: 0; cursor: pointer;
          text-align: inherit; font: inherit; color: inherit;
        }
        /* generous invisible hit pad around the tiny anchor dot */
        .callout::before {
          content: ''; position: absolute; width: 64px; height: 64px;
          left: -32px; top: -32px; border-radius: 50%;
        }
        .callout:focus-visible .callout-label { color: var(--green); }
        .callout.is-active .callout-dot { background: var(--cyan); box-shadow: 0 0 14px rgba(63,212,255,0.9); }
        .callout.is-active .callout-label { color: var(--cyan); }
        .callout:hover .callout-label { color: var(--green); }
        .callout-dot {
          position: absolute; width: 10px; height: 10px; background: var(--green);
          transform: translate(-50%, -50%); box-shadow: 0 0 12px rgba(56,232,160,0.8);
        }
        .callout-dot-pulse {
          position: absolute; inset: -4px; border: 1px solid rgba(56,232,160,0.8); border-radius: 50%;
        }
        .callout-line {
          position: absolute; top: 0; height: 1px; width: 74px; background: rgba(232,237,242,0.65);
        }
        .callout-line[data-side='right'] { left: 6px; }
        .callout-line[data-side='left'] { right: 6px; }
        .callout-text {
          position: absolute; top: -8px; display: flex; flex-direction: column; white-space: nowrap;
        }
        .callout-text[data-side='right'] { left: 88px; }
        .callout-text[data-side='left'] { right: 88px; align-items: flex-end; }
        .callout-label {
          font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.16em; color: var(--ink);
          text-shadow: 0 2px 16px rgba(0,0,0,0.9);
        }
        .callout-sub {
          font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.14em; color: var(--muted);
        }

        .hero-anatomy {
          position: absolute; left: clamp(26px, 5vw, 64px); bottom: clamp(60px, 10vh, 110px);
          z-index: 7; max-width: 560px;
          pointer-events: none; /* text block must not block callouts underneath */
        }
        .hero-anatomy .btn { pointer-events: auto; }
        .hero-anatomy h2 {
          font-size: clamp(2.1rem, 5vw, 4rem); text-transform: uppercase; margin: 16px 0 18px;
          text-shadow: 0 4px 40px rgba(0,0,0,0.9);
        }
        .hero-anatomy p { color: rgba(232,237,242,0.75); max-width: 440px; text-shadow: 0 2px 20px rgba(0,0,0,0.8); }

        .hero-rail {
          position: absolute; right: clamp(18px, 3vw, 40px); top: 50%; transform: translateY(-50%);
          z-index: 7; display: flex; gap: 14px; align-items: stretch; height: 34vh;
        }
        .rail-track { width: 2px; background: rgba(232,237,242,0.12); position: relative; }
        .rail-fill {
          position: absolute; inset: 0; background: var(--grad-circuit); transform-origin: top center;
        }
        .rail-labels {
          display: flex; flex-direction: column; justify-content: space-between;
          font-family: var(--font-mono); font-size: 0.56rem; letter-spacing: 0.18em; color: var(--muted);
          writing-mode: vertical-rl;
        }
        .dossier {
          position: absolute; z-index: 9;
          top: 0; bottom: 0; margin: auto 0; height: fit-content;
          right: clamp(18px, 4vw, 56px);
          width: min(400px, calc(100vw - 36px));
          background: rgba(8, 12, 19, 0.92); backdrop-filter: blur(14px);
          border: 1px solid var(--line-bright);
          padding: clamp(20px, 2.4vw, 30px);
          box-shadow: 0 30px 80px rgba(0,0,0,0.6);
        }
        .dossier-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
        .dossier-close {
          font-size: 0.62rem; letter-spacing: 0.14em; color: var(--muted);
          background: none; border: 1px solid var(--line); padding: 6px 10px; cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
        }
        .dossier-close:hover { color: var(--red); border-color: var(--red); }
        .dossier-title { font-size: 1.35rem; text-transform: uppercase; margin-bottom: 6px; }
        .dossier-spec { font-size: 0.64rem; letter-spacing: 0.16em; color: var(--cyan); margin-bottom: 16px; }
        .dossier-body { font-size: 0.92rem; line-height: 1.65; color: rgba(232,237,242,0.85); margin-bottom: 18px; }
        .dossier-tie {
          display: flex; flex-direction: column; gap: 4px;
          border-top: 1px solid var(--line); padding-top: 14px; font-size: 0.85rem;
        }
        .dossier-tie-label { font-size: 0.58rem; letter-spacing: 0.18em; color: var(--green); }

        @media (max-width: 760px) {
          .hide-sm { display: none; }
          .hero-rail { display: none; }
          .callout-line { width: 40px; }
          .callout-text[data-side='right'] { left: 54px; }
          .callout-text[data-side='left'] { right: 54px; }
          .hero-anatomy { bottom: 40px; }
          .dossier {
            top: auto; right: 0; left: 0; bottom: 0; margin: 0;
            width: 100%; border-left: none; border-right: none; border-bottom: none;
          }
        }
      `}</style>
    </div>
  );
}
