import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CheckSquare, Droplets, Timer, Repeat } from "lucide-react";
import { format } from "date-fns";

type Item = { time: Date; icon: any; label: string; sub?: string };

export function DailyTimeline() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const start = new Date(); start.setHours(0,0,0,0);
      const [tasks, hydration, focus, habits] = await Promise.all([
        supabase.from("tasks").select("title,completed_at").eq("user_id", user.id).eq("status", "done").gte("completed_at", start.toISOString()),
        supabase.from("hydration_logs").select("amount_ml,created_at").eq("user_id", user.id).gte("created_at", start.toISOString()),
        supabase.from("focus_sessions").select("mode,duration_minutes,started_at").eq("user_id", user.id).eq("completed", true).gte("started_at", start.toISOString()),
        supabase.from("habit_logs").select("habit_id,created_at,habit:habits(name,icon)").eq("user_id", user.id).gte("created_at", start.toISOString()),
      ]);
      const out: Item[] = [];
      (tasks.data ?? []).forEach((t: any) => t.completed_at && out.push({ time: new Date(t.completed_at), icon: CheckSquare, label: `Tarefa: ${t.title}` }));
      (hydration.data ?? []).forEach((h: any) => out.push({ time: new Date(h.created_at), icon: Droplets, label: `Água +${h.amount_ml}ml` }));
      (focus.data ?? []).forEach((f: any) => out.push({ time: new Date(f.started_at), icon: Timer, label: `Foco ${f.mode}`, sub: `${f.duration_minutes}min` }));
      (habits.data ?? []).forEach((h: any) => out.push({ time: new Date(h.created_at), icon: Repeat, label: `Hábito: ${h.habit?.name ?? "—"}` }));
      out.sort((a, b) => a.time.getTime() - b.time.getTime());
      setItems(out);
    })();
  }, [user?.id]);

  if (!items.length) {
    return <div className="text-sm text-muted-foreground py-6 text-center">Sua timeline aparece aqui conforme o dia acontece.</div>;
  }

  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3 rounded-xl bg-secondary/30 px-4 py-2.5">
          <span className="text-xs tabular-nums text-muted-foreground w-12">{format(it.time, "HH:mm")}</span>
          <it.icon className="h-4 w-4 text-primary" />
          <span className="text-sm flex-1">{it.label}</span>
          {it.sub && <span className="text-xs text-muted-foreground">{it.sub}</span>}
        </li>
      ))}
    </ul>
  );
}
