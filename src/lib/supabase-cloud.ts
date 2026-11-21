import { useEffect, useState } from "react";
import { LogIn, LogOut, Cloud, CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = "https://utmcnicgabcmkfmsxzop.supabase.co";
const SUPABASE_KEY = "sb_publishable_6jQ9EmAD4pJIyPhKsJIK2Q_O8kvnswF";
const SESSION_KEY = "rosa-azul:supabase-session";

type Session = { access_token: string; refresh_token: string; user: { id: string; email?: string } };
function getSession(): Session | null { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } }
async function authRequest(path: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, { method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.msg || json.message || json.error_description || json.error || "Não foi possível autenticar.");
  return json;
}
export async function signIn(email: string, password: string) {
  const s = await authRequest("token?grant_type=password", { email, password });
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("rosa-auth-change"));
}
export async function signUp(email: string, password: string) {
  const s = await authRequest("signup", { email, password });
  if (s.access_token) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("rosa-auth-change"));
  return s;
}
export function signOut() { localStorage.removeItem(SESSION_KEY); window.dispatchEvent(new Event("rosa-auth-change")); }
export function currentSession() { return getSession(); }
export async function cloudLoad() {
  const s = getSession(); if (!s) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rosa_azul_cloud_data?user_id=eq.${s.user.id}&select=notes,connections`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${s.access_token}` } });
  if (!res.ok) throw new Error("Falha ao carregar notas da nuvem");
  const rows = await res.json(); return rows[0] || null;
}
export async function cloudSave(data: {notes: unknown[]; connections: unknown[]}) {
  const s = getSession(); if (!s) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rosa_azul_cloud_data`, { method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({user_id:s.user.id, notes:data.notes, connections:data.connections, updated_at:new Date().toISOString()}) });
  if (!res.ok) throw new Error("Falha ao sincronizar notas");
}
export function AccountControl() {
  const [session,setSession]=useState<Session|null>(null);
  const [open,setOpen]=useState(false); const [mode,setMode]=useState<"login"|"signup">("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [message,setMessage]=useState("");
  useEffect(()=>{const refresh=()=>setSession(getSession()); refresh(); window.addEventListener("rosa-auth-change",refresh); return ()=>window.removeEventListener("rosa-auth-change",refresh)},[]);
  const submit=async()=>{setBusy(true);setError("");setMessage("");try{if(mode==="login")await signIn(email,password);else {const result=await signUp(email,password); if(!result.access_token)setMessage("Cadastro realizado! Confirme o e-mail para entrar.");} }catch(e){setError(e instanceof Error?e.message:"Erro");}finally{setBusy(false)}};
  return <div className="relative">
    <Button variant="outline" size="sm" className="rounded-full gap-2 border-white/15 bg-white/5" onClick={()=>setOpen(v=>!v)}>{session?<Cloud className="h-4 w-4 text-emerald-400"/>:<CloudOff className="h-4 w-4"/>}{session?.user?.email||"Conectar conta"}</Button>
    {open&&<div className="absolute right-0 top-12 z-[70] w-[min(20rem,90vw)] rounded-2xl border border-white/15 bg-[#191427] p-4 shadow-2xl">
      {session?<><p className="text-sm font-medium text-white">Conta sincronizada</p><p className="mt-1 text-xs text-muted-foreground">{session.user.email}</p><Button className="mt-3 w-full" variant="outline" onClick={()=>{signOut();setOpen(false)}}><LogOut className="mr-2 h-4 w-4"/>Sair</Button></>:
      <><div className="flex gap-2"><Button size="sm" variant={mode==="login"?"default":"outline"} onClick={()=>setMode("login")}>Entrar</Button><Button size="sm" variant={mode==="signup"?"default":"outline"} onClick={()=>setMode("signup")}>Criar conta</Button></div>
      <label className="mt-3 block text-xs text-muted-foreground">E-mail</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white" placeholder="seu@email.com"/>
      <label className="mt-3 block text-xs text-muted-foreground">Senha</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white" placeholder="Mínimo 6 caracteres"/>
      {error&&<p className="mt-2 text-xs text-red-400">{error}</p>}{message&&<p className="mt-2 text-xs text-emerald-400">{message}</p>}
      <Button className="mt-3 w-full" disabled={busy||!email||password.length<6} onClick={()=>void submit()}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<LogIn className="mr-2 h-4 w-4"/>}{mode==="login"?"Entrar":"Cadastrar"}</Button></>}
    </div>}
  </div>;
}
