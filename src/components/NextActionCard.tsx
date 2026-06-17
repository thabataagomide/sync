import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Action = { kind: "task" | "habit" | "event" | "rest"; title: string; sub?: string; href: string };

export function NextActionCard({ action }: { action: Action | null }) {
  if (!action) {
    return (
      <div className="glass rounded-3xl p-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Próxima ação</div>
        <div className="mt-2 text-xl font-semibold">Nada urgente agora.</div>
        <div className="text-sm text-muted-foreground">Aproveite o intervalo.</div>
      </div>
    );
  }
  return (
    <Link to={action.href} className="glass rounded-3xl p-6 block group hover:translate-y-[-2px] transition-smooth">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Próxima ação</div>
          <div className="mt-2 text-xl font-semibold">{action.title}</div>
          {action.sub && <div className="text-sm text-muted-foreground mt-0.5">{action.sub}</div>}
        </div>
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center glow group-hover:scale-110 transition-smooth">
          <ArrowRight className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
    </Link>
  );
}
