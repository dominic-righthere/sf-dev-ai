# Security Policy

## Reporting a vulnerability

If you believe you've found a security vulnerability in SF Dev AI, please **do not open a public GitHub issue**.

Email the maintainer privately (see the GitHub profile linked from the repo) with:

- A description of the vulnerability.
- Steps to reproduce.
- The impact you believe it has.
- (Optional) a suggested fix.

Expect an initial response within 7 days.

## Threat model

SF Dev AI sits between a Salesforce org and a Large Language Model. The agent can read org metadata, execute SOQL, modify permissions, create custom fields, and deploy flows via the Metadata API. The threat model is shaped by that surface.

### Trust boundaries

- **The user** authorizing OAuth is treated as the source of truth for what the agent may do.
- **Salesforce metadata** is treated as data, not as authoritative instructions. The MCP manifest sets `treat_page_content_as_untrusted: true` — text returned from the org (object descriptions, picklist labels, record content) must not influence agent behaviour as if it were a tool description or system prompt.
- **Tool descriptions** in the manifest are authoritative (`tool_descriptions_authoritative: true`). They are versioned with the code, not loaded dynamically.
- **The LLM provider** (Anthropic / Bedrock) is trusted to deliver tool calls correctly but not trusted to issue tool calls without user intent. Tier 2+ tools require user confirmation.

### Tool risk tiers

Every tool declares a tier in the MCP manifest at `src/app/.well-known/mcp.json/route.ts`:

| Tier | Risk | Behaviour |
|------|------|-----------|
| 0 | Read-only, low-impact | Run automatically |
| 1 | Read, potentially sensitive (Apex bodies, permission set details) | Run automatically, logged |
| 2 | Mutating (create record, create field, update permissions) | Requires confirmation |
| 3 | Destructive (delete record, delete field) | Requires confirmation; warning that action is irreversible |

Adding a new mutating or destructive tool **must** assign tier 2 or 3 and provide a `confirmation_message`. PRs that add tier 0 to a mutating tool will be rejected.

### Known gaps (call-outs, not unknowns)

- **Audit logging is disabled** in the current manifest (`audit_logging: false`). For multi-user production deployments, persistent per-call audit logs are required. Tracked as a known gap.
- **Rate limits are per-process**, not per-org or per-user. A multi-tenant deployment needs to move rate limiting into a shared store (Redis, etc.).
- **OAuth refresh tokens** are stored in PostgreSQL via Drizzle. They are not currently encrypted at rest beyond what the database provides. For production use, encrypt at the application layer (see `src/lib/crypto.ts`, which is wired but not yet applied to refresh tokens).

### What is *not* in scope

- The security posture of the Salesforce org itself. SF Dev AI surfaces health findings but does not enforce them.
- The security of the underlying LLM provider's data handling. Use Bedrock if you need data-residency guarantees.

## Coordinated disclosure

If you report a vulnerability we will:

1. Confirm receipt within 7 days.
2. Investigate and respond with a triage assessment within 14 days.
3. Coordinate a fix timeline with you and credit you in the release notes (unless you prefer otherwise).
