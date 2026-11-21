import { useState, type FormEvent } from "react";
import { AlertCircle, Cloud, CloudOff, Loader2, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sendPasswordReset, signIn, signInWithGoogle, signOut, signUp, useCloudSession } from "@/lib/supabase-cloud";
import { syncNow, useSyncStatus, type SyncStatus } from "@/lib/notes-store";

const GOOGLE_G = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

const STATUS_TEXT: Record<SyncStatus, string> = {
  local: "Salvo só neste aparelho",
  syncing: "Sincronizando…",
  synced: "Tudo salvo na nuvem",
  error: "Falha ao sincronizar — tentaremos de novo",
};

function StatusIcon({ status, signedIn }: { status: SyncStatus; signedIn: boolean }) {
  if (!signedIn) return <CloudOff className="h-4 w-4" />;
  if (status === "syncing") return <Loader2 className="h-4 w-4 animate-spin" />;
  if (status === "error") return <AlertCircle className="h-4 w-4 text-destructive" />;
  return <Cloud className="h-4 w-4 text-primary" />;
}

export function AccountControl() {
  const { session } = useCloudSession();
  const status = useSyncStatus();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function run(task: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : "Algo deu errado."); } finally { setBusy(false); }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      if (mode === "login") { await signIn(email, password); toast.success("Conta conectada! Suas notas estão sendo sincronizadas."); }
      else if (mode === "signup") {
        const needsConfirm = await signUp(email, password);
        if (needsConfirm) setMessage("Quase lá! Abra o e-mail que enviamos e clique no link para confirmar.");
      } else { await sendPasswordReset(email); setMessage("Enviamos um link para criar uma nova senha."); }
    });
  }

  const label = session ? session.user.email ?? "Minha conta" : "Entrar";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[46vw] gap-2 rounded-full" aria-label={session ? `Conta: ${label}` : "Entrar para salvar na nuvem"}>
          <StatusIcon status={status} signedIn={!!session} />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,92vw)] rounded-2xl p-5">
        {session ? (
          <div className="space-y-4">
            <div>
              <p className="font-display text-lg font-semibold">Sua conta</p>
              <p className="truncate text-sm text-muted-foreground">{session.user.email}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm">
              <StatusIcon status={status} signedIn />
              <span>{STATUS_TEXT[status]}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">Notas, fotos, vídeos e arquivos ficam guardados na sua conta. Entre com o mesmo e-mail em qualquer aparelho para ver tudo.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => syncNow()} disabled={status === "syncing"}><RefreshCw className="h-4 w-4" />Sincronizar</Button>
              <Button variant="outline" className="flex-1" onClick={() => void signOut()}><LogOut className="h-4 w-4" />Sair</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <p className="font-display text-lg font-semibold">{mode === "signup" ? "Criar conta" : mode === "reset" ? "Recuperar senha" : "Salvar na nuvem"}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">Entre com seu e-mail para ver suas notas, fotos e vídeos em qualquer aparelho.</p>
            </div>
            {mode !== "reset" && (
              <>
                <Button
                  type="button"
                  className="h-10 w-full gap-2.5 rounded-full border font-medium hover:opacity-90"
                  style={{ background: "#131314", borderColor: "#8E918F", color: "#E3E3E3" }}
                  disabled={busy}
                  onClick={() => void run(signInWithGoogle)}
                >
                  {GOOGLE_G}
                  Continuar com Google
                </Button>
                <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou com e-mail<span className="h-px flex-1 bg-border" /></div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="account-email">E-mail</Label>
              <Input id="account-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            {mode !== "reset" && (
              <div className="space-y-1.5">
                <Label htmlFor="account-password">Senha</Label>
                <Input id="account-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-primary">{message}</p>}
            <Button type="submit" className="w-full" disabled={busy || !email || (mode !== "reset" && password.length < 6)}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
            </Button>
            <div className="flex flex-wrap justify-between gap-2 text-xs">
              {mode === "login" ? (
                <>
                  <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Criar conta</button>
                  <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" onClick={() => { setMode("reset"); setError(""); setMessage(""); }}>Esqueci a senha</button>
                </>
              ) : (
                <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => { setMode("login"); setError(""); setMessage(""); }}>Já tenho conta — entrar</button>
              )}
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
