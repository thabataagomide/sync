import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pin, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notes")({ component: NotesPage });

function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notes").select("*").eq("user_id", user.id).eq("archived", false).order("pinned", { ascending: false }).order("updated_at", { ascending: false });
    setNotes(data ?? []);
  };
  useEffect(() => { load(); }, [user?.id]);

  const create = async () => {
    if (!user) return;
    const { data } = await supabase.from("notes").insert({ user_id: user.id, title: "Nova nota", content: "" }).select().single();
    if (data) { setActive(data); load(); }
  };

  const save = async (n: any) => {
    await supabase.from("notes").update({ title: n.title, content: n.content }).eq("id", n.id);
    load();
  };
  const togglePin = async (n: any) => { await supabase.from("notes").update({ pinned: !n.pinned }).eq("id", n.id); load(); };
  const remove = async (id: string) => { await supabase.from("notes").update({ archived: true }).eq("id", id); if (active?.id === id) setActive(null); load(); toast.success("Nota arquivada"); };

  const filtered = notes.filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5 h-[calc(100vh-160px)]">
      <div className="glass rounded-2xl p-3 flex flex-col">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="icon" onClick={create}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.map(n => (
            <button key={n.id} onClick={() => setActive(n)} className={`w-full text-left rounded-lg px-3 py-2 transition-smooth ${active?.id === n.id ? "bg-primary/15" : "hover:bg-secondary/60"}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm truncate">{n.title}</div>
                {n.pinned && <Pin className="h-3 w-3 text-primary" />}
              </div>
              <div className="text-xs text-muted-foreground truncate">{n.content?.slice(0, 60) || "Sem conteúdo"}</div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-xs text-center text-muted-foreground py-8">Nenhuma nota</p>}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 flex flex-col">
        {active ? (
          <>
            <div className="flex justify-between items-center mb-4 gap-2">
              <Input className="text-xl font-bold border-0 bg-transparent focus-visible:ring-0 px-0"
                value={active.title}
                onChange={e => setActive({ ...active, title: e.target.value })}
                onBlur={() => save(active)} />
              <Button variant="ghost" size="icon" onClick={() => togglePin(active)}><Pin className={`h-4 w-4 ${active.pinned ? "text-primary" : ""}`} /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(active.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Textarea className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 px-0 text-base"
              placeholder="Escreva..."
              value={active.content ?? ""}
              onChange={e => setActive({ ...active, content: e.target.value })}
              onBlur={() => save(active)} />
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-muted-foreground">Selecione ou crie uma nota</div>
        )}
      </div>
    </div>
  );
}
