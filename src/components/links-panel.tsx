import { ExternalLink, Link2, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { makeId, normalizeUrl, type Note } from "@/lib/notes-model";
import { notesActions } from "@/lib/notes-store";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinksPanel({ note }: { note: Note }) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  function add(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      toast.error("Isso não parece um link válido.");
      return;
    }
    notesActions.update(note.id, {
      links: [{ id: makeId(), url: normalized, label: label.trim() }, ...note.links],
    });
    setUrl("");
    setLabel("");
  }

  function remove(id: string) {
    notesActions.update(note.id, { links: note.links.filter((l) => l.id !== id) });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <form onSubmit={add} className="space-y-2 border-b border-border p-4">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Cole um link aqui"
          className="bg-paper"
          aria-label="Link"
        />
        <div className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nome (opcional)"
            className="bg-paper"
            aria-label="Nome do link"
          />
          <Button type="submit" disabled={!url.trim()}>
            <Plus className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </form>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {note.links.length === 0 && (
          <li className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Link2 className="h-6 w-6" />
            Nenhum link ainda. Cole artigos, vídeos ou referências.
          </li>
        )}
        {note.links.map((l) => (
          <li
            key={l.id}
            className="group flex items-center gap-3 rounded-lg border border-border bg-paper p-3 shadow-paper animate-fade-up"
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${hostOf(l.url)}&sz=64`}
              alt=""
              className="h-8 w-8 shrink-0 rounded-md border border-border bg-background p-1"
              loading="lazy"
            />
            <a href={l.url} target="_blank" rel="noreferrer noopener" className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground group-hover:text-rose">
                {l.label || hostOf(l.url)}
              </p>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                {hostOf(l.url)} <ExternalLink className="h-3 w-3" />
              </p>
            </a>
            <button
              type="button"
              onClick={() => remove(l.id)}
              className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus:opacity-100"
              aria-label="Remover link"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
