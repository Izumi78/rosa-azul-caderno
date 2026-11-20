import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bold, Check, Code2, Eye, FileImage, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, PenLine, Quote, Sparkles, Strikethrough, Trash2, Waypoints } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";

import { AiAssistant } from "@/components/ai-assistant";
import { ColorPicker } from "@/components/color-picker";
import { LinksPanel } from "@/components/links-panel";
import { MarkdownView } from "@/components/markdown-view";
import { NOTE_COLOR_BG } from "@/components/note-colors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { connectedNotes, type Note } from "@/lib/notes-model";
import { notesActions, useNotesState } from "@/lib/notes-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nota/$id")({
  head: () => ({
    meta: [
      { title: "Bloco de notas — Rosa Azul" },
      { name: "description", content: "Escreva, guarde links e peça ajuda à Íris neste bloco de notas." },
      { property: "og:title", content: "Bloco de notas — Rosa Azul" },
      { property: "og:description", content: "Escreva, guarde links e peça ajuda à Íris neste bloco de notas." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotePage,
});

function NotePage() {
  const { id } = Route.useParams();
  const state = useNotesState();
  const note = state.notes.find((n) => n.id === id);

  if (!state.hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Skeleton className="h-[70vh] rounded-lg bg-secondary" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Bloco não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Ele pode ter sido apagado.</p>
        <Button asChild className="mt-6">
          <Link to="/">Voltar aos blocos</Link>
        </Button>
      </div>
    );
  }

  return <NoteEditor key={note.id} note={note} />;
}

function NoteEditor({ note }: { note: Note }) {
  const state = useNotesState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"write" | "view">("write");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverUploadRef = useRef<HTMLInputElement>(null);
  const related = useMemo(() => connectedNotes(state, note.id), [state, note.id]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [note.content, mode]);

  const words = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;
  const insertAtCursor = (before: string, after = before, placeholder = "texto") => {
    const el = textRef.current, value = note.content, start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || placeholder;
    notesActions.update(note.id, { content: value.slice(0, start) + before + selected + after + value.slice(end) });
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(start + before.length, start + before.length + selected.length); } });
  };
  const insertLink = () => {\n    const url = window.prompt("Cole ou digite o endereço do link:");\n    if (!url?.trim()) return;\n    const label = window.prompt("Texto que aparecerá no link:", url.trim()) || url.trim();\n    insertAtCursor("[", `](${url.trim()})`, label);\n  };\n  const insertLinePrefix = (prefix: string) => {
    const el = textRef.current, value = note.content, start = el?.selectionStart ?? value.length, lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    notesActions.update(note.id, { content: value.slice(0, lineStart) + prefix + value.slice(lineStart) });
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length); } });
  };
  const addFileAttachment = (file: File) => {
    if (file.size > 400 * 1024) { window.alert("Arquivo maior que 400 KB. Anexe um arquivo menor para manter o caderno leve."); return; }
    const reader = new FileReader();
    reader.onload = () => { const data = String(reader.result || ""), name = file.name.replace(/[\[\]()]/g, "_");
      notesActions.update(note.id, { content: note.content + (note.content.endsWith("\n") ? "" : "\n\n") + "[" + name + "](" + data + ")\n" });
    };
    reader.readAsDataURL(file);
  };
  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"))?.getAsFile();
    if (!file) return; event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => { const img = new Image(); img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height)), canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.72), el = textRef.current, value = note.content, start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
      notesActions.update(note.id, { content: value.slice(0, start) + "\n![Imagem colada](" + data + ")\n" + value.slice(end) });
    }; img.src = String(reader.result); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 animate-note-open">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Blocos
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              <Check className="h-3.5 w-3.5" /> Salvo · {words} {words === 1 ? "palavra" : "palavras"}
            </span>
            <ColorPicker value={note.color} onChange={(color) => notesActions.update(note.id, { color })} />
            <div className="flex rounded-full border border-border bg-paper p-0.5">
              <ModeButton active={mode === "write"} onClick={() => setMode("write")} icon={PenLine} label="Escrever" />
              <ModeButton active={mode === "view"} onClick={() => setMode("view")} icon={Eye} label="Visualizar" />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label="Apagar bloco">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-paper">
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar “{note.title}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A página, os links, a conversa com a Íris e as ligações no mural serão apagados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      notesActions.remove(note.id);
                      void navigate({ to: "/" });
                    }}
                  >
                    Apagar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <article className="paper-ruled relative min-h-[75vh] overflow-hidden rounded-lg border border-border pb-16 pl-16 pr-6 pt-8 shadow-lift sm:pr-12">
          <span className={cn("absolute inset-x-0 top-0 h-1.5", NOTE_COLOR_BG[note.color])} />
          <input
            value={note.title}
            onChange={(e) => notesActions.update(note.id, { title: e.target.value })}
            placeholder="Título"
            aria-label="Título do bloco"
            className="block h-16 w-full bg-transparent font-display text-3xl font-semibold leading-[4rem] text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-4xl"
          />
                    <div className="rosa-note-customize relative z-10 my-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/10 bg-background/35 p-2.5 backdrop-blur-md">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Emoji
              <input value={note.emoji || "🌷"} onChange={(e) => notesActions.update(note.id, { emoji: e.target.value })} maxLength={8} aria-label="Emoji do bloco" className="h-9 w-14 rounded-lg border border-border bg-paper/70 text-center text-lg outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <input value={note.coverImage?.startsWith("data:") ? "Imagem carregada ✓" : note.coverImage || ""} onChange={(e) => notesActions.update(note.id, { coverImage: e.target.value })} disabled={note.coverImage?.startsWith("data:")} placeholder="URL da foto de capa" aria-label="URL da foto de capa" className="h-9 min-w-[140px] flex-1 rounded-lg border border-border bg-paper/70 px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
            <Button type="button" variant="outline" size="sm" className="h-9 bg-paper/60" onClick={() => coverUploadRef.current?.click()}><ImagePlus className="h-4 w-4" />Foto</Button>
            <input ref={coverUploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 300 * 1024) { window.alert("A foto de capa deve ter até 300 KB."); e.currentTarget.value = ""; return; } const reader = new FileReader(); reader.onload = () => notesActions.update(note.id, { coverImage: String(reader.result || "") }); reader.readAsDataURL(file); e.currentTarget.value = ""; }} />
            {note.coverImage && <Button type="button" variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => notesActions.update(note.id, { coverImage: "" })}>Remover foto</Button>}
          </div>
