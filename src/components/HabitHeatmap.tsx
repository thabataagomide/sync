import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const WEEKS = 12;
const DAYS = WEEKS * 7;

export function HabitHeatmap({ habitId, userId, color = "var(--primary)" }: { habitId: string; userId: string; color?: string }) {
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    const since = format(subDays(startOfDay(new Date()), DAYS - 1), "yyyy-MM-dd");
    supabase.from("habit_logs")
      .select("log_date")
      .eq("user_id", userId).eq("habit_id", habitId)
      .gte("log_date", since)
      .then(({ data }) => {
        const s = new Set<string>();
        (data ?? []).forEach((r: any) => s.add(r.log_date));
        setDone(s);
      });
  }, [habitId, userId]);

  const today = startOfDay(new Date());
  const cells: { date: string; done: boolean }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const ds = format(d, "yyyy-MM-dd");
    cells.push({ date: ds, done: done.has(ds) });
  }

  // group into columns of 7 (one week)
  const cols: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));

  return (
    <div className="flex gap-[3px] mt-3" title="Últimas 12 semanas">
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((c) => (
            <div
              key={c.date}
              title={`${c.date}${c.done ? " · feito" : ""}`}
              className={cn("h-2.5 w-2.5 rounded-[3px] transition-colors")}
              style={{
                background: c.done ? color : "color-mix(in oklab, var(--foreground) 8%, transparent)",
                boxShadow: c.done ? `0 0 6px ${color}55` : undefined,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
