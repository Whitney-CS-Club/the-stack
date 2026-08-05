/*
 * Scoring policy lives on the server. The browser reports "I finished Trivia",
 * but the server decides what that is worth — so a tampered client cannot mint
 * points, and the leaderboard stays meaningful.
 */
export const GAME_RULES = {
  daily: { label: 'Daily Challenge', max: 20, dailyCap: 20 },
  trivia: { label: 'Trivia Blitz', max: 40, dailyCap: 80 },
  bigo: { label: 'Big-O Speed Round', max: 64, dailyCap: 128 },
  debug: { label: 'Debug Hunt', max: 90, dailyCap: 180 },
  memory: { label: 'Memory Match', max: 70, dailyCap: 140 },
  typerace: { label: 'Type Racer', max: 60, dailyCap: 120 },
  regex: { label: 'Regex Rumble', max: 64, dailyCap: 128 },
};

/* A game may only ever grant its own achievement badge. */
export const BADGE_BY_GAME = {
  daily: [],
  trivia: ['🎯 Perfect Score'],
  bigo: ['⚡ Speed Demon'],
  debug: ['🐛 Bug Squasher'],
  memory: ['🧠 Memory Master'],
  typerace: ['⌨️ Fast Fingers'],
  regex: ['✅ Regex Master'],
};

export const STREAK_BADGES = [
  { days: 3, label: '🔥 3-Day Spark' },
  { days: 7, label: '⚡ Week Streak' },
  { days: 14, label: '🚀 Two-Week Grinder' },
  { days: 30, label: '🏆 Monthly Legend' },
];

export const POINT_BADGES = [
  { pts: 100, label: '⭐ 100 Club' },
  { pts: 500, label: '🌟 500 Club' },
  { pts: 1000, label: '💎 1K Legend' },
  { pts: 2500, label: '👑 Hall of Famer' },
];

export const LEVEL_STEP = 150;
export const levelOf = (points) => Math.floor((points || 0) / LEVEL_STEP) + 1;

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day));
  return d.toISOString().slice(0, 10);
}

/** Recompute the full badge set from server-held facts. */
export function recomputeBadges(player, granted = []) {
  const before = new Set(player.badges || []);
  const earned = new Set(before);
  STREAK_BADGES.forEach((b) => { if ((player.streak || 0) >= b.days) earned.add(b.label); });
  POINT_BADGES.forEach((b) => { if ((player.points || 0) >= b.pts) earned.add(b.label); });
  granted.forEach((b) => earned.add(b));
  if ((player.gamesTried || []).length >= 7) earned.add('🎮 All-Rounder');
  player.badges = Array.from(earned);
  return player.badges.filter((b) => !before.has(b));
}
