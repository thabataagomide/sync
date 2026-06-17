import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { awardXp, bumpSyncFlow, checkAchievements } from "@/lib/sync-data";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/app/pomodoro")({ component: PomodoroPage });

const MODES = {
  work: { label: "Trabalho", min: 25 },
  study: { label: "Estudo", min: 30 },
  deep: { label: "Foco profundo", min: 50 },
  read: { label: "Leitura", min: 20 },
  break: { label: "Pausa", min: 5 },
};

function PomodoroPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<keyof typeof MODES>("work");
  const [secs, setSecs] = useState(MODES.work.min * 60);
  const [running, setRunning] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [stats, setStats] = useState({ today: 0, sessions: 0 });
  const ref = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setSecs(MODES[mode].min * 60); setRunning(false); }, [mode]);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => setSecs(s => s - 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  useEffect(() => {
    if (secs <= 0 && running) {
      setRunning(false);
      complete();
    }
  }, [secs, running]);

  const loadStats = async () => {
    if (!user) return;
    const start = new Date(); start.setHours(0,0,0,0);
    const { data } = await supabase.from("focus_sessions").select("duration_minutes").eq("user_id", user.id).eq("completed", true).gte("started_at", start.toISOString());
    setStats({ today: (data ?? []).reduce((a, b: any) => a + b.duration_minutes, 0), sessions: data?.length ?? 0 });
  };
  useEffect(() => { loadStats(); }, [user?.id]);

  const complete = async () => {
    if (!user) return;
    await supabase.from("focus_sessions").insert({
      user_id: user.id, mode, duration_minutes: MODES[mode].min, completed: true, ended_at: new Date().toISOString(),
    });
    // Pomodoro completo = +15 XP fixo (independente do modo) + Sync Energy + contribui para streak
    const XP_PER_POMODORO = 15;
    await awardXp(user.id, XP_PER_POMODORO);
    await bumpSyncFlow(user.id, 5);
    // Increment daily streak via profile (light bump if no other activity)
    const { data: prof } = await supabase.from("profiles").select("streak").eq("id", user.id).maybeSingle();
    if (prof) await supabase.from("profiles").update({ streak: (prof.streak ?? 0) + (mode === "break" ? 0 : 0) }).eq("id", user.id);
    toast.success(`🍅 Pomodoro concluído · +${XP_PER_POMODORO} XP · +5 Sync Energy`);
    const newly = await checkAchievements(user.id);
    newly.forEach((c) => toast.success(`🏆 Conquista: ${c}`));
    loadStats();
  };

  const m = Math.floor(secs / 60), s = secs % 60;
  const pct = 100 - (secs / (MODES[mode].min * 60)) * 100;

  return (
    <div className={focusMode ? "fixed inset-0 z-50 bg-background grid place-items-center p-6" : "space-y-6"}>
      {!focusMode && (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Foco</h1>
            <p className="text-muted-foreground">Pomodoro & Focus Mode.</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gradient">{stats.today}min</div>
            <div className="text-xs text-muted-foreground">{stats.sessions} sessões hoje</div>
          </div>
        </div>
      )}

      <div className={`glass rounded-3xl p-10 grid place-items-center ${focusMode ? "w-full max-w-2xl" : ""}`}>
        {!focusMode && (
          <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="mb-6">
            <TabsList>
              {Object.entries(MODES).map(([k, v]) => <TabsTrigger key={k} value={k}>{v.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        )}

        <div className="relative h-64 w-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="oklch(0.28 0.04 215)" strokeWidth="4" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="url(#g)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${pct * 2.827} 282.7`} className="transition-all duration-500" />
            <defs>
              <linearGradient id="g">
                <stop offset="0%" stopColor="oklch(0.78 0.18 165)" />
                <stop offset="100%" stopColor="oklch(0.92 0.16 165)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-6xl font-bold tabular-nums">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</div>
              <div className="text-sm text-muted-foreground mt-1">{MODES[mode].label}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Button size="lg" onClick={() => setRunning(r => !r)} className="glow">
            {running ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
            {running ? "Pausar" : "Iniciar"}
          </Button>
          <Button size="lg" variant="outline" onClick={() => { setRunning(false); setSecs(MODES[mode].min * 60); }}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => setFocusMode(f => !f)}>
            {focusMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
