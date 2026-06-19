import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getNotifPrefs, notify, today } from "@/lib/sync-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isValidUsername,
  normalizeUsername,
  PENDING_USERNAME_KEY,
  USERNAME_RULE_MESSAGE,
} from "@/lib/username";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

function useNotifierLoop() {
  const { user } = useAuth();
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const tick = async () => {
      const prefs = getNotifPrefs();
      const now = new Date();
      const hour = now.getHours();
      const period = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "night";

      // Tasks: notify once at the start of each period for pending tasks of that period
      if (prefs.tasks) {
        const key = `tasks:${today()}:${period}`;
        if (!fired.current.has(key)) {
          const { data } = await supabase.from("tasks")
            .select("title,periods,period,daily_completed,times_per_day,status")
            .eq("user_id", user.id).eq("due_date", today()).eq("archived", false);
          const due = (data ?? []).filter((t: any) => {
            if (t.status === "done") return false;
            const ps: string[] = t.periods?.length ? t.periods : [t.period];
            return ps.includes(period);
          });
          if (due.length) {
            notify(`${due.length} tarefa(s) para a ${period === "morning" ? "manhã" : period === "afternoon" ? "tarde" : "noite"}`,
              due.slice(0, 3).map((t: any) => `• ${t.title}`).join("\n"));
            fired.current.add(key);
          }
        }
      }

      // Habits: notify once a day around 9h if any pending
      if (prefs.habits && hour >= 9 && hour < 22) {
        const key = `habits:${today()}`;
        if (!fired.current.has(key)) {
          const [h, l] = await Promise.all([
            supabase.from("habits").select("id,name").eq("user_id", user.id).eq("archived", false),
            supabase.from("habit_logs").select("habit_id").eq("user_id", user.id).eq("log_date", today()),
          ]);
          const doneIds = new Set((l.data ?? []).map((x: any) => x.habit_id));
          const pending = (h.data ?? []).filter((x: any) => !doneIds.has(x.id));
          if (pending.length) {
            notify(`${pending.length} hábito(s) ainda pendente(s) hoje`,
              pending.slice(0, 3).map((x: any) => `• ${x.name}`).join("\n"));
            fired.current.add(key);
          }
        }
      }

      // Events: notify 10 min before start
      if (prefs.events) {
        const soon = new Date(now.getTime() + 10 * 60_000);
        const { data } = await supabase.from("events")
          .select("id,title,starts_at")
          .eq("user_id", user.id)
          .gte("starts_at", now.toISOString())
          .lte("starts_at", soon.toISOString());
        (data ?? []).forEach((e: any) => {
          const key = `event:${e.id}:${e.starts_at}`;
          if (fired.current.has(key)) return;
          notify(`Em breve: ${e.title}`, `Começa às ${new Date(e.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
          fired.current.add(key);
        });
      }

      // Hydration reminders: profile.hydration_reminders { enabled, times: HH:mm[] }
      const { data: prof } = await supabase.from("profiles").select("hydration_reminders").eq("id", user.id).maybeSingle();
      const hr: any = prof?.hydration_reminders;
      if (hr?.enabled && Array.isArray(hr.times)) {
        const cur = `${String(hour).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        for (const t of hr.times) {
          if (t === cur) {
            const key = `hydra:${today()}:${t}`;
            if (!fired.current.has(key)) {
              notify("💧 Hora de beber água", "Mantenha sua hidratação em dia.");
              fired.current.add(key);
            }
          }
        }
      }
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [user?.id]);
}

function AppLayout() {
  useNotifierLoop();
  const { user, loading } = useAuth();
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (user) {
      setSessionUser(null);
      setAuthError("");
      return;
    }

    let alive = true;
    const timeout = window.setTimeout(() => {
      if (!alive) return;
      setAuthError("A sessão demorou demais para carregar.");
    }, 8000);

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      window.clearTimeout(timeout);
      setSessionUser((data.session?.user as User | undefined) ?? null);
      setAuthError(data.session ? "" : "Sua sessão não foi encontrada.");
    }).catch((error) => {
      if (!alive) return;
      window.clearTimeout(timeout);
      setAuthError(error.message ?? "Não foi possível validar sua sessão.");
    });

    return () => {
      alive = false;
      window.clearTimeout(timeout);
    };
  }, [user?.id]);

  const activeUser = user ?? sessionUser;

  if (authError && !activeUser) {
    return (
      <AppProblem
        title="Sessão não carregou"
        message={authError}
        actionLabel="Voltar para login"
        onAction={async () => {
          await supabase.auth.signOut();
          window.location.href = "/login";
        }}
      />
    );
  }

  if (!activeUser) {
    return <AppLoading message={loading ? "Carregando sua conta..." : "Validando sessão..."} />;
  }

  return (
    <RequireUsername user={activeUser}>
      <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block"><AppSidebar /></div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border/60 px-4 glass sticky top-0 z-30 safe-pt">
            <div className="hidden md:block"><SidebarTrigger /></div>
            <span className="text-sm text-muted-foreground">Sync · Workspace</span>
          </header>
          <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
            <Outlet />
          </main>
        </div>
        <MobileBottomNav />
      </div>
      </SidebarProvider>
    </RequireUsername>
  );
}

function RequireUsername({
  children,
  user,
}: {
  children: ReactNode;
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
}) {
  const [checking, setChecking] = useState(true);
  const [hasUsername, setHasUsername] = useState(false);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setChecking(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        setLoadError(error.message);
        setChecking(false);
        return;
      }

      const currentUsername = data?.username ?? "";
      const pendingUsername =
        typeof window !== "undefined"
          ? window.localStorage.getItem(PENDING_USERNAME_KEY)
          : "";

      setHasUsername(Boolean(currentUsername));
      setUsername(currentUsername || normalizeUsername(pendingUsername ?? ""));
      setChecking(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, [user.id]);

  const saveUsername = async () => {
    const normalized = normalizeUsername(username);

    if (!isValidUsername(normalized)) {
      toast.error(USERNAME_RULE_MESSAGE);
      return;
    }

    setSaving(true);

    const { data: existing, error: lookupError } = await supabase.functions.invoke(
      "username-lookup",
      {
        body: { username: normalized },
      }
    );

    if (lookupError) {
      setSaving(false);
      toast.error(lookupError.message);
      return;
    }

    if (existing?.email && existing.email !== user.email) {
      setSaving(false);
      toast.error("Esse user já está em uso. Escolha outro.");
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      username: normalized,
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PENDING_USERNAME_KEY);
    }

    setHasUsername(true);
    toast.success("User salvo");
  };

  if (checking) return <AppLoading message="Carregando perfil..." />;

  if (loadError) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="w-full max-w-md glass rounded-3xl p-8 shadow-elegant">
          <h1 className="text-2xl font-bold">Não foi possível carregar o perfil</h1>
          <p className="text-sm text-muted-foreground mt-2">{loadError}</p>
          <Button className="mt-6 w-full" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (hasUsername) return <>{children}</>;

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-md glass rounded-3xl p-8 shadow-elegant">
        <h1 className="text-2xl font-bold">Escolha seu user</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ele será usado no seu perfil e também para entrar com user e senha.
        </p>

        <div className="space-y-4 mt-6">
          <div>
            <Label>User</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              placeholder="seu_user"
              maxLength={20}
              disabled={saving}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {USERNAME_RULE_MESSAGE}
            </p>
          </div>

          <Button onClick={saveUsername} className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppLoading({ message }: { message: string }) {
  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-elegant animate-pulse" />
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
