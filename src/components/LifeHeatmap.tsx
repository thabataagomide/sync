import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { addDays, format, startOfDay, subDays } from "date-fns";

type Cell = { date: string; value: number };

export function LifeHeatmap({ days = 120 }: { days?: number }) {
  const { user } = useAuth();
  const [cells, setCells] = useState<Cell[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const start = startOfDay(subDays(new Date(), days - 1));
      const startISO = start.toISOString();
      const startDate = format(start, "yyyy-MM-dd");
      const [tasks, habits, hydration, focus] = await Promise.all([
        supabase.from("tasks").select("completed_at").eq("user_id", user.id).eq("status", "done").gte("completed_at", startISO),
        supabase.from("habit_logs").select("log_date").eq("user_id", user.id).gte("log_date", startDate),
        supabase.from("hydration_logs").select("log_date,amount_ml").eq("user_id", user.id).gte("log_date", startDate),
        supabase.from("focus_sessions").select("started_at,duration_minutes").eq("user_id", user.id).eq("completed", true).gte("started_at", startISO),
      ]);
      const map = new Map<string, number>();
      const add = (d: string, v: number) => map.set(d, (map.get(d) ?? 0) + v);
      (tasks.data ?? []).forEach((r: any) => r.completed_at && add(format(new Date(r.completed_at), "yyyy-MM-dd"), 2));
      (habits.data ?? []).forEach((r: any) => add(r.log_date, 2));
      (hydration.data ?? []).forEach((r: any) => add(r.log_date, Math.min(r.amount_ml / 500, 2)));
      (focus.data ?? []).forEach((r: any) => add(format(new Date(r.started_at), "yyyy-MM-dd"), Math.min(r.duration_minutes / 25, 3)));

      const out: Cell[] = [];
      for (let i = 0; i < days; i++) {
        const d = format(addDays(start, i), "yyyy-MM-dd");
        out.push({ date: d, value: map.get(d) ?? 0 });
      }
      setCells(out);
    })();
  }, [user?.id, days]);

  const level = (v: number) => v <= 0 ? 0 : v < 1.5 ? 1 : v < 3 ? 2 : v < 5 ? 3 : 4;
  const colors = [
    "oklch(0.28 0.02 215 / 0.4)",
    "var(--accent)",
    "oklch(from var(--primary) calc(l - 0.2) c h)",
    "var(--primary)",
    "var(--primary-glow)",
  ];

  // arrange in weeks (columns)
  const weeks = Math.ceil(days / 7);
  const cellSize = 12, gap = 3;

  return (
    <div className="overflow-x-auto">
      <svg width={weeks * (cellSize + gap)} height={7 * (cellSize + gap)}>
        {cells.map((c, i) => {
          const x = Math.floor(i / 7) * (cellSize + gap);
          const y = (i % 7) * (cellSize + gap);
          return (
            <rect
              key={c.date}
              x={x} y={y} width={cellSize} height={cellSize} rx={3}
              fill={colors[level(c.value)]}
              opacity={c.value > 0 ? 0.9 : 0.4}
            >
              <title>{c.date} · intensidade {level(c.value)}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>menos</span>
        {colors.map((c, i) => <span key={i} className="inline-block rounded-sm" style={{ width: 12, height: 12, background: c, opacity: i === 0 ? 0.4 : 0.9 }} />)}
        <span>mais</span>
      </div>
    </div>
  );
}
