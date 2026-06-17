import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, KanbanSquare, Calendar as CalendarIcon, Tag, GripVertical, Trash2, Pencil, FolderPlus, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/taskflow")({ component: TaskFlowPage });

const COLUMNS = [
  { id: "todo", label: "A Fazer", dot: "bg-slate-400", color: "from-slate-500/15 to-transparent" },
  { id: "doing", label: "Fazendo", dot: "bg-primary", color: "from-primary/15 to-transparent" },
  { id: "pending", label: "Pendente", dot: "bg-amber-400", color: "from-amber-500/15 to-transparent" },
  { id: "done", label: "Feito", dot: "bg-emerald-400", color: "from-emerald-500/15 to-transparent" },
] as const;

const PRIORITY_CHIP: Record<string, string> = {
  low: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  high: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const BOARD_COLORS = ["#2dd4a8", "#3b82f6", "#a78bfa", "#f59e0b", "#ef4444", "#10b981"];

const emptyCard = () => ({
  id: null as string | null,
  title: "",
  description: "",
  priority: "medium",
  tagsText: "",
  due_date: "",
  column_key: "todo",
});

function TaskFlowPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [cards, setCards] = useState<any[]>([]);

  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardColor, setNewBoardColor] = useState(BOARD_COLORS[0]);

  const [cardOpen, setCardOpen] = useState(false);
  const [form, setForm] = useState(emptyCard());
  const [dragId, setDragId] = useState<string | null>(null);

  const loadBoards = async () => {
    if (!user) return;
    const { data } = await supabase.from("taskflow_boards").select("*").eq("user_id", user.id).order("position");
    setBoards(data ?? []);
    if (!activeBoard && data?.length) setActiveBoard(data[0].id);
  };

  const loadCards = async () => {
    if (!user || !activeBoard) { setCards([]); return; }
    const { data } = await supabase.from("taskflow_cards").select("*").eq("user_id", user.id).eq("board_id", activeBoard).order("position");
    setCards(data ?? []);
  };

  useEffect(() => { loadBoards(); }, [user?.id]);
  useEffect(() => { loadCards(); }, [activeBoard, user?.id]);

  const createBoard = async () => {
    if (!user || !newBoardName.trim()) return;
    const { data, error } = await supabase.from("taskflow_boards").insert({
      user_id: user.id, name: newBoardName.trim(), color: newBoardColor, position: boards.length,
    }).select().single();
    if (error) return toast.error(error.message);
    setNewBoardName(""); setNewBoardOpen(false); await loadBoards();
    setActiveBoard(data!.id);
    toast.success("Quadro criado");
  };

  const removeBoard = async (b: any) => {
    if (!confirm(`Excluir quadro "${b.name}" e todos os cards?`)) return;
    await supabase.from("taskflow_boards").delete().eq("id", b.id);
    setActiveBoard(null);
    await loadBoards();
  };

  const renameBoard = async (b: any) => {
    const name = prompt("Novo nome do quadro:", b.name);
    if (!name?.trim()) return;
    await supabase.from("taskflow_boards").update({ name: name.trim() }).eq("id", b.id);
    loadBoards();
  };

  const openCard = (col?: string) => {
    setForm({ ...emptyCard(), column_key: col ?? "todo" });
    setCardOpen(true);
  };

  const editCard = (c: any) => {
    setForm({
      id: c.id,
      title: c.title,
      description: c.description ?? "",
      priority: c.priority ?? "medium",
      tagsText: (c.tags ?? []).join(", "),
      due_date: c.due_date ?? "",
      column_key: c.column_key,
    });
    setCardOpen(true);
  };

  const saveCard = async () => {
    if (!user || !activeBoard || !form.title.trim()) return;
    const tags = form.tagsText.split(",").map((s) => s.trim()).filter(Boolean);
    const payload: any = {
      user_id: user.id,
      board_id: activeBoard,
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority,
      tags,
      due_date: form.due_date || null,
      column_key: form.column_key,
    };
    const { error } = form.id
      ? await supabase.from("taskflow_cards").update(payload).eq("id", form.id)
      : await supabase.from("taskflow_cards").insert(payload);
    if (error) return toast.error(error.message);
    setCardOpen(false); setForm(emptyCard()); loadCards();
  };

  const removeCard = async (id: string) => {
    if (!confirm("Excluir este card?")) return;
    await supabase.from("taskflow_cards").delete().eq("id", id);
    loadCards();
  };

  const moveTo = async (id: string, col: string) => {
    const c = cards.find((x) => x.id === id);
    if (!c || c.column_key === col) return;
    setCards((cs) => cs.map((x) => (x.id === id ? { ...x, column_key: col } : x)));
    await supabase.from("taskflow_cards").update({ column_key: col }).eq("id", id);
  };

  const byCol = useMemo(() => {
    const map: Record<string, any[]> = { todo: [], doing: [], pending: [], done: [] };
    for (const c of cards) (map[c.column_key] ?? map.todo).push(c);
    return map;
  }, [cards]);

  const board = boards.find((b) => b.id === activeBoard);

  if (boards.length === 0) {
    return (
      <div className="max-w-xl glass rounded-2xl p-8 text-center space-y-4 mx-auto mt-12">
        <KanbanSquare className="h-12 w-12 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">TaskFlow</h1>
        <p className="text-muted-foreground text-sm">
          Crie quadros visuais estilo Trello para organizar projetos, trabalho, faculdade — tudo separado das suas tarefas e calendário.
        </p>
        <Button onClick={() => setNewBoardOpen(true)}><FolderPlus className="h-4 w-4 mr-1" />Criar primeiro quadro</Button>
        <NewBoardDialog
          open={newBoardOpen} setOpen={setNewBoardOpen}
          name={newBoardName} setName={setNewBoardName}
          color={newBoardColor} setColor={setNewBoardColor}
          onCreate={createBoard}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl grid place-items-center" style={{ background: `${board?.color ?? "#2dd4a8"}25` }}>
            <KanbanSquare className="h-5 w-5" style={{ color: board?.color }} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 font-bold text-2xl md:text-3xl hover:opacity-80">
                {board?.name ?? "—"} <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {boards.map((b) => (
                <DropdownMenuItem key={b.id} onSelect={() => setActiveBoard(b.id)} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                  <span className="flex-1">{b.name}</span>
                  {b.id === activeBoard && <span className="text-xs text-primary">●</span>}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setNewBoardOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo quadro</DropdownMenuItem>
              {board && (
                <>
                  <DropdownMenuItem onSelect={() => renameBoard(board)}><Pencil className="h-4 w-4 mr-2" />Renomear</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => removeBoard(board)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir quadro</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button onClick={() => openCard()}><Plus className="h-4 w-4 mr-1" />Novo card</Button>
      </div>

      <NewBoardDialog
        open={newBoardOpen} setOpen={setNewBoardOpen}
        name={newBoardName} setName={setNewBoardName}
        color={newBoardColor} setColor={setNewBoardColor}
        onCreate={createBoard}
      />

      <Dialog open={cardOpen} onOpenChange={setCardOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar card" : "Novo card"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Coluna</Label>
                <Select value={form.column_key} onValueChange={(v) => setForm({ ...form, column_key: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COLUMNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
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
            <div><Label>Prazo (opcional)</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><Label>Tags</Label><Input placeholder="design, urgente" value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} /></div>
            <Button onClick={saveCard} className="w-full">{form.id ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId) moveTo(dragId, col.id); setDragId(null); }}
            className={cn("rounded-2xl border border-border/40 bg-gradient-to-b p-3 min-h-[60vh]", col.color)}
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                <span className="font-semibold text-sm">{col.label}</span>
                <span className="text-xs text-muted-foreground">{byCol[col.id]?.length ?? 0}</span>
              </div>
              <button onClick={() => openCard(col.id)} className="text-muted-foreground hover:text-primary p-1"><Plus className="h-4 w-4" /></button>
            </div>

            <div className="space-y-2">
              {(byCol[col.id] ?? []).map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => editCard(c)}
                  className="group rounded-xl bg-card/80 border border-border/40 p-3 hover:border-primary/40 transition-smooth cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-snug">{c.title}</div>
                      {c.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</div>}
                      <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", PRIORITY_CHIP[c.priority] ?? PRIORITY_CHIP.medium)}>
                          {c.priority}
                        </Badge>
                        {c.due_date && (
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />{c.due_date}
                          </span>
                        )}
                        {(c.tags ?? []).slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCard(c.id); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="md:hidden flex flex-wrap gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                    {COLUMNS.filter((x) => x.id !== col.id).map((x) => (
                      <button key={x.id} onClick={() => moveTo(c.id, x.id)} className="text-[10px] px-2 py-0.5 rounded-full border border-border/40 text-muted-foreground">
                        → {x.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {(byCol[col.id] ?? []).length === 0 && (
                <button onClick={() => openCard(col.id)} className="w-full text-center text-xs text-muted-foreground/60 py-8 hover:text-primary">
                  + Adicionar card
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewBoardDialog({ open, setOpen, name, setName, color, setColor, onCreate }: any) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo quadro</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Trabalho, Faculdade, Projetos..." /></div>
          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 mt-1">
              {BOARD_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={cn("h-8 w-8 rounded-full transition-transform", color === c && "ring-2 ring-offset-2 ring-offset-background scale-110")} style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }} />
              ))}
            </div>
          </div>
          <Button onClick={onCreate} className="w-full">Criar quadro</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
