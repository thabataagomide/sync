import { scoreLabel } from "@/lib/sync-score";

export function SyncScoreRing({ score }: { score: number }) {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-5">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="oklch(0.28 0.02 215 / 0.5)" strokeWidth="8" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="url(#ssg)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * c} ${c}`} className="transition-all duration-700" />
          <defs>
            <linearGradient id="ssg">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--primary-glow)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-xl font-bold tabular-nums">{score}</span>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Sync Score</div>
        <div className="text-lg font-semibold">{scoreLabel(score)}</div>
        <div className="text-xs text-muted-foreground mt-1">Equilíbrio da sua rotina hoje</div>
      </div>
    </div>
  );
}
