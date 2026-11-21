import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { Json } from "@/integrations/supabase/types";
import type { NotesData } from "./notes-model";

/** Fired on window whenever the signed-in account changes (sign in, sign out, first load). */
export const AUTH_EVENT = "rosa-auth-change";

let session: Session | null = null;
let authReady = false;
let lastUserId: string | null | undefined;
const authListeners = new Set<() => void>();
const SERVER_SNAPSHOT: { session: Session | null; ready: boolean } = { session: null, ready: false };
let snapshot = SERVER_SNAPSHOT;

function publish() {
  snapshot = { session, ready: authReady };
  for (const l of authListeners) l();
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_event, next) => {
    session = next;
    authReady = true;
    const id = next?.user.id ?? null;
    publish();
    if (id !== lastUserId) {
      lastUserId = id;
      window.dispatchEvent(new Event(AUTH_EVENT));
    }
  });
}

export function currentSession(): Session | null {
  return session;
}

export function useCloudSession() {
  return useSyncExternalStore(
    (l) => { authListeners.add(l); return () => authListeners.delete(l); },
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("already registered")) return "Este e-mail já tem conta. Use “Entrar”.";
  if (m.includes("password")) return "A senha precisa ter pelo menos 6 caracteres e não pode ser uma senha comum.";
  return message || "Não foi possível entrar agora. Tente novamente.";
}

export async function signInWithGoogle() {
  const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (result.error) throw new Error("Não foi possível entrar com o Google. Tente novamente.");
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** Returns true when the account still needs e-mail confirmation before signing in. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
  if (error) throw new Error(friendlyAuthError(error.message));
  return !data.session;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function cloudLoad(): Promise<(NotesData & { updatedAt: string }) | null> {
  const s = currentSession();
  if (!s) return null;
  const { data, error } = await supabase.from("user_notes").select("notes, connections, updated_at").eq("user_id", s.user.id).maybeSingle();
  if (error) throw new Error("Falha ao carregar notas da nuvem");
  if (!data) return null;
  return {
    notes: Array.isArray(data.notes) ? (data.notes as unknown as NotesData["notes"]) : [],
    connections: Array.isArray(data.connections) ? (data.connections as unknown as NotesData["connections"]) : [],
    updatedAt: data.updated_at,
  };
}

export async function cloudSave(data: NotesData) {
  const s = currentSession();
  if (!s) return;
  const { error } = await supabase.from("user_notes").upsert({
    user_id: s.user.id,
    notes: data.notes as unknown as Json,
    connections: data.connections as unknown as Json,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Falha ao sincronizar notas");
}
