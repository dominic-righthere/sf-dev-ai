# Contributing to SF Dev AI

Thanks for your interest. SF Dev AI is an experimental, AI-native Salesforce developer workbench. Contributions are welcome — issues, PRs, and design discussions.

## Quick start

1. Fork and clone the repo.
2. Follow the setup in the [README](./README.md) (Node 22+, PostgreSQL 17 or Docker, a Salesforce dev org).
3. Use the Salesforce CLI device flow for auth if you don't want to create a Connected App — see the README's *Zero-config auth* section.
4. `npm run dev` (or `bun dev`) to start the Turbopack dev server.

## What's in scope

Good areas to contribute:

- **New MCP tools** — add to `src/lib/mcp/tools/`. Each tool must declare its tier (0–3) and, for tier 2+, an explicit `requires_confirmation` flag and message. Update `src/app/.well-known/mcp.json/route.ts` to reflect new tools.
- **New static analysis checks** for the Health Hub (`src/lib/health/checks.ts`) or Technical Debt scanner (`src/lib/debt/checks.ts`). Static analysis surfaces findings; the agent explains them. Keep the two responsibilities separate.
- **New workspace pages** — follow the pattern in `src/app/(workspace)/health/page.tsx` etc. Each page declares its toolset via the `AgentBar` component.
- **Bug fixes** — issues with reproductions get priority.

Out of scope for now:

- Production Apex test runners, packaging/CI integrations, change-set automation — these are deliberately deferred (see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)).
- Multi-tenant SaaS hardening. SF Dev AI is single-user-per-instance today.

## PR conventions

- Branch from `main`. Keep PRs focused — one feature or fix per PR.
- Run `npm run lint` and ensure no TypeScript errors before pushing.
- Include a short test plan in the PR body: how you verified the change works against a real Salesforce org.
- For new tools, include the manifest update in the same PR.

## Security

Found a security issue? Don't open a public issue. See [SECURITY.md](./SECURITY.md).

## License

By contributing you agree your contributions are licensed under the [Apache License 2.0](./LICENSE).
