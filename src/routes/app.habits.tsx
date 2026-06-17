import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { Plus, Trash2, Trophy, Pencil, Upload, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { awardXp, bumpSyncFlow, today, checkAchievements, difficultyXp } from "@/lib/sync-data";
import { streakTier } from "@/lib/levels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { WeekdayPicker } from "@/components/WeekdayPicker";
import { HabitHeatmap } from "@/components/HabitHeatmap";

export const Route = createFileRoute("/app/habits")({ component: HabitsPage });

const ICONS = ["💧", "🏃", "📚", "🧘", "💤", "🥗", "✍️", "🎯", "🌱", "💪", "☀️", "🎨"];
const CATEGORIES = ["Saúde", "Mente", "Estudo", "Leitura", "Trabalho", "Lazer", "Espiritual"];

const emptyForm = () => ({
  id: null as string | null,
  name: "",
  description: "",
  icon: "✨",
  image_url: "" as string | null,
  category: "Saúde",
  difficulty: "easy",
  hasWeekdays: false,
  weekdays: [] as number[],
});

function HabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<any[]>([]);
  const [logs, setLogs] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [filterCat, setFilterCat] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "pending">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const t = today();
    const [h, l] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).eq("archived", false).order("created_at"),
      supabase.from("habit_logs").select("habit_id,count").eq("user_id", user.id).eq("log_date", t),
    ]);
    setHabits(h.data ?? []);
    const map: Record<string, number> = {};
    (l.data ?? []).forEach((x: any) => { map[x.habit_id] = (map[x.habit_id] ?? 0) + x.count; });
    setLogs(map);
  };
  useEffect(() => { load(); }, [user?.id]);

  const save = async () => {
    if (!user || !form.name) return;
    const payload = {
      user_id: user.id,
      name: form.name,
      description: form.description || null,
      icon: form.icon,
      image_url: form.image_url || null,
      category: form.category,
      difficulty: form.difficulty,
      times_per_day: 1,
      weekdays: form.hasWeekdays ? form.weekdays : [],
    };
    const { error } = form.id
      ? await supabase.from("habits").update(payload).eq("id", form.id)
      : await supabase.from("habits").insert(payload);
    if (error) return toast.error(error.message);
    setOpen(false); setForm(emptyForm()); load();
    toast.success(form.id ? "Hábito atualizado" : "Hábito criado!");
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("habit-icons").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data: signed, error: signErr } = await supabase.storage.from("habit-icons").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed) return toast.error(signErr?.message ?? "Falha ao gerar URL");
    setForm({ ...form, image_url: signed.signedUrl });
    toast.success("Imagem carregada");
  };

  const checkIn = async (h: any) => {
    if (!user) return;
    const already = (logs[h.id] ?? 0) > 0;
    const xp = difficultyXp(h.difficulty);
    if (already) {
      const { data: l } = await supabase.from("habit_logs").select("id").eq("user_id", user.id).eq("habit_id", h.id).eq("log_date", today());
      if (l) for (const row of l) await supabase.from("habit_logs").delete().eq("id", row.id);
      const newStreak = Math.max(0, (h.streak ?? 0) - 1);
      await supabase.from("habits").update({ streak: newStreak }).eq("id", h.id);
      await awardXp(user.id, -xp);
      await bumpSyncFlow(user.id, -1);
      toast("XP estornado");
    } else {
      await supabase.from("habit_logs").insert({ user_id: user.id, habit_id: h.id, log_date: today(), count: 1 });
      const newStreak = (h.streak ?? 0) + 1;
      await supabase.from("habits").update({ streak: newStreak, best_streak: Math.max(h.best_streak ?? 0, newStreak) }).eq("id", h.id);
      await awardXp(user.id, xp);
      await bumpSyncFlow(user.id, 1);
      const newly = await checkAchievements(user.id);
      newly.forEach((c) => toast.success(`🏆 Conquista: ${c}`));
      toast.success(`+${xp} XP · Streak ${newStreak}🔥`);
    }
    load();
  };

  const edit = (h: any) => {
    setForm({
      id: h.id,
      name: h.name,
      description: h.description ?? "",
      icon: h.icon ?? "✨",
      image_url: h.image_url ?? "",
      category: h.category ?? "Saúde",
      difficulty: h.difficulty ?? "easy",
      hasWeekdays: !!(h.weekdays?.length),
      weekdays: h.weekdays ?? [],
    });
    setOpen(true);
  };

  const remove = async (h: any) => {
    if (!user) return;
    if (!confirm(`Excluir o hábito "${h.name}"? Essa ação é definitiva.`)) return;
    await supabase.from("habit_logs").delete().eq("habit_id", h.id);
    await supabase.from("habits").delete().eq("id", h.id);
    toast.success("Hábito excluído");
    load();
  };

  const filtered = useMemo(() => habits.filter((h) => {
    if (filterCat !== "all" && h.category !== filterCat) return false;
    const done = (logs[h.id] ?? 0) > 0;
    if (statusFilter === "done" && !done) return false;
    if (statusFilter === "pending" && done) return false;
    return true;
  }), [habits, logs, filterCat, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Hábitos</h1>
          <p className="text-muted-foreground">Construa consistência. Suba de nível.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setForm(emptyForm()); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo hábito</Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm()); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar hábito" : "Novo hábito"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2 mt-1 items-center">
                {ICONS.map((i) => (
                  <button key={i} type="button" onClick={() => setForm({ ...form, icon: i, image_url: "" })} className={`h-10 w-10 rounded-lg text-xl ${form.icon === i && !form.image_url ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary"}`}>{i}</button>
                ))}
                <button type="button" onClick={() => fileRef.current?.click()} className={`h-10 w-10 rounded-lg grid place-items-center bg-secondary hover:bg-secondary/80 ${form.image_url ? "ring-2 ring-primary" : ""}`}>
                  {form.image_url ? <img src={form.image_url} alt="custom" className="h-9 w-9 rounded-md object-cover" /> : <Upload className="h-4 w-4" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dificuldade</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Repetir em dias específicos</Label>
                <Switch checked={form.hasWeekdays} onCheckedChange={(v) => setForm({ ...form, hasWeekdays: v })} />
              </div>
              {form.hasWeekdays ? (
                <>
                  <WeekdayPicker value={form.weekdays} onChange={(v) => setForm({ ...form, weekdays: v })} />
                  <p className="text-[11px] text-muted-foreground">O hábito só aparecerá nos dias selecionados.</p>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">Todos os dias da semana.</p>
              )}
            </div>

            <Button onClick={save} className="w-full">{form.id ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap gap-2">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="done">Feitos</TabsTrigger>
            <TabsTrigger value="pending">A fazer</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((h) => {
          const done = (logs[h.id] ?? 0) > 0;
          const tier = streakTier(h.streak ?? 0);
          return (
            <div key={h.id} className={`glass rounded-2xl p-5 group transition-all ${done ? `bg-gradient-to-br ${tier.aura} border-0 ${tier.glow}` : ""}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center text-2xl overflow-hidden">
                    {h.image_url ? <img src={h.image_url} alt={h.name} className="h-full w-full object-cover" /> : h.icon}
                  </div>
                  <div>
                    <div className="font-semibold">{h.name}</div>
                    <div className="text-xs text-muted-foreground">{h.category} · {h.difficulty} · +{difficultyXp(h.difficulty)} XP</div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => edit(h)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(h)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className={`flex items-center gap-1 font-semibold ${done ? "text-white" : "text-warning"}`}>
                    <Flame className="h-4 w-4" />{h.streak ?? 0} · {tier.label}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Trophy className="h-3 w-3" />{h.best_streak ?? 0}</span>
                </div>
                <Button size="sm" variant={done ? "outline" : "default"} onClick={() => checkIn(h)}>
                  {done ? "✓ Feito hoje" : "Marcar"}
                </Button>
              </div>
              {user && <HabitHeatmap habitId={h.id} userId={user.id} />}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground col-span-full py-16">Nada por aqui ✨</p>}
      </div>
    </div>
  );
}
