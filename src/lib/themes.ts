export type ThemeId =
  | "midnight-sync"
  | "crimson-focus"
  | "deep-ocean"
  | "violet-mind"
  | "arctic-flow"
  | "emerald-night"
  | "golden-focus"
  | "rose-night";

export type ThemeDef = {
  id: ThemeId;
  name: string;
  feel: string;
  swatch: string;
  glow: string;
};

export const THEMES: ThemeDef[] = [
  { id: "midnight-sync", name: "Sync Green", feel: "foco · equilíbrio · tecnologia", swatch: "#2dd4a8", glow: "0 0 40px #2dd4a866" },
  { id: "crimson-focus", name: "Crimson Focus", feel: "intensidade · concentração · poder", swatch: "#c2424a", glow: "0 0 40px #c2424a55" },
  { id: "deep-ocean", name: "Deep Ocean", feel: "calma · clareza · produtividade", swatch: "#3b82f6", glow: "0 0 40px #3b82f655" },
  { id: "violet-mind", name: "Violet Mind", feel: "criatividade · inteligência · futurismo", swatch: "#a78bfa", glow: "0 0 40px #a78bfa55" },
  { id: "arctic-flow", name: "Arctic Flow", feel: "minimalismo · leveza · silêncio", swatch: "#9bc4e2", glow: "0 0 40px #9bc4e244" },
  { id: "emerald-night", name: "Emerald Night", feel: "equilíbrio · saúde · consistência", swatch: "#10b981", glow: "0 0 40px #10b98155" },
  { id: "golden-focus", name: "Golden Focus", feel: "premium · conquista · evolução", swatch: "#d4a857", glow: "0 0 40px #d4a85755" },
  { id: "rose-night", name: "Rose Night", feel: "delicado · introspectivo · acolhedor", swatch: "#c97189", glow: "0 0 40px #c9718955" },
];

export const DEFAULT_THEME: ThemeId = "midnight-sync";
const KEY = "sync.theme";

const VALID = new Set<ThemeId>(["midnight-sync","crimson-focus","deep-ocean","violet-mind","arctic-flow","emerald-night","golden-focus","rose-night"]);

export function normalizeTheme(value: string | null | undefined): ThemeId {
  if (!value) return DEFAULT_THEME;
  if (value === "solar-dust") return "golden-focus";
  return VALID.has(value as ThemeId) ? (value as ThemeId) : DEFAULT_THEME;
}

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return normalizeTheme(localStorage.getItem(KEY));
}

export function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", id);
  try { localStorage.setItem(KEY, id); } catch {}
}
