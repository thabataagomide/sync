import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle, Cake, Check, X, Clock } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  isSameMonth, isSameDay, parseISO, getDate, getMonth, differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

const CATEGORIES = [
  { value: "personal", label: "Personalizado", color: "#2dd4a8", emoji: "🟢" },
  { value: "birthday", label: "Aniversário", color: "#f472b6", emoji: "🎂" },
  { value: "meeting", label: "Reunião", color: "#60a5fa", emoji: "💼" },
  { value: "workout", label: "Treino", color: "#fb923c", emoji: "💪" },
  { value: "study", label: "Estudo", color: "#a78bfa", emoji: "📚" },
];

type Recurrence =
  | { type: "none" }
  | { type: "daily" | "weekly" | "monthly" | "yearly" }
  | { type: "custom"; everyDays?: number; weekdays?: number[] };

const STATUSES = [
  { value: "planned", label: "Planejado", color: "#94a3b8", chip: "bg-slate-500/15 text-slate-300 border-slate-500/40" },
  { value: "done", label: "Feito", color: "#10b981", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  { value: "cancelled", label: "Cancelado", color: "#ef4444", chip: "bg-rose-500/15 text-rose-300 border-rose-500/40" },
  { value: "postponed", label: "Adiado", color: "#f59e0b", chip: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
];

const WEEKDAYS = [
  { idx: 1, label: "Seg" },
  { idx: 2, label: "Ter" },
  { idx: 3, label: "Qua" },
  { idx: 4, label: "Qui" },
  { idx: 5, label: "Sex" },
  { idx: 6, label: "Sáb" },
  { idx: 0, label: "Dom" },
];

const emptyForm = () => ({
  id: null as string | null,
  title: "",
  description: "",
  category: "personal",
  starts_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  ends_at: format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
  hasStart: true,
  hasEnd: true,
  status: "planned",
  color: "#2dd4a8",
  priority: "medium",
  recurrence: "none" as "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom",
  customDays: 7,
  customWeekdays: [] as number[],
});

function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(new Date());
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState(emptyForm());
  const [convertEvent, setConvertEvent] = useState<any | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("events").select("*").eq("user_id", user.id).order("starts_at");
    setEvents(data ?? []);
  };
  useEffect(() => { load(); }, [user?.id]);

  const convertToTask = async () => {
    if (!user || !convertEvent) return;
    const startsAt = parseISO(convertEvent.starts_at);
    await supabase.from("tasks").insert({
      user_id: user.id,
      title: convertEvent.title,
      description: convertEvent.description ?? null,
      kind: "task",
      due_date: format(startsAt, "yyyy-MM-dd"),
      due_time: format(startsAt, "HH:mm:ss"),
      priority: convertEvent.priority ?? "medium",
    } as any);
    toast.success("Adicionado às tarefas");
    setConvertEvent(null);
  };

  const convertToHabit = async () => {
    if (!user || !convertEvent) return;
    await supabase.from("habits").insert({
      user_id: user.id,
      name: convertEvent.title,
      description: convertEvent.description ?? null,
      icon: "✨",
      category: convertEvent.category === "workout" ? "Saúde" : convertEvent.category === "study" ? "Estudo" : "Mente",
      difficulty: "easy",
      times_per_day: 1,
    } as any);
    toast.success("Adicionado aos hábitos");
    setConvertEvent(null);
  };

  const save = async () => {
    if (!user || !form.title) return;

    let recurrence: Recurrence | null = null;
    if (form.recurrence === "custom") {
      // Custom: by weekdays selection or by interval
      if (form.customWeekdays.length > 0) {
        recurrence = { type: "custom", weekdays: form.customWeekdays };
      } else {
        recurrence = { type: "custom", everyDays: Math.max(1, form.customDays) };
      }
    } else if (form.recurrence !== "none") {
      recurrence = { type: form.recurrence };
    }

    const cat = CATEGORIES.find((c) => c.value === form.category);
    const now = new Date().toISOString();
    const payload: any = {
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      category: form.category,
      starts_at: form.hasStart ? new Date(form.starts_at).toISOString() : now,
      ends_at: form.hasEnd ? new Date(form.ends_at).toISOString() : new Date("2999-12-31T23:59:59Z").toISOString(),
      color: cat?.color ?? form.color,
      priority: form.priority,
      status: form.status,
      recurrence: recurrence as any,
      location: null,
      guests: [],
    };
    const isNew = !form.id;
    const { error } = form.id
      ? await supabase.from("events").update(payload).eq("id", form.id)
      : await supabase.from("events").insert(payload);
    if (error) return toast.error(error.message);
    const snapshot = { ...payload };
    setOpen(false); setForm(emptyForm()); load();
    toast.success(isNew ? "Evento criado" : "Evento atualizado");
    if (isNew) setConvertEvent(snapshot);
  };

  const remove = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("events").update({ status }).eq("id", id);
    load();
  };

  const edit = (e: any) => {
    const r = e.recurrence?.type ?? "none";
    const farFuture = e.ends_at && new Date(e.ends_at).getFullYear() >= 2999;
    setForm({
      id: e.id,
      title: e.title,
      description: e.description ?? "",
      category: e.category ?? "personal",
      starts_at: format(parseISO(e.starts_at), "yyyy-MM-dd'T'HH:mm"),
      ends_at: farFuture ? format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm") : format(parseISO(e.ends_at), "yyyy-MM-dd'T'HH:mm"),
      hasStart: true,
      hasEnd: !farFuture,
      status: e.status ?? "planned",
      color: e.color ?? "#2dd4a8",
      priority: e.priority ?? "medium",
      recurrence: r,
      customDays: e.recurrence?.everyDays ?? 7,
      customWeekdays: e.recurrence?.weekdays ?? [],
    });
    setOpen(true);
  };

  // Build month grid
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  // Expand recurring events for a date
  const occursOn = (e: any, day: Date): boolean => {
    const start = parseISO(e.starts_at);
    if (isSameDay(start, day)) return true;
    if (day < start) return false;
    const r = e.recurrence;
    if (!r || !r.type || r.type === "none") return false;
    const diff = differenceInCalendarDays(day, start);
    if (diff <= 0) return false;
    switch (r.type) {
      case "daily": return true;
      case "weekly": return diff % 7 === 0;
      case "monthly": return getDate(day) === getDate(start);
      case "yearly": return getDate(day) === getDate(start) && getMonth(day) === getMonth(start);
      case "custom":
        if (Array.isArray(r.weekdays) && r.weekdays.length > 0) return r.weekdays.includes(day.getDay());
        return diff % Math.max(1, r.everyDays || 1) === 0;
      default: return false;
    }
  };

  const filteredEvents = useMemo(
    () => filter === "all" ? events : events.filter((e) => e.category === filter),
    [events, filter],
  );

  const eventsForDay = (d: Date) => filteredEvents.filter((e) => occursOn(e, d));

  const overloaded = days.filter((d) => isSameMonth(d, cursor) && eventsForDay(d).length >= 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Calendário</h1>
          <p className="text-muted-foreground capitalize">{format(cursor, "MMMM yyyy", { locale: ptBR })}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {filter !== "all" && (
            <Button variant="outline" onClick={() => setFilter("all")}>Limpar filtro</Button>
          )}
          {filter === "all" && (
            <>
              <Button variant="outline" onClick={() => setCursor(addMonths(cursor, -1))}>←</Button>
              <Button variant="outline" onClick={() => setCursor(new Date())}>Hoje</Button>
              <Button variant="outline" onClick={() => setCursor(addMonths(cursor, 1))}>→</Button>
            </>
          )}
          <Button onClick={() => { setForm(emptyForm()); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Evento
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm()); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-2 rounded-xl bg-secondary/30 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Data inicial</Label>
                  <Switch checked={form.hasStart} onCheckedChange={(v) => setForm({ ...form, hasStart: v })} />
                </div>
                {form.hasStart && (
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                )}
              </div>
              <div className="col-span-2 space-y-2 rounded-xl bg-secondary/30 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Data final</Label>
                  <Switch checked={form.hasEnd} onCheckedChange={(v) => setForm({ ...form, hasEnd: v })} />
                </div>
                {form.hasEnd ? (
                  <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                ) : (
                  <p className="text-xs text-muted-foreground">Evento contínuo · sem limite de término</p>
                )}
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
                  </SelectContent>
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
              <div className="col-span-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: s.color }} />
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Recorrência</Label>
                <Select value={form.recurrence} onValueChange={(v: any) => setForm({ ...form, recurrence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.recurrence === "custom" && (
                <div className="col-span-2 space-y-3 rounded-xl bg-secondary/30 p-3">
                  <div>
                    <Label className="text-xs">Dias da semana</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {WEEKDAYS.map((w) => {
                        const active = form.customWeekdays.includes(w.idx);
                        return (
                          <button
                            type="button"
                            key={w.idx}
                            onClick={() => setForm({
                              ...form,
                              customWeekdays: active ? form.customWeekdays.filter((d) => d !== w.idx) : [...form.customWeekdays, w.idx],
                            })}
                            className={`h-9 w-11 rounded-lg text-xs font-semibold transition-smooth ${active ? "bg-primary text-primary-foreground glow" : "bg-secondary/60 hover:bg-secondary"}`}
                          >
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">— ou —</div>
                  <div>
                    <Label className="text-xs">A cada quantos dias?</Label>
                    <Input type="number" min={1} value={form.customDays} onChange={(e) => setForm({ ...form, customDays: parseInt(e.target.value) || 1 })} />
                    <p className="text-[11px] text-muted-foreground mt-1">Usado quando nenhum dia da semana é selecionado.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={save} className="flex-1">{form.id ? "Salvar" : "Criar"}</Button>
              {form.id && <Button variant="outline" onClick={() => { remove(form.id!); setOpen(false); setForm(emptyForm()); }}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {overloaded.length > 0 && (
        <div className="glass rounded-xl p-4 flex items-center gap-3 border border-warning/30">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <span className="text-sm">Atenção: {overloaded.length} dia(s) com sobrecarga este mês</span>
        </div>
      )}

      {filter === "all" ? (
        <div className="glass rounded-2xl p-3">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => (
              <div key={d} className="text-xs uppercase tracking-wider text-muted-foreground text-center py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const dayEvents = eventsForDay(d);
              const isToday = isSameDay(d, new Date());
              const inMonth = isSameMonth(d, cursor);
              const hasBday = dayEvents.some((e) => e.category === "birthday");
              return (
                <div
                  key={d.toISOString()}
                  className={[
                    "min-h-[110px] rounded-xl p-2 transition-smooth",
                    inMonth ? "bg-secondary/30" : "bg-secondary/10 opacity-50",
                    isToday ? "ring-2 ring-primary" : "",
                    hasBday ? "border-2 border-pink-400/70 shadow-[0_0_20px_rgba(244,114,182,0.25)]" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${isToday ? "text-primary" : ""}`}>{format(d, "d")}</span>
                    {hasBday && <Cake className="h-3 w-3 text-pink-400" />}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => {
                      const cat = CATEGORIES.find((c) => c.value === e.category);
                      const st = STATUSES.find((s) => s.value === (e.status ?? "planned"));
                      const isDone = e.status === "done";
                      const isCancelled = e.status === "cancelled";
                      return (
                        <button
                          key={e.id + d.toISOString()}
                          onClick={() => edit(e)}
                          className={`w-full text-left rounded-md px-1.5 py-0.5 text-[10px] truncate font-medium flex items-center gap-1 ${isCancelled ? "line-through opacity-60" : ""} ${isDone ? "opacity-80" : ""}`}
                          style={{ background: `${cat?.color ?? "#2dd4a8"}26`, color: cat?.color ?? undefined, borderLeft: `3px solid ${st?.color ?? "transparent"}` }}
                          title={st?.label}
                        >
                          {format(parseISO(e.starts_at), "HH:mm")} {e.title}
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-4 space-y-2">
          <div className="text-sm text-muted-foreground mb-2">
            Mostrando apenas: <span className="text-foreground font-medium">{CATEGORIES.find((c) => c.value === filter)?.label}</span>
          </div>
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum evento nesta categoria.</p>
          ) : filteredEvents.map((e) => {
            const cat = CATEGORIES.find((c) => c.value === e.category);
            const st = STATUSES.find((s) => s.value === (e.status ?? "planned"))!;
            return (
              <div key={e.id} className={`rounded-xl bg-secondary/40 hover:bg-secondary/60 px-4 py-3 flex items-center justify-between transition-smooth ${e.status === "cancelled" ? "opacity-70" : ""}`}>
                <button onClick={() => edit(e)} className="flex items-center gap-3 text-left flex-1 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cat?.color }} />
                  <div className="min-w-0">
                    <div className={`font-medium truncate ${e.status === "cancelled" ? "line-through" : ""}`}>{cat?.emoji} {e.title}</div>
                    <div className="text-xs text-muted-foreground">{format(parseISO(e.starts_at), "dd/MM/yyyy 'às' HH:mm")}</div>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${st.chip}`}>{st.label}</span>
                  <button onClick={() => setStatus(e.id, "done")} title="Marcar como feito" className="text-emerald-400 hover:scale-110 transition-smooth"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setStatus(e.id, "postponed")} title="Adiar" className="text-amber-400 hover:scale-110 transition-smooth"><Clock className="h-4 w-4" /></button>
                  <button onClick={() => setStatus(e.id, "cancelled")} title="Cancelar" className="text-rose-400 hover:scale-110 transition-smooth"><X className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Badge key={c.value} variant="outline" className="gap-1" style={{ borderColor: `${c.color}66`, color: c.color }}>
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.label}
          </Badge>
        ))}
      </div>

      <Dialog open={!!convertEvent} onOpenChange={(v) => !v && setConvertEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transformar em tarefa ou hábito?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deseja também adicionar <span className="text-foreground font-medium">"{convertEvent?.title}"</span> como tarefa ou hábito para acompanhar?
          </p>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <Button variant="outline" onClick={convertToTask}>Tarefa</Button>
            <Button variant="outline" onClick={convertToHabit}>Hábito</Button>
            <Button variant="ghost" onClick={() => setConvertEvent(null)}>Não</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
