<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Notes, links, AI chat history and board connections live in browser localStorage via `src/lib/notes-store.ts`; pure data rules sit in `src/lib/notes-model.ts` (tested). Why: no login yet, and keeping rules pure makes a later move to a cloud database a store-only change.
- The AI assistant streams through the server route `src/routes/api/chat.ts`, which lazy-imports `src/lib/ai-chat.server.ts` (Lovable AI Gateway SDK). Why: keeps the SDK and key server-side.
- AI charts are fenced ```chart JSON blocks rendered by `ChartBlock` inside `MarkdownView`, so charts work both in chat and in a note's preview. Why: one format the model can emit and the note can store as plain text.