<input
            value={note.description}
            onChange={(e) => notesActions.update(note.id, { description: e.target.value })}
            placeholder="Descrição curta do bloco"
            aria-label="Descrição do bloco"
            className="block h-8 w-full bg-transparent font-serif text-base italic leading-8 text-muted-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <div className="mt-8">
            {mode === "write" ? (
              <>
              <div className="rosa-editor-tools mb-3 flex flex-wrap items-center gap-1 rounded-2xl border border-primary/10 bg-paper/70 p-2 shadow-sm backdrop-blur">
<Button type="button" variant="ghost" size="icon" title="Negrito" aria-label="Negrito" onClick={() => insertAtCursor("**", "**")}><Bold className="h-4 w-4" /></Button>
<Button type="button" variant="ghost" size="icon" title="Itálico" aria-label="Itálico" onClick={() => insertAtCursor("*", "*")}><Italic className="h-4 w-4" /></Button>
<Button type="button" variant="ghost" size="icon" title="Título" aria-label="Título" onClick={() => insertLinePrefix("## ")}><Heading2 className="h-4 w-4" /></Button>
<Button type="button" variant="ghost" size="icon" title="Lista" aria-label="Lista" onClick={() => insertLinePrefix("- ")}><List className="h-4 w-4" /></Button>
<Button type="button" variant="ghost" size="icon" title="Citação" aria-label="Citação" onClick={() => insertLinePrefix("> ")}><Quote className="h-4 w-4" /></Button>
<Button type="button" variant="ghost" size="icon" title="Riscado" aria-label="Riscado" onClick={() => insertAtCursor("~~", "~~")}><Strikethrough className="h-4 w-4" /></Button>\n<Button type="button" variant="ghost" size="icon" title="Código" aria-label="Código" onClick={() => insertAtCursor("`", "`")}><Code2 className="h-4 w-4" /></Button>\n<Button type="button" variant="ghost" size="icon" title="Lista numerada" aria-label="Lista numerada" onClick={() => insertLinePrefix("1. ")}><ListOrdered className="h-4 w-4" /></Button>\n<Button type="button" variant="ghost" size="icon" title="Checklist" aria-label="Checklist" onClick={() => insertLinePrefix("- [ ] ")}><Check className="h-4 w-4" /></Button>\n<Button type="button" variant="ghost" size="icon" title="Inserir link" aria-label="Inserir link" onClick={insertLink}><Link2 className="h-4 w-4" /></Button>\n<Button type="button" variant="ghost" size="icon" title="Separador" aria-label="Separador" onClick={() => insertLinePrefix("---\\n")}><span className="text-xs font-bold">—</span></Button>
<span className="mx-1 h-5 w-px bg-border" />
<Button type="button" variant="ghost" size="sm" className="gap-1.5" title="Inserir imagem ou arquivo" onClick={() => fileRef.current?.click()}><FileImage className="h-4 w-4" />Imagem/Arquivo</Button>
<input ref={fileRef} type="file" accept="image/*,application/pdf,text/plain" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) addFileAttachment(file); e.currentTarget.value = ""; }} />
</div>
<textarea
                ref={textRef}
                value={note.content}
                onChange={(e) => notesActions.update(note.id, { content: e.target.value })}
                onPaste={handlePaste}
                placeholder="Comece a escrever… (dica: use # para títulos, - para listas)"
                aria-label="Conteúdo da página"
                className="block min-h-[55vh] w-full resize-none overflow-hidden bg-transparent font-serif text-lg leading-8 text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              </>
            ) : note.content.trim() ? (
              <MarkdownView source={note.content} className="text-lg" />
            ) : (
              <p className="font-serif text-lg leading-8 text-muted-foreground">Página em branco.</p>
            )}
          </div>
        </article>
      </div>

      <aside className="flex h-[80vh] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-sidebar shadow-paper animate-slide-in-right lg:sticky lg:top-20 lg:h-[calc(100vh-6.5rem)]">
        <Tabs defaultValue="ia" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="m-3 grid grid-cols-3 bg-secondary">
            <TabsTrigger value="ia" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Íris
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Links
              {note.links.length > 0 && <span className="text-xs text-muted-foreground">{note.links.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="ligacoes" className="gap-1.5">
              <Waypoints className="h-3.5 w-3.5" /> Ligações
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ia" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
            <AiAssistant note={note} related={related.map((n) => n.title)} />
          </TabsContent>
          <TabsContent value="links" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
            <LinksPanel note={note} />
          </TabsContent>
          <TabsContent value="ligacoes" className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden">
            <ConnectionsPanel note={note} related={related} all={state.notes} />
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof PenLine;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function ConnectionsPanel({ note, related, all }: { note: Note; related: Note[]; all: Note[] }) {
  const candidates = all.filter((n) => n.id !== note.id && !related.some((r) => r.id === n.id));
  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-muted-foreground">
        Blocos com assuntos ligados a este. Você também pode ligar blocos arrastando no{" "}
        <Link to="/mural" className="font-medium text-rose underline underline-offset-2">
          Mural
        </Link>
        .
      </p>
      {candidates.length > 0 && (
        <Select value="" onValueChange={(v) => notesActions.toggleConnection(note.id, v)}>
          <SelectTrigger className="bg-paper">
            <SelectValue placeholder="Ligar a outro bloco…" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <ul className="space-y-2">
        {related.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">Nenhuma ligação ainda.</li>
        )}
        {related.map((r) => (
          <li key={r.id} className="group flex items-center gap-3 rounded-lg border border-border bg-paper p-3 shadow-paper">
            <span className={cn("h-8 w-1.5 shrink-0 rounded-full", NOTE_COLOR_BG[r.color])} />
            <Link to="/nota/$id" params={{ id: r.id }} className="min-w-0 flex-1">
              <p className="truncate font-display font-semibold group-hover:text-primary">{r.title}</p>
              <p className="truncate text-xs text-muted-foreground">{r.description || "Sem descrição"}</p>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => notesActions.toggleConnection(note.id, r.id)}
            >
              Desligar
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
