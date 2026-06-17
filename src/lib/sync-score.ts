// Sync Score = equilíbrio da rotina (0-100)
// Combina: hábitos completados, tarefas concluídas, hidratação, foco, streak
export function computeSyncScore(input: {
  habitsDone: number; habitsTotal: number;
  tasksDone: number; tasksTotal: number;
  hydrationPct: number; // 0-1
  focusMinutes: number; // hoje
  streak: number;
}): number {
  const { habitsDone, habitsTotal, tasksDone, tasksTotal, hydrationPct, focusMinutes, streak } = input;
  const habit = habitsTotal ? (habitsDone / habitsTotal) * 25 : 12;
  const task = tasksTotal ? (tasksDone / tasksTotal) * 25 : 12;
  const hydration = Math.min(hydrationPct, 1) * 15;
  const focus = Math.min(focusMinutes / 90, 1) * 20;
  const streakPts = Math.min(streak / 14, 1) * 15;
  return Math.round(Math.min(100, habit + task + hydration + focus + streakPts));
}

export const scoreLabel = (s: number) =>
  s >= 80 ? "Em sintonia" : s >= 60 ? "Equilibrado" : s >= 40 ? "Em construção" : "Reconectando";
