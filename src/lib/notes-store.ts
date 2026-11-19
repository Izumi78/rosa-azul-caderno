import { useSyncExternalStore } from "react";

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
