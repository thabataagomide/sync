import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Droplets, Plus, Minus, Target, TrendingUp, Trash2, Bell } from "lucide-react";
import { format, subDays, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useProfile, awardXp, bumpSyncFlow, today } from "@/lib/sync-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/app/hydration")({ component: HydrationPage });

const QUICK_ADD = [100, 200, 300, 500, 1000];
const XP_PER_GOAL = 5; // light XP only when reaching daily goal

function HydrationPage() {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const [logs, setLogs] = useState<any[]>([]);
  const [history, setHistory] = useState<{ date: string; total: number }[]>([]);
  const [goalInput, setGoalInput] = useState(2000);
  const [weight, setWeight] = useState<number | "">("");
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTimes, setReminderTimes] = useState<string[]>(["09:00", "13:00", "17:00", "20:00"]);
  const [goalAwarded, setGoalAwarded] = useState(false);

  const goal = profile?.hydration_goal_ml ?? 2000;

  const reload = async () => {
    if (!user) return;
    const t = today();
    const since = format(subDays(new Date(), 13), "yyyy-MM-dd");
    const [todayRes, histRes] = await Promise.all([
      supabase.from("hydration_logs").select("*").eq("user_id", user.id).eq("log_date", t).order("created_at", { ascending: false }),
      supabase.from("hydration_logs").select("amount_ml,log_date").eq("user_id", user.id).gte("log_date", since),
    ]);
    setLogs(todayRes.data ?? []);
    const map = new Map<string, number>();
    (histRes.data ?? []).forEach((r: any) => map.set(r.log_date, (map.get(r.log_date) ?? 0) + r.amount_ml));
    const hist: { date: string; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      hist.push({ date: d, total: map.get(d) ?? 0 });
    }
    setHistory(hist);
  };

  useEffect(() => { reload(); }, [user?.id]);
  useEffect(() => {
    if (profile) {
      setGoalInput(profile.hydration_goal_ml ?? 2000);
      setWeight(profile.weight_kg ?? "");
      const r = profile.hydration_reminders ?? {};
      setRemindersEnabled(!!r.enabled);
      setReminderTimes(r.times ?? ["09:00", "13:00", "17:00", "20:00"]);
    }
  }, [profile]);

  const recommended = typeof weight === "number" && weight > 0 ? Math.round(weight * 35) : null;

  const total = useMemo(() => logs.reduce((a, b) => a + b.amount_ml, 0), [logs]);
  const pct = Math.min(100, (total / Math.max(1, goal)) * 100);
  const remaining = Math.max(0, goal - total);

  const goalsHit = useMemo(() => {
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].total >= goal) streak++;
      else break;
    }
    return streak;
  }, [history, goal]);

  const weekAvg = useMemo(() => {
    const last7 = history.slice(-7);
    const sum = last7.reduce((a, b) => a + b.total, 0);
    return Math.round(sum / Math.max(1, last7.length));
  }, [history]);

  const addAmount = async (amount: number) => {
    if (!user) return;
    const wasReached = total >= goal;
    await supabase.from("hydration_logs").insert({ user_id: user.id, amount_ml: amount, log_date: today() });
    await reload();
    const nowTotal = total + amount;
    if (!wasReached && nowTotal >= goal && !goalAwarded) {
      setGoalAwarded(true);
      await awardXp(user.id, XP_PER_GOAL);
      await bumpSyncFlow(user.id, 2);
      refresh();
      toast.success(`💧 Meta de hidratação atingida! +${XP_PER_GOAL} XP`);
    }
  };

  const removeLog = async (id: string) => {
    await supabase.from("hydration_logs").delete().eq("id", id);
    await reload();
  };

  const saveGoal = async () => {
    if (!user) return;
    await supabase.from("profiles").update({
      hydration_goal_ml: goalInput,
      weight_kg: typeof weight === "number" ? weight : null,
    }).eq("id", user.id);
    refresh();
    toast.success("Meta atualizada");
  };

  const applyRecommended = () => {
    if (recommended) {
      setGoalInput(recommended);
      toast.success(`Meta sugerida: ${recommended}ml`);
    }
  };

  const saveReminders = async () => {
    if (!user) return;
    await supabase.from("profiles").update({
      hydration_reminders: { enabled: remindersEnabled, times: reminderTimes },
    }).eq("id", user.id);
    refresh();
    toast.success("Lembretes salvos");
  };

  const updateTime = (i: number, v: string) => setReminderTimes((arr) => arr.map((t, idx) => idx === i ? v : t));
  const addTime = () => setReminderTimes((arr) => [...arr, "12:00"]);
  const removeTime = (i: number) => setReminderTimes((arr) => arr.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Droplets className="h-7 w-7 text-primary" /> Hidratação</h1>
          <p className="text-muted-foreground">Acompanhe sua água diária com agilidade.</p>
        </div>
      </div>

      {/* Progress */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/40 to-primary/10 transition-all duration-700 ease-out" style={{ height: `${pct}%` }} />
        <div className="relative grid md:grid-cols-3 gap-4 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Hoje</div>
            <div className="text-5xl font-bold tabular-nums">{(total / 1000).toFixed(2)}<span className="text-xl text-muted-foreground"> L</span></div>
            <div className="text-sm text-muted-foreground">de {(goal / 1000).toFixed(1)} L · {Math.round(pct)}%</div>
          </div>
          <div className="md:col-span-2">
            <div className="h-4 rounded-full bg-secondary/60 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{remaining > 0 ? `Faltam ${remaining}ml` : "Meta cumprida ✨"}</span>
              <span>Sequência: {goalsHit} {goalsHit === 1 ? "dia" : "dias"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick add */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Adicionar rápido</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_ADD.map((ml) => (
            <Button key={ml} variant="outline" size="lg" onClick={() => addAmount(ml)} className="rounded-xl">
              +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Today log */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-3">Registros de hoje</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum registro ainda. Comece bebendo um copo 💧</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-2">
                  <span className="font-medium">+{l.amount_ml}ml</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{format(new Date(l.created_at), "HH:mm")}</span>
                    <button onClick={() => removeLog(l.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* History */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Últimos 14 dias</h2>
          <div className="flex items-end gap-1.5 h-32">
            {history.map((d) => {
              const h = Math.min(100, (d.total / Math.max(1, goal)) * 100);
              const hit = d.total >= goal;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.date}: ${d.total}ml`}>
                  <div className={`w-full rounded-t-md transition-all ${hit ? "bg-gradient-to-t from-primary to-primary-glow" : "bg-primary/30"}`} style={{ height: `${h}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-3">
            <span>Média 7d: {weekAvg}ml</span>
            <span>Metas seguidas: {goalsHit}</span>
          </div>
        </div>
      </div>

      {/* Goal + smart calc */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Meta diária</h2>

        <div className="rounded-xl bg-secondary/40 p-4 space-y-3">
          <div className="text-sm font-medium">Cálculo inteligente · peso × 35ml</div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>Seu peso (kg)</Label>
              <Input
                type="number"
                min={1}
                value={weight}
                onChange={(e) => setWeight(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="70"
                className="w-32"
              />
            </div>
            {recommended && (
              <div className="text-sm">
                Recomendado: <span className="font-bold text-primary">{recommended}ml</span>
                <span className="text-muted-foreground"> ({(recommended / 1000).toFixed(2)}L)</span>
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={applyRecommended} disabled={!recommended}>
              Usar recomendação
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">A meta sempre pode ser editada manualmente abaixo.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Volume manual (ml)</Label>
            <Input type="number" value={goalInput} onChange={(e) => setGoalInput(parseInt(e.target.value) || 0)} className="w-32" />
          </div>
          <div className="flex gap-2">
            {[2000, 2500, 3000, 4000].map((g) => (
              <Button key={g} variant="outline" size="sm" onClick={() => setGoalInput(g)}>{g / 1000}L</Button>
            ))}
          </div>
          <Button onClick={saveGoal}>Salvar meta</Button>
        </div>
      </div>

      {/* Reminders */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Lembretes de hidratação</h2>
          <Switch checked={remindersEnabled} onCheckedChange={setRemindersEnabled} />
        </div>
        {remindersEnabled && (
          <div className="space-y-2">
            {reminderTimes.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} className="w-36" />
                <Button variant="ghost" size="icon" onClick={() => removeTime(i)}><Minus className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addTime}><Plus className="h-4 w-4 mr-1" /> Adicionar horário</Button>
          </div>
        )}
        <Button onClick={saveReminders} variant="secondary">Salvar lembretes</Button>
        <p className="text-xs text-muted-foreground">Os lembretes são entregues como notificações do navegador enquanto o Sync estiver aberto.</p>
      </div>
    </div>
  );
}
