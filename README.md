# Whitney CS Club — Website

Interactive club site built with **React + Vite + Framer Motion + Lenis**, with a
**Netlify Functions** API for anything that touches data. Features a scroll-driven duck
teardown hero with clickable component dossiers, a 7-game arcade with levels/streaks/
leaderboard, a public events feed, and a cabinet dashboard with task assignment.

## Develop

```bash
npm install
npm run dev        # http://localhost:8888 — runs the site AND the API
```

`npm run dev` uses the Netlify CLI so the `/api/*` functions run locally. `npm run dev:web`
starts Vite alone (UI only — sign-in and the arcade will not work without the API).

## Build & deploy

```bash
npm run build      # static site → dist/, functions → netlify/functions
```

Netlify deploys automatically on every push to `main`.

---

## Security model

The browser holds **no** database URL, key, or password. It can only ask the API to do
things, and `netlify/functions/api.mjs` decides whether the caller is allowed.

| Concern | How it's handled |
|---|---|
| Password storage | **scrypt** with a per-password random salt (`lib/auth.mjs`). Plaintext is never stored. |
| Sessions | HMAC-SHA256 signed tokens, 12h expiry, in `sessionStorage`. Tampering with the role or user id invalidates the signature. |
| Who can do what | Enforced **server-side**: only a president can add/remove members, assign or delete tasks, and post events. Officers see and update only their own tasks. |
| Data exposure | Password hashes never leave the server. Officers never receive the full roster's secrets; the public leaderboard exposes only display name, points and streak. |
| Score cheating | The server is the scorekeeper: each game has a hard per-play maximum and a daily cap, and a game may only grant its own badge. |
| Brute force | Slow scrypt hashing + per-username attempt limiting (429 after 8 failures in 10 min). |
| Input abuse | Every field is type-checked, trimmed and length-capped; usernames are charset-restricted; dates, priorities and statuses are whitelisted. |
| Transport / browser | HTTPS via Netlify, plus CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS and a locked-down `Permissions-Policy` (see `netlify.toml`). |
| Data store | **Netlify Blobs** — reachable only from inside a function. There is no public URL to leak. |

### Verifying it yourself

Two commands, any time — don't take anyone's word for it:

```bash
npm run test:security                              # 37 checks against the API code
npm run audit -- https://your-site.netlify.app     # audits the LIVE deployed site
```

`test:security` covers forged tokens, privilege escalation and score tampering.
`audit` is read-only (creates nothing) and checks the real deployment: security headers,
that no database URL or secret reached the browser bundle, that cabinet data rejects
anonymous and forged requests, that nobody can create a second president, that server
files aren't downloadable, and that the old Firebase database is locked.

### What is still *not* guaranteed

- A determined member can still automate playing games to farm points **up to the daily
  caps**. Scores are capped, not proven.
- Anyone who learns a member's password can act as that member — there is no 2FA.
- This is a club site, not a bank. Don't store anything genuinely sensitive in it.

## Data / setup

Data lives in Netlify Blobs under the `club` store: `members`, `players`, `tasks`,
`events`, `join-requests`. Locally it falls back to a gitignored `.data/` folder.

**Required Netlify environment variable** (Site configuration → Environment variables):

- `SESSION_SECRET` — a long random string. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  Without it the site still works, but everyone is signed out whenever the function restarts.

## Where things live

| Path | What |
|---|---|
| `netlify/functions/api.mjs` | The entire API + authorization rules |
| `netlify/functions/lib/auth.mjs` | Password hashing, session tokens, rate limiting |
| `netlify/functions/lib/rules.mjs` | Scoring policy, point caps, badges |
| `src/lib/api.js` | Client-side API calls |
| `src/components/DuckHero.jsx` | Scroll teardown + component dossiers (edit `CALLOUTS`) |
| `src/components/Games.jsx` | All 7 arcade games |
| `src/lib/gameData.js` | Questions, challenges, badge list |
| `src/components/Cabinet.jsx` | President/officer dashboards |
| `public/duck/` | Hero renders (intact + exploded) |

Handing off to next year's cabinet: transfer this repo and the Netlify site to the club
account, and keep `SESSION_SECRET` in Netlify (not in the repo).
