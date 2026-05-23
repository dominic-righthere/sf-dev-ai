/**
 * Read Salesforce CLI auth from ~/.sfdx (the canonical location used by both
 * `sfdx` and `sf` CLI families) so the stdio MCP server can reuse the dev's
 * existing org logins — same UX as Salesforce's own DX MCP Server.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import jsforce from "jsforce";

export interface SfAuthRecord {
  username: string;
  instanceUrl: string;
  accessToken: string;
  refreshToken?: string;
  loginUrl?: string;
  orgId: string;
  clientId?: string;
  instanceApiVersion?: string;
  isDevHub?: boolean;
  isSandbox?: boolean;
  isScratch?: boolean;
}

interface AliasFile {
  orgs?: Record<string, string>;
}

const SFDX_DIR = join(homedir(), ".sfdx");

/**
 * Sentinels that match the official Salesforce DX MCP Server's flag conventions
 * so users can register both servers with the same arg style.
 */
export const SENTINELS = {
  DEFAULT_TARGET_ORG: "DEFAULT_TARGET_ORG",
  DEFAULT_TARGET_DEV_HUB: "DEFAULT_TARGET_DEV_HUB",
} as const;

function readJsonOrNull<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function loadAliases(): Record<string, string> {
  const file = readJsonOrNull<AliasFile>(join(SFDX_DIR, "alias.json"));
  return file?.orgs ?? {};
}

function loadAuthForUsername(username: string): SfAuthRecord | null {
  return readJsonOrNull<SfAuthRecord>(join(SFDX_DIR, `${username}.json`));
}

/**
 * Resolve an org argument to an auth record. Accepts:
 *  - a username (e.g. user@example.com)
 *  - an alias (resolved via ~/.sfdx/alias.json)
 *  - "DEFAULT_TARGET_ORG" / "DEFAULT_TARGET_DEV_HUB" sentinels
 */
export function resolveAuth(orgArg: string): SfAuthRecord {
  if (!existsSync(SFDX_DIR)) {
    throw new Error(
      "~/.sfdx not found. Run `sf org login web` (or `sf org login device`) first.",
    );
  }

  if (orgArg === SENTINELS.DEFAULT_TARGET_ORG || orgArg === SENTINELS.DEFAULT_TARGET_DEV_HUB) {
    const wantDevHub = orgArg === SENTINELS.DEFAULT_TARGET_DEV_HUB;
    const aliases = loadAliases();
    for (const username of Object.values(aliases)) {
      const auth = loadAuthForUsername(username);
      if (!auth) continue;
      if (!wantDevHub || auth.isDevHub) return auth;
    }
    throw new Error(
      `Could not resolve ${orgArg}. Set a default with \`sf config set ${
        wantDevHub ? "target-dev-hub" : "target-org"
      }=<alias>\`, or pass --orgs <username|alias> directly.`,
    );
  }

  const aliases = loadAliases();
  const resolvedUsername = aliases[orgArg] ?? orgArg;
  const auth = loadAuthForUsername(resolvedUsername);
  if (!auth) {
    throw new Error(
      `No auth found for "${orgArg}". Run \`sf org list\` to see available orgs, or \`sf org login web --alias ${orgArg}\` to add one.`,
    );
  }
  return auth;
}

/**
 * Build a jsforce Connection from an auth record. Includes refresh-token
 * handling so a stale access token is refreshed transparently against the
 * sf CLI's PlatformCLI connected app (PKCE-based; no client secret).
 */
export function buildConnection(auth: SfAuthRecord): jsforce.Connection {
  return new jsforce.Connection({
    instanceUrl: auth.instanceUrl,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    oauth2: {
      loginUrl: auth.loginUrl ?? "https://login.salesforce.com",
      clientId: auth.clientId ?? "PlatformCLI",
      clientSecret: "",
      redirectUri: "http://localhost:1717/OauthRedirect",
    },
    version: auth.instanceApiVersion ?? "62.0",
  });
}
