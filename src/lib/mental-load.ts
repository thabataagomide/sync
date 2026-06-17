export type MentalLoadState = "light" | "moderate" | "heavy" | "overload";

export type MentalLoadResult = {
  score: number; // 0-100
  state: MentalLoadState;
  label: string;
  suggestion: string;
  color: string;
};

export function computeMentalLoad(input: {
  tasks: number;
  estimatedMinutes: number;
  events: number;
  recentFocusMinutes: number; // last 24h
}): MentalLoadResult {
  const { tasks, estimatedMinutes, events, recentFocusMinutes } = input;
  // Weighted score
  const taskLoad = Math.min(tasks * 6, 40);
  const timeLoad = Math.min(estimatedMinutes / 10, 30); // 5h = 30pts
  const eventLoad = Math.min(events * 5, 20);
  const focusLoad = Math.min(recentFocusMinutes / 12, 15); // 3h focus = 15pts
  const score = Math.round(Math.min(100, taskLoad + timeLoad + eventLoad + focusLoad));

  let state: MentalLoadState = "light";
  if (score >= 75) state = "overload";
  else if (score >= 55) state = "heavy";
  else if (score >= 30) state = "moderate";

  const labels: Record<MentalLoadState, string> = {
    light: "Leve", moderate: "Moderado", heavy: "Pesado", overload: "Sobrecarregado",
  };
  const colors: Record<MentalLoadState, string> = {
    light: "text-success", moderate: "text-primary", heavy: "text-warning", overload: "text-destructive",
  };
  const suggestions: Record<MentalLoadState, string> = {
    light: "Sua agenda está em ritmo confortável.",
    moderate: "Boa janela para uma sessão de foco profundo.",
    heavy: "Considere mover 1 ou 2 tarefas para amanhã.",
    overload: "Sua agenda está densa. Reserve uma pausa real e redistribua.",
  };
  return { score, state, label: labels[state], suggestion: suggestions[state], color: colors[state] };
}
