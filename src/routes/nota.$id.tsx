import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bold, Check, Code2, Eye, FileImage, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, PenLine, Quote, Sparkles, Strikethrough, Trash2, Waypoints, Undo2, Redo2, Table, SlidersHorizontal, Search, FileText, PanelRightClose, PanelRightOpen, LayoutDashboard } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";

import { AiAssistant } from "@/components/ai-assistant";
import { ColorPicker } from "@/components/color-picker";
import { LinksPanel } from "@/components/links-panel";
import { MarkdownView } from "@/components/markdown-view";
import { VisualLayoutEditor } from "@/components/visual-layout-editor";
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
import { compressImageBlobForNotes, saveMediaFile } from "@/lib/image-utils";
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
  const [mode, setMode] = useState<"write" | "view" | "layout">("write");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const style = note.style || { font: "serif" as const, size: 18, paper: "cream" as const };
  const fontFamily = style.font === "sans" ? "Manrope, system-ui, sans-serif" : style.font === "mono" ? "ui-monospace, monospace" : "Literata, Georgia, serif";
  const paperColors = { cream: "var(--paper)", lavender: "oklch(0.96 0.035 300)", blue: "oklch(0.96 0.035 245)", dark: "oklch(0.24 0.02 285)" };
  const textColor = style.paper === "dark" ? "oklch(0.92 0.02 90)" : "var(--foreground)";
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverUploadRef = useRef<HTMLInputElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const historyCurrent = useRef(note.content);
  const saveContent = (next: string) => {
    if (next === historyCurrent.current) return;
    undoStack.current.push(historyCurrent.current);
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
    historyCurrent.current = next;
    notesActions.update(note.id, { content: next });
  };
  const undoContent = () => {
    const previous = undoStack.current.pop();
    if (previous === undefined) return;
    redoStack.current.push(historyCurrent.current);
    historyCurrent.current = previous;
    notesActions.update(note.id, { content: previous });
  };
  const redoContent = () => {
    const next = redoStack.current.pop();
    if (next === undefined) return;
    undoStack.current.push(historyCurrent.current);
    historyCurrent.current = next;
    notesActions.update(note.id, { content: next });
  };
  const related = useMemo(() => connectedNotes(state, note.id), [state, note.id]);

  useEffect(() => {
    if (historyCurrent.current !== note.content) {
      historyCurrent.current = note.content;
      undoStack.current = [];
      redoStack.current = [];
    }
  }, [note.content]);

  // Migrate legacy Base64 attachments into the same IndexedDB store used by uploads.
  useEffect(() => {
    const legacyMedia = [...note.content.matchAll(/data:(?:image\/(?:jpeg|png|gif|webp)|video\/(?:mp4|webm|ogg)|application\/pdf|text\/plain);base64,[A-Za-z0-9+/=]+/g)].map((match) => match[0]);
    if (legacyMedia.length === 0) return;
    let cancelled = false;
    void (async () => {
      let migrated = note.content;
      for (const dataUrl of [...new Set(legacyMedia)]) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const reference = await saveMediaFile(new File([blob], "anexo-migrado", { type: blob.type || "application/octet-stream" }));
          migrated = migrated.split(dataUrl).join(reference);
        } catch {
          // Keep the original content intact if a legacy attachment cannot be migrated.
        }
      }
      if (!cancelled && migrated !== note.content) saveContent(migrated);
    })();
    return () => { cancelled = true; };
  }, [note.id, note.content]);

  useEffect(() => {
    if (!note.coverImage?.startsWith("data:image/")) return;
    let cancelled = false;
    void (async () => {
      try {
        const blob = await (await fetch(note.coverImage!)).blob();
        const reference = await saveMediaFile(new File([blob], "foto-de-capa", { type: blob.type || "image/jpeg" }));
        if (!cancelled) notesActions.update(note.id, { coverImage: reference });
      } catch {
        // Keep the existing cover if migration is not possible.
      }
    })();
    return () => { cancelled = true; };
  }, [note.id, note.coverImage]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [note.content, mode]);

  const words = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;
  const readingMinutes = Math.max(1, Math.ceil(words / 200));
  const characters = note.content.length;
  const insertAtCursor = (before: string, after = before, placeholder = "texto") => {
    const el = textRef.current, value = note.content, start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || placeholder;
    saveContent(value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(start + before.length, start + before.length + selected.length); } });
  };
  const insertTable = () => {
    const rawRows = window.prompt("Quantas linhas de conteúdo? (1 a 8)", "2");
    if (rawRows === null) return;
    const rawCols = window.prompt("Quantas colunas? (1 a 6)", "3");
    if (rawCols === null) return;
    const rows = Math.min(8, Math.max(1, Number(rawRows) || 2));
    const cols = Math.min(6, Math.max(1, Number(rawCols) || 3));
    const header = "| " + Array.from({ length: cols }, (_, i) => "Coluna " + (i + 1)).join(" | ") + " |";
    const separator = "| " + Array.from({ length: cols }, () => "---").join(" | ") + " |";
    const body = Array.from({ length: rows }, () => "| " + Array.from({ length: cols }, () => " ").join(" | ") + " |").join("\n");
    insertAtCursor("", "", header + "\n" + separator + "\n" + body);
  };
  const insertLink = () => {
    const url = window.prompt("Cole ou digite o endereço do link:");
    if (!url?.trim()) return;
    const label = window.prompt("Texto que aparecerá no link:", url.trim()) || url.trim();
    insertAtCursor("[", "](" + url.trim() + ")", label);
  };
  const insertLinePrefix = (prefix: string) => {
    const el = textRef.current, value = note.content, start = el?.selectionStart ?? value.length, lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    saveContent(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length); } });
  };
  const addFileAttachment = async (file: File) => {
    const name = file.name.replace(/[\\[\\]()]/g, "_");
    try {
      if (file.type.startsWith("image/")) {
        const compressed = await compressImageBlobForNotes(file);
        const reference = await saveMediaFile(new File([compressed], name, { type: compressed.type }));
        saveContent(note.content + (note.content.endsWith("\n") ? "" : "\n\n") + "![" + name + "](" + reference + ")\n");
        return;
      }
      if (file.type.startsWith("video/")) {
        if (!["video/mp4", "video/webm"].includes(file.type)) {
          window.alert("Formato de vídeo não compatível. Use MP4 ou WebM.");
          return;
        }
        const reference = await saveMediaFile(file);
        saveContent(note.content + (note.content.endsWith("
") ? "" : "

") + "![Vídeo: " + name + "](" + reference + ")
");
        return;
      }
      if (file.size > 1024 * 1024) {
        window.alert("Arquivo maior que 1 MB. Para manter o caderno leve, anexe um arquivo menor ou use um link.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result || "");
        saveContent(note.content + (note.content.endsWith("
") ? "" : "

") + "[" + name + "](" + data + ")
");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível anexar este arquivo.");
    }
  };
  const handlePaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"))?.getAsFile();
    if (!file) return;
    event.preventDefault();
    try {
      const blob = await compressImageBlobForNotes(file);
      const reference = await saveMediaFile(new File([blob], file.name || "imagem-colada.webp", { type: blob.type }));
      const el = textRef.current, value = note.content, start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
      saveContent(value.slice(0, start) + "\n![Imagem colada](" + reference + ")\n" + value.slice(end));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível colar esta imagem.");
    }
  };

  return (
    <div className={cn("mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 transition-all", sidebarCollapsed ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_400px]")}>
      <nav className={cn("rosa-note-switcher", sidebarCollapsed ? "lg:col-span-1" : "lg:col-span-2")} aria-label="Navegação rápida entre blocos">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-violet-200/75"><FileText className="h-4 w-4" /> Seus blocos</div>
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-100/45" />
            <input value={noteSearch} onChange={(e) => setNoteSearch(e.target.value)} placeholder="Localizar outra nota..." aria-label="Localizar outra nota" className="h-8 w-full rounded-lg border border-white/10 bg-black/15 pl-8 pr-3 text-xs text-white outline-none placeholder:text-violet-100/40 focus:border-violet-300/40" />
          </div>
        </div>
        <div className="rosa-note-switcher-list flex gap-2 overflow-x-auto px-3 py-3">
          {[...state.notes].filter((item) => item.title.toLowerCase().includes(noteSearch.trim().toLowerCase())).sort((a, b) => b.updatedAt - a.updatedAt).map((item) => (
            <Link key={item.id} to="/nota/$id" params={{ id: item.id }} aria-current={item.id === note.id ? "page" : undefined}
              className={cn("rosa-note-switcher-tab shrink-0 rounded-xl border px-3 py-2 text-left transition-all", item.id === note.id && "is-current")}>
              <span className="mr-1.5">{item.emoji || "🌷"}</span><span className="max-w-36 truncate align-middle text-xs font-medium">{item.title || "Sem título"}</span>
            </Link>
          ))}
          {state.notes.filter((item) => item.title.toLowerCase().includes(noteSearch.trim().toLowerCase())).length === 0 && <span className="px-2 py-2 text-xs text-violet-100/45">Nenhuma nota encontrada.</span>}
        </div>
      </nav>
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
            <Button type="button" variant={customizeOpen ? "secondary" : "ghost"} size="sm" className="gap-1" onClick={() => setCustomizeOpen((v) => !v)}><SlidersHorizontal className="h-4 w-4" />Personalizar</Button>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setSidebarCollapsed((v) => !v)} title={sidebarCollapsed ? "Mostrar painel lateral" : "Recolher painel lateral"} aria-label={sidebarCollapsed ? "Mostrar painel lateral" : "Recolher painel lateral"}>{sidebarCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}{sidebarCollapsed ? "Painel" : "Recolher"}</Button>
            <div className="flex rounded-full border border-border bg-paper p-0.5">
              <ModeButton active={mode === "write"} onClick={() => setMode("write")} icon={PenLine} label="Escrever" />
              <ModeButton active={mode === "layout"} onClick={() => setMode("layout")} icon={LayoutDashboard} label="Layout" />
              <ModeButton active={mode === "view"} onClick={() => setMode("view")} icon={Eye} label="Prévia" />
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

        {customizeOpen && <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-primary/15 bg-paper/70 p-3 shadow-paper backdrop-blur-md">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Fonte<select value={style.font} onChange={(e) => notesActions.update(note.id, { style: { ...style, font: e.target.value as typeof style.font } })} className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"><option value="serif">Serifada (Literata)</option><option value="sans">Sem serifa (Manrope)</option><option value="mono">Monoespaçada</option></select></label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Tamanho<select value={style.size} onChange={(e) => notesActions.update(note.id, { style: { ...style, size: Number(e.target.value) } })} className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"><option value={16}>Pequeno</option><option value={18}>Normal</option><option value={20}>Grande</option><option value={22}>Muito grande</option><option value={24}>Extra grande</option></select></label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Papel<select value={style.paper} onChange={(e) => notesActions.update(note.id, { style: { ...style, paper: e.target.value as typeof style.paper } })} className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"><option value="cream">Creme</option><option value="lavender">Lavanda</option><option value="blue">Azul claro</option><option value="dark">Escuro</option></select></label>
          <Button type="button" variant="ghost" size="sm" onClick={() => notesActions.update(note.id, { style: { font: "serif", size: 18, paper: "cream" } })}>Restaurar padrão</Button>
        </div>}
        <article style={{ backgroundColor: paperColors[style.paper], color: textColor }} className="paper-grid rosa-grid-paper relative min-h-[75vh] overflow-hidden rounded-[1.4rem] border border-border pb-16 pl-8 pr-6 pt-8 shadow-lift sm:pl-10 sm:pr-12">
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
            <input ref={coverUploadRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; e.currentTarget.value = ""; if (!file) return; try { const blob = await compressImageBlobForNotes(file); const reference = await saveMediaFile(new File([blob], file.name || "foto-de-capa.webp", { type: blob.type })); notesActions.update(note.id, { coverImage: reference }); } catch (error) { window.alert(error instanceof Error ? error.message : "Não foi possível carregar a foto."); } }} />
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
<Button type="button" variant="ghost" size="icon" title="Riscado" aria-label="Riscado" onClick={() => insertAtCursor("~~", "~~")}><Strikethrough className="h-4 w-4" /></Button>
<Button type="button" variant="ghost" size="icon" title="Código" aria-label="Código" onClick={() => insertAtCursor("`", "`")}><Code2 className="h-4 w-4" /></Button>
<Button type="button" variant="ghost" size="icon" title="Lista numerada" aria-label="Lista numerada" onClick={() => insertLinePrefix("1. ")}><ListOrdered className="h-4 w-4" /></Button>
<Button type="button" variant="ghost" size="icon" title="Checklist" aria-label="Checklist" onClick={() => insertLinePrefix("- [ ] ")}><Check className="h-4 w-4" /></Button>
<Button type="button" variant="ghost" size="icon" title="Inserir link" aria-label="Inserir link" onClick={insertLink}><Link2 className="h-4 w-4" /></Button>
<Button type="button" variant="ghost" size="icon" title="Separador" aria-label="Separador" onClick={() => insertLinePrefix("---\n")}><span className="text-xs font-bold">—</span></Button><Button type="button" variant="ghost" size="icon" title="Inserir tabela" aria-label="Inserir tabela" onClick={insertTable}><Table className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" onClick={undoContent} disabled={undoStack.current.length === 0}><Undo2 className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" title="Refazer (Ctrl+Y)" aria-label="Refazer" onClick={redoContent} disabled={redoStack.current.length === 0}><Redo2 className="h-4 w-4" /></Button>
<span className="mx-1 h-5 w-px bg-border" />
<Button type="button" variant="ghost" size="sm" className="gap-1.5" title="Inserir imagem ou arquivo" onClick={() => fileRef.current?.click()}><FileImage className="h-4 w-4" />Imagem/Arquivo</Button>
<input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,application/pdf,text/plain" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) addFileAttachment(file); e.currentTarget.value = ""; }} />
</div>
<textarea
                ref={textRef}
                value={note.content}
                onChange={(e) => saveContent(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); insertAtCursor("**", "**"); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") { e.preventDefault(); insertAtCursor("*", "*"); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); insertLink(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redoContent(); else undoContent(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redoContent(); } }}
                placeholder="Comece a escrever… (dica: use # para títulos, - para listas)"
                aria-label="Conteúdo da página"
                style={{ fontFamily, fontSize: `${style.size}px`, color: textColor }} className="block min-h-[55vh] w-full resize-none overflow-hidden bg-transparent leading-8 outline-none placeholder:text-muted-foreground/60"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-primary/10 pt-2 text-xs text-muted-foreground">
                <span>{words} palavras · {characters} caracteres · leitura ~{readingMinutes} min</span>
                <span>Atalhos: Ctrl+B negrito · Ctrl+I itálico · Ctrl+K link</span>
              </div>
              </>
            ) : mode === "layout" ? (
              <VisualLayoutEditor elements={note.layoutElements || []} onChange={(layoutElements) => notesActions.update(note.id, { layoutElements })} />
            ) : note.content.trim() ? (
              <MarkdownView source={note.content} className="leading-8" style={{ fontFamily, fontSize: `${style.size}px`, color: textColor }} />
            ) : (
              <p className="font-serif text-lg leading-8 text-muted-foreground">Página em branco.</p>
            )}
          </div>
        </article>
      </div>

      {!sidebarCollapsed && <aside className="flex h-[80vh] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-sidebar shadow-paper animate-slide-in-right lg:sticky lg:top-20 lg:h-[calc(100vh-6.5rem)]">
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
      </aside>}
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
