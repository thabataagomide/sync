import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, X, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { awardXp, bumpSyncFlow, today } from "@/lib/sync-data";
import { toast } from "sonner";

export const Route = createFileRoute("/app/focus")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: DeepFocus,
});

type FocusTask = {
  id: string;
  title: string;
  priority?: string | null;
};

function DeepFocus() {
  const { user } = useAuth();

  const [duration, setDuration] = useState(25);
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<FocusTask[]>([]);

  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSecs(duration * 60);
  }, [duration]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("tasks")
      .select("id,title,priority")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .eq("due_date", today())
      .limit(20)
      .then(({ data }: { data: FocusTask[] | null }) => {
        setTasks(data ?? []);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!running) return;

    ref.current = setInterval(() => {
      setSecs((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      if (ref.current) {
        clearInterval(ref.current);
      }
    };
  }, [running]);

  const complete = async () => {
    if (!user) return;

    await supabase.from("focus_sessions").insert({
      user_id: user.id,
      mode: "deep",
      duration_minutes: duration,
      completed: true,
      ended_at: new Date().toISOString(),
      task_id: taskId,
    });

    await awardXp(user.id, 15);
    await bumpSyncFlow(user.id, 5);

    toast.success("Sessão profunda concluída · +15 XP");
  };

  useEffect(() => {
    if (secs === 0 && running) {
      setRunning(false);
      complete();
    }
  }, [secs, running]);

  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;

  const currentTask = tasks.find((task) => task.id === taskId);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      style={{ background: "var(--background)" }}
    >
      <Link
        to="/app"
        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-smooth"
      >
        <X className="h-5 w-5" />
      </Link>

      <div className="absolute top-6 left-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Wind className="h-4 w-4" />
        Deep Focus
      </div>

      <div className="flex flex-col items-center gap-8 max-w-md w-full px-6">
        <div className="relative w-72 h-72 grid place-items-center">
          <div
            className="absolute inset-0 rounded-full breathe"
            style={{
              background:
                "radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)",
              opacity: 0.4,
            }}
          />

          <div
            className="absolute inset-8 rounded-full breathe"
            style={{
              background:
                "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
              opacity: 0.2,
              animationDelay: "0.5s",
            }}
          />

          <div className="relative text-center">
            <div className="text-7xl font-light tabular-nums tracking-tight">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </div>

            <div className="text-xs text-muted-foreground mt-2 tracking-widest uppercase">
              {running ? "Inspire · Sustente · Solte" : "Pronto para começar"}
            </div>
          </div>
        </div>

        {!running && (
          <div className="w-full">
            <div className="text-xs text-muted-foreground mb-2 text-center">
              Foco em
            </div>

            <select
              value={taskId ?? ""}
              onChange={(event) => setTaskId(event.target.value || null)}
              className="w-full rounded-xl bg-secondary/40 border border-border/40 px-4 py-3 text-center"
            >
              <option value="">Sessão livre</option>

              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {running && currentTask && (
          <div className="text-sm text-muted-foreground">
            {currentTask.title}
          </div>
        )}

        {!running && (
          <div className="flex gap-2">
            {[15, 25, 45, 60, 90].map((option) => (
              <button
                key={option}
                onClick={() => setDuration(option)}
                className={`px-4 py-2 rounded-full text-sm transition-smooth ${
                  duration === option
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {option}m
              </button>
            ))}
          </div>
        )}

        <div className="w-full h-0.5 bg-border/50 overflow-hidden rounded-full">
          <div
            className="h-full bg-primary transition-all duration-1000"
            style={{
              width: `${100 - (secs / (duration * 60)) * 100}%`,
            }}
          />
        </div>

        <button
          onClick={() => setRunning((current) => !current)}
          className="h-16 w-16 rounded-full bg-primary text-primary-foreground grid place-items-center glow hover:scale-105 transition-smooth"
        >
          {running ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}