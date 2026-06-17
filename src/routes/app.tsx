import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getNotifPrefs, notify, today } from "@/lib/sync-data";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

function useNotifierLoop() {
  const { user } = useAuth();
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const tick = async () => {
      const prefs = getNotifPrefs();
      const now = new Date();
      const hour = now.getHours();
      const period = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "night";

      // Tasks: notify once at the start of each period for pending tasks of that period
      if (prefs.tasks) {
        const key = `tasks:${today()}:${period}`;
        if (!fired.current.has(key)) {
          const { data } = await supabase.from("tasks")
            .select("title,periods,period,daily_completed,times_per_day,status")
            .eq("user_id", user.id).eq("due_date", today()).eq("archived", false);
          const due = (data ?? []).filter((t: any) => {
            if (t.status === "done") return false;
            const ps: string[] = t.periods?.length ? t.periods : [t.period];
            return ps.includes(period);
          });
          if (due.length) {
            notify(`${due.length} tarefa(s) para a ${period === "morning" ? "manhã" : period === "afternoon" ? "tarde" : "noite"}`,
              due.slice(0, 3).map((t: any) => `• ${t.title}`).join("\n"));
            fired.current.add(key);
          }
        }
      }

      // Habits: notify once a day around 9h if any pending
      if (prefs.habits && hour >= 9 && hour < 22) {
        const key = `habits:${today()}`;
        if (!fired.current.has(key)) {
          const [h, l] = await Promise.all([
            supabase.from("habits").select("id,name").eq("user_id", user.id).eq("archived", false),
            supabase.from("habit_logs").select("habit_id").eq("user_id", user.id).eq("log_date", today()),
          ]);
          const doneIds = new Set((l.data ?? []).map((x: any) => x.habit_id));
          const pending = (h.data ?? []).filter((x: any) => !doneIds.has(x.id));
          if (pending.length) {
            notify(`${pending.length} hábito(s) ainda pendente(s) hoje`,
              pending.slice(0, 3).map((x: any) => `• ${x.name}`).join("\n"));
            fired.current.add(key);
          }
        }
      }

      // Events: notify 10 min before start
      if (prefs.events) {
        const soon = new Date(now.getTime() + 10 * 60_000);
        const { data } = await supabase.from("events")
          .select("id,title,starts_at")
          .eq("user_id", user.id)
          .gte("starts_at", now.toISOString())
          .lte("starts_at", soon.toISOString());
        (data ?? []).forEach((e: any) => {
          const key = `event:${e.id}:${e.starts_at}`;
          if (fired.current.has(key)) return;
          notify(`Em breve: ${e.title}`, `Começa às ${new Date(e.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
          fired.current.add(key);
        });
      }

      // Hydration reminders: profile.hydration_reminders { enabled, times: HH:mm[] }
      const { data: prof } = await supabase.from("profiles").select("hydration_reminders").eq("id", user.id).maybeSingle();
      const hr: any = prof?.hydration_reminders;
      if (hr?.enabled && Array.isArray(hr.times)) {
        const cur = `${String(hour).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        for (const t of hr.times) {
          if (t === cur) {
            const key = `hydra:${today()}:${t}`;
            if (!fired.current.has(key)) {
              notify("💧 Hora de beber água", "Mantenha sua hidratação em dia.");
              fired.current.add(key);
            }
          }
        }
      }
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [user?.id]);
}

function AppLayout() {
  useNotifierLoop();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block"><AppSidebar /></div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border/60 px-4 glass sticky top-0 z-30 safe-pt">
            <div className="hidden md:block"><SidebarTrigger /></div>
            <span className="text-sm text-muted-foreground">Sync · Workspace</span>
          </header>
          <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
            <Outlet />
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
