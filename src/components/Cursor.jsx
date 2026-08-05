import { useEffect, useRef, useState } from 'react';

/*
 * Desktop-only custom cursor:
 *  - 5px dot (instant) + 34px ring (lerped) in mix-blend difference
 *  - ring inflates + shows a label over anything with [data-cursor]
 *  - pixel grid trail: fading 5px squares snapped to a grid, canvas-drawn
 */
const FINE_POINTER = '(hover: hover) and (pointer: fine) and (min-width: 1025px)';

export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia(FINE_POINTER);
    setEnabled(mq.matches);
    const onChange = (e) => setEnabled(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('has-custom-cursor');

    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let mx = -100, my = -100, rx = -100, ry = -100;
    let raf = 0;
    let hoverLabel = null;
    let visible = true;

    /* ---- pixel grid trail ---- */
    const GRID = 5;
    const LIFE = 900; // ms
    let cells = [];
    let prev = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const pushCell = (x, y) => {
      const cx = Math.floor(x / GRID) * GRID;
      const cy = Math.floor(y / GRID) * GRID;
      const last = cells[cells.length - 1];
      if (last && last.x === cx && last.y === cy) return;
      cells.push({ x: cx, y: cy, t: performance.now() });
      if (cells.length > 90) cells.shift();
    };

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (prev) {
        // interpolate so fast swipes leave a continuous trail
        const dx = mx - prev.x, dy = my - prev.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy)) / GRID;
        for (let i = 0; i <= steps; i++) {
          const t = steps > 0 ? i / steps : 0;
          pushCell(prev.x + dx * t, prev.y + dy * t);
        }
      }
      prev = { x: mx, y: my };
    };

    const onOver = (e) => {
      const el = e.target.closest?.('[data-cursor]');
      const next = el ? el.getAttribute('data-cursor') : null;
      if (next === hoverLabel) return;
      hoverLabel = next;
      if (hoverLabel) {
        ring.classList.add('is-hover');
        label.textContent = hoverLabel;
      } else {
        ring.classList.remove('is-hover');
      }
    };

    const onLeave = () => { visible = false; };
    const onEnter = () => { visible = true; };

    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      dot.style.opacity = visible ? 1 : 0;
      ring.style.opacity = visible ? 1 : 0;

      const now = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cells = cells.filter((c) => now - c.t < LIFE);
      for (const c of cells) {
        const a = 1 - (now - c.t) / LIFE;
        ctx.fillStyle = `rgba(56, 232, 160, ${a * 0.55})`;
        ctx.fillRect(c.x, c.y, GRID - 1, GRID - 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.documentElement.addEventListener('mouseenter', onEnter);

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.documentElement.removeEventListener('mouseenter', onEnter);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2500, pointerEvents: 'none' }} aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true">
        <span ref={labelRef} className="cursor-label" />
      </div>
      <style>{`
        .has-custom-cursor, .has-custom-cursor * { cursor: none !important; }
        .has-custom-cursor input, .has-custom-cursor textarea, .has-custom-cursor select { cursor: text !important; }
        .cursor-dot {
          position: fixed; top: -2.5px; left: -2.5px; width: 5px; height: 5px;
          background: #fff; border-radius: 50%; z-index: 2502; pointer-events: none;
          mix-blend-mode: difference; transition: opacity 0.3s;
        }
        .cursor-ring {
          position: fixed; top: -17px; left: -17px; width: 34px; height: 34px;
          z-index: 2501; pointer-events: none; mix-blend-mode: difference;
          transition: opacity 0.3s;
        }
        .cursor-ring::before {
          content: ''; position: absolute; inset: 0; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.65); background: rgba(255,255,255,0);
          transform: scale(1);
          transition: transform 0.28s cubic-bezier(0.23, 1, 0.32, 1), background-color 0.28s, border-color 0.28s;
        }
        .cursor-ring.is-hover::before {
          transform: scale(1.85); background: #fff; border-color: #fff;
        }
        .cursor-label {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: 0.08em;
          color: #000; text-transform: uppercase; opacity: 0; transform: scale(0.6);
          transition: opacity 0.2s, transform 0.28s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .cursor-ring.is-hover .cursor-label { opacity: 1; transform: scale(1); }
      `}</style>
    </>
  );
}
