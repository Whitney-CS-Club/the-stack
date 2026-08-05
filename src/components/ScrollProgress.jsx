import { motion, useScroll, useSpring } from 'framer-motion';

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 1500,
        background: 'var(--grad-circuit)', transformOrigin: 'left center', scaleX,
        boxShadow: '0 0 12px rgba(56,232,160,0.4)', pointerEvents: 'none',
      }}
    />
  );
}
