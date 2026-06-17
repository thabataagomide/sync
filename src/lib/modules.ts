import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type ModuleKey =
  | "hydration"
  | "notes"
  | "rituals"
  | "library"
  | "taskflow"
  | "roadmaps"
  | "insights"
  | "focus";

export const MODULE_META: Record<
  ModuleKey,
  { label: string; desc: string; emoji: string }
> = {
  taskflow: { label: "TaskFlow", desc: "Quadros Kanban estilo Trello", emoji: "🗂️" },
  roadmaps: { label: "Roadmaps", desc: "Trilhas de evolução por fases", emoji: "🗺️" },
  insights: { label: "Insights", desc: "Análises e relatórios da sua jornada", emoji: "📊" },
  focus: { label: "Deep Focus", desc: "Sessões longas de concentração", emoji: "🌬️" },
  library: { label: "Biblioteca", desc: "Estante de livros com avaliação", emoji: "📚" },
  hydration: { label: "Hidratação", desc: "Acompanhe sua ingestão de água", emoji: "💧" },
  notes: { label: "Notas", desc: "Notas rápidas e ideias soltas", emoji: "📝" },
  rituals: { label: "Rotina", desc: "Rotinas diárias e executáveis", emoji: "✨" },
};

const DEFAULTS: Record<ModuleKey, boolean> = {
  taskflow: true,
  roadmaps: false,
  insights: false,
  focus: false,
  library: false,
  hydration: false,
  notes: false,
  rituals: true,
};

const STORAGE_KEY = "sync.modules.enabled";
const EVT = "sync:modules-changed";

function normalizeModules(value: unknown): Record<ModuleKey, boolean> {
  if (!value || typeof value !== "object") return DEFAULTS;

  return {
    ...DEFAULTS,
    ...(value as Partial<Record<ModuleKey, boolean>>),
  };
}

function getStoredModules(): Record<ModuleKey, boolean> {
  if (typeof window === "undefined") return DEFAULTS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;

    return normalizeModules(JSON.parse(raw));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return DEFAULTS;
  }
}

function saveStoredModules(modules: Record<ModuleKey, boolean>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
}

export function useModules() {
  const { user } = useAuth();
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(() =>
    getStoredModules()
  );
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const localModules = getStoredModules();

    setModules(localModules);
    setLoaded(true);

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("modules_enabled")
      .eq("id", user.id)
      .maybeSingle();

    const dbModules = normalizeModules((data as any)?.modules_enabled);

    /**
     * Regra:
     * localStorage manda no modo local.
     * Assim, o menu e as telas não voltam para o padrão.
     */
    const next = normalizeModules({
      ...dbModules,
      ...localModules,
    });

    setModules(next);
    saveStoredModules(next);

    await supabase
      .from("profiles")
      .update({ modules_enabled: next } as any)
      .eq("id", user.id);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const fn = () => {
      setModules(getStoredModules());
    };

    window.addEventListener(EVT, fn);
    window.addEventListener("storage", fn);

    return () => {
      window.removeEventListener(EVT, fn);
      window.removeEventListener("storage", fn);
    };
  }, []);

  const setModule = async (k: ModuleKey, v: boolean) => {
    const next = {
      ...modules,
      [k]: v,
    };

    setModules(next);
    saveStoredModules(next);

    if (user) {
      await supabase
        .from("profiles")
        .update({ modules_enabled: next } as any)
        .eq("id", user.id);
    }

    window.dispatchEvent(new Event(EVT));
  };

  return { modules, setModule, loaded };
}