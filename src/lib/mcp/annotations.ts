/**
 * MCP tool annotation presets keyed to the SF Dev AI tier model.
 *
 * Tiers are declared at the protocol layer in /.well-known/mcp.json and
 * surfaced to MCP clients (Claude Code, Cursor, Windsurf) via these
 * annotations so they can render confirmation gates without consulting the
 * manifest. This is the single most differentiating feature versus the
 * official @salesforce/mcp server, which exposes no safety hints at all.
 *
 *   tier 0 → read           (auto-run; SOQL, describes, lists)
 *   tier 1 → readSensitive  (auto-run; Apex bodies, raw permission XML)
 *   tier 2 → create | update (confirm; create_* / update_*)
 *   tier 3 → delete         (confirm + irreversibility warning; delete_*)
 *
 * Reference: MCP protocol 2024-11-05 ToolAnnotations
 *   - readOnlyHint:    no environment mutation
 *   - destructiveHint: may perform destructive updates (meaningful when readOnlyHint=false)
 *   - idempotentHint:  same args → same end state when called repeatedly
 *   - openWorldHint:   interacts with external entities (true for Salesforce ops)
 */
export const ANNOTATIONS = {
  /** Tier 0 — read-only, low-impact. Queries, describes, lists. */
  read: {
    readOnlyHint: true,
    openWorldHint: true,
  },

  /** Tier 1 — read, sensitive payload. Apex bodies, raw permission XML, FlexiPage source. */
  readSensitive: {
    readOnlyHint: true,
    openWorldHint: true,
  },

  /** Tier 2 (create) — non-destructive mutation, NOT idempotent (each call adds a new entity). */
  create: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },

  /** Tier 2 (update) — non-destructive mutation, idempotent (same payload → same end state). */
  update: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },

  /** Tier 3 (delete) — destructive, NOT idempotent (second call errors on already-deleted entity). */
  delete: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },

  /** In-app agent helper: emits SSE events to the workspace UI. No external side effect. */
  uiEvent: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;
