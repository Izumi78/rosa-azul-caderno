import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Rosa Azul" },
      { name: "description", content: "Crie uma nova senha para sua conta do caderno Rosa Azul." },
      { property: "og:title", content: "Nova senha — Rosa Azul" },
      { property: "og:description", content: "Crie uma nova senha para sua conta do caderno Rosa Azul." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validLink, setValidLink] = useState<boolean | null>(null);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setValidLink(true); });
    void supabase.auth.getSession().then(({ data: d }) => setValidLink(isRecovery || !!d.session));
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError("Não foi possível salvar a nova senha. Use pelo menos 6 caracteres e tente de novo."); return; }
    toast.success("Senha atualizada!");
    void navigate({ to: "/" });
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">Nova senha</h1>
      {validLink === false ? (
        <p className="mt-3 text-sm text-muted-foreground">Este link expirou ou já foi usado. Peça um novo em “Entrar” → “Esqueci a senha”.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Escolha uma nova senha</Label>
            <Input id="new-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || password.length < 6}>Salvar nova senha</Button>
        </form>
      )}
    </main>
  );
}
