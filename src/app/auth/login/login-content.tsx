"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Zap, Cloud, TestTube, AlertCircle, ExternalLink, Loader2, Copy, Check,
  ChevronRight, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function SetupGuide({ callbackUrl }: { callbackUrl: string }) {
  const [copiedCallback, setCopiedCallback] = useState(false);

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent-amber/20 bg-accent-amber/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-accent-amber" />
          <p className="text-sm font-medium text-text-primary">One-time setup required</p>
        </div>
        <p className="text-xs text-text-secondary mb-4">
          Create a Connected App in any Salesforce org. Once created, it works for all orgs — production and sandbox.
        </p>

        <ol className="space-y-3 text-xs">
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 text-[10px] font-bold text-accent-blue">1</span>
            <div>
              <p className="text-text-primary font-medium">Open App Manager in any Salesforce org</p>
              <p className="text-text-muted mt-0.5">Setup → App Manager → New Connected App</p>
            </div>
          </li>

          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 text-[10px] font-bold text-accent-blue">2</span>
            <div>
              <p className="text-text-primary font-medium">Fill in basics</p>
              <p className="text-text-muted mt-0.5">Name: <span className="font-mono text-text-secondary">SF Dev AI</span>, Contact Email: yours</p>
            </div>
          </li>

          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 text-[10px] font-bold text-accent-blue">3</span>
            <div>
              <p className="text-text-primary font-medium">Enable OAuth Settings</p>
              <div className="mt-1 space-y-1.5">
                <div>
                  <p className="text-text-muted">Callback URL:</p>
                  <button
                    onClick={handleCopyCallback}
                    className="group mt-0.5 inline-flex items-center gap-1.5 rounded bg-bg-tertiary px-2 py-1 font-mono text-accent-blue hover:bg-bg-tertiary/80 transition-colors cursor-pointer"
                  >
                    <span className="select-all">{callbackUrl}</span>
                    {copiedCallback ? (
                      <Check className="h-3 w-3 text-accent-green" />
                    ) : (
                      <Copy className="h-3 w-3 text-text-muted group-hover:text-text-secondary" />
                    )}
                  </button>
                </div>
                <p className="text-text-muted">
                  Scopes: <span className="font-mono text-text-secondary">Full access (full)</span> + <span className="font-mono text-text-secondary">Perform requests at any time (refresh_token)</span>
                </p>
              </div>
            </div>
          </li>

          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 text-[10px] font-bold text-accent-blue">4</span>
            <div>
              <p className="text-text-primary font-medium">Save & copy credentials</p>
              <p className="text-text-muted mt-0.5">
                Manage Consumer Details → copy <span className="font-mono text-text-secondary">Consumer Key</span> and <span className="font-mono text-text-secondary">Consumer Secret</span>
              </p>
            </div>
          </li>

          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 text-[10px] font-bold text-accent-blue">5</span>
            <div>
              <p className="text-text-primary font-medium">Add to environment</p>
              <div className="mt-1 rounded bg-bg-tertiary px-2.5 py-1.5 font-mono text-text-secondary leading-relaxed">
                <p>SF_CLIENT_ID=&lt;Consumer Key&gt;</p>
                <p>SF_CLIENT_SECRET=&lt;Consumer Secret&gt;</p>
              </div>
              <p className="text-text-muted mt-1">Add to <span className="font-mono">.env.local</span> and restart</p>
            </div>
          </li>
        </ol>
      </div>

      <div className="flex items-center justify-center gap-3">
        <a
          href="https://login.salesforce.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-blue hover:text-accent-blue/80 transition-colors"
        >
          Open Production Org <ExternalLink className="h-3 w-3" />
        </a>
        <span className="text-text-muted">·</span>
        <a
          href="https://test.salesforce.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-amber hover:text-accent-amber/80 transition-colors"
        >
          Open Sandbox Org <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function LoginInner({ sfConfigured, callbackUrl }: { sfConfigured: boolean; callbackUrl: string }) {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleConnect = (orgType: "production" | "sandbox") => {
    setLoading(true);
    window.location.href = `/api/auth/salesforce?orgType=${orgType}`;
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg-primary p-8 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(#1b96ff 1px, transparent 1px), linear-gradient(90deg, #1b96ff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="logo-hover flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-blue/15 text-accent-blue shadow-lg shadow-accent-blue/10">
            <Zap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {sfConfigured ? "Connect Your Org" : "Get Started"}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {sfConfigured
                ? "Authenticate with Salesforce to get started. Your tokens are stored securely in an encrypted session cookie."
                : "Connect SF Dev AI to Salesforce with a Connected App."}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-accent-red mt-0.5" />
            <div>
              <p className="text-sm font-medium text-accent-red">Connection failed</p>
              <p className="text-xs text-accent-red/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {sfConfigured ? (
          <>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-16 px-4 group hover:border-accent-blue/30 transition-all"
                onClick={() => handleConnect("production")}
                disabled={loading}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue/10 group-hover:bg-accent-blue/15 transition-colors">
                  <Cloud className="h-5 w-5 text-accent-blue" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    Production Org
                  </div>
                  <div className="text-xs text-text-muted font-mono">
                    login.salesforce.com
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-text-secondary transition-colors" />
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-16 px-4 group hover:border-accent-amber/30 transition-all"
                onClick={() => handleConnect("sandbox")}
                disabled={loading}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-amber/10 group-hover:bg-accent-amber/15 transition-colors">
                  <TestTube className="h-5 w-5 text-accent-amber" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    Sandbox Org
                  </div>
                  <div className="text-xs text-text-muted font-mono">
                    test.salesforce.com
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-text-secondary transition-colors" />
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-text-muted font-mono">
              OAuth 2.0 Web Server flow — works with any Salesforce org
            </p>
          </>
        ) : (
          <SetupGuide callbackUrl={callbackUrl} />
        )}
      </div>
    </div>
  );
}

export function LoginContent({ sfConfigured, callbackUrl }: { sfConfigured: boolean; callbackUrl: string }) {
  return (
    <Suspense>
      <LoginInner sfConfigured={sfConfigured} callbackUrl={callbackUrl} />
    </Suspense>
  );
}
