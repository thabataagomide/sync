import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Check, Trash2, Flag, Tag, Pencil, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { awardXp, bumpSyncFlow, checkAchievements } from "@/lib/sync-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { WeekdayPicker } from "@/components/WeekdayPicker";

export const Route = createFileRoute("/app/tasks")({ component: TasksPage });

const CATEGORIES = ["Casa", "Trabalho", "Estudo", "Saúde", "Pessoal", "Finanças"];
const PERIODS = [
  { value: "morning", label: "Manhã", emoji: "🌅" },
  { value: "afternoon", label: "Tarde", emoji: "☀️" },
  { value: "night", label: "Noite", emoji: "🌙" },
] as const;
const periodLabel = (v?: string) => PERIODS.find((p) => p.value === v)?.label ?? "Sem período";

type Kind = "task" | "routine";

const emptyForm = (kind: Kind = "task") => ({
  id: null as string | null,
  kind,
  title: "",
  description: "",
  priority: "medium",
  category: "Pessoal",
  tags: "",
  // optional toggles
  hasDate: false,
  due_date: format(new Date(), "yyyy-MM-dd"),
  hasTime: false,
  due_time: "09:00",
  hasEstimate: false,
  estimated_minutes: "30",
  hasRecurrence: kind === "routine",
  recurrence: kind === "routine" ? "daily" : "none",
  // routine only
  times_per_day: 1,
  periods: ["morning"] as string[],
  weekdays: [] as number[], // empty = every day
});

function TasksPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [kindTab, setKindTab] = useState<Kind>("task");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [form, setForm] = useState(emptyForm("task"));

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("tasks").select("*").eq("user_id", user.id).eq("archived", false).order("due_date", { nullsFirst: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [user?.id]);

  const setTimes = (n: number) => {
    const times = Math.max(1, Math.min(20, n));
    const periods = Array.from({ length: times }, (_, i) => form.periods[i] ?? "morning");
    setForm({ ...form, times_per_day: times, periods });
  };

  const openNew = (kind: Kind) => { setForm(emptyForm(kind)); setOpen(true); };

  const save = async () => {
    if (!user || !form.title.trim()) return;
    const isRoutine = form.kind === "routine";
    const periods = isRoutine ? form.periods.slice(0, form.times_per_day) : [];
    const payload: any = {
      user_id: user.id,
      kind: form.kind,
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority,
      category: form.category,
      tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
      due_date: isRoutine ? null : (form.hasDate ? form.due_date : null),
      due_time: !isRoutine && form.hasTime && form.hasDate ? form.due_time : null,
      estimated_minutes: form.hasEstimate ? parseInt(form.estimated_minutes) || null : null,
      recurrence: form.hasRecurrence && form.recurrence !== "none" ? { type: form.recurrence } : null,
      times_per_day: isRoutine ? Math.max(1, form.times_per_day) : 1,
      periods: isRoutine ? periods : [],
      period: isRoutine ? periods[0] ?? null : null,
      weekdays: isRoutine ? form.weekdays : [],
    };
    const { error } = form.id
      ? await supabase.from("tasks").update(payload).eq("id", form.id)
      : await supabase.from("tasks").insert({ ...payload, daily_completed: 0 });
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Salvo" : isRoutine ? "Rotina criada" : "Tarefa criada");
    setOpen(false); setForm(emptyForm(kindTab)); load();
  };

  const toggleSlot = async (t: any, idx: number) => {
    if (!user) return;
    const total = t.times_per_day ?? 1;
    const current = t.daily_completed ?? 0;
    const slotDone = idx < current;
    const next = slotDone ? Math.max(0, current - 1) : Math.min(total, current + 1);
    const status = next >= total ? "done" : "pending";
    const completed_at = status === "done" ? new Date().toISOString() : null;
    await supabase.from("tasks").update({ daily_completed: next, status, completed_at }).eq("id", t.id);
    if (slotDone) {
      await awardXp(user.id, -15);
      await bumpSyncFlow(user.id, -1);
      toast("XP estornado");
    } else {
      await awardXp(user.id, 15);
      await bumpSyncFlow(user.id, 1);
      if (status === "done") {
        const newly = await checkAchievements(user.id);
        newly.forEach((c) => toast.success(`🏆 Conquista: ${c}`));
      }
      toast.success("+15 XP");
    }
    load();
  };

  const remove = async (t: any) => {
    if (!user) return;
    const completedSlots = t.daily_completed ?? 0;
    if (completedSlots > 0) {
      await awardXp(user.id, -15 * completedSlots);
      await bumpSyncFlow(user.id, -1 * completedSlots);
    }
    await supabase.from("tasks").delete().eq("id", t.id);
    toast.success("Excluído");
    load();
  };

  const edit = (t: any) => {
    const kind: Kind = (t.kind ?? "task") as Kind;
    const periods: string[] = (t.periods?.length ? t.periods : [t.period ?? "morning"]).slice(0, t.times_per_day ?? 1);
    while (periods.length < (t.times_per_day ?? 1)) periods.push("morning");
    setForm({
      id: t.id,
      kind,
      title: t.title,
      description: t.description ?? "",
      priority: t.priority ?? "medium",
      category: t.category ?? "Pessoal",
      tags: (t.tags ?? []).join(", "),
      hasDate: !!t.due_date,
      due_date: t.due_date ?? format(new Date(), "yyyy-MM-dd"),
      hasTime: !!t.due_time,
      due_time: t.due_time ?? "09:00",
      hasEstimate: t.estimated_minutes != null,
      estimated_minutes: t.estimated_minutes?.toString() ?? "30",
      hasRecurrence: !!t.recurrence,
      recurrence: t.recurrence?.type ?? (kind === "routine" ? "daily" : "none"),
      times_per_day: t.times_per_day ?? 1,
      periods,
      weekdays: t.weekdays ?? [],
    });
    setOpen(true);
  };

  const allTags = useMemo(() => {
    const s = new Set<string>();
    items.forEach((t) => (t.tags ?? []).forEach((tag: string) => s.add(tag)));
    return Array.from(s);
  }, [items]);

  const filtered = items.filter((t) => {
    const k: Kind = (t.kind ?? "task") as Kind;
    if (k !== kindTab) return false;
    if (statusFilter === "pending" && t.status === "done") return false;
    if (statusFilter === "done" && t.status !== "done") return false;
    if (tagFilter && !(t.tags ?? []).includes(tagFilter)) return false;
    if (catFilter !== "all" && t.category !== catFilter) return false;
    return true;
  });

  // grouping
  const today = format(new Date(), "yyyy-MM-dd");
  const taskGroups = useMemo(() => {
    if (kindTab !== "task") return [] as { label: string; items: any[] }[];
    const overdue: any[] = [], todayList: any[] = [], upcoming: any[] = [], noDate: any[] = [];
    filtered.forEach((t) => {
      if (!t.due_date) noDate.push(t);
      else if (t.due_date < today) overdue.push(t);
      else if (t.due_date === today) todayList.push(t);
      else upcoming.push(t);
    });
    return [
      { label: "Atrasadas", items: overdue },
      { label: "Hoje", items: todayList },
      { label: "Próximas", items: upcoming },
      { label: "Sem data", items: noDate },
    ].filter((g) => g.items.length);
  }, [filtered, kindTab, today]);

  const routineGroups = useMemo(() => {
    if (kindTab !== "routine") return [] as { label: string; items: any[] }[];
    const buckets = ["morning", "afternoon", "night", "none"] as const;
    const bucketOf = (t: any) => (t.periods?.[0] ?? t.period) || "none";
    return buckets.map((p) => ({
      label: p === "none" ? "Sem período" : periodLabel(p),
      items: filtered.filter((t) => bucketOf(t) === p),
    })).filter((g) => g.items.length);
  }, [filtered, kindTab]);

  const groups = kindTab === "task" ? taskGroups : routineGroups;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tarefas</h1>
          <p className="text-sm text-muted-foreground">Demandas pontuais e atividades únicas.</p>
        </div>
        <Button onClick={() => openNew("task")} size="sm">
          <Plus className="h-4 w-4 mr-1" />Nova tarefa
        </Button>
      </div>

      <Tabs value={kindTab} onValueChange={(v: any) => setKindTab(v)}>
        <TabsList className="w-full md:w-auto hidden">
          <TabsTrigger value="task" className="flex-1 md:flex-none">Tarefas</TabsTrigger>
        </TabsList>


        <div className="flex flex-wrap gap-2 items-center mt-4">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="done">Concluídas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Categorias</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {allTags.length > 0 && (
            <Select value={tagFilter || "_all"} onValueChange={(v) => setTagFilter(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tags</SelectItem>
                {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value={kindTab} className="mt-5 space-y-5">
          {groups.map(({ label, items: gItems }) => (
            <div key={label}>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">{label}</h3>
              <ul className="space-y-2">
                {gItems.map((t) => {
                  const total = t.times_per_day ?? 1;
                  const done = t.daily_completed ?? 0;
                  const isRoutine = (t.kind ?? "task") === "routine";
                  return (
                    <li key={t.id} className="glass rounded-xl px-3 md:px-4 py-3 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{t.priority}</span>
                            {t.category && <span>{t.category}</span>}
                            {t.due_date && <span>{t.due_date}{t.due_time ? ` · ${t.due_time.slice(0,5)}` : ""}</span>}
                            {t.estimated_minutes && <span>{t.estimated_minutes}min</span>}
                            {isRoutine && total > 1 && <span>{done}/{total}</span>}
                            {t.recurrence?.type && <span>↻ {t.recurrence.type}</span>}
                            {t.tags?.length > 0 && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{t.tags.join(", ")}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-smooth">
                          <button onClick={() => edit(t)} className="text-muted-foreground hover:text-primary p-2"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => remove(t)} className="text-muted-foreground hover:text-destructive p-2"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isRoutine ? (
                          Array.from({ length: total }).map((_, i) => {
                            const slotDone = i < done;
                            const slotPeriod = t.periods?.[i] ?? t.period ?? "morning";
                            return (
                              <button key={i} onClick={() => toggleSlot(t, i)}
                                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-smooth ${slotDone ? "bg-primary/15 border-primary text-primary" : "border-border hover:border-primary/50"}`}>
                                <span className={`h-3.5 w-3.5 rounded border grid place-items-center ${slotDone ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                                  {slotDone && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                                </span>
                                {total > 1 && <span>{i + 1}ª</span>}
                                <span>{periodLabel(slotPeriod)}</span>
                              </button>
                            );
                          })
                        ) : (
                          <button onClick={() => toggleSlot(t, 0)}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-smooth ${t.status === "done" ? "bg-primary/15 border-primary text-primary" : "border-border hover:border-primary/50"}`}>
                            <span className={`h-3.5 w-3.5 rounded border grid place-items-center ${t.status === "done" ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                              {t.status === "done" && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                            </span>
                            {t.status === "done" ? "Concluída" : "Marcar como feita"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nada por aqui ainda.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => openNew(kindTab)}>
                <Plus className="h-4 w-4 mr-1" />Criar {kindTab === "task" ? "tarefa" : "rotina"}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm(kindTab)); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar" : "Novo"} {form.kind === "task" ? "tarefa" : "rotina"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">


            <div><Label>Título</Label><Input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.kind === "task" ? "Ex: Enviar documento" : "Ex: Beber água"} /></div>
            <div><Label>Descrição (opcional)</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              {form.kind === "task" && (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer">Definir data</Label>
                    <Switch checked={form.hasDate} onCheckedChange={(v) => setForm({ ...form, hasDate: v, hasTime: v ? form.hasTime : false })} />
                  </div>
                  {form.hasDate && <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />}
                  {form.hasDate && (
                    <>
                      <div className="flex items-center justify-between pt-2">
                        <Label className="cursor-pointer">Definir horário</Label>
                        <Switch checked={form.hasTime} onCheckedChange={(v) => setForm({ ...form, hasTime: v })} />
                      </div>
                      {form.hasTime && <Input type="time" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} />}
                    </>
                  )}
                </>
              )}

              {form.kind === "routine" && (
                <div className="space-y-2">
                  <Label>Dias da semana</Label>
                  <WeekdayPicker value={form.weekdays} onChange={(v) => setForm({ ...form, weekdays: v })} />
                  <p className="text-[11px] text-muted-foreground">{form.weekdays.length === 0 ? "Todos os dias" : "Apenas nos dias selecionados"}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Label className="cursor-pointer">Duração estimada</Label>
                <Switch checked={form.hasEstimate} onCheckedChange={(v) => setForm({ ...form, hasEstimate: v })} />
              </div>
              {form.hasEstimate && (
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })} />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              )}

              {form.kind === "task" && (
                <>
                  <div className="flex items-center justify-between pt-2">
                    <Label className="cursor-pointer">Repetir</Label>
                    <Switch checked={form.hasRecurrence} onCheckedChange={(v) => setForm({ ...form, hasRecurrence: v, recurrence: v && form.recurrence === "none" ? "daily" : form.recurrence })} />
                  </div>
                  {form.hasRecurrence && (
                    <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                        <SelectItem value="custom">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>

            {form.kind === "routine" && (
              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <Label>Quantas vezes por dia</Label>
                <Input type="number" min={1} max={20} value={form.times_per_day} onChange={(e) => setTimes(parseInt(e.target.value) || 1)} />
                <div className="space-y-2 pt-1">
                  <Label className="text-xs text-muted-foreground">Período de cada repetição</Label>
                  {form.periods.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-14">{i + 1}ª vez</span>
                      <Select value={p} onValueChange={(v) => { const np = [...form.periods]; np[i] = v; setForm({ ...form, periods: np }); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PERIODS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div><Label>Tags (separadas por vírgula)</Label><Input placeholder="urgente, foco" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>

            <div className="flex gap-2 pt-2">
              <Button onClick={save} className="flex-1">{form.id ? "Salvar" : "Criar"}</Button>
              {form.id && <Button variant="outline" onClick={() => { remove({ id: form.id, daily_completed: 0 }); setOpen(false); setForm(emptyForm(kindTab)); }}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
