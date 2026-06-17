import type { MentalLoadResult } from "@/lib/mental-load";
import { Activity } from "lucide-react";

export function MentalLoadCard({ load }: { load: MentalLoadResult }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Carga Mental</div>
        <Activity className={`h-4 w-4 ${load.color}`} />
      </div>
      <div className={`text-2xl font-bold ${load.color}`}>{load.label}</div>
      <div className="mt-3 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
        <div className={`h-full transition-all duration-700 ${load.state === "overload" ? "bg-destructive" : load.state === "heavy" ? "bg-warning" : "bg-primary"}`} style={{ width: `${load.score}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-3">{load.suggestion}</p>
    </div>
  );
}
