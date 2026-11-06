<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture decisions
- Server functions (`createServerFn`) live in `src/lib/*.functions.ts` — never under `src/server/` or `src/pages/`; `src/server/**` is import-protected and any client-reachable import there breaks the production build (dev server masks it).
- Server-only helpers (admin clients, providers, secrets) get a `*.server.ts` filename or stay in a directory never imported by client code.
- AI look favorites are store-scoped snapshots written through authenticated server functions, so owners can reshare looks without trusting client-supplied prices or pieces.
