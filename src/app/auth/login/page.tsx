import { headers } from "next/headers";
import { LoginContent } from "./login-content";

export default async function LoginPage() {
  const sfConfigured = !!process.env.SF_CLIENT_ID;

  // Derive the callback URL so we can show it in the setup guide
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") || "http";
  const callbackUrl = `${proto}://${host}/auth/callback`;

  return <LoginContent sfConfigured={sfConfigured} callbackUrl={callbackUrl} />;
}
