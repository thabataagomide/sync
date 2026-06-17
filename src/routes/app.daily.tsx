import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sun, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { today } from "@/lib/sync-data";
import { computeMentalLoad } from "@/lib/mental-load";
import { MentalLoadCard } from "@/components/MentalLoadCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/app/daily")({ component: DailyPage });

const CACHE_KEY = "sync.dailySync";

function DailyPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [data, setData] = useState<any>({ tasks: [], habits: [], events: [], estMin: 0, focusToday: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const t = today();
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      const [tasks, habits, events, focus] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id).eq("due_date", t).eq("archived", false),
        supabase.from("habits").select("*").eq("user_id", user.id).eq("archived", false),
        supabase.from("events").select("*").eq("user_id", user.id).gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString()),
        supabase.from("focus_sessions").select("duration_minutes").eq("user_id", user.id).eq("completed", true).gte("started_at", start.toISOString()),
      ]);
      const tlist = tasks.data ?? [];
      const estMin = tlist.reduce((a, b: any) => a + (b.estimated_minutes ?? 0), 0);
      const focusToday = (focus.data ?? []).reduce((a, b: any) => a + b.duration_minutes, 0);
      setData({ tasks: tlist, habits: habits.data ?? [], events: events.data ?? [], estMin, focusToday });

      // Try cached summary
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw);
          if (c.date === t) setSummary(c.text);
        }
      } catch {}
    })();
  }, [user?.id]);

  const load = computeMentalLoad({
    tasks: data.tasks.length,
    estimatedMinutes: data.estMin,
    events: data.events.length,
    recentFocusMinutes: data.focusToday,
  });

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const payload = {
        mode: "daily-sync",
        tasks: data.tasks.map((t: any) => ({ title: t.title, priority: t.priority, period: t.period, est: t.estimated_minutes })),
        habits: data.habits.map((h: any) => ({ name: h.name, streak: h.streak })),
        sessions: [],
        context: { events: data.events.length, mentalLoad: load.label },
      };
      const { data: res, error } = await supabase.functions.invoke("ai-insights", { body: payload });
      if (error) throw error;
      const text = res.insights ?? "";
      setSummary(text);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today(), text })); } catch {}
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar resumo");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{format(new Date(), "EEEE, dd 'de' MMMM")}</div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Sun className="h-7 w-7 text-primary" /> Daily Sync</h1>
          <p className="text-muted-foreground">Resumo inteligente do seu dia.</p>
        </div>
        <Button onClick={generate} disabled={loading} className="glow">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando…</> : <><RefreshCw className="h-4 w-4 mr-2" /> Atualizar resumo</>}
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Tarefas hoje</div>
          <div className="text-2xl font-bold mt-1">{data.tasks.length}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Hábitos</div>
          <div className="text-2xl font-bold mt-1">{data.habits.length}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Eventos</div>
          <div className="text-2xl font-bold mt-1">{data.events.length}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Tempo estimado</div>
          <div className="text-2xl font-bold mt-1">{data.estMin}min</div>
        </div>
      </div>

      <MentalLoadCard load={load} />

      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-3">Resumo do dia</h2>
        {summary ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</div>
        ) : (
          <p className="text-sm text-muted-foreground">Clique em "Atualizar resumo" para gerar uma análise do seu dia.</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Tarefas prioritárias</h3>
          {data.tasks.filter((t: any) => t.priority === "high").slice(0, 5).map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> {t.title}
            </div>
          ))}
          {!data.tasks.some((t: any) => t.priority === "high") && <p className="text-sm text-muted-foreground">Sem alta prioridade hoje.</p>}
          <Link to="/app/tasks" className="text-xs text-primary hover:underline mt-3 inline-block">Ver todas →</Link>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Próximos eventos</h3>
          {data.events.slice(0, 5).map((e: any) => (
            <div key={e.id} className="flex items-center justify-between py-1.5 text-sm">
              <span>{e.title}</span>
              <span className="text-xs text-muted-foreground">{format(new Date(e.starts_at), "HH:mm")}</span>
            </div>
          ))}
          {!data.events.length && <p className="text-sm text-muted-foreground">Agenda livre hoje.</p>}
          <Link to="/app/calendar" className="text-xs text-primary hover:underline mt-3 inline-block">Abrir calendário →</Link>
        </div>
      </div>
    </div>
  );
}
