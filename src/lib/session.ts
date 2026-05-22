import { SessionOptions } from "iron-session";

export interface SessionData {
  accessToken?: string;
  instanceUrl?: string;
  orgId?: string;
  sfUserId?: string;
  username?: string;
  displayName?: string;
  orgType?: "production" | "sandbox";
  issuedAt?: number;
  appUserId?: string;
  orgConnectionId?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long_for_dev",
  cookieName: "sf-dev-ai-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 8, // 8 hours
  },
};
