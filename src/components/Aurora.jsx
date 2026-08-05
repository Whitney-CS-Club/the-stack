import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/*
 * Fixed ambient layer behind the whole site:
 *  - two blurred glow blobs that drift toward the mouse (springs, opposite parallax)
 *  - their colour retunes as sections with [data-aurora] scroll into view
 */
export default function Aurora() {
  const [color, setColor] = useState('#3fd4ff');

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 40, damping: 20 });
  const sy = useSpring(my, { stiffness: 40, damping: 20 });

  const blobAX = useTransform(sx, [0, 1], ['-12%', '12%']);
  const blobAY = useTransform(sy, [0, 1], ['-10%', '10%']);
  const blobBX = useTransform(sx, [0, 1], ['10%', '-10%']);
  const blobBY = useTransform(sy, [0, 1], ['8%', '-8%']);

  useEffect(() => {
    const onMove = (e) => {
      mx.set(e.clientX / window.innerWidth);
      my.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [mx, my]);

  useEffect(() => {
    const sections = document.querySelectorAll('[data-aurora]');
    if (!sections.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setColor(entry.target.getAttribute('data-aurora'));
        });
      },
      { rootMargin: '-40% 0px -40% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const blob = {
    position: 'absolute',
    width: '55vw',
    height: '55vw',
    borderRadius: '50%',
    filter: 'blur(110px)',
    willChange: 'transform, background-color',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
      <motion.div
        animate={{ backgroundColor: color }}
        transition={{ duration: 1.6, ease: 'easeInOut' }}
        style={{ ...blob, top: '-18%', left: '-14%', opacity: 0.1, x: blobAX, y: blobAY }}
      />
      <motion.div
        animate={{ backgroundColor: color }}
        transition={{ duration: 2.1, ease: 'easeInOut' }}
        style={{ ...blob, bottom: '-22%', right: '-16%', opacity: 0.07, x: blobBX, y: blobBY }}
      />
    </div>
  );
}
