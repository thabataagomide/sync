import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, CheckSquare, Repeat, Calendar, Timer, StickyNote, Sparkles, User, LogOut, Zap, Settings, Droplets, Sun, Wind, Palette, KanbanSquare, BookOpen, Plus, Map } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useModules, MODULE_META, type ModuleKey } from "@/lib/modules";

type Item = { title: string; url: string; icon: any; module?: ModuleKey };

const allItems: Item[] = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
  { title: "Daily Sync", url: "/app/daily", icon: Sun },
  { title: "Tarefas", url: "/app/tasks", icon: CheckSquare },
  { title: "TaskFlow", url: "/app/taskflow", icon: KanbanSquare, module: "taskflow" },
  { title: "Roadmaps", url: "/app/roadmaps", icon: Map, module: "roadmaps" },
  { title: "Hábitos", url: "/app/habits", icon: Repeat },
  { title: "Rotina", url: "/app/rituals", icon: Sparkles },
  { title: "Calendário", url: "/app/calendar", icon: Calendar },
  { title: "Deep Focus", url: "/app/focus", icon: Wind, module: "focus" },
  { title: "Pomodoro", url: "/app/pomodoro", icon: Timer },
  { title: "Hidratação", url: "/app/hydration", icon: Droplets, module: "hydration" },
  { title: "Notas", url: "/app/notes", icon: StickyNote, module: "notes" },
  { title: "Biblioteca", url: "/app/library", icon: BookOpen, module: "library" },
  { title: "Insights", url: "/app/insights", icon: Sparkles, module: "insights" },
  { title: "Aparência", url: "/app/appearance", icon: Palette },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { modules, setModule } = useModules();

  const items = allItems.filter((i) => !i.module || modules[i.module]);
  const isActive = (u: string) => u === "/app" ? path === "/app" : path.startsWith(u);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Até logo!");
    navigate({ to: "/login" });
  };

  const moduleKeys = Object.keys(MODULE_META) as ModuleKey[];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 py-5">
        <Link to="/app" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center glow">
            <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          {!collapsed && <span className="font-bold text-lg tracking-tight">Sync</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuLabel className="sr-only">Módulos</DropdownMenuLabel>
                  <DropdownMenuTriggerWrap>
                    <SidebarMenuButton tooltip="Adicionar módulos" className="text-muted-foreground hover:text-primary">
                      <Plus className="h-4 w-4" />
                      <span>Módulos</span>
                    </SidebarMenuButton>
                  </DropdownMenuTriggerWrap>
                  <DropdownMenuContent side="right" align="start" className="w-64">
                    <DropdownMenuLabel>Ativar módulos</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {moduleKeys.map((k) => (
                      <DropdownMenuCheckboxItem
                        key={k}
                        checked={!!modules[k]}
                        onCheckedChange={(v) => setModule(k, !!v)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <span className="mr-2">{MODULE_META[k].emoji}</span>
                        <div className="flex-1">
                          <div className="text-sm">{MODULE_META[k].label}</div>
                          <div className="text-[10px] text-muted-foreground">{MODULE_META[k].desc}</div>
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-2 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Configurações">
              <Link to="/app/settings"><Settings className="h-4 w-4" /> <span>Configurações</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Perfil">
              <Link to="/app/profile"><User className="h-4 w-4" /> <span>Perfil</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} tooltip="Sair">
              <LogOut className="h-4 w-4" /> <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Helper: DropdownMenuTrigger asChild proxy (avoid extra import line)
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
function DropdownMenuTriggerWrap({ children }: { children: React.ReactNode }) {
  return <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>;
}
