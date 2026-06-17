import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sun, CheckSquare, Repeat, Wind, MoreHorizontal,
  Calendar, Timer, Droplets, StickyNote, Sparkles, Palette, User, Settings, LogOut, KanbanSquare, BookOpen, Plus, Map,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useModules, MODULE_META, type ModuleKey } from "@/lib/modules";

const primary = [
  { title: "Hoje", url: "/app/daily", icon: Sun },
  { title: "Tarefas", url: "/app/tasks", icon: CheckSquare },
  { title: "Hábitos", url: "/app/habits", icon: Repeat },
  { title: "Rotina", url: "/app/rituals", icon: Sparkles },
];

type Item = { title: string; url: string; icon: any; module?: ModuleKey };

const allMore: Item[] = [
  { title: "Dashboard", url: "/app", icon: Sun },
  { title: "TaskFlow", url: "/app/taskflow", icon: KanbanSquare, module: "taskflow" },
  { title: "Roadmaps", url: "/app/roadmaps", icon: Map, module: "roadmaps" },
  { title: "Pomodoro", url: "/app/pomodoro", icon: Timer },
  { title: "Calendário", url: "/app/calendar", icon: Calendar },
  { title: "Deep Focus", url: "/app/focus", icon: Wind, module: "focus" },
  { title: "Hidratação", url: "/app/hydration", icon: Droplets, module: "hydration" },
  { title: "Notas", url: "/app/notes", icon: StickyNote, module: "notes" },
  { title: "Biblioteca", url: "/app/library", icon: BookOpen, module: "library" },
  { title: "Insights", url: "/app/insights", icon: Sparkles, module: "insights" },
  { title: "Aparência", url: "/app/appearance", icon: Palette },
  { title: "Perfil", url: "/app/profile", icon: User },
  { title: "Configurações", url: "/app/settings", icon: Settings },
];

export function MobileBottomNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { modules, setModule } = useModules();

  const more = allMore.filter((i) => !i.module || modules[i.module]);
  const isActive = (u: string) => u === "/app" ? path === "/app" : path.startsWith(u);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Até logo!");
    navigate({ to: "/login" });
  };

  const moduleKeys = Object.keys(MODULE_META) as ModuleKey[];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5 h-16">
        {primary.map((item) => {
          const active = isActive(item.url);
          return (
            <Link key={item.url} to={item.url}
              className={cn("flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-smooth",
                active ? "text-primary" : "text-muted-foreground")}>
              <item.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_currentColor]")} />
              <span>{item.title}</span>
            </Link>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground active:text-primary">
              <MoreHorizontal className="h-5 w-5" />
              <span>Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <SheetHeader><SheetTitle>Mais</SheetTitle></SheetHeader>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {more.map((item) => (
                <Link key={item.url} to={item.url} onClick={() => setOpen(false)}
                  className={cn("flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs glass border border-border/40",
                    isActive(item.url) && "border-primary text-primary")}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-center">{item.title}</span>
                </Link>
              ))}
              <button onClick={() => { setOpen(false); logout(); }}
                className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs glass border border-border/40 text-destructive">
                <LogOut className="h-5 w-5" />
                <span>Sair</span>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                <Plus className="h-3.5 w-3.5" /> Módulos opcionais
              </div>
              <div className="space-y-2">
                {moduleKeys.map((k) => (
                  <label key={k} className="flex items-center gap-3 p-2 rounded-lg border border-border/40">
                    <span className="text-xl">{MODULE_META[k].emoji}</span>
                    <div className="flex-1">
                      <div className="text-sm">{MODULE_META[k].label}</div>
                      <div className="text-[10px] text-muted-foreground">{MODULE_META[k].desc}</div>
                    </div>
                    <input type="checkbox" checked={!!modules[k]} onChange={(e) => setModule(k, e.target.checked)} className="h-4 w-4" />
                  </label>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
