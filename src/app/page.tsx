import Link from "next/link";
import { Zap, Workflow, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-primary p-8 overflow-hidden">
      {/* Atmospheric grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#1b96ff 1px, transparent 1px), linear-gradient(90deg, #1b96ff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-blue/5 blur-[120px]" />

      <div className="relative flex flex-col items-center gap-8 max-w-2xl text-center">
        <div className="logo-hover flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue/15 text-accent-blue shadow-lg shadow-accent-blue/10">
          <Zap className="h-8 w-8" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            SF Dev AI
          </h1>
          <p className="text-lg text-text-secondary max-w-lg">
            AI-native Salesforce developer workbench. Describe what you want in
            natural language — get production-grade Salesforce artifacts.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="group rounded-xl border border-border-default bg-bg-secondary p-6 text-left transition-all hover:border-accent-blue/20 hover:bg-bg-secondary/80">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue/10">
              <Workflow className="h-5 w-5 text-accent-blue" />
            </div>
            <h3 className="font-semibold text-text-primary">Flow Builder</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Describe a flow in plain English. Watch it build itself on canvas
              in real-time.
            </p>
          </div>
          <div className="group rounded-xl border border-border-default bg-bg-secondary p-6 text-left transition-all hover:border-accent-purple/20 hover:bg-bg-secondary/80">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-purple/10">
              <Search className="h-5 w-5 text-accent-purple" />
            </div>
            <h3 className="font-semibold text-text-primary">SOQL Workspace</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Ask questions about your data in English. Get SOQL, run it,
              explore results.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link href="/flows/new">
            <Button size="lg" className="gap-2 shadow-lg shadow-accent-blue/20">
              Start Building
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-text-secondary gap-1.5">
              Or connect a Salesforce org for schema-aware generation
            </Button>
          </Link>
        </div>

        <p className="text-xs text-text-muted font-mono">
          No Salesforce connection required to start
        </p>
      </div>
    </div>
  );
}
