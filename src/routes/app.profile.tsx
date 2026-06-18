import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/sync-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Trophy, Zap, Flame, Sparkles, AlertTriangle, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { tierFor, nextTier, streakTier, xpForLevel, LEVEL_TIERS } from "@/lib/levels";
import { isValidUsername, normalizeUsername, USERNAME_RULE_MESSAGE } from "@/lib/username";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

const RARITY_STYLE: Record<string, string> = {
  common: "from-slate-400 to-slate-300",
  rare: "from-sky-400 to-cyan-300",
  epic: "from-violet-500 to-fuchsia-400",
  legendary: "from-amber-300 via-rose-400 to-fuchsia-500",
};

function ProfilePage() {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setUsername(profile.username ?? "");
    }
  }, [profile]);
  useEffect(() => {
    if (!user) return;
    supabase.from("achievements").select("*").eq("user_id", user.id).order("unlocked_at", { ascending: false })
      .then((result: { data: any[] | null }) => setAchievements(result.data ?? []));
  }, [user?.id]);

  const save = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    toast.success("Perfil atualizado");
    refresh();
  };

  const saveUsername = async () => {
    if (!user) return;
    const u = normalizeUsername(username);
    if (!u) return toast.error("Username não pode ficar vazio");
    if (!isValidUsername(u)) return toast.error(USERNAME_RULE_MESSAGE);
    setSavingUsername(true);
    const { data: existing, error: lookupError } = await supabase.functions.invoke("username-lookup", {
      body: { username: u },
    });
    if (lookupError) {
      setSavingUsername(false);
      return toast.error(lookupError.message);
    }
    if (existing?.email && existing.email !== user.email) {
      setSavingUsername(false);
      return toast.error("Esse username já está em uso. Escolha outro.");
    }
    const { error } = await supabase.from("profiles").update({ username: u }).eq("id", user.id);
    setSavingUsername(false);
    if (error) return toast.error(error.message);
    setUsername(u);
    toast.success("Username salvo");
    refresh();
  };

  const onAvatarChange = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Envie um arquivo de imagem");
    if (file.size > 3 * 1024 * 1024) return toast.error("Máximo 3 MB");
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploadingAvatar(false); return toast.error(upErr.message); }
    const { data: signed, error: signErr } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed) { setUploadingAvatar(false); return toast.error(signErr?.message ?? "Falha ao gerar URL"); }
    await supabase.from("profiles").update({ avatar_url: signed.signedUrl }).eq("id", user.id);
    setUploadingAvatar(false);
    toast.success("Foto de perfil atualizada");
    refresh();
  };

  const logout = async () => { await supabase.auth.signOut(); nav({ to: "/" }); };


  const deleteAccount = async () => {
    if (confirmText !== "EXCLUIR") { toast.error("Digite EXCLUIR para confirmar"); return; }
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.auth.signOut();
      toast.success("Conta excluída permanentemente");
      setDeleteDialogOpen(false);
      nav({ to: "/" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir conta");
      setDeleting(false);
    }
  };

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const tier = tierFor(level);
  const next = nextTier(level);
  const xpInLevel = xp % 200;
  const sStreak = streakTier(profile?.streak ?? 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Perfil</h1>
        <p className="text-muted-foreground">Sua identidade Sync, evolução e conquistas.</p>
      </div>

      {/* Level showcase */}
      <div className="glass rounded-2xl p-6 overflow-hidden relative">
        <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-10 pointer-events-none`} />
        <div className="relative flex items-center gap-5 flex-wrap">
          <div className={`h-24 w-24 rounded-3xl grid place-items-center text-5xl bg-gradient-to-br ${tier.gradient} shadow-[0_0_40px_rgba(255,255,255,0.15)]`}>
            {tier.medal}
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Nível {level}</div>
            <div className={`text-3xl font-bold bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent`}>{tier.name}</div>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={(xpInLevel / 200) * 100} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground tabular-nums">{xpInLevel}/200 XP</span>
            </div>
            {next && <div className="text-xs text-muted-foreground mt-1">Próximo: {next.medal} {next.name} · nível {next.level}</div>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <Stat icon={Trophy} label="Nível" value={level} />
          <Stat icon={Zap} label="XP total" value={xp} />
          <Stat icon={Sparkles} label="Sync Energy" value={`${profile?.sync_flow ?? 50}%`} />
        </div>
      </div>

      {/* Streak */}
      <div className={`glass rounded-2xl p-6 bg-gradient-to-br ${sStreak.aura} ${sStreak.glow}`}>
        <div className="flex items-center gap-4">
          <Flame className="h-12 w-12 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" />
          <div>
            <div className="text-xs uppercase tracking-widest text-white/80">Streak atual</div>
            <div className="text-3xl font-bold text-white">{profile?.streak ?? 0} dias · {sStreak.label}</div>
            <div className="text-xs text-white/80 mt-1">A consistência alimenta sua aura.</div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Conquistas {achievements.length > 0 && <span className="text-sm text-muted-foreground">· {achievements.length}</span>}</h2>
        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conquista ainda. Conclua tarefas, mantenha hábitos e evolua para desbloquear medalhas raras ✨</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {achievements.map((a) => (
              <div key={a.id} className={`relative rounded-2xl p-4 bg-gradient-to-br ${RARITY_STYLE[a.rarity] ?? RARITY_STYLE.common} text-white overflow-hidden`}>
                <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-2xl animate-pulse" />
                <div className="relative">
                  <div className="text-3xl">{a.icon}</div>
                  <div className="font-bold mt-2 text-sm">{a.title}</div>
                  <div className="text-[10px] opacity-90">{a.description}</div>
                  <div className="text-[10px] uppercase tracking-wider mt-2 opacity-80">{a.rarity}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tiers preview */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Caminho de evolução</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {LEVEL_TIERS.map((t) => {
            const reached = level >= t.level;
            return (
              <div key={t.level} className={`shrink-0 w-32 rounded-xl p-3 text-center border ${reached ? `bg-gradient-to-br ${t.gradient} border-transparent text-white` : "bg-secondary/30 border-border opacity-50"}`}>
                <div className="text-2xl">{t.medal}</div>
                <div className="text-xs font-semibold mt-1">{t.name}</div>
                <div className="text-[10px] opacity-80">Nv {t.level}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Conta</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-16 w-16 rounded-2xl object-cover border border-border" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center text-2xl font-bold text-primary-foreground">
                {(profile?.full_name ?? user?.email ?? "U")[0].toUpperCase()}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center cursor-pointer shadow-md hover:scale-105 transition-smooth">
              <Camera className="h-3.5 w-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarChange(f); }}
              />
            </label>
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{profile?.full_name ?? "Sem nome"}</div>
            {profile?.username && <div className="text-xs text-primary">@{profile.username}</div>}
            <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Username</Label>
            <div className="flex gap-2">
              <Input
                value={username}
                onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                placeholder="seu_username"
                maxLength={20}
              />
              <Button variant="secondary" onClick={saveUsername} disabled={savingUsername}>
                {savingUsername ? "..." : "Salvar"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{USERNAME_RULE_MESSAGE} · precisa ser único</p>
          </div>
          <div className="flex gap-3 pt-1">
            <Button onClick={save}>Salvar nome</Button>
            <Button variant="outline" onClick={logout}>Sair</Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
            🔒 Sua conta é privada. Apenas você visualiza suas tarefas, hábitos, eventos, notas, insights e progresso.
          </p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="glass rounded-2xl p-6 border border-destructive/40">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <h2 className="text-xl font-bold text-destructive">Zona perigosa</h2>
            <p className="text-sm text-muted-foreground">A exclusão da conta é permanente e irreversível.</p>
          </div>
        </div>
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            if (deleting) return;
            setDeleteDialogOpen(open);
            if (!open) setConfirmText("");
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Excluir minha conta</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação <strong>não pode ser desfeita</strong>. Todos os seus dados serão apagados, incluindo:
                <ul className="list-disc list-inside mt-2 space-y-0.5 text-xs">
                  <li>tarefas, hábitos e eventos</li>
                  <li>progresso, XP, streaks e Sync Energy</li>
                  <li>notas, sessões de foco e hidratação</li>
                  <li>configurações e conquistas</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div>
              <Label>Digite <strong>EXCLUIR</strong> para confirmar</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="mt-1"
                disabled={deleting}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={deleteAccount}
                disabled={deleting || confirmText !== "EXCLUIR"}
              >
                {deleting ? "Excluindo..." : "Sim, excluir tudo"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <Icon className="h-4 w-4 text-primary mb-1" />
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
