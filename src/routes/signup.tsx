import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Zap, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  isValidUsername,
  normalizeUsername,
  PENDING_USERNAME_KEY,
  USERNAME_RULE_MESSAGE,
} from "@/lib/username";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

const GOOGLE_AUTH_HREF =
  "https://zacwhvlhfrnihoxgbsvm.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fsync.syncmodeapp.workers.dev%2Fapp";
function SignupPage() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
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

  const validateUsername = () => {
    const normalized = normalizeUsername(username);

    if (!isValidUsername(normalized)) {
      toast.error(USERNAME_RULE_MESSAGE);
      return null;
    }

    return normalized;
  };

  const usernameExists = async (value: string) => {
    const { data, error } = await supabase.functions.invoke("username-lookup", {
      body: { username: value },
    });

    if (error) throw error;
    return Boolean(data?.email);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const normalizedUsername = validateUsername();
    if (!normalizedUsername) return;

    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      if (await usernameExists(normalizedUsername)) {
        toast.error("Esse user já está em uso. Escolha outro.");
        setLoading(false);
        return;
      }
    } catch (error: any) {
      toast.error(error.message ?? "Não foi possível validar o user.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: name,
          username: normalizedUsername,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      toast.success("Conta criada com sucesso!");
      nav({ to: "/app" });
      return;
    }

    toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
    nav({ to: "/login" });
  };

  const signUpWithGoogle = async () => {
    const normalizedUsername = validateUsername();
    if (!normalizedUsername) return;

    setLoading(true);

    try {
      if (await usernameExists(normalizedUsername)) {
        toast.error("Esse user já está em uso. Escolha outro.");
        setLoading(false);
        return;
      }

      window.localStorage.setItem(PENDING_USERNAME_KEY, normalizedUsername);
      window.location.href = GOOGLE_AUTH_HREF;
    } catch (error: any) {
      toast.error(error.message ?? "Não foi possível validar o user.");
      setLoading(false);
    }
  };

  const switchAccount = async () => {
    await supabase.auth.signOut();
    setActiveUser(null);
    toast("Sessão encerrada — crie uma conta com outro usuário");
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
                . Confirme para continuar ou saia para criar uma nova conta.
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
                Sair e criar outra conta
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Criar conta</h1>

            <p className="text-sm text-muted-foreground mt-1">
              Comece sua jornada no Sync.
            </p>

            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={signUpWithGoogle}
                className="w-full"
                disabled={loading}
              >
                Criar conta com Google
              </Button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px bg-border flex-1" />
              ou
              <div className="h-px bg-border flex-1" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Nome</Label>

                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <Label>User</Label>

                <Input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  placeholder="seu_user"
                  maxLength={20}
                />

                <p className="text-[11px] text-muted-foreground mt-1">
                  {USERNAME_RULE_MESSAGE}
                </p>
              </div>

              <div>
                <Label>Email</Label>

                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@email.com"
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
                    placeholder="Mínimo de 6 caracteres"
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
                {loading ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>

            <div className="mt-4 flex justify-center text-sm">
              <Link
                to="/login"
                className="text-muted-foreground hover:text-foreground"
              >
                Já tenho conta
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
