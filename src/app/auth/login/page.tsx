"use client";

import { useState } from "react";
import { Zap, Cloud, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleConnect = (orgType: "production" | "sandbox") => {
    setLoading(true);
    window.location.href = `/api/auth/salesforce?orgType=${orgType}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-blue/20 text-accent-blue">
            <Zap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Connect Your Org
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Authenticate with Salesforce to get started. Your tokens are
              stored securely in an encrypted session cookie.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14 px-4"
            onClick={() => handleConnect("production")}
            disabled={loading}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-blue/10">
              <Cloud className="h-5 w-5 text-accent-blue" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-text-primary">
                Production Org
              </div>
              <div className="text-xs text-text-muted">login.salesforce.com</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14 px-4"
            onClick={() => handleConnect("sandbox")}
            disabled={loading}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-amber/10">
              <TestTube className="h-5 w-5 text-accent-amber" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-text-primary">
                Sandbox Org
              </div>
              <div className="text-xs text-text-muted">test.salesforce.com</div>
            </div>
          </Button>
        </div>

        <p className="text-center text-xs text-text-muted">
          Uses OAuth 2.0 Web Server flow. No passwords stored.
        </p>
      </div>
    </div>
  );
}
