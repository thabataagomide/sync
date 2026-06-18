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

type DailyTask = {
  id: string;
  title: string;
  priority?: string | null;
  period?: string | null;
  estimated_minutes?: number | null;
};

type DailyHabit = {
  id: string;
  name: string;
  streak?: number | null;
};

type DailyEvent = {
  id: string;
  title: string;
  starts_at: string;
};

type FocusSession = {
  duration_minutes?: number | null;
};

type DailyData = {
  tasks: DailyTask[];
  habits: DailyHabit[];
  events: DailyEvent[];
  estMin: number;
  focusToday: number;
};

function DailyPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");

  const [data, setData] = useState<DailyData>({
    tasks: [],
    habits: [],
    events: [],
    estMin: 0,
    focusToday: 0,
  });

  useEffect(() => {
    const userId = user?.id;

    if (!userId) return;

    async function loadDailyData() {
      const t = today();

      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const [tasks, habits, events, focus] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .eq("due_date", t)
          .eq("archived", false),

        supabase
          .from("habits")
          .select("*")
          .eq("user_id", userId)
          .eq("archived", false),

        supabase
          .from("events")
          .select("*")
          .eq("user_id", userId)
          .gte("starts_at", start.toISOString())
          .lte("starts_at", end.toISOString()),

        supabase
          .from("focus_sessions")
          .select("duration_minutes")
          .eq("user_id", userId)
          .eq("completed", true)
          .gte("started_at", start.toISOString()),
      ]);

      const tlist = (tasks.data ?? []) as DailyTask[];
      const hlist = (habits.data ?? []) as DailyHabit[];
      const elist = (events.data ?? []) as DailyEvent[];
      const flist = (focus.data ?? []) as FocusSession[];

      const estMin = tlist.reduce(
        (acc: number, task: DailyTask) =>
          acc + (task.estimated_minutes ?? 0),
        0
      );

      const focusToday = flist.reduce(
        (acc: number, session: FocusSession) =>
          acc + (session.duration_minutes ?? 0),
        0
      );

      setData({
        tasks: tlist,
        habits: hlist,
        events: elist,
        estMin,
        focusToday,
      });

      try {
        const raw = localStorage.getItem(CACHE_KEY);

        if (raw) {
          const cached = JSON.parse(raw);

          if (cached.date === t) {
            setSummary(cached.text);
          }
        }
      } catch {
        // Ignora cache inválido
      }
    }

    loadDailyData();
  }, [user?.id]);

  const load = computeMentalLoad({
    tasks: data.tasks.length,
    estimatedMinutes: data.estMin,
    events: data.events.length,
    recentFocusMinutes: data.focusToday,
  });

  const generate = async () => {
    const userId = user?.id;

    if (!userId) return;

    setLoading(true);

    try {
      const payload = {
        mode: "daily-sync",
        tasks: data.tasks.map((task: DailyTask) => ({
          title: task.title,
          priority: task.priority,
          period: task.period,
          est: task.estimated_minutes,
        })),
        habits: data.habits.map((habit: DailyHabit) => ({
          name: habit.name,
          streak: habit.streak,
        })),
        sessions: [],
        context: {
          events: data.events.length,
          mentalLoad: load.label,
        },
      };

      const { data: res, error } = await supabase.functions.invoke(
        "ai-insights",
        {
          body: payload,
        }
      );

      if (error) throw error;

      const text = (res as any)?.insights ?? "";

      setSummary(text);

      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            date: today(),
            text,
          })
        );
      } catch {
        // Ignora erro de cache
      }
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar resumo");
    } finally {
      setLoading(false);
    }
  };

  const highPriorityTasks = data.tasks
    .filter((task: DailyTask) => task.priority === "high")
    .slice(0, 5);

  const nextEvents = data.events.slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM")}
          </div>

          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sun className="h-7 w-7 text-primary" />
            Daily Sync
          </h1>

          <p className="text-muted-foreground">
            Resumo inteligente do seu dia.
          </p>
        </div>

        <Button onClick={generate} disabled={loading} className="glow">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar resumo
            </>
          )}
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Tarefas hoje
          </div>

          <div className="text-2xl font-bold mt-1">{data.tasks.length}</div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Hábitos
          </div>

          <div className="text-2xl font-bold mt-1">{data.habits.length}</div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Eventos
          </div>

          <div className="text-2xl font-bold mt-1">{data.events.length}</div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Tempo estimado
          </div>

          <div className="text-2xl font-bold mt-1">{data.estMin}min</div>
        </div>
      </div>

      <MentalLoadCard load={load} />

      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-3">Resumo do dia</h2>

        {summary ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {summary}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Clique em "Atualizar resumo" para gerar uma análise do seu dia.
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Tarefas prioritárias</h3>

          {highPriorityTasks.map((task: DailyTask) => (
            <div
              key={task.id}
              className="flex items-center gap-2 py-1.5 text-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              {task.title}
            </div>
          ))}

          {!highPriorityTasks.length && (
            <p className="text-sm text-muted-foreground">
              Sem alta prioridade hoje.
            </p>
          )}

          <Link
            to="/app/tasks"
            className="text-xs text-primary hover:underline mt-3 inline-block"
          >
            Ver todas →
          </Link>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Próximos eventos</h3>

          {nextEvents.map((event: DailyEvent) => (
            <div
              key={event.id}
              className="flex items-center justify-between py-1.5 text-sm"
            >
              <span>{event.title}</span>

              <span className="text-xs text-muted-foreground">
                {format(new Date(event.starts_at), "HH:mm")}
              </span>
            </div>
          ))}

          {!nextEvents.length && (
            <p className="text-sm text-muted-foreground">
              Agenda livre hoje.
            </p>
          )}

          <Link
            to="/app/calendar"
            className="text-xs text-primary hover:underline mt-3 inline-block"
          >
            Abrir calendário →
          </Link>
        </div>
      </div>
    </div>
  );
}