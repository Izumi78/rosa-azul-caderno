import { useSyncExternalStore } from "react";
import { AUTH_EVENT, cloudLoad, cloudSave, currentSession } from "./supabase-cloud";
import { syncNoteMediaToCloud } from "./image-utils";

import {
  addNote,
  collectMediaIds,
  deleteNote,
  isOnlySampleData,
  mergeNotesData,
  moveNote,
  removeConnection,
  sampleData,
  toggleConnection,
  updateNote,
  type Note,
  type NoteColor,
  type NotesData,
} from "./notes-model";

const STORAGE_KEY = "rosa-azul:v1";
const SYNC_META_KEY = "rosa-azul:sync";

interface StoreState extends NotesData {
  hydrated: boolean;
}

export type SyncStatus = "local" | "syncing" | "synced" | "error";

const SERVER_STATE: StoreState = { hydrated: false, notes: [], connections: [] };
let state: StoreState = SERVER_STATE;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let syncTimer: ReturnType<typeof setTimeout> | undefined;
let syncing = false;
let syncStatus: SyncStatus = "local";
const statusListeners = new Set<() => void>();

function setStatus(next: SyncStatus) {
  if (syncStatus === next) return;
  syncStatus = next;
  for (const l of statusListeners) l();
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => { statusListeners.add(l); return () => statusListeners.delete(l); },
    () => syncStatus,
    () => "local" as SyncStatus,
  );
}

/** Remembers which account this browser last synced with and whether it has edits not yet sent. */
function readMeta(): { userId?: string; dirty?: boolean } {
  try { return JSON.parse(localStorage.getItem(SYNC_META_KEY) || "{}") as { userId?: string; dirty?: boolean }; } catch { return {}; }
}
function writeMeta(meta: { userId?: string; dirty?: boolean }) {
  try { localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

function currentData(): NotesData {
  return { notes: state.notes, connections: state.connections };
}

async function pushNow(force = false) {
  const s = currentSession();
  if (!s) return;
  // Never overwrite an account before this browser has read (and merged) what it already holds.
  if (!force && readMeta().userId !== s.user.id) { void pullFromCloud(); return; }
  setStatus("syncing");
  try {
    const data = currentData();
    await cloudSave(data);
    writeMeta({ userId: s.user.id, dirty: false });
    setStatus("synced");
    await syncNoteMediaToCloud(collectMediaIds(data.notes));
  } catch {
    setStatus("error");
  }
}

function scheduleCloudSave() {
  const s = currentSession();
  if (!s || !state.hydrated) return;
  writeMeta({ ...readMeta(), dirty: true });
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function run() {
    if (syncing) { syncTimer = setTimeout(run, 500); return; }
    void pushNow();
  }, 1000);
}

/** Brings the account's notes into this browser (merging the first time, or when this browser has unsent edits). */
async function pullFromCloud() {
  const s = currentSession();
  if (!s || !state.hydrated || syncing) return;
  syncing = true;
  setStatus("syncing");
  try {
    const before = state;
    const cloud = await cloudLoad();
    if (currentSession()?.user.id !== s.user.id) return;
    const meta = readMeta();
    const local = currentData();
    const needsMerge = meta.userId !== s.user.id || meta.dirty || state !== before;
    if (!cloud) {
      await pushNow(true);
      return;
    }
    const cloudData: NotesData = { notes: cloud.notes, connections: cloud.connections };
    const next = !needsMerge || isOnlySampleData(local) ? cloudData : mergeNotesData(local, cloudData);
    state = { ...next, hydrated: true };
    emit();
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    if (needsMerge && !isOnlySampleData(local)) await pushNow(true);
    else { writeMeta({ userId: s.user.id, dirty: false }); setStatus("synced"); }
  } catch {
    setStatus("error");
  } finally {
    syncing = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener(AUTH_EVENT, () => {
    if (currentSession()) void pullFromCloud();
    else setStatus("local");
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !readMeta().dirty) void pullFromCloud();
  });
}

/** Manually re-syncs with the account (used by the "Sincronizar agora" button). */
export function syncNow() {
  if (readMeta().dirty) void pushNow();
  else void pullFromCloud();
}

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { notes, connections } = state;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, connections }));
    } catch {
      // storage full or blocked; keep working in memory
    }
    scheduleCloudSave();
  }, 250);
}

function set(next: NotesData) {
  state = { ...next, hydrated: true };
  emit();
  persist();
}

/** Loads notes from this browser once, after the page has hydrated. */
export function hydrateNotes() {
  if (state.hydrated || typeof window === "undefined") return;
  let data: NotesData | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NotesData>;
      data = {
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      };
    }
  } catch {
    data = null;
  }
  if (data) {
    state = { ...data, hydrated: true };
    emit();
  } else {
    set(sampleData());
  }
  if (currentSession()) void pullFromCloud();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useNotesState(): StoreState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

export function useNote(id: string): { hydrated: boolean; note: Note | undefined } {
  const s = useNotesState();
  return { hydrated: s.hydrated, note: s.notes.find((n) => n.id === id) };
}

export const notesActions = {
  restoreBackup(data: NotesData) {
    set({ notes: data.notes, connections: data.connections });
  },
  create(input: { title: string; description: string; color?: NoteColor; emoji?: string; coverImage?: string }): Note {
    const { data, note } = addNote(state, input);
    set(data);
    return note;
  },
  update(id: string, patch: Partial<Omit<Note, "id" | "createdAt">>) {
    set(updateNote(state, id, patch));
  },
  move(id: string, x: number, y: number) {
    set(moveNote(state, id, x, y));
  },
  remove(id: string) {
    set(deleteNote(state, id));
  },
  toggleConnection(a: string, b: string) {
    set(toggleConnection(state, a, b));
  },
  removeConnection(id: string) {
    set(removeConnection(state, id));
  },
  getNote(id: string): Note | undefined {
    return state.notes.find((n) => n.id === id);
  },
};
