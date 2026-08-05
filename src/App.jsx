import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import { ToastProvider } from './components/Toaster.jsx';
import Preloader from './components/Preloader.jsx';
import Nav from './components/Nav.jsx';
import DuckHero from './components/DuckHero.jsx';
import About from './components/About.jsx';
import Events from './components/Events.jsx';
import Play from './components/Play.jsx';
import Join from './components/Join.jsx';
import Cabinet from './components/Cabinet.jsx';
import Footer from './components/Footer.jsx';
import Cursor from './components/Cursor.jsx';
import Aurora from './components/Aurora.jsx';
import ScrollProgress from './components/ScrollProgress.jsx';
import KineticMarquee from './components/KineticMarquee.jsx';

export default function App() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.11,
      smoothWheel: true,
      anchors: true,
    });
    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    if (!booted) lenis.stop();
    else lenis.start();
    window.__lenis = lenis;
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [booted]);

  return (
    <ToastProvider>
      <Aurora />
      <div className="grain" aria-hidden="true" />
      <ScrollProgress />
      <Cursor />
      {!booted && <Preloader onDone={() => setBooted(true)} />}
      <Nav />
      <main style={{ position: 'relative', zIndex: 1 }}>
        <DuckHero booted={booted} />
        <About />
        <KineticMarquee />
        <Events />
        <Play />
        <Join />
        <Cabinet />
      </main>
      <Footer />
    </ToastProvider>
  );
}
