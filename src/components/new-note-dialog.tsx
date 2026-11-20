import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";

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
import { compressImageForNotes } from "@/lib/image-utils";

import { ColorPicker } from "./color-picker";

export function NewNoteDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<NoteColor>("roxo");
  const [emoji, setEmoji] = useState("🌷");
  const [coverImage, setCoverImage] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function submit(e: FormEvent) {
    e.preventDefault();
    const note = notesActions.create({ title, description, color, emoji: emoji.trim() || "🌷", coverImage });
    setOpen(false);
    setTitle("");
    setDescription("");
    setEmoji("🌷");
    setCoverImage("");
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
          <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
            <div className="space-y-2">
              <Label htmlFor="note-emoji">Emoji</Label>
              <Input id="note-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} className="bg-background text-center text-xl" placeholder="🌷" />
            </div>
            <div className="space-y-2">
              <Label>Foto de capa (opcional)</Label>
              <div className="flex gap-2">
                <Input value={coverImage.startsWith("data:") ? "Foto carregada ✓" : coverImage} onChange={(e) => setCoverImage(e.target.value)} className="bg-background" placeholder="Cole URL de uma imagem" disabled={coverImage.startsWith("data:")} />
                <Button type="button" variant="outline" onClick={() => coverInputRef.current?.click()}>Escolher</Button>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; e.currentTarget.value = ""; if (!file) return;
                  try { setCoverImage(await compressImageForNotes(file)); }
                  catch (error) { window.alert(error instanceof Error ? error.message : "Não foi possível carregar a imagem."); }
                }} />
              </div>
            </div>
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
