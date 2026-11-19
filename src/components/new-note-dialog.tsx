import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NoteColor } from "@/lib/notes-model";
import { notesActions } from "@/lib/notes-store";

import { ColorPicker } from "./color-picker";

export function NewNoteDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<NoteColor>("roxo");
  const navigate = useNavigate();

  function submit(e: FormEvent) {
    e.preventDefault();
    const note = notesActions.create({ title, description, color });
    setOpen(false);
    setTitle("");
    setDescription("");
    void navigate({ to: "/nota/$id", params: { id: note.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="rounded-full shadow-lift">
            <Plus className="h-4 w-4" />
            Novo bloco
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-paper sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Novo bloco de notas</DialogTitle>
            <DialogDescription>Dê um nome e conte em poucas palavras do que se trata.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="note-title">Título</Label>
            <Input
              id="note-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Plano de estudos"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-desc">Descrição</Label>
            <Textarea
              id="note-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Do que se trata este bloco?"
              rows={3}
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!title.trim()}>
              Criar e abrir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
