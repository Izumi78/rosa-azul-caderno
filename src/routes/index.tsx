import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { NewNoteDialog } from "@/components/new-note-dialog";
import { NoteCard } from "@/components/note-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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

function exportBackup(notes: ReturnType<typeof useNotesState>["notes"], connections: ReturnType<typeof useNotesState>["connections"]) {
  const backup = {
    app: "Rosa Azul",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    notes,
    connections,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rosa-azul-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

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
    <div className="rosa-home mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <section className="rosa-home-hero flex flex-col items-center gap-5 text-center">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose">ROSA AZUL · ESPAÇO CRIATIVO</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Um espaço para suas <em className="text-primary">ideias</em>.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Organize pensamentos, projetos e inspirações em pequenos espaços que se conectam.
          </p>
        </div>
        <div className="rosa-home-actions flex flex-wrap items-center justify-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar blocos"
              className="h-11 w-64 rounded-full border-white/40 bg-white/35 pl-9 shadow-sm backdrop-blur-lg"
              aria-label="Buscar blocos"
            />
          </div>
          <div className="flex items-center gap-2"><Button type="button" variant="outline" className="h-11 rounded-full border-white/40 bg-white/35 shadow-sm backdrop-blur-lg" onClick={() => exportBackup(notes, connections)} disabled={!hydrated} title="Baixar cópia de segurança de todas as notas e conexões"><Download className="h-4 w-4" /> Backup</Button><NewNoteDialog /></div>
        </div>
      </section>

      <section className="rosa-note-grid mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {!hydrated &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl bg-secondary" />
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
                className="rosa-create-card aspect-square flex animate-fade-up flex-col items-center justify-center gap-3 rounded-[1.4rem] border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:bg-paper hover:text-primary"
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
