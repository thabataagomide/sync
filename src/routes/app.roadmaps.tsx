import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Map as MapIcon, Trash2, Pencil, ChevronDown, ChevronRight,
  Link as LinkIcon, GripVertical, CheckCircle2, Circle, ArrowLeft, Tag,
  Download, Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { awardXp, checkAchievements } from "@/lib/sync-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/roadmaps")({ component: RoadmapsPage });

const COLORS = ["#2dd4a8", "#3b82f6", "#a78bfa", "#f59e0b", "#ef4444", "#10b981", "#ec4899"];
const ICONS = ["🗺️", "🎯", "📚", "💼", "🎓", "💪", "🧠", "🚀", "🎨", "🌱", "🏆", "💡"];

const sb = supabase as any;

type Roadmap = { id: string; name: string; description: string | null; category: string | null; color: string | null; icon: string | null; sort_order: number };
type Phase = { id: string; roadmap_id: string; name: string; sort_order: number; completed: boolean };
type Item = { id: string; roadmap_id: string; phase_id: string; title: string; description: string | null; link: string | null; tag: string | null; completed: boolean; sort_order: number };

function RoadmapsPage() {
  const { user } = useAuth();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [rmOpen, setRmOpen] = useState(false);
  const [rmForm, setRmForm] = useState<{ id: string | null; name: string; description: string; category: string; color: string; icon: string }>({ id: null, name: "", description: "", category: "", color: COLORS[0], icon: ICONS[0] });

  const [phaseOpen, setPhaseOpen] = useState(false);
  const [phaseForm, setPhaseForm] = useState<{ id: string | null; name: string }>({ id: null, name: "" });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState<{ id: string | null; phase_id: string; title: string; description: string; link: string; tag: string }>({ id: null, phase_id: "", title: "", description: "", link: "", tag: "" });

  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragPhase, setDragPhase] = useState<string | null>(null);

  const active = useMemo(() => roadmaps.find((r) => r.id === activeId) ?? null, [roadmaps, activeId]);
  const activePhases = useMemo(() => phases.filter((p) => p.roadmap_id === activeId).sort((a, b) => a.sort_order - b.sort_order), [phases, activeId]);
  const activeItems = useMemo(() => items.filter((i) => i.roadmap_id === activeId), [items, activeId]);

  const stats = useMemo(() => {
    const total = activeItems.length;
    const done = activeItems.filter((i) => i.completed).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const currentPhase = activePhases.find((p) => !p.completed) ?? activePhases[activePhases.length - 1] ?? null;
    return { total, done, remaining: total - done, pct, currentPhase };
  }, [activeItems, activePhases]);

  const load = async () => {
    if (!user) return;
    const [r, p, i] = await Promise.all([
      sb.from("roadmaps").select("*").eq("user_id", user.id).order("sort_order"),
      sb.from("roadmap_phases").select("*").eq("user_id", user.id).order("sort_order"),
      sb.from("roadmap_items").select("*").eq("user_id", user.id).order("sort_order"),
    ]);
    setRoadmaps((r.data ?? []) as Roadmap[]);
    setPhases((p.data ?? []) as Phase[]);
    setItems((i.data ?? []) as Item[]);
  };
  useEffect(() => { load(); }, [user?.id]);

  // ---- Roadmap CRUD ----
  const openNewRoadmap = () => { setRmForm({ id: null, name: "", description: "", category: "", color: COLORS[0], icon: ICONS[0] }); setRmOpen(true); };
  const editRoadmap = (r: Roadmap) => { setRmForm({ id: r.id, name: r.name, description: r.description ?? "", category: r.category ?? "", color: r.color ?? COLORS[0], icon: r.icon ?? ICONS[0] }); setRmOpen(true); };
  const saveRoadmap = async () => {
    if (!user || !rmForm.name.trim()) return;
    const payload = { user_id: user.id, name: rmForm.name.trim(), description: rmForm.description || null, category: rmForm.category || null, color: rmForm.color, icon: rmForm.icon };
    if (rmForm.id) {
      await sb.from("roadmaps").update(payload).eq("id", rmForm.id);
    } else {
      await sb.from("roadmaps").insert({ ...payload, sort_order: roadmaps.length });
    }
    setRmOpen(false);
    toast.success(rmForm.id ? "Roadmap atualizado" : "Roadmap criado");
    load();
  };
  const deleteRoadmap = async (id: string) => {
    if (!confirm("Excluir este roadmap e todas as fases e itens?")) return;
    await sb.from("roadmaps").delete().eq("id", id);
    if (activeId === id) setActiveId(null);
    load();
  };

  // ---- Phase CRUD ----
  const openNewPhase = () => { setPhaseForm({ id: null, name: "" }); setPhaseOpen(true); };
  const editPhase = (p: Phase) => { setPhaseForm({ id: p.id, name: p.name }); setPhaseOpen(true); };
  const savePhase = async () => {
    if (!user || !activeId || !phaseForm.name.trim()) return;
    if (phaseForm.id) {
      await sb.from("roadmap_phases").update({ name: phaseForm.name.trim() }).eq("id", phaseForm.id);
    } else {
      await sb.from("roadmap_phases").insert({ user_id: user.id, roadmap_id: activeId, name: phaseForm.name.trim(), sort_order: activePhases.length });
    }
    setPhaseOpen(false);
    load();
  };
  const deletePhase = async (id: string) => {
    if (!confirm("Excluir esta fase e todos os itens?")) return;
    await sb.from("roadmap_phases").delete().eq("id", id);
    load();
  };

  // ---- Item CRUD ----
  const openNewItem = (phase_id: string) => { setItemForm({ id: null, phase_id, title: "", description: "", link: "", tag: "" }); setItemOpen(true); };
  const editItem = (it: Item) => { setItemForm({ id: it.id, phase_id: it.phase_id, title: it.title, description: it.description ?? "", link: it.link ?? "", tag: it.tag ?? "" }); setItemOpen(true); };
  const saveItem = async () => {
    if (!user || !activeId || !itemForm.title.trim()) return;
    const payload = { title: itemForm.title.trim(), description: itemForm.description || null, link: itemForm.link || null, tag: itemForm.tag || null };
    if (itemForm.id) {
      await sb.from("roadmap_items").update(payload).eq("id", itemForm.id);
    } else {
      const count = items.filter((i) => i.phase_id === itemForm.phase_id).length;
      await sb.from("roadmap_items").insert({ ...payload, user_id: user.id, roadmap_id: activeId, phase_id: itemForm.phase_id, sort_order: count });
    }
    setItemOpen(false);
    load();
  };
  const deleteItem = async (id: string) => {
    await sb.from("roadmap_items").delete().eq("id", id);
    load();
  };

  // ---- Toggle item with phase auto-complete & XP ----
  const toggleItem = async (it: Item) => {
    if (!user) return;
    const next = !it.completed;
    setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, completed: next } : x));
    await sb.from("roadmap_items").update({ completed: next }).eq("id", it.id);

    // Check phase completion state
    const phaseItems = items.map((x) => x.id === it.id ? { ...x, completed: next } : x).filter((x) => x.phase_id === it.phase_id);
    const phase = phases.find((p) => p.id === it.phase_id);
    if (!phase || phaseItems.length === 0) return;
    const allDone = phaseItems.every((x) => x.completed);

    if (allDone && !phase.completed) {
      await sb.from("roadmap_phases").update({ completed: true }).eq("id", phase.id);
      await awardXp(user.id, 5);
      await checkAchievements(user.id);
      toast.success(`Fase "${phase.name}" concluída! +5 XP`, { description: "Continue evoluindo na sua trilha." });
      setPhases((arr) => arr.map((p) => p.id === phase.id ? { ...p, completed: true } : p));
    } else if (!allDone && phase.completed) {
      await sb.from("roadmap_phases").update({ completed: false }).eq("id", phase.id);
      await awardXp(user.id, -5);
      setPhases((arr) => arr.map((p) => p.id === phase.id ? { ...p, completed: false } : p));
    }
  };

  // ---- Drag & drop items within phase ----
  const onItemDragStart = (id: string) => setDragItem(id);
  const onItemDrop = async (targetId: string) => {
    if (!dragItem || dragItem === targetId) { setDragItem(null); return; }
    const src = items.find((i) => i.id === dragItem);
    const tgt = items.find((i) => i.id === targetId);
    if (!src || !tgt || src.phase_id !== tgt.phase_id) { setDragItem(null); return; }
    const list = items.filter((i) => i.phase_id === src.phase_id).sort((a, b) => a.sort_order - b.sort_order);
    const reordered = list.filter((i) => i.id !== src.id);
    const idx = reordered.findIndex((i) => i.id === tgt.id);
    reordered.splice(idx, 0, src);
    await Promise.all(reordered.map((i, n) => sb.from("roadmap_items").update({ sort_order: n }).eq("id", i.id)));
    setDragItem(null);
    load();
  };

  // ---- Drag & drop phases ----
  const onPhaseDrop = async (targetId: string) => {
    if (!dragPhase || dragPhase === targetId) { setDragPhase(null); return; }
    const reordered = activePhases.filter((p) => p.id !== dragPhase);
    const idx = reordered.findIndex((p) => p.id === targetId);
    const src = activePhases.find((p) => p.id === dragPhase)!;
    reordered.splice(idx, 0, src);
    await Promise.all(reordered.map((p, n) => sb.from("roadmap_phases").update({ sort_order: n }).eq("id", p.id)));
    setDragPhase(null);
    load();
  };

  // ============ Render ============
  if (!active) {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><MapIcon className="h-7 w-7 text-primary" /> Roadmaps</h1>
            <p className="text-sm text-muted-foreground mt-1">Trilhas inteligentes para acompanhar sua evolução.</p>
          </div>
          <div className="flex items-center gap-2">
            <DesktopOnlyImport onImported={load} />
            <Button onClick={openNewRoadmap} className="gap-2"><Plus className="h-4 w-4" /> Novo roadmap</Button>
          </div>
        </header>

        {roadmaps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
            <MapIcon className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-muted-foreground">Crie sua primeira trilha de evolução.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roadmaps.map((r) => {
              const total = items.filter((i) => i.roadmap_id === r.id).length;
              const done = items.filter((i) => i.roadmap_id === r.id && i.completed).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              const phaseCount = phases.filter((p) => p.roadmap_id === r.id).length;
              return (
                <button key={r.id} onClick={() => setActiveId(r.id)}
                  className="text-left rounded-2xl border border-border/50 glass p-5 hover:border-primary/60 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl grid place-items-center text-2xl"
                        style={{ background: `color-mix(in oklab, ${r.color ?? "var(--primary)"} 18%, transparent)`, boxShadow: `0 0 24px color-mix(in oklab, ${r.color ?? "var(--primary)"} 40%, transparent)` }}>
                        {r.icon ?? "🗺️"}
                      </div>
                      <div>
                        <div className="font-semibold leading-tight">{r.name}</div>
                        {r.category && <div className="text-[11px] text-muted-foreground mt-0.5">{r.category}</div>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><Pencil className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => editRoadmap(r)}><Pencil className="h-3.5 w-3.5 mr-2" /> Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteRoadmap(r.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{r.description}</p>}
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                    <span>{done}/{total} itens</span>
                    <span>{phaseCount} fases · {pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <RoadmapDialog open={rmOpen} onOpenChange={setRmOpen} form={rmForm} setForm={setRmForm} onSave={saveRoadmap} />
      </div>
    );
  }

  // ============ Active roadmap detail ============
  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => setActiveId(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="h-12 w-12 shrink-0 rounded-xl grid place-items-center text-2xl"
            style={{ background: `color-mix(in oklab, ${active.color ?? "var(--primary)"} 18%, transparent)`, boxShadow: `0 0 24px color-mix(in oklab, ${active.color ?? "var(--primary)"} 40%, transparent)` }}>
            {active.icon ?? "🗺️"}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{active.name}</h1>
            {active.description && <p className="text-sm text-muted-foreground line-clamp-1">{active.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => editRoadmap(active)} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Editar</Button>
          <Button size="sm" onClick={openNewPhase} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Nova fase</Button>
        </div>
      </header>

      {/* Progress overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Progresso" value={`${stats.pct}%`} accent />
        <Stat label="Concluídos" value={`${stats.done}`} />
        <Stat label="Restantes" value={`${stats.remaining}`} />
        <Stat label="Fase atual" value={stats.currentPhase?.name ?? "—"} small />
      </div>
      <div>
        <Progress value={stats.pct} className="h-2" />
      </div>

      {/* Phases */}
      <div className="space-y-3">
        {activePhases.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground text-sm">
            Adicione a primeira fase desta trilha.
          </div>
        )}
        {activePhases.map((p) => {
          const phaseItems = activeItems.filter((i) => i.phase_id === p.id).sort((a, b) => a.sort_order - b.sort_order);
          const pdone = phaseItems.filter((i) => i.completed).length;
          const ppct = phaseItems.length ? Math.round((pdone / phaseItems.length) * 100) : 0;
          const open = expanded[p.id] ?? true;
          return (
            <div key={p.id}
              draggable onDragStart={() => setDragPhase(p.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onPhaseDrop(p.id)}
              className={cn("rounded-2xl border border-border/50 glass overflow-hidden transition-all", p.completed && "border-emerald-500/40")}>
              <div className="flex items-center gap-2 p-4">
                <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                <button onClick={() => setExpanded((e) => ({ ...e, [p.id]: !open }))} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <span className={cn("font-semibold truncate", p.completed && "text-emerald-400")}>{p.name}</span>
                  {p.completed && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                </button>
                <span className="text-xs text-muted-foreground shrink-0">{pdone}/{phaseItems.length}</span>
                <div className="w-24 hidden sm:block"><Progress value={ppct} className="h-1.5" /></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => editPhase(p)}><Pencil className="h-3.5 w-3.5 mr-2" /> Renomear</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openNewItem(p.id)}><Plus className="h-3.5 w-3.5 mr-2" /> Adicionar item</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => deletePhase(p.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir fase</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {open && (
                <div className="border-t border-border/40 p-3 space-y-1.5">
                  {phaseItems.map((it) => (
                    <div key={it.id}
                      draggable onDragStart={() => onItemDragStart(it.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onItemDrop(it.id)}
                      className={cn(
                        "group flex items-start gap-3 rounded-xl p-3 border border-transparent hover:border-border/50 hover:bg-secondary/30 transition-colors",
                        it.completed && "opacity-60",
                      )}>
                      <button onClick={() => toggleItem(it)} className="mt-0.5 shrink-0">
                        {it.completed
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-sm font-medium leading-snug", it.completed && "line-through")}>{it.title}</div>
                        {it.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{it.description}</div>}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {it.tag && <Badge variant="outline" className="h-5 text-[10px] gap-1"><Tag className="h-2.5 w-2.5" />{it.tag}</Badge>}
                          {it.link && <a href={it.link} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"><LinkIcon className="h-3 w-3" /> link</a>}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editItem(it)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItem(it.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => openNewItem(p.id)} className="w-full justify-start gap-2 text-muted-foreground hover:text-primary">
                    <Plus className="h-3.5 w-3.5" /> Adicionar item
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <RoadmapDialog open={rmOpen} onOpenChange={setRmOpen} form={rmForm} setForm={setRmForm} onSave={saveRoadmap} />

      {/* Phase dialog */}
      <Dialog open={phaseOpen} onOpenChange={setPhaseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{phaseForm.id ? "Editar fase" : "Nova fase"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={phaseForm.name} onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })} placeholder="Ex: Fundamentos" autoFocus />
          </div>
          <DialogFooter><Button onClick={savePhase}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{itemForm.id ? "Editar item" : "Novo item"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Título</Label><Input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} autoFocus /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={2} value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tag</Label><Input value={itemForm.tag} onChange={(e) => setItemForm({ ...itemForm, tag: e.target.value })} placeholder="ex: vídeo" /></div>
              <div className="space-y-1.5"><Label>Link</Label><Input value={itemForm.link} onChange={(e) => setItemForm({ ...itemForm, link: e.target.value })} placeholder="https://..." /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveItem}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border/50 glass p-3", accent && "border-primary/40")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-bold mt-1", small ? "text-sm truncate" : "text-2xl", accent && "text-primary")}>{value}</div>
    </div>
  );
}

function RoadmapDialog({
  open, onOpenChange, form, setForm, onSave,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  form: { id: string | null; name: string; description: string; category: string; color: string; icon: string };
  setForm: (f: any) => void; onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form.id ? "Editar roadmap" : "Novo roadmap"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Roadmap UI Design" autoFocus /></div>
          <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" /></div>
          <div className="space-y-1.5"><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: estudos, carreira" /></div>
          <div className="space-y-1.5">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })}
                  className={cn("h-9 w-9 rounded-lg text-lg grid place-items-center border", form.icon === ic ? "border-primary bg-primary/10" : "border-border/50")}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={cn("h-8 w-8 rounded-full transition-transform", form.color === c && "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110")}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={onSave}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Desktop-only spreadsheet importer
// ============================================================
function DesktopOnlyImport({ onImported }: { onImported: () => void }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      "Nome do roadmap",
      "Descrição do roadmap",
      "Fase",
      "Ordem da fase",
      "Item",
      "Descrição do item",
      "Link",
      "Tag",
    ];
    const sample = [
      ["Aprender Inglês", "Trilha de 6 meses para fluência", "Básico", 1, "Aprender 100 palavras essenciais", "Foco em verbos comuns", "https://example.com", "vocabulário"],
      ["Aprender Inglês", "", "Básico", 1, "Praticar pronúncia", "", "", "fala"],
      ["Aprender Inglês", "", "Intermediário", 2, "Ler 1 artigo por dia", "", "", "leitura"],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    ws["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 24 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Roadmap");
    XLSX.writeFile(wb, "modelo-roadmap.xlsx");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
      if (!rows.length) { toast.error("Planilha vazia"); return; }

      // Group by roadmap name
      const byRoadmap = new Map<string, { description: string; phases: Map<string, { order: number; items: { title: string; description: string; link: string; tag: string }[] }> }>();
      for (const row of rows) {
        const rmName = String(row["Nome do roadmap"] ?? "").trim();
        if (!rmName) continue;
        const phaseName = String(row["Fase"] ?? "").trim() || "Geral";
        const itemTitle = String(row["Item"] ?? "").trim();
        if (!itemTitle) continue;
        if (!byRoadmap.has(rmName)) byRoadmap.set(rmName, { description: String(row["Descrição do roadmap"] ?? ""), phases: new Map() });
        const rm = byRoadmap.get(rmName)!;
        if (!rm.description && row["Descrição do roadmap"]) rm.description = String(row["Descrição do roadmap"]);
        if (!rm.phases.has(phaseName)) rm.phases.set(phaseName, { order: Number(row["Ordem da fase"] ?? rm.phases.size + 1) || rm.phases.size + 1, items: [] });
        rm.phases.get(phaseName)!.items.push({
          title: itemTitle,
          description: String(row["Descrição do item"] ?? ""),
          link: String(row["Link"] ?? ""),
          tag: String(row["Tag"] ?? ""),
        });
      }

      let created = 0;
      for (const [rmName, rm] of byRoadmap) {
        const { data: rmIns, error: rmErr } = await sb.from("roadmaps").insert({
          user_id: user.id, name: rmName, description: rm.description || null,
          color: COLORS[created % COLORS.length], icon: ICONS[created % ICONS.length], sort_order: created,
        }).select().single();
        if (rmErr || !rmIns) { toast.error(`Falha ao criar "${rmName}": ${rmErr?.message}`); continue; }

        const phases = [...rm.phases.entries()].sort((a, b) => a[1].order - b[1].order);
        for (let pIdx = 0; pIdx < phases.length; pIdx++) {
          const [pName, pData] = phases[pIdx];
          const { data: pIns, error: pErr } = await sb.from("roadmap_phases").insert({
            user_id: user.id, roadmap_id: rmIns.id, name: pName, sort_order: pIdx,
          }).select().single();
          if (pErr || !pIns) continue;
          const itemRows = pData.items.map((it, iIdx) => ({
            user_id: user.id, roadmap_id: rmIns.id, phase_id: pIns.id,
            title: it.title, description: it.description || null,
            link: it.link || null, tag: it.tag || null, sort_order: iIdx,
          }));
          if (itemRows.length) await sb.from("roadmap_items").insert(itemRows);
        }
        created++;
      }
      toast.success(`${created} roadmap${created !== 1 ? "s" : ""} importado${created !== 1 ? "s" : ""}`);
      onImported();
    } catch (err: any) {
      toast.error("Falha ao importar: " + (err?.message ?? "erro desconhecido"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hidden md:flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Baixar modelo
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" /> {busy ? "Importando…" : "Importar planilha"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Crie roadmaps massivos com mais rapidez, se preferir.</p>
    </div>
  );
}
