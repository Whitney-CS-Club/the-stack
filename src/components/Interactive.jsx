import { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';

const isFine = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* 3D tilt-toward-mouse wrapper with a moving glare highlight */
export function Tilt({ children, max = 7, style, ...rest }) {
  const ref = useRef(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(120,255,214,0.08), transparent 55%)`;

  const onMove = (e) => {
    if (!isFine() || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max);
    rx.set(-(py - 0.5) * 2 * max);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformStyle: 'preserve-3d',
        transformPerspective: 900,
        position: 'relative',
        ...style,
      }}
      {...rest}
    >
      {children}
      <motion.div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: glare, pointerEvents: 'none' }}
      />
    </motion.div>
  );
}

/* Button/link that leans toward the cursor and snaps back on leave */
export function Magnetic({ children, strength = 0.3, style, ...rest }) {
  const ref = useRef(null);
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 16 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 16 });

  const onMove = (e) => {
    if (!isFine() || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ x, y, display: 'inline-block', ...style }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
