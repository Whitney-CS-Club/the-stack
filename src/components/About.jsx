import { motion } from 'framer-motion';
import { Reveal, WordReveal } from './Reveal.jsx';
import { Tilt } from './Interactive.jsx';

const CARDS = [
  {
    num: '01 / BUILD',
    title: 'Project Nights',
    body: "Bi-Weekly build session: Bring your own idea or learn from us. We've created Discord bots, tic-tac-toe, and one very serious debugging duck.",
  },
  {
    num: '02 / GROW',
    title: 'Mentorship & Talks',
    body: "Upperclassmen and alumni share what actually got them internships and full-time jobs at tech companies + guest talks from engineers who've been in your seat.",
  },
  {
    num: '03 / VIBE',
    title: 'Community',
    body: 'Afterschool workshops, in-person & online hackathons, and a discord server chat that never sleeps. Programming can isolate you; collaboration brings you back.',
  },
];

export default function About() {
  return (
    <section id="about" className="block" data-aurora="#38e8a0">
      <div className="container">
        <div className="section-head">
          <Reveal><div className="eyebrow">Why people stick around</div></Reveal>
          <WordReveal text="Built for the 3AM semicolon hunters." />
          <Reveal delay={0.15}>
            <p>We're the club for anyone who's ever stayed up all night fixing a bug that turned out to be a missing semicolon.</p>
          </Reveal>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {CARDS.map((c, i) => (
            <motion.div
              key={c.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
            >
              <Tilt className="panel brackets" style={{ height: '100%' }}>
                <i /><i /><i /><i />
                <div className="mono" style={{ fontSize: '0.66rem', letterSpacing: '0.16em', color: 'var(--green)', marginBottom: 16 }}>{c.num}</div>
                <h3 style={{ fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: 12 }}>{c.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.93rem' }}>{c.body}</p>
              </Tilt>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
