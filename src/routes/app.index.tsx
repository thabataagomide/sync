import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckSquare, Repeat, Timer, Calendar, Flame, Trophy, Zap, TrendingUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useProfile, today } from "@/lib/sync-data";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function StatCard({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
      <div className="mt-4 text-3xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState({ tasksToday: 0, doneToday: 0, habitsToday: 0, focusMin: 0, eventsToday: 0 });
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const t = today();
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);

      const [tasksRes, habitsRes, focusRes, eventsRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id).eq("due_date", t).order("due_time"),
        supabase.from("habits").select("*").eq("user_id", user.id).eq("archived", false),
        supabase.from("focus_sessions").select("duration_minutes").eq("user_id", user.id).eq("completed", true).gte("started_at", start.toISOString()),
        supabase.from("events").select("id").eq("user_id", user.id).gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString()),
      ]);
      setTasks(tasksRes.data ?? []);
      setHabits(habitsRes.data ?? []);
      setStats({
        tasksToday: tasksRes.data?.length ?? 0,
        doneToday: tasksRes.data?.filter(x => x.status === "done").length ?? 0,
        habitsToday: habitsRes.data?.length ?? 0,
        focusMin: (focusRes.data ?? []).reduce((a, b: any) => a + b.duration_minutes, 0),
        eventsToday: eventsRes.data?.length ?? 0,
      });
    })();
  }, [user?.id]);

  const xpProgress = profile ? ((profile.xp % 200) / 200) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Olá, {profile?.full_name?.split(" ")[0] ?? "viajante"} ✨</h1>
          <p className="text-muted-foreground">Sua central de produtividade está sincronizada.</p>
        </div>
        <div className="glass rounded-2xl px-5 py-3 flex items-center gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Sync Energy</div>
            <div className="text-2xl font-bold text-gradient">{profile?.sync_flow ?? 50}</div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <div className="text-xs text-muted-foreground">Nível {profile?.level ?? 1}</div>
            <Progress value={xpProgress} className="w-32 h-2 mt-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CheckSquare} label="Tarefas hoje" value={`${stats.doneToday}/${stats.tasksToday}`} sub="concluídas" />
        <StatCard icon={Repeat} label="Hábitos ativos" value={stats.habitsToday} sub="no tracker" />
        <StatCard icon={Timer} label="Foco hoje" value={`${stats.focusMin}min`} sub="pomodoro" />
        <StatCard icon={Calendar} label="Eventos hoje" value={stats.eventsToday} sub="agenda" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><CheckSquare className="h-4 w-4 text-primary" /> Tarefas de hoje</h2>
            <Link to="/app/tasks" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma tarefa hoje. Aproveite a calma 🌿</p>
          ) : (
            <ul className="space-y-2">
              {tasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${t.priority === "high" ? "bg-destructive" : t.priority === "low" ? "bg-muted-foreground" : "bg-primary"}`} />
                    <span className={t.status === "done" ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{t.due_time?.slice(0,5) ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Repeat className="h-4 w-4 text-primary" /> Hábitos</h2>
            <Link to="/app/habits" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Crie seu primeiro hábito.</p>
          ) : (
            <ul className="space-y-2">
              {habits.slice(0, 5).map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
                  <span className="flex items-center gap-2"><span>{h.icon}</span>{h.name}</span>
                  <span className="text-xs flex items-center gap-1 text-warning"><Flame className="h-3 w-3" />{h.streak}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass rounded-2xl p-6">
          <Trophy className="h-6 w-6 text-primary mb-3" />
          <div className="text-2xl font-bold">{profile?.xp ?? 0} XP</div>
          <div className="text-sm text-muted-foreground">Pontuação total</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <Flame className="h-6 w-6 text-warning mb-3" />
          <div className="text-2xl font-bold">{profile?.streak ?? 0} dias</div>
          <div className="text-sm text-muted-foreground">Streak atual</div>
        </div>
        <Link to="/app/insights" className="glass rounded-2xl p-6 hover:translate-y-[-2px] transition-smooth">
          <Sparkles className="h-6 w-6 text-primary mb-3" />
          <div className="font-semibold">Gerar Insights de IA</div>
          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><TrendingUp className="h-3 w-3" />Veja seus padrões</div>
        </Link>
      </div>
    </div>
  );
}
