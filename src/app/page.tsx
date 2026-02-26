import Link from "next/link";
import { Zap, Workflow, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary p-8">
      <div className="flex flex-col items-center gap-8 max-w-2xl text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue/20 text-accent-blue">
          <Zap className="h-8 w-8" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            SF Dev AI
          </h1>
          <p className="text-lg text-text-secondary">
            AI-native Salesforce developer workbench. Describe what you want in
            natural language — get production-grade Salesforce artifacts.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border-default bg-bg-secondary p-6 text-left">
            <Workflow className="mb-3 h-6 w-6 text-accent-blue" />
            <h3 className="font-semibold text-text-primary">Flow Builder</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Describe a flow in plain English. Watch it build itself on canvas
              in real-time.
            </p>
          </div>
          <div className="rounded-xl border border-border-default bg-bg-secondary p-6 text-left">
            <Search className="mb-3 h-6 w-6 text-accent-purple" />
            <h3 className="font-semibold text-text-primary">SOQL Workspace</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Ask questions about your data in English. Get SOQL, run it,
              explore results.
            </p>
          </div>
        </div>

        <Link href="/auth/login">
          <Button size="lg" className="gap-2">
            Connect Your Salesforce Org
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        <p className="text-xs text-text-muted">
          Supports Production and Sandbox orgs via OAuth 2.0
        </p>
      </div>
    </div>
  );
}
