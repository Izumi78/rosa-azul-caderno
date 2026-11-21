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

- Notes live in browser localStorage via `src/lib/notes-store.ts` and, when signed in, sync to the Lovable Cloud `user_notes` row (one JSON row per user); merge rules sit in `src/lib/notes-model.ts` (tested). A browser never pushes to an account before it has pulled and merged it once. Why: works offline/signed-out and keeps device-to-device sync a store-only concern.
- Photos, videos and files are stored in IndexedDB as `rosa-media://<id>` and uploaded to the private `note-media` bucket under `<userId>/<id>`; components open them through `loadMedia()` (local first, then account). Why: notes JSON stays small and media follows the account.
- Auth goes through `src/lib/supabase-cloud.ts` (generated client + Lovable Google broker); the UI is `src/components/account-control.tsx`. Why: one place owns session state and the auth-change event the store listens to.
- The AI assistant streams through the server route `src/routes/api/chat.ts`, which lazy-imports `src/lib/ai-chat.server.ts` (Lovable AI Gateway SDK). Why: keeps the SDK and key server-side.
- AI charts are fenced ```chart JSON blocks rendered by `ChartBlock` inside `MarkdownView`, so charts work both in chat and in a note's preview. Why: one format the model can emit and the note can store as plain text.
