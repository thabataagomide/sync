import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  applyTheme,
  getStoredTheme,
  normalizeTheme,
  type ThemeId,
  DEFAULT_THEME,
} from "@/lib/themes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type Ctx = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
};

const ThemeCtx = createContext<Ctx>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [theme, setThemeState] = useState<ThemeId>(() => getStoredTheme());

  useEffect(() => {
    const localTheme = getStoredTheme();
    setThemeState(localTheme);
    applyTheme(localTheme);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function syncThemeWithProfile() {
      if (!user?.id) return;

      const localTheme = getStoredTheme();

      setThemeState(localTheme);
      applyTheme(localTheme);

      const { data } = await supabase
        .from("profiles")
        .select("theme")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const dbTheme = normalizeTheme((data?.theme as string | null) ?? null);

      if (dbTheme !== localTheme) {
        await supabase
          .from("profiles")
          .update({ theme: localTheme })
          .eq("id", user.id);
      }
    }

    syncThemeWithProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setTheme = (t: ThemeId) => {
    const normalizedTheme = normalizeTheme(t);

    setThemeState(normalizedTheme);
    applyTheme(normalizedTheme);

    if (user?.id) {
      supabase
        .from("profiles")
        .update({ theme: normalizedTheme })
        .eq("id", user.id);
    }
  };

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);