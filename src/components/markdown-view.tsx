import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

import { ChartBlock } from "./chart-block";

export function MarkdownView({ source, className }: { source: string; className?: string }) {
  return (
    <div
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
        urlTransform={(url, key) => {\n          const safeData = /^data:(image\\/(?:jpeg|png|gif|webp)|application\\/pdf|text\\/plain);base64,[A-Za-z0-9+/=]+$/.test(url);\n          if (safeData && (key === "src" || key === "href")) return url;\n          return defaultUrlTransform(url, key);\n        }}\n        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
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
