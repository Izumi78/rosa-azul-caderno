import { ArrowUp, BarChart3, FileText, ListTree, Loader2, PenLine, Sparkles, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { makeId, type ChatMessage, type Note } from "@/lib/notes-model";
import { notesActions } from "@/lib/notes-store";
import { cn } from "@/lib/utils";

import { RoseMark } from "./logo";
import { MarkdownView } from "./markdown-view";

const QUICK_ACTIONS = [
  { icon: ListTree, label: "Organizar", prompt: "Organize o conteúdo desta página em tópicos claros, com títulos e uma lista de próximos passos." },
  { icon: PenLine, label: "Melhorar escrita", prompt: "Revise e melhore a escrita do texto desta página, mantendo minhas ideias e meu tom." },
  { icon: BarChart3, label: "Criar gráfico", prompt: "Crie um gráfico útil a partir das informações desta página. Se não houver números, sugira dados ilustrativos." },
  { icon: FileText, label: "Gerar relatório", prompt: "Gere um relatório completo em Markdown sobre o conteúdo desta página, com resumo, seções, tabela e gráfico quando fizer sentido." },
];

async function readStream(res: Response, onDelta: (text: string) => void) {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Sem resposta");
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let event: { type?: string; delta?: unknown; error?: { message?: string }; message?: string };
        try {
          event = JSON.parse(payload);
        } catch {
          continue;
        }
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          onDelta(event.delta);
        } else if (event.type === "error" || event.type === "response.failed" || event.error) {
          throw new Error(event.error?.message ?? event.message ?? "Falha na resposta");
        }
      }
    }
  }
}

export function AiAssistant({ note, related }: { note: Note; related: string[] }) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = note.chat;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const userMsg: ChatMessage = { id: makeId(), role: "user", content };
    const history = [...messages, userMsg];
    notesActions.update(note.id, { chat: history });
    setInput("");
    setBusy(true);
    setPending("");
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          note: {
            title: note.title,
            description: note.description,
            content: note.content,
            links: note.links.map((l) => ({ url: l.url, label: l.label })),
            related,
          },
          messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "A Íris não conseguiu responder agora.");
      }
      await readStream(res, (d) => {
        acc += d;
        setPending(acc);
      });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        toast.error(err instanceof Error ? err.message : "A Íris não conseguiu responder agora.");
      }
    } finally {
      const current = notesActions.getNote(note.id);
      if (current && acc.trim()) {
        notesActions.update(note.id, {
          chat: [...current.chat, { id: makeId(), role: "assistant", content: acc }],
        });
      }
      setPending(null);
      setBusy(false);
      abortRef.current = null;
    }
  }

  function insertIntoNote(text: string) {
    const current = notesActions.getNote(note.id);
    if (!current) return;
    const sep = current.content.trim() ? "\n\n" : "";
    notesActions.update(note.id, { content: `${current.content.trimEnd()}${sep}${text}\n` });
    toast.success("Adicionado ao final da página");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && pending === null && (
          <div className="rounded-lg border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2">
              <RoseMark className="h-7 w-7" />
              <p className="font-display text-lg font-semibold">Olá, eu sou a Íris</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Posso organizar suas ideias, melhorar seus textos e criar gráficos e relatórios a partir desta página.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} message={m} onInsert={insertIntoNote} />
        ))}
        {pending !== null && (
          <div className="rounded-lg border border-border bg-paper p-3 text-sm shadow-paper">
            {pending ? (
              <MarkdownView source={pending} className="font-sans text-sm" />
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Íris está pensando…
              </span>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background/70 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={busy}
              onClick={() => void send(a.prompt)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <a.icon className="h-3.5 w-3.5" />
              {a.label}
            </button>
          ))}
          {messages.length > 0 && !busy && (
            <button
              type="button"
              onClick={() => notesActions.update(note.id, { chat: [] })}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
              title="Limpar conversa"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <form onSubmit={submit} className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Peça algo à Íris…"
            rows={2}
            className="resize-none bg-paper pr-12"
          />
          {busy ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
              onClick={() => abortRef.current?.abort()}
              aria-label="Parar"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
              disabled={!input.trim()}
              aria-label="Enviar"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

function Bubble({ message, onInsert }: { message: ChatMessage; onInsert: (t: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {message.content}
        </p>
      </div>
    );
  }
  return (
    <div className={cn("group rounded-lg border border-border bg-paper p-3 text-sm shadow-paper")}>
      <MarkdownView source={message.content} className="font-sans text-sm" />
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => onInsert(message.content)}>
          <Sparkles className="h-3.5 w-3.5" />
          Inserir na página
        </Button>
      </div>
    </div>
  );
}
