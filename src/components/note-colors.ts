import type { NoteColor } from "@/lib/notes-model";

export const NOTE_COLOR_LABEL: Record<NoteColor, string> = {
  roxo: "Roxo",
  azul: "Azul",
  rosa: "Rosa",
  tinta: "Preto",
};

export const NOTE_COLOR_BG: Record<NoteColor, string> = {
  roxo: "bg-note-roxo",
  azul: "bg-note-azul",
  rosa: "bg-note-rosa",
  tinta: "bg-note-tinta",
};

export const NOTE_COLOR_TEXT: Record<NoteColor, string> = {
  roxo: "text-note-roxo",
  azul: "text-note-azul",
  rosa: "text-note-rosa",
  tinta: "text-note-tinta",
};

export const NOTE_COLOR_BORDER: Record<NoteColor, string> = {
  roxo: "border-note-roxo",
  azul: "border-note-azul",
  rosa: "border-note-rosa",
  tinta: "border-note-tinta",
};
