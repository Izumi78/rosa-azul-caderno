import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MousePointer2, Waypoints, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";

import { NewNoteDialog } from "@/components/new-note-dialog";
import { NOTE_COLOR_BG } from "@/components/note-colors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { NoteColor } from "@/lib/notes-model";
import { notesActions, useNotesState } from "@/lib/notes-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mural")({
  head: () => ({
    meta: [
      { title: "Mural de ideias — Rosa Azul" },
      { name: "description", content: "Ligue blocos de notas que tratam de assuntos parecidos e veja suas ideias conectadas." },
      { property: "og:title", content: "Mural de ideias — Rosa Azul" },
      { property: "og:description", content: "Ligue blocos de notas que tratam de assuntos parecidos e veja suas ideias conectadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MuralPage,
});

const CARD_W = 168;
const CARD_H = 96;

const STROKE: Record<NoteColor, string> = {
  roxo: "var(--note-roxo)",
  azul: "var(--note-azul)",
  tinta: "var(--note-tinta)",
};

function curve(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  const bend = Math.min(150, Math.max(42, distance * 0.2));
  const nx = distance ? -dy / distance : 0;
  const ny = distance ? dx / distance : 0;
  const direction = dx >= 0 ? 1 : -1;
  const c1x = x1 + dx * 0.32 + nx * bend * direction;
  const c1y = y1 + dy * 0.32 + ny * bend * direction;
  const c2x = x2 - dx * 0.32 + nx * bend * direction;
  const c2y = y2 - dy * 0.32 + ny * bend * direction;
  return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
}

function MuralPage() {
  const { notes, connections, hydrated } = useNotesState();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const pan = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const [linking, setLinking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [hoverLine, setHoverLine] = useState<string | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);

  const byId = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);
  const width = Math.max(5000, ...notes.map((n) => n.position.x + CARD_W + 1200));
  const height = Math.max(3600, ...notes.map((n) => n.position.y + CARD_H + 1000));

  useEffect(() => {
    if (!hydrated || !viewportRef.current) return;
    const bounds = notes.reduce((acc, note) => ({
      minX: Math.min(acc.minX, note.position.x),
      minY: Math.min(acc.minY, note.position.y),
      maxX: Math.max(acc.maxX, note.position.x + CARD_W),
      maxY: Math.max(acc.maxY, note.position.y + CARD_H),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const centerX = notes.length ? (bounds.minX + bounds.maxX) / 2 : width / 2;
    const centerY = notes.length ? (bounds.minY + bounds.maxY) / 2 : height / 2;
    setCamera({ x: viewportRef.current.clientWidth / 2 - centerX, y: viewportRef.current.clientHeight / 2 - centerY, scale: 1 });
  }, [hydrated, notes.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelected(null);
        setLinking(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function canvasPoint(e: { clientX: number; clientY: number }) {
    const rect = viewportRef.current?.getBoundingClientRect();
    return {
      x: (e.clientX - (rect?.left ?? 0) - camera.x) / camera.scale,
      y: (e.clientY - (rect?.top ?? 0) - camera.y) / camera.scale,
    };
  }

  function onViewportPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".rosa-mural-card, button, a")) return;
    pan.current = { x: e.clientX, y: e.clientY, originX: camera.x, originY: camera.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onViewportPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pan.current) return;
    setCamera((current) => ({ ...current, x: pan.current!.originX + e.clientX - pan.current!.x, y: pan.current!.originY + e.clientY - pan.current!.y }));
  }

  function onViewportPointerUp() { pan.current = null; }

  function onCanvasWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setCamera((current) => {
      const scale = Math.min(1.8, Math.max(0.45, current.scale * (e.deltaY < 0 ? 1.08 : 0.92)));
      const ratio = scale / current.scale;
      return { scale, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
    });
  }

  function onCardPointerDown(e: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (e.button !== 0) return;
    const note = byId.get(id);
    if (!note) return;
    const p = canvasPoint(e);
    drag.current = { id, dx: p.x - note.position.x, dy: p.y - note.position.y, sx: p.x, sy: p.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onCardPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const p = canvasPoint(e);
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) < 5) return;
    d.moved = true;
    notesActions.move(d.id, Math.round(p.x - d.dx), Math.round(p.y - d.dy));
  }

  function onCardPointerUp(id: string) {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) return;
    // treat as a click
    if (linking) {
      if (!selected) {
        setSelected(id);
      } else if (selected === id) {
        setSelected(null);
      } else {
        const a = byId.get(selected);
        const b = byId.get(id);
        const wasLinked = connections.some(
          (c) => (c.from === selected && c.to === id) || (c.from === id && c.to === selected),
        );
        notesActions.toggleConnection(selected, id);
        toast.success(wasLinked ? "Ligação desfeita" : `“${a?.title}” ligado a “${b?.title}”`);
        setSelected(null);
      }
    } else {
      void navigate({ to: "/nota/$id", params: { id } });
    }
  }

  return (
    <div className="rosa-mural-page flex h-[calc(100vh-4rem)] flex-col">
      <div className="rosa-mural-header flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Mural de ideias</h1>
          <p className="text-sm text-muted-foreground">
            {linking
              ? selected
                ? "Agora clique no bloco que tem a ver com este."
                : "Clique em um bloco e depois em outro para ligá-los."
              : "Arraste cada bloco para qualquer ponto do espaço. Arraste o fundo para navegar e use o scroll para controlar o zoom."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewNoteDialog trigger={<Button variant="outline" className="bg-paper">Novo bloco</Button>} />
          <Button
            variant={linking ? "default" : "outline"}
            className={cn(!linking && "bg-paper")}
            onClick={() => {
              setLinking((v) => !v);
              setSelected(null);
            }}
          >
            {linking ? <X className="h-4 w-4" /> : <Waypoints className="h-4 w-4" />}
            {linking ? "Terminar ligações" : "Ligar blocos"}
          </Button>
        </div>
      </div>

      <div ref={viewportRef} className="rosa-mural-canvas rosa-mural-stage relative min-h-0 flex-1 overflow-hidden cursor-grab active:cursor-grabbing" onPointerDown={onViewportPointerDown} onPointerMove={(e) => { onViewportPointerMove(e); if (linking && selected) setCursor(canvasPoint(e)); }} onPointerUp={onViewportPointerUp} onPointerCancel={onViewportPointerUp} onWheel={onCanvasWheel}>
        {!hydrated ? (
          <div className="p-10">
            <Skeleton className="h-32 w-56 bg-secondary" />
          </div>
        ) : (
          <div
            ref={canvasRef}
            className="relative"
            style={{ width, height, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`, transformOrigin: "0 0" }}
            onPointerLeave={() => setCursor(null)}
          >
            <svg className="rosa-synapse-svg pointer-events-none absolute inset-0" width={width} height={height}>
              {connections.map((c) => {
                const a = byId.get(c.from);
                const b = byId.get(c.to);
                if (!a || !b) return null;
                const d = curve(
                  a.position.x + CARD_W / 2,
                  a.position.y + CARD_H / 2,
                  b.position.x + CARD_W / 2,
                  b.position.y + CARD_H / 2,
                );
                const hovered = hoverLine === c.id;
                return (
                  <g key={c.id}>
                    <path d={d} fill="none" stroke={STROKE[a.color]} strokeWidth={hovered ? 3.5 : 2.2} strokeLinecap="round" opacity={hovered ? 0.98 : 0.65} className="rosa-synapse-wire" />
                    <path d={d} fill="none" stroke="var(--accent)" strokeWidth={1} strokeLinecap="round" strokeDasharray="3 14" opacity={0.85} className="rosa-synapse-pulse" />
                    <circle cx={a.position.x + CARD_W / 2} cy={a.position.y + CARD_H / 2} r={hovered ? 7 : 5} fill={STROKE[a.color]} className="rosa-synapse-node" />
                    <circle cx={b.position.x + CARD_W / 2} cy={b.position.y + CARD_H / 2} r={hovered ? 7 : 5} fill={STROKE[b.color]} className="rosa-synapse-node" />
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={18}
                      className="pointer-events-auto cursor-pointer"
                      onMouseEnter={() => setHoverLine(c.id)}
                      onMouseLeave={() => setHoverLine(null)}
                      onClick={() => {
                        notesActions.removeConnection(c.id);
                        setHoverLine(null);
                        toast("Ligação removida", {
                          action: { label: "Desfazer", onClick: () => notesActions.toggleConnection(c.from, c.to) },
                        });
                      }}
                    >
                      <title>Clique para desfazer a ligação</title>
                    </path>
                  </g>
                );
              })}
              {linking && selected && cursor && byId.get(selected) && (
                <line
                  x1={(byId.get(selected)?.position.x ?? 0) + CARD_W / 2}
                  y1={(byId.get(selected)?.position.y ?? 0) + CARD_H / 2}
                  x2={cursor.x}
                  y2={cursor.y}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  strokeDasharray="5 6"
                />
              )}
            </svg>

            {notes.map((n, i) => {
              const isSel = selected === n.id;
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Bloco ${n.title}`}
                  onPointerDown={(e) => onCardPointerDown(e, n.id)}
                  onPointerMove={onCardPointerMove}
                  onPointerUp={() => onCardPointerUp(n.id)}
                  onKeyDown={(e) => e.key === "Enter" && onCardPointerUp(n.id)}
                  className={cn(
                    "rosa-mural-card group absolute flex touch-none select-none flex-col overflow-hidden rounded-2xl border p-3 pl-4 backdrop-blur-xl transition-all duration-300 animate-fade-up",
                    linking ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing",
                    isSel && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                  style={{
                    left: n.position.x,
                    top: n.position.y,
                    width: CARD_W,
                    height: CARD_H,
                    animationDelay: `${Math.min(i, 12) * 40}ms`,
                  }}
                >
                  <span className={cn("absolute inset-y-0 left-0 w-1.5", NOTE_COLOR_BG[n.color])} />
                  {n.coverImage && <img src={n.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}\n                  <span className="rosa-mural-card-gloss absolute inset-0" />\n                  <span className="relative z-10 mb-0.5 text-base">{n.emoji || "🌷"}</span>\n                  <p className="relative z-10 line-clamp-2 font-display text-sm font-semibold leading-snug text-foreground">{n.title}</p>
                  <p className="relative z-10 mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{n.description || "Sem descrição"}</p>
                </div>
              );
            })}

            {notes.length === 0 && (
              <div className="absolute left-1/2 top-40 -translate-x-1/2 text-center text-muted-foreground">
                <MousePointer2 className="mx-auto h-8 w-8" />
                <p className="mt-2">Crie blocos para começar a ligar suas ideias.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
