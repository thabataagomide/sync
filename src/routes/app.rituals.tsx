import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Play,
  Trash2,
  Sparkles,
  Check,
  Flag,
  Tag,
  Pencil,
  Inbox,
  Repeat,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { awardXp, bumpSyncFlow, checkAchievements } from "@/lib/sync-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WeekdayPicker } from "@/components/WeekdayPicker";
import { toast } from "sonner";

export const Route = createFileRoute("/app/rituals")({
  component: RoutinePage,
});

const CATEGORIES = ["Casa", "Trabalho", "Estudo", "Saúde", "Pessoal", "Finanças"];

const PERIODS = [
  { value: "morning", label: "Manhã", emoji: "🌅" },
  { value: "afternoon", label: "Tarde", emoji: "☀️" },
  { value: "night", label: "Noite", emoji: "🌙" },
] as const;

const periodLabel = (v?: string) =>
  PERIODS.find((p) => p.value === v)?.label ?? "Sem período";

type Step = {
  kind: "habit" | "task" | "timer" | "note";
  label: string;
  minutes?: number;
};

function RoutinePage() {
  const [tab, setTab] = useState<"daily" | "executable">("daily");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Repeat className="h-7 w-7 text-primary" />
          Rotina
        </h1>
        <p className="text-sm text-muted-foreground">
          Suas rotinas diárias e rotinas executáveis passo a passo.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="daily" className="flex-1 md:flex-none">
            Diárias
          </TabsTrigger>
          <TabsTrigger value="executable" className="flex-1 md:flex-none">
            Executáveis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-5">
          <DailyRoutines />
        </TabsContent>

        <TabsContent value="executable" className="mt-5">
          <ExecutableRoutines />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const emptyForm = () => ({
  id: null as string | null,
  title: "",
  description: "",
  priority: "medium",
  category: "Pessoal",
  tags: "",
  hasEstimate: false,
  estimated_minutes: "30",
  times_per_day: 1,
  periods: ["morning"] as string[],
  weekdays: [] as number[],
});

function DailyRoutines() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .eq("kind", "routine");

    if (error) {
      toast.error(error.message);
      return;
    }

    setItems(data ?? []);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const setTimes = (n: number) => {
    const times = Math.max(1, Math.min(20, n));
    const periods = Array.from(
      { length: times },
      (_, i) => form.periods[i] ?? "morning"
    );

    setForm({
      ...form,
      times_per_day: times,
      periods,
    });
  };

  const save = async () => {
    if (!user) return;

    if (!form.title.trim()) {
      toast.error("Informe um título para a rotina.");
      return;
    }

    const periods = form.periods.slice(0, form.times_per_day);

    const payload: any = {
      user_id: user.id,
      kind: "routine",
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority,
      category: form.category,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      due_date: null,
      due_time: null,
      estimated_minutes: form.hasEstimate
        ? parseInt(form.estimated_minutes) || null
        : null,
      recurrence: { type: "daily" },
      times_per_day: Math.max(1, form.times_per_day),
      periods,
      period: periods[0] ?? null,
      weekdays: form.weekdays,
      archived: false,
      status: "pending",
      daily_completed: 0,
      completed_at: null,
    };

    const { error } = form.id
      ? await supabase.from("tasks").update(payload).eq("id", form.id)
      : await supabase.from("tasks").insert(payload);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(form.id ? "Rotina salva" : "Rotina criada");
    setOpen(false);
    setForm(emptyForm());
    load();
  };

  const toggleSlot = async (t: any, idx: number) => {
    if (!user) return;

    const total = t.times_per_day ?? 1;
    const current = t.daily_completed ?? 0;
    const slotDone = idx < current;

    const next = slotDone
      ? Math.max(0, current - 1)
      : Math.min(total, current + 1);

    const status = next >= total ? "done" : "pending";
    const completed_at = status === "done" ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("tasks")
      .update({
        daily_completed: next,
        status,
        completed_at,
      })
      .eq("id", t.id);

    if (error) {
      toast.error(error.message);
      return;
    }

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

    const { error } = await supabase.from("tasks").delete().eq("id", t.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Excluído");
    load();
  };

  const edit = (t: any) => {
    const periods: string[] = (
      t.periods?.length ? t.periods : [t.period ?? "morning"]
    ).slice(0, t.times_per_day ?? 1);

    while (periods.length < (t.times_per_day ?? 1)) {
      periods.push("morning");
    }

    setForm({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      priority: t.priority ?? "medium",
      category: t.category ?? "Pessoal",
      tags: (t.tags ?? []).join(", "),
      hasEstimate: t.estimated_minutes != null,
      estimated_minutes: t.estimated_minutes?.toString() ?? "30",
      times_per_day: t.times_per_day ?? 1,
      periods,
      weekdays: t.weekdays ?? [],
    });

    setOpen(true);
  };

  const groups = useMemo(() => {
    const periods = ["morning", "afternoon", "night"] as const;

    return periods
      .map((period) => ({
        period,
        label: periodLabel(period),
        items: items.flatMap((task) => {
          const taskPeriods = task.periods?.length
            ? task.periods
            : [task.period ?? "morning"];

          return taskPeriods
            .map((taskPeriod: string, index: number) => ({
              ...task,
              slotIndex: index,
              slotPeriod: taskPeriod,
            }))
            .filter((slot: any) => slot.slotPeriod === period);
        }),
      }))
      .filter((group) => group.items.length);
  }, [items]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setForm(emptyForm());
            setOpen(true);
          }}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova rotina diária
        </Button>
      </div>

      {groups.map(({ label, items: gItems }) => (
        <div key={label}>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            {label}
          </h3>

          <ul className="space-y-2">
            {gItems.map((t) => {
              const done = t.daily_completed ?? 0;
              const slotDone = t.slotIndex < done;
              const total = t.times_per_day ?? 1;

              return (
                <li
                  key={`${t.id}-${t.slotIndex}`}
                  className="glass rounded-xl px-3 md:px-4 py-3 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium ${
                          slotDone ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {t.title}
                      </div>

                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Flag className="h-3 w-3" />
                          {t.priority}
                        </span>

                        {t.category && <span>{t.category}</span>}

                        {t.estimated_minutes && (
                          <span>{t.estimated_minutes}min</span>
                        )}

                        {total > 1 && (
                          <span>
                            {t.slotIndex + 1}ª de {total}
                          </span>
                        )}

                        {t.tags?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {t.tags.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-smooth">
                      <button
                        onClick={() => edit(t)}
                        className="text-muted-foreground hover:text-primary p-2"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => remove(t)}
                        className="text-muted-foreground hover:text-destructive p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <button
                      onClick={() => toggleSlot(t, t.slotIndex)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-smooth ${
                        slotDone
                          ? "bg-primary/15 border-primary text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 rounded border grid place-items-center ${
                          slotDone
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {slotDone && (
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        )}
                      </span>

                      <span>{periodLabel(t.slotPeriod)}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhuma rotina diária ainda.</p>

          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setForm(emptyForm());
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Criar rotina
          </Button>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setForm(emptyForm());
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar" : "Nova"} rotina</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Beber água"
              />
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <WeekdayPicker
                  value={form.weekdays}
                  onChange={(v) => setForm({ ...form, weekdays: v })}
                />

                <p className="text-[11px] text-muted-foreground">
                  {form.weekdays.length === 0
                    ? "Todos os dias"
                    : "Apenas nos dias selecionados"}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label className="cursor-pointer">Duração estimada</Label>
                <Switch
                  checked={form.hasEstimate}
                  onCheckedChange={(v) =>
                    setForm({ ...form, hasEstimate: v })
                  }
                />
              </div>

              {form.hasEstimate && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={form.estimated_minutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimated_minutes: e.target.value,
                      })
                    }
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <Label>Quantas vezes por dia</Label>

              <Input
                type="number"
                min={1}
                max={20}
                value={form.times_per_day}
                onChange={(e) => setTimes(parseInt(e.target.value) || 1)}
              />

              <div className="space-y-2 pt-1">
                <Label className="text-xs text-muted-foreground">
                  Período de cada repetição
                </Label>

                {form.periods.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14">
                      {i + 1}ª vez
                    </span>

                    <Select
                      value={p}
                      onValueChange={(v) => {
                        const np = [...form.periods];
                        np[i] = v;
                        setForm({ ...form, periods: np });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {PERIODS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.emoji} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                placeholder="urgente, foco"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={save} className="flex-1">
                {form.id ? "Salvar" : "Criar"}
              </Button>

              {form.id && (
                <Button
                  variant="outline"
                  onClick={() => {
                    remove({ id: form.id, daily_completed: 0 });
                    setOpen(false);
                    setForm(emptyForm());
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExecutableRoutines() {
  const { user } = useAuth();
  const [rituals, setRituals] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✨");
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState<{ ritual: any; index: number } | null>(
    null
  );

  const load = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("rituals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    setRituals(data ?? []);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const addStep = () => {
    setSteps((s) => [...s, { kind: "task", label: "" }]);
  };

  const save = async () => {
    if (!user) return;

    if (!name.trim()) {
      toast.error("Informe um nome para a rotina.");
      return;
    }

    const validSteps = steps.filter((s) => s.label.trim());

    if (validSteps.length === 0) {
      toast.error("Adicione pelo menos um passo.");
      return;
    }

    const { error } = await supabase.from("rituals").insert({
      user_id: user.id,
      name: name.trim(),
      icon,
      steps: validSteps,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Rotina executável criada");
    setOpen(false);
    setName("");
    setIcon("✨");
    setSteps([]);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("rituals").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Sequências guiadas que você executa passo a passo.
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="glow">
              <Plus className="h-4 w-4 mr-1" />
              Nova executável
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar rotina executável</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  className="w-16 text-center"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={2}
                />

                <Input
                  placeholder="Rotina da manhã"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <select
                      value={s.kind}
                      onChange={(e) =>
                        setSteps((p) =>
                          p.map((x, j) =>
                            j === i
                              ? { ...x, kind: e.target.value as any }
                              : x
                          )
                        )
                      }
                      className="rounded-md bg-input border border-border px-2 text-sm"
                    >
                      <option value="task">Tarefa</option>
                      <option value="habit">Hábito</option>
                      <option value="timer">Timer</option>
                      <option value="note">Nota</option>
                    </select>

                    <Input
                      placeholder="Descrição do passo"
                      value={s.label}
                      onChange={(e) =>
                        setSteps((p) =>
                          p.map((x, j) =>
                            j === i ? { ...x, label: e.target.value } : x
                          )
                        )
                      }
                    />

                    {s.kind === "timer" && (
                      <Input
                        type="number"
                        placeholder="min"
                        className="w-20"
                        value={s.minutes ?? ""}
                        onChange={(e) =>
                          setSteps((p) =>
                            p.map((x, j) =>
                              j === i
                                ? { ...x, minutes: Number(e.target.value) }
                                : x
                            )
                          )
                        }
                      />
                    )}
                  </div>
                ))}

                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar passo
                </Button>
              </div>

              <Button onClick={save} className="w-full glow">
                Salvar rotina
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rituals.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">
            Crie sua primeira rotina executável — manhã, criativo, foco profundo,
            encerramento do dia…
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rituals.map((r) => (
            <div key={r.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl mb-1">{r.icon}</div>
                  <h3 className="font-semibold">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {r.steps.length} passo{r.steps.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <button
                  onClick={() => remove(r.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <ol className="mt-3 space-y-1.5 text-sm">
                {r.steps.map((s: Step, i: number) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <span className="h-5 w-5 rounded-full bg-secondary/60 text-xs grid place-items-center">
                      {i + 1}
                    </span>

                    <span>{s.label}</span>

                    {s.kind === "timer" && s.minutes && (
                      <span className="text-xs">· {s.minutes}min</span>
                    )}
                  </li>
                ))}
              </ol>

              <Button
                onClick={() => setRunning({ ritual: r, index: 0 })}
                className="w-full mt-4"
                variant="outline"
              >
                <Play className="h-3 w-3 mr-2" />
                Executar rotina
              </Button>
            </div>
          ))}
        </div>
      )}

      {running && (
        <Dialog open={!!running} onOpenChange={(o) => !o && setRunning(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {running.ritual.icon} {running.ritual.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-center">
              <div className="text-xs text-muted-foreground">
                Passo {running.index + 1} de {running.ritual.steps.length}
              </div>

              <div className="text-2xl font-semibold">
                {running.ritual.steps[running.index].label}
              </div>

              <div className="flex gap-2 justify-center">
                {running.index > 0 && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setRunning((r) =>
                        r ? { ...r, index: r.index - 1 } : r
                      )
                    }
                  >
                    Voltar
                  </Button>
                )}

                {running.index < running.ritual.steps.length - 1 ? (
                  <Button
                    onClick={() =>
                      setRunning((r) =>
                        r ? { ...r, index: r.index + 1 } : r
                      )
                    }
                  >
                    Próximo passo
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      toast.success("Rotina concluída ✨");
                      setRunning(null);
                    }}
                  >
                    Concluir
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}