import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ImagePlus, Plus, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMediaFile, getMediaId, saveMediaFile, compressImageBlobForNotes } from "@/lib/image-utils";

export type VisualElement = {
  id: string;
  type: "text" | "image" | "video";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
};

function MediaPreview({ reference }: { reference: string }) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    const id = getMediaId(reference);
    if (!id) return;
    getMediaFile(id).then((media) => {
      if (!active || !media) return;
      objectUrl = URL.createObjectURL(media.blob);
      setUrl(objectUrl);
      setType(media.type);
    }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [reference]);
  if (!url) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Carregando mídia…</div>;
  return type.startsWith("video/") ? <video src={url} controls className="h-full w-full rounded-lg bg-black object-contain" /> : <img src={url} alt="Mídia do layout" className="h-full w-full rounded-lg object-contain" />;
}

export function VisualLayoutEditor({ elements = [], onChange }: { elements?: VisualElement[]; onChange: (next: VisualElement[]) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const actionRef = useRef<"image" | "video">("image");
  const canvasRef = useRef<HTMLDivElement>(null);
  const selectedElement = elements.find((e) => e.id === selected);
  const updateElement = (id: string, patch: Partial<VisualElement>) => onChange(elements.map((e) => e.id === id ? { ...e, ...patch } : e));
  const addText = () => {
    const id = crypto.randomUUID();
    onChange([...elements, { id, type: "text", x: 36 + elements.length * 18, y: 36 + elements.length * 18, width: 320, height: 180, content: "Clique aqui e escreva…" }]);
    setSelected(id);
  };
  const addMedia = (type: "image" | "video") => { actionRef.current = type; fileRef.current?.click(); };
  const upload = async (file?: File) => {
    if (!file) return;
    try {
      let prepared = file;
      if (file.type.startsWith("image/")) {
        const compressed = await compressImageBlobForNotes(file);
        prepared = new File([compressed], file.name || "imagem.webp", { type: compressed.type });
      } else if (!["video/mp4", "video/webm"].includes(file.type)) {
        window.alert("Use imagens ou vídeos MP4/WebM.");
        return;
      }
      const reference = await saveMediaFile(prepared);
      const id = crypto.randomUUID();
      const type = prepared.type.startsWith("video/") ? "video" : "image";
      onChange([...elements, { id, type, x: 40 + elements.length * 18, y: 40 + elements.length * 18, width: type === "video" ? 440 : 360, height: type === "video" ? 280 : 260, content: reference }]);
      setSelected(id);
    } catch (error) { window.alert(error instanceof Error ? error.message : "Não foi possível adicionar mídia."); }
  };
  const startDrag = (event: PointerEvent, element: VisualElement, resize = false) => {
    if ((event.target as HTMLElement).closest("textarea") || (event.target as HTMLElement).closest("video")) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX, startY = event.clientY;
    const initial = { x: element.x, y: element.y, width: element.width, height: element.height };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      const scale = canvasRef.current?.getBoundingClientRect().width ? canvasRef.current!.getBoundingClientRect().width / 1000 : 1;
      const dx = (e.clientX - startX) / scale, dy = (e.clientY - startY) / scale;
      updateElement(element.id, resize ? { width: Math.max(140, initial.width + dx), height: Math.max(100, initial.height + dy) } : { x: Math.max(0, initial.x + dx), y: Math.max(0, initial.y + dy) });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
  };
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/60 p-2">
      <Button size="sm" variant="outline" onClick={addText}><Plus className="mr-1 h-4 w-4" /> Texto</Button>
      <Button size="sm" variant="outline" onClick={() => addMedia("image")}><ImagePlus className="mr-1 h-4 w-4" /> Foto</Button>
      <Button size="sm" variant="outline" onClick={() => addMedia("video")}><Video className="mr-1 h-4 w-4" /> Vídeo</Button>
      {selectedElement && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { onChange(elements.filter(e => e.id !== selected)); setSelected(null); }}><Trash2 className="mr-1 h-4 w-4" /> Excluir selecionado</Button>}
      <span className="ml-auto text-xs text-muted-foreground">Arraste para mover · canto para redimensionar</span>
      <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.currentTarget.value = ""; }} />
    </div>
    <div ref={canvasRef} onPointerDown={() => setSelected(null)} className="relative min-h-[780px] overflow-auto rounded-xl border border-violet-300/30 bg-white/60 shadow-inner" style={{ backgroundImage: "linear-gradient(rgba(120,90,160,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(120,90,160,.09) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      {elements.length === 0 && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-muted-foreground"><div><p className="text-lg font-medium">Seu espaço visual está vazio</p><p className="mt-1 text-sm">Adicione texto, fotos ou vídeos e organize como quiser.</p></div></div>}
      {elements.map((element) => <div key={element.id} onPointerDown={(e) => { setSelected(element.id); startDrag(e, element); }} className={`absolute rounded-xl border bg-white/80 p-2 shadow-lg backdrop-blur-sm ${selected === element.id ? "border-violet-500 ring-2 ring-violet-400/40" : "border-violet-200/70"}`} style={{ left: element.x, top: element.y, width: element.width, height: element.height, touchAction: "none" }}>\n        <div onPointerDown={(e) => { setSelected(element.id); startDrag(e, element); }} className="absolute left-2 right-8 top-1 z-10 h-2 cursor-grab rounded-full bg-violet-300/70 active:cursor-grabbing" aria-label="Mover elemento" />
        {element.type === "text" ? <textarea value={element.content} onChange={(e) => updateElement(element.id, { content: e.target.value })} onPointerDown={(e) => { e.stopPropagation(); setSelected(element.id); }} placeholder="Digite seu texto…" className="h-full w-full resize-none rounded-md bg-transparent p-2 text-sm leading-6 text-slate-800 outline-none" /> : <MediaPreview reference={element.content} />}
        <button type="button" aria-label="Redimensionar bloco" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, element, true); }} className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-violet-500 bg-white shadow" />
      </div>)}
    </div>
    <p className="text-xs text-muted-foreground">Elementos ficam salvos automaticamente nesta nota, neste navegador. O conteúdo Markdown original continua intacto.</p>
  </div>;
}
