import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link2, Waypoints } from "lucide-react";

import type { Note } from "@/lib/notes-model";
import { cn } from "@/lib/utils";

import { NOTE_COLOR_BG, NOTE_COLOR_TEXT } from "./note-colors";

export function NoteCard({ note, links, index }: { note: Note; links: number; index: number }) {
  return (
    <Link
      to="/nota/$id"
      params={{ id: note.id }}
      className="group relative block min-h-[230px] animate-fade-up focus-visible:outline-none"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <article
        className={cn(
          "rosa-note-glass paper-ruled relative flex h-full min-h-[230px] flex-col overflow-hidden rounded-2xl border border-border p-5 pl-14 shadow-paper transition-all duration-300 ease-out",
          "group-hover:-translate-y-1 group-hover:-rotate-[0.35deg] group-hover:shadow-lift group-focus-visible:ring-2 group-focus-visible:ring-ring",
        )}
      >
        <span className={cn("absolute inset-y-0 left-0 w-2", NOTE_COLOR_BG[note.color])} />
        <span className="absolute left-4 top-5 flex flex-col gap-4" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full border border-border bg-background shadow-inner" />
          ))}
        </span>
        <h2 className="line-clamp-2 text-lg font-semibold leading-7 text-foreground sm:text-xl">
          {note.title}
        </h2>
        <p className="mt-1 line-clamp-3 font-serif text-[14px] leading-7 text-muted-foreground">
          {note.description || "Sem descrição"}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(note.updatedAt, { addSuffix: true, locale: ptBR })}
          </span>
          <span className="flex items-center gap-3">
            {note.links.length > 0 && (
              <span className="flex items-center gap-1" title="Links salvos">
                <Link2 className="h-3.5 w-3.5" />
                {note.links.length}
              </span>
            )}
            {links > 0 && (
              <span className={cn("flex items-center gap-1", NOTE_COLOR_TEXT[note.color])} title="Ligações no mural">
                <Waypoints className="h-3.5 w-3.5" />
                {links}
              </span>
            )}
          </span>
        </div>
      </article>
    </Link>
  );
}
