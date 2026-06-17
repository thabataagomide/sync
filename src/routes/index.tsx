import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap, CheckSquare, Repeat, Timer, Sparkles, Calendar, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sync — Central inteligente de produtividade" },
      { name: "description", content: "Tarefas, hábitos, foco, calendário, notas e insights de IA. Tudo em um app, sincronizado com sua rotina." },
      { property: "og:title", content: "Sync — Central inteligente de produtividade" },
      { property: "og:description", content: "Organização, foco, hábitos e planejamento pessoal em um só lugar." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: CheckSquare, title: "Tarefas", desc: "Sistema avançado com prioridades, recorrências e subtarefas." },
  { icon: Repeat, title: "Hábitos", desc: "Tracker com streaks, XP e gamificação completa." },
  { icon: Timer, title: "Foco", desc: "Pomodoro com modos, sons e Focus Mode minimalista." },
  { icon: Calendar, title: "Calendário", desc: "Agenda inteligente que detecta conflitos e sobrecarga." },
  { icon: Sparkles, title: "Insights de IA", desc: "Padrões da sua rotina e sugestões anti-procrastinação." },
  { icon: Zap, title: "Sync Flow", desc: "Seu indicador único de equilíbrio, energia e consistência." },
];

function Landing() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionEmail(data.session?.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessionEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <div className="min-h-screen">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center glow">
            <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl">Sync</span>
        </div>
        <nav className="flex items-center gap-3">
          {sessionEmail ? (
            <>
              <span className="hidden sm:inline text-xs text-muted-foreground">Conectado: <span className="text-foreground">{sessionEmail}</span></span>
              <Button variant="ghost" onClick={signOut}><LogOut className="h-4 w-4 mr-1" />Sair</Button>
              <Link to="/app"><Button>Abrir Sync</Button></Link>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost">Entrar</Button></Link>
              <Link to="/signup"><Button>Começar grátis</Button></Link>
            </>
          )}
        </nav>
      </header>

      <section className="container mx-auto px-6 pt-16 pb-24 text-center">
        {sessionEmail && (
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-4">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Sessão ativa · {sessionEmail}
          </div>
        )}
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Powered by AI · Sync Energy™
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
          Sua rotina em <span className="text-gradient">perfeita sincronia</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          O Sync é uma central inteligente de tarefas, hábitos, foco e planejamento pessoal — desenhada para produtividade saudável e consistência real.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          {sessionEmail ? (
            <Link to="/app"><Button size="lg" className="glow">Abrir meu workspace <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          ) : (
            <>
              <Link to="/signup">
                <Button size="lg" className="glow">
                  Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login"><Button size="lg" variant="outline">Já tenho conta</Button></Link>
            </>
          )}
        </div>
      </section>

      <section className="container mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 hover:translate-y-[-2px] transition-smooth">
              <div className="h-11 w-11 rounded-xl bg-primary/15 grid place-items-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © 2026 Sync · Feito para uma vida em equilíbrio
      </footer>
    </div>
  );
}
