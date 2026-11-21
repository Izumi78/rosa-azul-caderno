import { useSyncExternalStore } from "react";
import { cloudLoad, cloudSave, currentSession } from "./supabase-cloud";

import {
  addNote,
  deleteNote,
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

interface StoreState extends NotesData {
  hydrated: boolean;
}

const SERVER_STATE: StoreState = { hydrated: false, notes: [], connections: [] };
let state: StoreState = SERVER_STATE;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let syncTimer: ReturnType<typeof setTimeout> | undefined;
let syncing = false;
function scheduleCloudSave() {
  if (!currentSession() || !state.hydrated) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { void cloudSave({ notes: state.notes, connections: state.connections }).catch(() => {}); }, 800);
}
function syncFromAccount() {
  if (!currentSession() || !state.hydrated || syncing) return;
  syncing = true;
  void cloudLoad().then((cloud) => {
    if (cloud && Array.isArray(cloud.notes) && Array.isArray(cloud.connections)) {
      const localHasData = state.notes.length > 0 && !state.notes.every((n) => n.id === "boas-vindas" || n.id === "ideias-projeto" || n.id === "leituras");
      if (!localHasData) { state = { ...state, notes: cloud.notes, connections: cloud.connections }; emit(); persist(); }
      else scheduleCloudSave();
    } else scheduleCloudSave();
  }).catch(() => {}).finally(() => { syncing = false; });
}
if (typeof window !== "undefined") window.addEventListener("rosa-auth-change", syncFromAccount);

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
      scheduleCloudSave();
    } catch {
      // storage full or blocked; keep working in memory
    }
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
  create(input: { title: string; description: string; color?: NoteColor }): Note {
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
