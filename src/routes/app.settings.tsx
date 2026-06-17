import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff, CheckSquare, Repeat, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getNotifPrefs, setNotifPrefs, ensureNotifPermission, type NotifPrefs } from "@/lib/sync-data";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const [prefs, setPrefs] = useState<NotifPrefs>({ tasks: true, habits: true, events: true });
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    setPrefs(getNotifPrefs());
    if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission);
  }, []);

  const update = (k: keyof NotifPrefs, v: boolean) => {
    const p = { ...prefs, [k]: v };
    setPrefs(p); setNotifPrefs(p);
  };

  const enable = async () => {
    const ok = await ensureNotifPermission();
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "denied");
    if (ok) toast.success("Notificações ativadas neste dispositivo");
    else toast.error("Permissão negada pelo navegador");
  };

  const items: { key: keyof NotifPrefs; label: string; desc: string; icon: any }[] = [
    { key: "tasks", label: "Tarefas", desc: "Lembretes de tarefas pendentes", icon: CheckSquare },
    { key: "habits", label: "Hábitos", desc: "Lembretes de check-in dos hábitos", icon: Repeat },
    { key: "events", label: "Eventos do calendário", desc: "Avisos antes do início do evento", icon: Calendar },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Personalize notificações e preferências.</p>
        <p className="text-xs text-muted-foreground mt-1">Para ativar ou desativar módulos, use o botão <strong>+ Módulos</strong> no menu lateral.</p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {permission === "granted" ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
            <div>
              <div className="font-semibold">Permissão de notificações</div>
              <div className="text-xs text-muted-foreground">Status: {permission === "granted" ? "ativada" : permission === "denied" ? "bloqueada" : "não solicitada"}</div>
            </div>
          </div>
          {permission !== "granted" && <Button onClick={enable}>Ativar</Button>}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-1">
        <h2 className="font-semibold mb-3">Tipos de notificação</h2>
        {items.map(({ key, label, desc, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </div>
            <Switch checked={prefs[key]} onCheckedChange={(v) => update(key, v)} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-3">As preferências são salvas neste dispositivo. Para receber notificações com o app fechado, ative as notificações do navegador.</p>
      </div>
    </div>
  );
}
