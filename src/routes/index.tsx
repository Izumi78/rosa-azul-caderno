import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { NewNoteDialog } from "@/components/new-note-dialog";
import { NoteCard } from "@/components/note-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotesState } from "@/lib/notes-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rosa Azul — seus blocos de notas" },
      {
        name: "description",
        content: "Todos os seus blocos de notas em um só lugar, com páginas para escrever, links e uma assistente de IA.",
      },
      { property: "og:title", content: "Rosa Azul — seus blocos de notas" },
      {
        property: "og:description",
        content: "Todos os seus blocos de notas em um só lugar, com páginas para escrever, links e uma assistente de IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { notes, connections, hydrated } = useNotesState();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return list;
    return list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q),
    );
  }, [notes, query]);

  const linkCount = (id: string) => connections.filter((c) => c.from === id || c.to === id).length;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose">Seu caderno</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Ideias que <em className="text-primary">florescem</em> em páginas.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Cada bloco guarda uma página inteira, seus links e uma conversa com a Íris.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar blocos"
              className="h-11 w-56 rounded-full bg-paper pl-9"
              aria-label="Buscar blocos"
            />
          </div>
          <NewNoteDialog />
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {!hydrated &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg bg-secondary" />
          ))}
        {hydrated &&
          filtered.map((note, i) => (
            <NoteCard key={note.id} note={note} links={linkCount(note.id)} index={i} />
          ))}
        {hydrated && !query && (
          <NewNoteDialog
            trigger={
              <button
                type="button"
                className="flex aspect-square animate-fade-up flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:bg-paper hover:text-primary"
                style={{ animationDelay: `${Math.min(filtered.length, 12) * 45}ms` }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <Plus className="h-6 w-6" />
                </span>
                <span className="font-display text-lg">Criar novo bloco</span>
              </button>
            }
          />
        )}
      </section>
      {hydrated && query && filtered.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">Nenhum bloco encontrado para “{query}”.</p>
      )}
    </div>
  );
}
