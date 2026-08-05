# THE_STACK — CS Club Website

Interactive club site built with **React + Vite + Framer Motion + Lenis**. Features a
scroll-driven duck teardown hero with clickable component dossiers, a 7-game arcade with
levels/streaks/leaderboard, a public events feed, and a cabinet dashboard with task
assignment — all synced live through Firebase Realtime Database (REST, no SDK).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build & deploy

```bash
npm run build      # outputs static site to dist/
```

The site is fully static — deploy `dist/` anywhere (Vercel/Netlify auto-detect Vite:
build command `npm run build`, output directory `dist`). Every push to `main`
redeploys automatically once the repo is connected.

## Data / Firebase

All shared data (members, tasks, players, events, join requests) lives in a Firebase
Realtime Database configured in `src/lib/storage.js`. To point at a different project,
replace `FIREBASE_DB_URL` with your database URL (Firebase console → Build → Realtime
Database). Leave it empty (`''`) to fall back to per-browser localStorage.

⚠️ This is a lightweight club tool, **not** a secure auth system: the database is open
and passwords are stored in plaintext. Tell members to never reuse a real password.

## Where things live

| Path | What |
|---|---|
| `src/components/DuckHero.jsx` | Scroll teardown + component dossiers (edit `CALLOUTS` to add parts) |
| `src/components/Games.jsx` | All 7 arcade games |
| `src/lib/gameData.js` | Questions, challenges, badges — add content here |
| `src/components/Cabinet.jsx` | President/member dashboards |
| `src/components/Interactive.jsx` | Tilt + magnetic interaction primitives |
| `public/duck/` | Hero renders (intact + exploded) |

Handing off to next year's cabinet: transfer this repo to the club GitHub org and
keep the Firebase project owner account with the club email.
