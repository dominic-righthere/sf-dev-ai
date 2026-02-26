import type { SalesforceTokens } from "./types";

const PRODUCTION_LOGIN_URL = "https://login.salesforce.com";
const SANDBOX_LOGIN_URL = "https://test.salesforce.com";

function getLoginUrl(orgType: "production" | "sandbox"): string {
  return orgType === "sandbox" ? SANDBOX_LOGIN_URL : PRODUCTION_LOGIN_URL;
}

export function buildAuthorizationUrl(orgType: "production" | "sandbox"): string {
  const loginUrl = getLoginUrl(orgType);
  const clientId = process.env.SF_CLIENT_ID;
  const redirectUri = process.env.SF_CALLBACK_URL;

  if (!clientId || !redirectUri) {
    throw new Error("SF_CLIENT_ID and SF_CALLBACK_URL must be configured");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "full refresh_token",
    prompt: "login consent",
  });

  return `${loginUrl}/services/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  orgType: "production" | "sandbox"
): Promise<SalesforceTokens> {
  const loginUrl = getLoginUrl(orgType);
  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;
  const redirectUri = process.env.SF_CALLBACK_URL;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "SF_CLIENT_ID, SF_CLIENT_SECRET, and SF_CALLBACK_URL must be configured"
    );
  }

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
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
  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SF_CLIENT_ID and SF_CLIENT_SECRET must be configured");
  }

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
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
