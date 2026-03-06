import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "SF Dev AI — AI-Native Salesforce Developer Workbench",
  description:
    "Build Salesforce Flows, write SOQL, and manage metadata using natural language.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
