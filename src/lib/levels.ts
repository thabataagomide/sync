export type LevelTier = {
  level: number;
  name: string;
  medal: string;
  gradient: string;
};

export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, name: "Beginner", medal: "🌱", gradient: "from-emerald-400 to-teal-300" },
  { level: 3, name: "Awakening", medal: "🌿", gradient: "from-teal-400 to-cyan-300" },
  { level: 5, name: "Consistent", medal: "🔷", gradient: "from-cyan-400 to-sky-400" },
  { level: 10, name: "Builder", medal: "⚙️", gradient: "from-sky-400 to-indigo-400" },
  { level: 15, name: "Focused Mind", medal: "🧠", gradient: "from-indigo-400 to-violet-400" },
  { level: 20, name: "Flow State", medal: "🌊", gradient: "from-violet-400 to-purple-400" },
  { level: 30, name: "Deep Worker", medal: "🛠️", gradient: "from-purple-400 to-fuchsia-400" },
  { level: 40, name: "Master of Routine", medal: "🏛️", gradient: "from-fuchsia-400 to-pink-400" },
  { level: 50, name: "Synced", medal: "✨", gradient: "from-amber-300 via-pink-400 to-violet-500" },
  { level: 75, name: "Transcendent", medal: "💫", gradient: "from-yellow-300 via-amber-400 to-orange-500" },
  { level: 100, name: "Sync Legend", medal: "👑", gradient: "from-yellow-200 via-amber-300 to-rose-400" },
];

export function tierFor(level: number): LevelTier {
  let current = LEVEL_TIERS[0];
  for (const t of LEVEL_TIERS) if (level >= t.level) current = t;
  return current;
}

export function nextTier(level: number): LevelTier | null {
  return LEVEL_TIERS.find((t) => t.level > level) ?? null;
}

export function xpForLevel(level: number) {
  return level * 200;
}

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / 200) + 1);
}

export const STREAK_TIERS = [
  { min: 0, label: "Início", aura: "from-muted to-muted", glow: "" },
  { min: 3, label: "Faísca", aura: "from-amber-400 to-yellow-300", glow: "shadow-[0_0_15px_rgba(251,191,36,0.4)]" },
  { min: 7, label: "Chama", aura: "from-orange-500 to-amber-300", glow: "shadow-[0_0_25px_rgba(249,115,22,0.55)]" },
  { min: 15, label: "Fogo", aura: "from-rose-500 via-orange-500 to-amber-300", glow: "shadow-[0_0_35px_rgba(244,63,94,0.6)]" },
  { min: 30, label: "Inferno", aura: "from-fuchsia-500 via-rose-500 to-amber-400", glow: "shadow-[0_0_45px_rgba(232,121,249,0.7)]" },
  { min: 60, label: "Aura Lendária", aura: "from-violet-500 via-fuchsia-400 to-amber-300", glow: "shadow-[0_0_60px_rgba(167,139,250,0.85)]" },
];

export function streakTier(streak: number) {
  let current = STREAK_TIERS[0];
  for (const t of STREAK_TIERS) if (streak >= t.min) current = t;
  return current;
}
