import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/insights")({ component: InsightsPage });

function InsightsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string>("");

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // gather summary
      const [tasks, habits, sessions] = await Promise.all([
        supabase.from("tasks").select("title,status,priority,due_date,due_time,completed_at,created_at").eq("user_id", user.id).limit(100),
        supabase.from("habits").select("name,streak,best_streak,difficulty").eq("user_id", user.id),
        supabase.from("focus_sessions").select("mode,duration_minutes,started_at,completed").eq("user_id", user.id).limit(50),
      ]);

      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: {
          tasks: tasks.data ?? [],
          habits: habits.data ?? [],
          sessions: sessions.data ?? [],
        },
      });
      if (error) throw error;
      setInsights(data.insights);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar insights");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="text-muted-foreground">Análise de IA da sua rotina e produtividade.</p>
      </div>

      <div className="glass rounded-3xl p-8 text-center">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center glow mb-4">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Gerar análise inteligente</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Detectamos padrões em suas tarefas, hábitos e sessões de foco para sugerir melhorias.</p>
        <Button onClick={generate} disabled={loading} className="mt-5 glow">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</> : <><Sparkles className="h-4 w-4 mr-2" />Gerar insights</>}
        </Button>
      </div>

      {insights && (
        <div className="glass rounded-2xl p-6 prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{insights}</div>
        </div>
      )}
    </div>
  );
}
