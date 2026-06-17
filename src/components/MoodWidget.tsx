import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { today } from "@/lib/sync-data";
import { toast } from "sonner";

const MOODS = [
  { id: "energized", emoji: "⚡", label: "Energizado" },
  { id: "focused", emoji: "🎯", label: "Focado" },
  { id: "calm", emoji: "🌿", label: "Tranquilo" },
  { id: "tired", emoji: "😴", label: "Cansado" },
  { id: "anxious", emoji: "🌀", label: "Ansioso" },
];

export function MoodWidget() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("mood_logs").select("mood").eq("user_id", user.id).eq("log_date", today()).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setCurrent(data?.mood ?? null);
    })();
  }, [user?.id]);

  const log = async (mood: string) => {
    if (!user) return;
    const { error } = await supabase.from("mood_logs").insert({ user_id: user.id, mood, log_date: today() });
    if (error) { toast.error("Não foi possível registrar"); return; }
    setCurrent(mood);
    toast.success("Humor registrado");
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Como você está?</div>
      <div className="flex justify-between gap-2">
        {MOODS.map((m) => (
          <button
            key={m.id}
            onClick={() => log(m.id)}
            className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2 transition-smooth ${current === m.id ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-secondary/50"}`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
