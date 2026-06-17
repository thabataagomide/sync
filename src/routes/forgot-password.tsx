import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPage });

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Email de recuperação enviado!");
  };

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-md glass rounded-3xl p-8 shadow-elegant">
        <h1 className="text-2xl font-bold">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground mt-1">Enviaremos um link de redefinição.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar link"}</Button>
        </form>
        <p className="mt-4 text-sm text-center"><Link to="/login" className="text-primary hover:underline">Voltar para login</Link></p>
      </div>
    </div>
  );
}
