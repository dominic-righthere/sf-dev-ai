import { randomBytes, createHash } from "crypto";
import type { SalesforceTokens } from "./types";

const PRODUCTION_LOGIN_URL = "https://login.salesforce.com";
const SANDBOX_LOGIN_URL = "https://test.salesforce.com";

// Salesforce CLI's built-in Connected App — pre-authorized in every org
const PLATFORM_CLI_CLIENT_ID = "PlatformCLI";

// -- PKCE helpers --

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function isSfConfigured(): boolean {
  return !!process.env.SF_CLIENT_ID;
}

export function getClientId(): string {
  return process.env.SF_CLIENT_ID || PLATFORM_CLI_CLIENT_ID;
}

function getLoginUrl(orgType: "production" | "sandbox"): string {
  return orgType === "sandbox" ? SANDBOX_LOGIN_URL : PRODUCTION_LOGIN_URL;
}

/**
 * Resolve the OAuth callback URL. Uses SF_CALLBACK_URL env var if set,
 * otherwise derives it from the incoming request URL.
 */
export function resolveCallbackUrl(requestUrl?: string): string {
  if (process.env.SF_CALLBACK_URL) {
    return process.env.SF_CALLBACK_URL;
  }
  if (requestUrl) {
    const url = new URL(requestUrl);
    return `${url.protocol}//${url.host}/auth/callback`;
  }
  throw new Error(
    "SF_CALLBACK_URL is not configured and no request URL was provided to derive it"
  );
}

export function buildAuthorizationUrl(
  orgType: "production" | "sandbox",
  requestUrl?: string,
  codeChallenge?: string
): string {
  const loginUrl = getLoginUrl(orgType);
  const clientId = process.env.SF_CLIENT_ID;

  if (!clientId) {
    throw new Error("SF_CLIENT_ID is not configured. Add it to your environment variables.");
  }

  const redirectUri = resolveCallbackUrl(requestUrl);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "full refresh_token",
    prompt: "login consent",
  });

  if (codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }

  return `${loginUrl}/services/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  orgType: "production" | "sandbox",
  redirectUri?: string,
  codeVerifier?: string
): Promise<SalesforceTokens> {
  const loginUrl = getLoginUrl(orgType);
  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;
  const resolvedRedirectUri = redirectUri || resolveCallbackUrl();

  if (!clientId || !clientSecret) {
    throw new Error(
      "SF_CLIENT_ID and SF_CLIENT_SECRET must be configured"
    );
  }

  const params: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: resolvedRedirectUri,
  };

  if (codeVerifier) {
    params.code_verifier = codeVerifier;
  }

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl: data.instance_url,
    id: data.id,
    issuedAt: data.issued_at,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  orgType: "production" | "sandbox"
): Promise<{ accessToken: string; issuedAt: string }> {
  const loginUrl = getLoginUrl(orgType);
  const clientId = getClientId();
  const clientSecret = process.env.SF_CLIENT_SECRET;

  const params: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  };
  // Only include secret when using a custom Connected App
  if (clientSecret) {
    params.client_secret = clientSecret;
  }

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    issuedAt: data.issued_at,
  };
}

export async function getUserInfo(
  accessToken: string,
  idUrl: string
): Promise<{ username: string; displayName: string; orgId: string; userId: string }> {
  const response = await fetch(idUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  const data = await response.json();
  return {
    username: data.username,
    displayName: data.display_name,
    orgId: data.organization_id,
    userId: data.user_id,
  };
}

// -- Device Authorization Flow (zero-config, uses PlatformCLI) --

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
}

export async function requestDeviceCode(
  orgType: "production" | "sandbox"
): Promise<DeviceCodeResponse> {
  const loginUrl = getLoginUrl(orgType);
  const clientId = getClientId();

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      response_type: "device_code",
      client_id: clientId,
      scope: "full refresh_token",
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (data.error === "invalid_grant" && /device flow/i.test(data.error_description || "")) {
      throw new Error(
        "Device Flow is not enabled in your Salesforce org. " +
        "Go to Setup → OAuth and OpenID Connect Settings → enable \"Allow OAuth Device Flow\"."
      );
    }
    throw new Error(`Device code request failed: ${JSON.stringify(data)}`);
  }

  return response.json();
}

export interface DeviceTokenResult {
  status: "pending" | "success" | "error";
  tokens?: SalesforceTokens;
  error?: string;
}

export async function pollDeviceToken(
  deviceCode: string,
  orgType: "production" | "sandbox"
): Promise<DeviceTokenResult> {
  const loginUrl = getLoginUrl(orgType);
  const clientId = getClientId();

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "device",
      client_id: clientId,
      code: deviceCode,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    // "authorization_pending" means user hasn't authorized yet — keep polling
    if (data.error === "authorization_pending") {
      return { status: "pending" };
    }
    // "slow_down" means we're polling too fast
    if (data.error === "slow_down") {
      return { status: "pending" };
    }
    return {
      status: "error",
      error: data.error_description || data.error || "Token poll failed",
    };
  }

  const data = await response.json();
  return {
    status: "success",
    tokens: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      instanceUrl: data.instance_url,
      id: data.id,
      issuedAt: data.issued_at,
    },
  };
}
