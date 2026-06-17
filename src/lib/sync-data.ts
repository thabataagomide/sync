import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { levelFromXp } from "@/lib/levels";

export type Profile = any;

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(data);
  };
  useEffect(() => { refresh(); }, [user?.id]);
  return { profile, refresh };
}

export async function awardXp(userId: string, xp: number, _coins = 0) {
  const { data: p } = await supabase.from("profiles").select("xp").eq("id", userId).maybeSingle();
  if (!p) return;
  const newXp = Math.max(0, p.xp + xp);
  const newLevel = levelFromXp(newXp);
  await supabase.from("profiles").update({ xp: newXp, level: newLevel }).eq("id", userId);
}

export async function bumpSyncFlow(userId: string, delta: number) {
  const { data: p } = await supabase.from("profiles").select("sync_flow").eq("id", userId).maybeSingle();
  if (!p) return;
  const next = Math.max(0, Math.min(100, (p.sync_flow ?? 50) + delta));
  await supabase.from("profiles").update({ sync_flow: next }).eq("id", userId);
}

export const today = () => format(new Date(), "yyyy-MM-dd");

// Difficulty → XP mapping for habits
export const DIFFICULTY_XP: Record<string, number> = { easy: 5, medium: 10, hard: 20 };
export const difficultyXp = (d?: string | null) => DIFFICULTY_XP[d ?? "easy"] ?? 5;

// ========== Achievements ==========
export type AchievementDef = { code: string; title: string; description: string; icon: string; rarity: "common" | "rare" | "epic" | "legendary" };

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_task", title: "Primeiro Passo", description: "Conclua sua primeira tarefa", icon: "✅", rarity: "common" },
  { code: "early_bird", title: "Madrugador Supremo", description: "5 tarefas concluídas antes das 9h", icon: "🌅", rarity: "rare" },
  { code: "focus_master", title: "Mestre do Foco", description: "10 sessões de foco profundo", icon: "🧠", rarity: "epic" },
  { code: "100_pomodoros", title: "100 Pomodoros", description: "Complete 100 sessões pomodoro", icon: "🍅", rarity: "epic" },
  { code: "no_procrast_30", title: "30 Dias Sem Procrastinar", description: "30 dias consecutivos cumprindo a rotina", icon: "🔥", rarity: "legendary" },
  { code: "perfect_week", title: "Semana Perfeita", description: "Todos os hábitos completados em 7 dias", icon: "💎", rarity: "rare" },
  { code: "habit_streak_7", title: "Faísca Acesa", description: "7 dias mantendo um hábito", icon: "✨", rarity: "common" },
  { code: "habit_streak_30", title: "Aura de Consistência", description: "30 dias de hábito ininterrupto", icon: "🌟", rarity: "legendary" },
  { code: "level_10", title: "Construtor", description: "Atinja o nível 10", icon: "⚙️", rarity: "rare" },
  { code: "level_50", title: "Synced", description: "Atinja o nível 50", icon: "👑", rarity: "legendary" },
];

export async function unlockAchievement(userId: string, code: string) {
  const def = ACHIEVEMENTS.find((a) => a.code === code);
  if (!def) return false;
  const { data: existing } = await supabase.from("achievements").select("id").eq("user_id", userId).eq("code", code).maybeSingle();
  if (existing) return false;
  await supabase.from("achievements").insert({
    user_id: userId, code, title: def.title, description: def.description, icon: def.icon, rarity: def.rarity,
  });
  return true;
}

export async function checkAchievements(userId: string) {
  const newly: string[] = [];
  const [tasksRes, sessionsRes, profileRes, habitsRes] = await Promise.all([
    supabase.from("tasks").select("id,completed_at,status").eq("user_id", userId).eq("status", "done"),
    supabase.from("focus_sessions").select("id,duration_minutes,mode").eq("user_id", userId).eq("completed", true),
    supabase.from("profiles").select("level").eq("id", userId).maybeSingle(),
    supabase.from("habits").select("streak,best_streak").eq("user_id", userId),
  ]);
  const tasks = tasksRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const level = profileRes.data?.level ?? 1;
  const habits = habitsRes.data ?? [];

  if (tasks.length >= 1 && await unlockAchievement(userId, "first_task")) newly.push("first_task");
  if (sessions.length >= 100 && await unlockAchievement(userId, "100_pomodoros")) newly.push("100_pomodoros");
  if (sessions.filter((s: any) => s.mode === "deep").length >= 10 && await unlockAchievement(userId, "focus_master")) newly.push("focus_master");
  if (level >= 10 && await unlockAchievement(userId, "level_10")) newly.push("level_10");
  if (level >= 50 && await unlockAchievement(userId, "level_50")) newly.push("level_50");
  const earlyCount = tasks.filter((t: any) => t.completed_at && new Date(t.completed_at).getHours() < 9).length;
  if (earlyCount >= 5 && await unlockAchievement(userId, "early_bird")) newly.push("early_bird");
  const maxStreak = Math.max(0, ...habits.map((h: any) => h.streak ?? 0));
  if (maxStreak >= 7 && await unlockAchievement(userId, "habit_streak_7")) newly.push("habit_streak_7");
  if (maxStreak >= 30 && await unlockAchievement(userId, "habit_streak_30")) newly.push("habit_streak_30");
  return newly;
}

// ========== Notifications ==========
export type NotifPrefs = { tasks: boolean; habits: boolean; events: boolean };
const NOTIF_KEY = "sync.notifications";
export const defaultNotifPrefs = (): NotifPrefs => ({ tasks: true, habits: true, events: true });

export function getNotifPrefs(): NotifPrefs {
  if (typeof window === "undefined") return defaultNotifPrefs();
  try { return { ...defaultNotifPrefs(), ...JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "{}") }; }
  catch { return defaultNotifPrefs(); }
}
export function setNotifPrefs(p: NotifPrefs) {
  if (typeof window !== "undefined") localStorage.setItem(NOTIF_KEY, JSON.stringify(p));
}
export async function ensureNotifPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}
export function notify(title: string, body?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try { new Notification(title, { body, icon: "/favicon.ico" }); } catch {}
}
