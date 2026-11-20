import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Download, Plus, Search, Upload, Waypoints } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { NewNoteDialog } from "@/components/new-note-dialog";
import { HomeCalendar } from "@/components/home-calendar";
import { NoteCard } from "@/components/note-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { notesActions, useNotesState } from "@/lib/notes-store";

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
  const importRef = useRef<HTMLInputElement>(null);

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
  const importBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.app !== "Rosa Azul" || !Array.isArray(parsed.notes) || !Array.isArray(parsed.connections)) {
        window.alert("Arquivo de backup inválido.");
        return;
      }
      const notesValid = parsed.notes.every((n: any) => n && typeof n.id === "string" && typeof n.title === "string" && typeof n.content === "string");
      const connectionsValid = parsed.connections.every((c: any) => c && typeof c.id === "string" && typeof c.from === "string" && typeof c.to === "string");
      if (!notesValid || !connectionsValid) { window.alert("Backup incompleto ou inválido. Nada foi alterado."); return; }
      if (!window.confirm("Importar " + parsed.notes.length + " notas? Isso substituirá o conteúdo atual. Faça backup antes.")) return;
      notesActions.restoreBackup({ notes: parsed.notes, connections: parsed.connections });
      window.alert("Backup restaurado!");
    } catch { window.alert("Não foi possível ler esse arquivo JSON."); }
  };


  return (
    <div className="rosa-home rosa-home-dark mx-auto max-w-[1440px] px-5 pb-20 pt-7 sm:px-8">
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
          <div className="flex items-center gap-2"><Button type="button" variant="outline" className="h-11 rounded-full border-white/40 bg-white/35 shadow-sm backdrop-blur-lg" onClick={() => exportBackup(notes, connections)} disabled={!hydrated} title="Baixar cópia de segurança de todas as notas e conexões"><Download className="h-4 w-4" /> Backup</Button><Button type="button" variant="outline" className="h-11 rounded-full border-white/40 bg-white/35 shadow-sm backdrop-blur-lg" onClick={() => importRef.current?.click()} disabled={!hydrated} title="Restaurar backup JSON"><Upload className="h-4 w-4" /> Restaurar</Button><input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importBackup(file); e.currentTarget.value = ""; }} /><NewNoteDialog /></div>
        </div>
      </section>

      <HomeCalendar />

      <section className="rosa-workspace-summary mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rosa-summary-tile">
          <span className="rosa-summary-icon"><BookOpen className="h-4 w-4" /></span>
          <span className="rosa-summary-copy"><strong>{notes.length}</strong><small>{notes.length === 1 ? "bloco criado" : "blocos criados"}</small></span>
        </div>
        <div className="rosa-summary-tile">
          <span className="rosa-summary-icon"><Waypoints className="h-4 w-4" /></span>
          <span className="rosa-summary-copy"><strong>{connections.length}</strong><small>{connections.length === 1 ? "conexão no mural" : "conexões no mural"}</small></span>
        </div>
        <div className="rosa-summary-tile col-span-2 sm:col-span-1">
          <span className="rosa-summary-copy"><strong>{hydrated ? "Seu espaço está pronto" : "Preparando seu espaço"}</strong><small>Ideias, referências e projetos em um só lugar</small></span>
        </div>
      </section>

      <div className="rosa-section-heading mt-9">
        <div><p className="rosa-section-eyebrow">SUA BIBLIOTECA</p><h2>Seus blocos de ideias</h2></div>
        <span>{query ? `${filtered.length} resultado(s)` : "Atualizados recentemente"}</span>
      </div>
      <section className="rosa-note-grid mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
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
                className="rosa-create-card aspect-square flex animate-fade-up flex-col items-center justify-center gap-3 rounded-[1.4rem] border border-dashed border-primary/30 text-muted-foreground transition-colors hover:border-primary hover:bg-paper hover:text-primary"
                style={{ animationDelay: `${Math.min(filtered.length, 12) * 45}ms` }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-paper/70 shadow-paper">
                  <Plus className="h-6 w-6" />
                </span>
                <span className="font-display text-lg">Criar novo bloco</span>
                <span className="max-w-[13rem] text-center text-xs text-muted-foreground">Abra uma nova página para guardar uma ideia.</span>
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
