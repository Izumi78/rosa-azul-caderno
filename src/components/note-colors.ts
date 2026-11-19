import type { NoteColor } from "@/lib/notes-model";

export const NOTE_COLOR_LABEL: Record<NoteColor, string> = {
  roxo: "Roxo",
  azul: "Azul",
  tinta: "Preto",
};

export const NOTE_COLOR_BG: Record<NoteColor, string> = {
  roxo: "bg-note-roxo",
  azul: "bg-note-azul",
  tinta: "bg-note-tinta",
};

export const NOTE_COLOR_TEXT: Record<NoteColor, string> = {
  roxo: "text-note-roxo",
  azul: "text-note-azul",
  tinta: "text-note-tinta",
};

export const NOTE_COLOR_BORDER: Record<NoteColor, string> = {
  roxo: "border-note-roxo",
  azul: "border-note-azul",
  tinta: "border-note-tinta",
};
