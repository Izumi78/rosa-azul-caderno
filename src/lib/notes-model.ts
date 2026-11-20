// Pure data rules for notebooks and the board. No browser APIs here so they stay testable.

export type NoteColor = "roxo" | "azul" | "tinta";

export type NoteFont = "serif" | "sans" | "mono";
export type NotePaper = "cream" | "lavender" | "blue" | "dark";
export type TaskStatus = "fazer" | "fazendo" | "feito";
export interface NoteStyle { font: NoteFont; size: number; paper: NotePaper; }

export interface NoteLink {
  id: string;
  url: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface VisualElement {
  id: string;
  type: "text" | "image" | "video";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
}

export interface Note {
  id: string;
  title: string;
  description: string;
  content: string;
  color: NoteColor;
  status?: TaskStatus;
  emoji?: string;
  coverImage?: string;
  style?: NoteStyle;
  layoutElements?: VisualElement[];
  links: NoteLink[];
  chat: ChatMessage[];
  position: { x: number; y: number };
  createdAt: number;
  updatedAt: number;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface NotesData {
  notes: Note[];
  connections: Connection[];
}

export const NOTE_COLORS: NoteColor[] = ["roxo", "azul", "tinta"];

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const SLOT_W = 280;
const SLOT_H = 190;

/** Finds the first spot in a loose grid on the board that no existing card overlaps. */
export function nextBoardPosition(taken: { x: number; y: number }[]): { x: number; y: number } {
  for (let i = 0; i < 400; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const pos = { x: 60 + col * SLOT_W, y: 60 + row * SLOT_H };
    const clash = taken.some((t) => Math.abs(t.x - pos.x) < SLOT_W - 20 && Math.abs(t.y - pos.y) < SLOT_H - 30);
    if (!clash) return pos;
  }
  return { x: 60, y: 60 + taken.length * 40 };
}

export function addNote(
  data: NotesData,
  input: { title: string; description: string; color?: NoteColor; emoji?: string; coverImage?: string },
  now = Date.now(),
): { data: NotesData; note: Note } {
  const note: Note = {
    id: makeId(),
    title: input.title.trim() || "Sem título",
    description: input.description.trim(),
    content: "",
    color: input.color ?? "roxo",
    status: "fazer",
    emoji: input.emoji || "🌷",
    coverImage: input.coverImage || "",
    links: [],
    chat: [],
    position: nextBoardPosition(data.notes.map((n) => n.position)),
    createdAt: now,
    updatedAt: now,
  };
  return { data: { ...data, notes: [note, ...data.notes] }, note };
}

export function updateNote(
  data: NotesData,
  id: string,
  patch: Partial<Omit<Note, "id" | "createdAt">>,
  now = Date.now(),
): NotesData {
  return {
    ...data,
    notes: data.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)),
  };
}

/** Moving a card on the board is not an edit, so it does not touch updatedAt. */
export function moveNote(data: NotesData, id: string, x: number, y: number): NotesData {
  return {
    ...data,
    notes: data.notes.map((n) =>
      n.id === id ? { ...n, position: { x: Math.max(0, x), y: Math.max(0, y) } } : n,
    ),
  };
}

/** Deleting a note also removes every board connection that touched it. */
export function deleteNote(data: NotesData, id: string): NotesData {
  return {
    notes: data.notes.filter((n) => n.id !== id),
    connections: data.connections.filter((c) => c.from !== id && c.to !== id),
  };
}

export function areConnected(data: NotesData, a: string, b: string): boolean {
  return data.connections.some(
    (c) => (c.from === a && c.to === b) || (c.from === b && c.to === a),
  );
}

/** Links two notes; linking an already-linked pair (either direction) unlinks it. A note never links to itself. */
export function toggleConnection(data: NotesData, a: string, b: string): NotesData {
  if (a === b) return data;
  if (!data.notes.some((n) => n.id === a) || !data.notes.some((n) => n.id === b)) return data;
  if (areConnected(data, a, b)) {
    return {
      ...data,
      connections: data.connections.filter(
        (c) => !((c.from === a && c.to === b) || (c.from === b && c.to === a)),
      ),
    };
  }
  return { ...data, connections: [...data.connections, { id: makeId(), from: a, to: b }] };
}

export function removeConnection(data: NotesData, connectionId: string): NotesData {
  return { ...data, connections: data.connections.filter((c) => c.id !== connectionId) };
}

export function connectedNotes(data: NotesData, id: string): Note[] {
  const ids = new Set(
    data.connections.flatMap((c) => (c.from === id ? [c.to] : c.to === id ? [c.from] : [])),
  );
  return data.notes.filter((n) => ids.has(n.id));
}

/** Accepts "site.com" style input and returns a full https URL, or null when it is not a link. */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sampleData(now = Date.now()): NotesData {
  const base = (over: Partial<Note> & Pick<Note, "id" | "title">): Note => ({
    description: "",
    content: "",
    color: "roxo",
    links: [],
    chat: [],
    position: { x: 60, y: 60 },
    createdAt: now,
    updatedAt: now,
    ...over,
  });
  const notes: Note[] = [
    base({
      id: "boas-vindas",
      title: "Bem-vindo à Rosa Azul",
      description: "Como usar seus blocos, o mural e a Íris, sua assistente.",
      color: "roxo",
      position: { x: 80, y: 80 },
      content: `# Bem-vindo 🌹

Cada bloco é uma página inteira para escrever.

- Use a aba **Links** para guardar referências.
- Peça ajuda à **Íris** para organizar ideias, revisar textos, criar gráficos e relatórios.
- No **Mural**, ligue blocos que tratam de assuntos parecidos.
`,
    }),
    base({
      id: "ideias-projeto",
      title: "Ideias de projeto",
      description: "Rascunho solto de ideias para desenvolver depois.",
      color: "azul",
      position: { x: 440, y: 220 },
      content: `- Um diário de leituras
- Planejar viagem de fim de ano
- Estudar sobre jardinagem`,
    }),
    base({
      id: "leituras",
      title: "Leituras do mês",
      description: "Livros e artigos que quero ler e anotar.",
      color: "tinta",
      position: { x: 800, y: 90 },
      links: [{ id: "l1", url: "https://pt.wikipedia.org/wiki/Rosa_azul", label: "Rosa azul — Wikipédia" }],
    }),
  ];
  return {
    notes,
    connections: [
      { id: "c1", from: "boas-vindas", to: "ideias-projeto" },
      { id: "c2", from: "ideias-projeto", to: "leituras" },
    ],
  };
}
