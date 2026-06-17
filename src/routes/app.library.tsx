import { createFileRoute } from "@tanstack/react-router";
import { useModules } from "@/lib/modules";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, BookOpen, Star, Trash2, Pencil, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/library")({
  component: LibraryPage,
});

const STATUSES = [
  { value: "all", label: "Todos" },
  { value: "want", label: "Quero Ler" },
  { value: "reading", label: "Lendo" },
  { value: "read", label: "Lido" },
];

const emptyForm = () => ({
  id: null as string | null,
  title: "",
  author: "",
  cover_url: "",
  status: "want",
  rating: 0,
});

function LibraryPage() {
  const { user } = useAuth();
  const { modules, loaded } = useModules();

  const enabled = !loaded ? null : !!modules.library;

  const [books, setBooks] = useState<any[]>([]);
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    setBooks(data ?? []);
  };

  useEffect(() => {
    if (enabled) load();
  }, [enabled, user?.id]);

  const save = async () => {
    if (!user) return;

    if (!form.title.trim()) {
      toast.error("Informe o título do livro.");
      return;
    }

    const payload: any = {
      user_id: user.id,
      title: form.title.trim(),
      author: form.author || null,
      cover_url: form.cover_url || null,
      status: form.status || "want",
      rating: form.rating || null,
    };

    const { error } = form.id
      ? await supabase.from("books").update(payload).eq("id", form.id)
      : await supabase.from("books").insert(payload);

    if (error) {
      toast.error(error.message);
      return;
    }

    setOpen(false);
    setForm(emptyForm());
    load();

    toast.success(form.id ? "Livro atualizado" : "Livro adicionado");
  };

  const uploadCover = async (file: File) => {
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/books-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("habit-icons")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from("habit-icons")
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    if (signErr || !signed) {
      toast.error(signErr?.message ?? "Falha ao gerar URL");
      return;
    }

    setForm((current) => ({
      ...current,
      cover_url: signed.signedUrl,
    }));

    toast.success("Capa enviada");
  };

  const remove = async (book: any) => {
    if (!confirm(`Excluir "${book.title}"?`)) return;

    const { error } = await supabase.from("books").delete().eq("id", book.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    load();
  };

  const setStatus = async (book: any, status: string) => {
    const { error } = await supabase
      .from("books")
      .update({ status })
      .eq("id", book.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    load();
  };

  const setRating = async (book: any, rating: number) => {
    const { error } = await supabase
      .from("books")
      .update({ rating })
      .eq("id", book.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    load();
  };

  const filtered = useMemo(() => {
    return tab === "all" ? books : books.filter((book) => book.status === tab);
  }, [books, tab]);

  if (enabled === null) {
    return <div className="text-muted-foreground">Carregando…</div>;
  }

  if (!enabled) {
    return (
      <div className="max-w-xl glass rounded-2xl p-8 text-center space-y-3">
        <BookOpen className="h-10 w-10 text-primary mx-auto" />

        <h1 className="text-2xl font-bold">Biblioteca desativada</h1>

        <p className="text-sm text-muted-foreground">
          Ative a Biblioteca pelo botão <strong>+ Módulos</strong> no menu lateral.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Biblioteca
          </h1>

          <p className="text-muted-foreground text-sm">
            Sua estante pessoal de leitura.
          </p>
        </div>

        <Button
          onClick={() => {
            setForm(emptyForm());
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo livro
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {STATUSES.map((status) => (
            <TabsTrigger key={status.value} value={status.value}>
              {status.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setForm(emptyForm());
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar livro" : "Novo livro"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </div>

            <div>
              <Label>Autor</Label>
              <Input
                value={form.author}
                onChange={(event) =>
                  setForm({ ...form, author: event.target.value })
                }
              />
            </div>

            <div>
              <Label>Capa</Label>

              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-24 w-16 rounded-lg bg-secondary grid place-items-center overflow-hidden"
                >
                  {form.cover_url ? (
                    <img
                      src={form.cover_url}
                      alt="capa"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                <Input
                  placeholder="ou cole uma URL"
                  value={form.cover_url}
                  onChange={(event) =>
                    setForm({ ...form, cover_url: event.target.value })
                  }
                />

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadCover(file);
                  }}
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>

              <Select
                value={form.status}
                onValueChange={(value: string) =>
                  setForm({ ...form, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="want">Quero Ler</SelectItem>
                  <SelectItem value="reading">Lendo</SelectItem>
                  <SelectItem value="read">Lido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Avaliação</Label>

              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        rating: number === form.rating ? 0 : number,
                      })
                    }
                  >
                    <Star
                      className={cn(
                        "h-6 w-6",
                        number <= form.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={save} className="w-full">
              {form.id ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((book) => (
          <div key={book.id} className="group glass rounded-2xl p-3 space-y-2">
            <div className="aspect-[2/3] rounded-lg bg-secondary overflow-hidden grid place-items-center">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div>
              <div className="font-medium text-sm line-clamp-2 leading-snug">
                {book.title}
              </div>

              {book.author && (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {book.author}
                </div>
              )}
            </div>

            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((number) => (
                <button
                  key={number}
                  onClick={() =>
                    setRating(book, number === book.rating ? 0 : number)
                  }
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      number <= (book.rating ?? 0)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
            </div>

            <Select
              value={book.status ?? "want"}
              onValueChange={(value: string) => setStatus(book, value)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="want">Quero Ler</SelectItem>
                <SelectItem value="reading">Lendo</SelectItem>
                <SelectItem value="read">Lido</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => {
                  setForm({
                    id: book.id,
                    title: book.title,
                    author: book.author ?? "",
                    cover_url: book.cover_url ?? "",
                    status: book.status ?? "want",
                    rating: book.rating ?? 0,
                  });
                  setOpen(true);
                }}
                className="text-muted-foreground hover:text-primary p-1"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => remove(book)}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground col-span-full py-16">
            Sua estante está vazia 📚
          </p>
        )}
      </div>
    </div>
  );
}