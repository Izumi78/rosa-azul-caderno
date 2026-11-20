import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import type { CSSProperties } from "react";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

import { ChartBlock } from "./chart-block";
import { getNoteMedia } from "@/lib/note-media-store";
import { useEffect, useState } from "react";

function StoredMedia({ id, alt, video = false }: { id: string; alt?: string; video?: boolean }) {\n  const [url, setUrl] = useState<string | null>(null);\n  useEffect(() => {\n    let active = true;\n    let objectUrl = "";\n    getNoteMedia(id).then((blob) => {\n      if (!active || !blob) return;\n      objectUrl = URL.createObjectURL(blob);\n      setUrl(objectUrl);\n    }).catch(() => setUrl(null));\n    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };\n  }, [id]);\n  if (!url) return <div className="my-4 rounded-lg border border-border bg-secondary/60 px-4 py-6 text-center text-sm text-muted-foreground">{video ? "Carregando vídeo…" : "Carregando imagem…"}</div>;\n  if (video) return <video src={url} controls preload="metadata" playsInline className="my-4 max-h-[520px] w-full rounded-xl border border-border bg-black" />;\n  return <img src={url} alt={alt || "Imagem anexada"} loading="lazy" className="my-4 max-h-[600px] max-w-full rounded-lg border border-border object-contain" />;\n}\n\nfunction StoredMediaLink({ id, children }: { id: string; children: React.ReactNode }) {\n  const [url, setUrl] = useState<string | null>(null);\n  const [isVideo, setIsVideo] = useState(false);\n  useEffect(() => {\n    let active = true;\n    let objectUrl = "";\n    getNoteMedia(id).then((blob) => {\n      if (!active || !blob) return;\n      setIsVideo(blob.type.startsWith("video/"));\n      objectUrl = URL.createObjectURL(blob);\n      setUrl(objectUrl);\n    }).catch(() => setUrl(null));\n    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };\n  }, [id]);\n  if (!url) return <span className="text-muted-foreground">{children} (mídia indisponível)</span>;\n  if (isVideo) return <video src={url} controls preload="metadata" playsInline className="my-4 max-h-[520px] w-full rounded-xl border border-border bg-black" />;\n  return <a href={url} download className="text-rose underline underline-offset-2">{children}</a>;\n}\n\nfunction videoEmbedUrl(raw?: string) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.hostname === "youtu.be") { const id = url.pathname.split("/").filter(Boolean)[0]; return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null; }
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) { const id = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]; return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null; }
    if (["vimeo.com", "www.vimeo.com"].includes(url.hostname)) { const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part)); return id ? `https://player.vimeo.com/video/${id}` : null; }
  } catch { return null; }
  return null;
}

export function MarkdownView({ source, className, style }: { source: string; className?: string; style?: CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        "space-y-3 break-words font-serif leading-relaxed text-foreground",
        "[&_h1]:mt-4 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-semibold",
        "[&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold",
        "[&_h3]:mt-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold",
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1",
        "[&_a]:text-rose [&_a]:underline [&_a]:underline-offset-2",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        "[&_strong]:font-semibold [&_strong]:text-primary",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-border [&_th]:bg-secondary [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5",
        "[&_hr]:my-6 [&_hr]:border-border",
        "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-secondary [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:text-sm",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        urlTransform={(url, key) => {
          const safeData =
            /^data:(image\/(?:jpeg|png|gif|webp)|video\/(?:mp4|webm)|application\/pdf|text\/plain);base64,[A-Za-z0-9+/=]+$/.test(url);
          if (safeData && (key === "src" || key === "href")) return url;
          return defaultUrlTransform(url);
        }}
        components={{
          img: ({ src, alt }) => {
            const embed = (alt?.toLowerCase().includes("vídeo") || alt?.toLowerCase().includes("video")) ? videoEmbedUrl(src) : null;
            if (embed) return <div className="my-5 aspect-video overflow-hidden rounded-xl border border-border bg-black shadow-sm"><iframe src={embed} title="Vídeo incorporado" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>;
            return <img src={src} alt={alt || ""} loading="lazy" className="my-4 max-h-[600px] max-w-full rounded-lg border border-border object-contain" />;
          },
          a: ({ children, href }) => {
            if (href?.startsWith("data:video/")) return <video src={href} controls preload="metadata" className="my-4 max-h-[520px] w-full rounded-xl border border-border bg-black" />;
            return <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>;
          },
          pre: ({ children }) => <>{children}</>,
          code: ({ className: cls, children }) => {
            const text = String(children ?? "").replace(/\n$/, "");
            if (cls?.includes("language-chart")) return <ChartBlock source={text} />;
            if (cls) {
              return (
                <pre className="overflow-x-auto rounded-md bg-secondary p-3 font-mono text-xs">
                  <code>{text}</code>
                </pre>
              );
            }
            return <code>{children}</code>;
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
