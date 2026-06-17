import { Heart } from "lucide-react";

export function RecoverBanner({ daysAway }: { daysAway: number }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-start gap-3">
      <Heart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold">Modo recuperação ativo</div>
        <p className="text-sm text-muted-foreground mt-1">
          {daysAway} dia{daysAway > 1 ? "s" : ""} fora. Vamos voltar ao ritmo aos poucos — sem pressão. Comece com 1 hábito leve ou uma única tarefa pequena.
        </p>
      </div>
    </div>
  );
}
