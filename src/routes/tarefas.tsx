import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Clock3, Plus, ArrowRight } from "lucide-react";
import { useMemo, useState, type DragEvent } from "react";

import { NewNoteDialog } from "@/components/new-note-dialog";
import { Button } from "@/components/ui/button";
import { NOTE_COLOR_BG } from "@/components/note-colors";
import { notesActions, useNotesState } from "@/lib/notes-store";
import type { TaskStatus } from "@/lib/notes-model";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Rosa Azul" }, { name: "description", content: "Organize suas notas em Fazer, Fazendo e Feito." }] }),
  component: TasksPage,
});

const columns: { id: TaskStatus; title: string; hint: string; icon: typeof Circle; tone: string }[] = [
  { id: "fazer", title: "Fazer", hint: "Ideias e próximas tarefas", icon: Circle, tone: "text-sky-300" },
  { id: "fazendo", title: "Fazendo", hint: "Em andamento agora", icon: Clock3, tone: "text-violet-300" },
  { id: "feito", title: "Feito", hint: "Concluído e entregue", icon: CheckCircle2, tone: "text-emerald-300" },
];

function TasksPage() {
  const { notes, hydrated } = useNotesState();
  const [dragging, setDragging] = useState<string | null>(null);
  const groups = useMemo(() => ({
    fazer: notes.filter((n) => (n.status || "fazer") === "fazer"),
    fazendo: notes.filter((n) => n.status === "fazendo"),
    feito: notes.filter((n) => n.status === "feito"),
  }), [notes]);

  function startDrag(event: DragEvent<HTMLElement>, id: string) {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setDragging(id);
  }
  function drop(event: DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    if (id) notesActions.update(id, { status });
    setDragging(null);
  }

  return (
    <div className="rosa-kanban-page mx-auto min-h-[calc(100vh-4.5rem)] max-w-[1500px] px-5 pb-16 pt-8 sm:px-8">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">ROSA AZUL · FLUXO DE TRABALHO</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Quadro de atividades</h1>
          <p className="mt-2 text-sm text-violet-100/65">Organize seus blocos como cartões e mova cada atividade entre as etapas.</p>
        </div>
        <NewNoteDialog trigger={<Button className="rounded-xl"><Plus className="h-4 w-4" />Nova atividade</Button>} />
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-violet-100/60">
        <span>{hydrated ? notes.length : "—"} cartões no quadro</span>
        <span>·</span>
        <span>Arraste um cartão para mudar sua etapa</span>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        {columns.map((column) => {
          const Icon = column.icon;
          const items = groups[column.id];
          return (
            <section key={column.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e, column.id)}
              className={cn("rosa-kanban-column min-h-[420px] rounded-2xl border p-3 sm:p-4", dragging && "is-drop-ready")}>
              <header className="mb-4 flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", column.tone)} />
                  <h2 className="font-semibold text-white">{column.title}</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-violet-100/70">{items.length}</span>
                </div>
                <span className="hidden text-[10px] text-violet-100/45 sm:block">{column.hint}</span>
              </header>
              <div className="space-y-3">
                {items.map((note) => (
                  <article key={note.id} draggable onDragStart={(e) => startDrag(e, note.id)} onDragEnd={() => setDragging(null)}
                    className={cn("rosa-kanban-card group relative overflow-hidden rounded-xl border p-3 transition-all", dragging === note.id && "opacity-40")}>
                    <span className={cn("absolute inset-y-0 left-0 w-1", NOTE_COLOR_BG[note.color])} />
                    <div className="flex items-start gap-2 pl-1">
                      <span className="text-lg">{note.emoji || "🌷"}</span>
                      <div className="min-w-0 flex-1">
                        <Link to="/nota/$id" params={{ id: note.id }} className="font-semibold text-white hover:text-violet-200">{note.title || "Sem título"}</Link>
                        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-violet-100/60">{note.description || note.content.replace(/[#>*_\-\[\]]/g, " ").slice(0, 140) || "Sem descrição"}</p>
                      </div>
                    </div>
                    <footer className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 pl-1">
                      <Link to="/nota/$id" params={{ id: note.id }} className="text-[10px] font-medium text-violet-200/65 hover:text-white">Abrir bloco <ArrowRight className="inline h-3 w-3" /></Link>
                      <span className="text-[10px] text-violet-100/35">{new Date(note.updatedAt).toLocaleDateString("pt-BR")}</span>
                    </footer>
                  </article>
                ))}
                {items.length === 0 && <div className="rosa-kanban-empty flex min-h-32 items-center justify-center rounded-xl border border-dashed border-white/10 px-4 text-center text-xs text-violet-100/40">Solte uma atividade aqui</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
