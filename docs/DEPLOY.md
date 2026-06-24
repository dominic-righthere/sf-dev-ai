# Deploying sf-dev-ai

This guide covers the **hosted SaaS path** for sf-dev-ai — registering an External Client App with Salesforce and deploying the Next.js workspace to Vercel with managed Postgres. For local dev, see the project README.

## Why External Client App, not Connected App

Salesforce **disabled creation of new Connected Apps in every org in Spring '26** (March 2026). External Client Apps (ECAs) are the supported replacement: secure-by-default, finer-grained policy controls, and the only thing that packages cleanly with 2GP. The OAuth wire protocol is identical to a Connected App — sf-dev-ai's `lib/salesforce/auth.ts` doesn't need to change, only the metadata you create on the Salesforce side does.

If you already have a Connected App in production, it keeps working; this guide is for a fresh setup.

## 1 — Register the External Client App in your org

Do this in the org that will *own* the app (your corporate prod org, or a long-lived Developer Edition for prototyping — not a Trailhead Playground, which expires).

1. **Setup → External Client Apps → New External Client App**.
2. **Basic Information**
   - Name: `sf-dev-ai`
   - Contact email: yours
3. **OAuth Settings**
   - **Enable OAuth**: yes
   - **Callback URL**: `https://<your-domain>/auth/callback` (Vercel preview deployments also need their URL added; you can add multiple, one per line)
   - **OAuth Scopes**: `Manage user data via APIs (api)`, `Perform requests at any time (refresh_token, offline_access)`, `Full access (full)` — choose the smallest set that covers your toolsets; `full` is the simplest for the workbench experience.
   - **Require PKCE**: yes (Web Server flow uses it)
   - **Allow Device Flow**: yes if you want the zero-config CLI fallback to keep working in prod
4. **Policies → App Settings**
   - **Permitted Users**: `All users may self-authorize` — this is what lets *other* customers' orgs OAuth into your app.
   - **IP Relaxation**: `Relax IP restrictions` (your Vercel functions have rotating IPs)
   - **Refresh Token Policy**: `Refresh token is valid until revoked`
5. Save. **Wait ~10 minutes** before testing — Salesforce caches Connected/External App metadata aggressively and a too-fast first attempt will fail with a confusing error.
6. Open the saved app → **Manage Consumer Details**. Copy:
   - **Consumer Key** → `SF_CLIENT_ID`
   - **Consumer Secret** → `SF_CLIENT_SECRET`

## 2 — Provision Postgres

The SQLite default is for local dev only. Vercel's serverless filesystem is read-only at request time, so SQLite won't survive a deploy.

Pick one from the Vercel Marketplace:

- **Neon** — serverless Postgres, generous free tier, low cold-start latency. Recommended for this workload.
- **Supabase** — Postgres + dashboard + auth UI (you don't need their auth, but the dashboard is nice).
- **Vercel Postgres (powered by Neon)** — managed via the Vercel dashboard end-to-end.

Create a database and copy its connection string (it'll look like `postgresql://user:pass@host/db?sslmode=require`).

## 3 — Wire up Vercel env vars

In Vercel → your project → Settings → Environment Variables, set:

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | ✓ | Your Postgres connection string |
| `SESSION_SECRET` | ✓ | `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | ✓ | From console.anthropic.com |
| `SF_CLIENT_ID` | ✓ | ECA Consumer Key |
| `SF_CLIENT_SECRET` | ✓ | ECA Consumer Secret |
| `SF_CALLBACK_URL` | ✓ | `https://<your-vercel-domain>/auth/callback` |
| `EMBEDDING_API_KEY` | optional | If you want grounded agent answers (RAG) |

Set scope to **Production + Preview + Development** for `DATABASE_URL` and `SESSION_SECRET`; you may want a separate ECA for Preview deployments since they use a different domain.

Alternatively, use the CLI:

```bash
vercel env add DATABASE_URL production
vercel env add SF_CLIENT_ID production
# …etc
```

## 4 — Deploy

```bash
vercel --prod
```

After the first deploy:

```bash
# Push schema to your production Postgres
DATABASE_URL='postgresql://…' npm run db:push
```

Re-run `db:push` after any schema change. For larger teams, switch to `db:generate` + `db:migrate` for a tracked migration history.

## 5 — Smoke test

1. Visit `https://<your-domain>/auth/login`.
2. Log in with a Salesforce user from *any* org (not just the one that owns the ECA — that's the whole point of `All users may self-authorize`).
3. First time, you should see a Salesforce consent screen: *"sf-dev-ai is requesting access to your data."*
4. After consent, you land on the workspace. Visit `/health` and run a scan.

If the consent screen errors with `invalid_client_id` and you only saved the ECA <10 minutes ago, wait and try again.

## 6 — Optional: domain, MFA, monitoring

- **Custom domain.** Add it in Vercel → Domains, then update `SF_CALLBACK_URL` *and* the ECA's callback URL in Salesforce (both must match exactly).
- **MFA.** As of 22 June / 13 July 2026, Salesforce enforces phishing-resistant MFA on user logins. Your customers' users must be MFA-enrolled to consent — this is on them, not you, but worth flagging.
- **Cost / quotas.** Per-tenant rate limits are on the Q1 2027 roadmap. Until then, monitor `ANTHROPIC_API_KEY` usage in the Anthropic console; one runaway tenant can spike the bill.
- **Audit log persistence.** Not on by default (Q3 2026 roadmap item). Required before enterprise / SOC2 conversations.

## Limits this guide doesn't cover

- AppExchange listing + Security Review — see `docs/ROADMAP.md`. Step 2 of the SaaS ladder.
- Per-tenant LLM cost caps — Q1 2027 roadmap item.
- Multi-region deploys — Vercel Functions are global by default; pin the database region close to your primary user base.
- Backup + DR for Postgres — depends on your provider; Neon has point-in-time recovery on paid tiers.
