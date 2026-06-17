import { createFileRoute } from "@tanstack/react-router";
import { Check, Palette } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { useTheme } from "@/lib/theme-context";

export const Route = createFileRoute("/app/appearance")({ component: AppearancePage });

function AppearancePage() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Palette className="h-7 w-7 text-primary" /> Aparência</h1>
        <p className="text-muted-foreground">Escolha o clima visual do seu Sync. Sempre escuro, sempre minimalista.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`relative rounded-2xl p-5 text-left transition-smooth border ${active ? "border-primary ring-2 ring-primary/40" : "border-border/40 hover:border-border"}`}
              style={{
                background: `linear-gradient(135deg, ${t.swatch}11, transparent), var(--card)`,
              }}
            >
              {active && (
                <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl shrink-0" style={{ background: t.swatch, boxShadow: t.glow }} />
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.feel}</div>
                </div>
              </div>
              {/* Mini preview */}
              <div className="flex gap-1.5">
                <div className="h-2 flex-1 rounded-full bg-secondary/50" />
                <div className="h-2 flex-[2] rounded-full" style={{ background: t.swatch, opacity: 0.8 }} />
                <div className="h-2 flex-1 rounded-full bg-secondary/50" />
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">A escolha é salva automaticamente e aplicada em todos os seus dispositivos.</p>
    </div>
  );
}
