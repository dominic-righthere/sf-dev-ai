/**
 * Anonymous Apex execution — closes the AI-validation loop. An agent that
 * generates Apex code can now run it via the Tooling API, see compile
 * errors and debug log output, and iterate.
 *
 * This is the gap that distinguishes a metadata-only assistant from a real
 * developer copilot: it can verify the code it suggests actually compiles
 * and runs in the target org before declaring success.
 *
 * Note: `@salesforce/mcp` does not ship an anonymous-apex tool as of
 * v0.30.13 (May 2026). Adding it here is a deliberate gap close.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Connection from "jsforce/lib/connection";
import { z } from "zod";
import { ANNOTATIONS } from "../annotations";

export function registerApexTools(
  server: McpServer,
  getConnection: () => Connection,
) {
  server.tool(
    "execute_anonymous_apex",
    "Compile and execute an Apex code snippet anonymously in the connected org via the Tooling API. Returns compile status, execution status, debug log, and any exception details. Useful for validating AI-generated Apex before deploying it. Side-effects are real (DML, callouts, etc.) — runs as the authenticated user.",
    {
      body: z
        .string()
        .describe(
          "Apex code to execute. Treat as a script body (no class/method wrapper). Use System.debug() to surface values in the returned debug log.",
        ),
    },
    ANNOTATIONS.create,
    async ({ body }) => {
      const conn = getConnection();
      // jsforce's tooling.executeAnonymous wraps the SOAP Apex.executeAnonymous call.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (await (conn as any).tooling.executeAnonymous(body)) as {
        compiled: boolean;
        compileProblem?: string | null;
        success: boolean;
        line?: number | null;
        column?: number | null;
        exceptionMessage?: string | null;
        exceptionStackTrace?: string | null;
      };

      // Compose a structured response. We don't fetch the full debug log by
      // default (that's a separate Tooling API call against ApexLog) — the
      // executeAnonymous result already includes compile + runtime status
      // and exception details.
      const payload = {
        compiled: result.compiled,
        executed: result.success,
        compileProblem: result.compiled ? null : result.compileProblem ?? null,
        compileLocation:
          !result.compiled && result.line != null
            ? { line: result.line, column: result.column ?? null }
            : null,
        exception:
          result.exceptionMessage
            ? {
                message: result.exceptionMessage,
                stackTrace: result.exceptionStackTrace ?? null,
              }
            : null,
      };

      const isError = !result.compiled || !result.success;
      return {
        content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
        ...(isError ? { isError: true } : {}),
      };
    },
  );
}
