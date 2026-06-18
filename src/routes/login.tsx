import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Zap, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

const GOOGLE_AUTH_HREF =
  "https://zacwhvlhfrnihoxgbsvm.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fsync.syncmodeapp.workers.dev%2Fapp";

function LoginPage() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [activeUser, setActiveUser] = useState<{ email?: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setActiveUser({
          email: data.session.user.email ?? undefined,
        });
      }

      setChecking(false);
    });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Bem-vindo de volta!");
    nav({ to: "/app" });
  };

  const switchAccount = async () => {
    await supabase.auth.signOut();
    setActiveUser(null);
    toast("Sessão encerrada — entre com outra conta");
  };

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-md glass rounded-3xl p-8 shadow-elegant">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center glow">
            <Zap
              className="h-5 w-5 text-primary-foreground"
              strokeWidth={2.5}
            />
          </div>

          <span className="font-bold text-xl">Sync</span>
        </Link>

        {!checking && activeUser ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold">Sessão ativa detectada</h1>

              <p className="text-sm text-muted-foreground mt-1">
                Você já está conectado como{" "}
                <span className="text-foreground font-medium">
                  {activeUser.email}
                </span>
                . Confirme para continuar ou troque de conta.
              </p>
            </div>

            <div className="rounded-xl bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
              Por segurança, você nunca entra automaticamente — confirme abaixo.
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => nav({ to: "/app" })}
                className="w-full glow"
              >
                Continuar como {activeUser.email?.split("@")[0]}
              </Button>

              <Button
                variant="outline"
                onClick={switchAccount}
                className="w-full"
              >
                Sair e trocar de conta
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Entrar</h1>

            <p className="text-sm text-muted-foreground mt-1">
              Continue de onde parou.
            </p>

            <div className="mt-6">
              <a
                href={GOOGLE_AUTH_HREF}
                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Entrar com Google
              </a>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px bg-border flex-1" />
              ou
              <div className="h-px bg-border flex-1" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Email</Label>

                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label>Senha</Label>

                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-4 flex justify-between text-sm">
              <Link
                to="/forgot-password"
                className="text-primary hover:underline"
              >
                Esqueci a senha
              </Link>

              <Link
                to="/signup"
                className="text-muted-foreground hover:text-foreground"
              >
                Criar conta
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}