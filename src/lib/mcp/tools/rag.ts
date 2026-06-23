/**
 * RAG tools — semantic retrieval over the org's generated documentation, so the
 * agent can ground answers in prior architecture/security docs instead of
 * re-deriving them. Read-only: indexing writes to the local index, never the org.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ANNOTATIONS } from "../annotations";
import { isEmbeddingConfigured } from "../../rag/embed";
import { indexOrgDocuments, retrieveContext } from "../../rag/pipeline";
import type { OrgContext } from "./governance";

const NOT_CONFIGURED =
  "Embedding API not configured. Set EMBEDDING_API_KEY (and optionally EMBEDDING_BASE_URL / EMBEDDING_MODEL).";

export function registerRagTools(server: McpServer, getOrgContext: () => OrgContext) {
  server.tool(
    "retrieve_org_context",
    "Semantic search over this org's generated documentation (architecture overviews, security model, object inventory). Returns the most relevant passages to ground an answer. If results are empty, run index_org_documents first.",
    {
      query: z.string().describe("What to search the org documentation for"),
      limit: z.number().optional().describe("Max passages to return (default 5)"),
    },
    ANNOTATIONS.read,
    async ({ query, limit }) => {
      if (!isEmbeddingConfigured()) {
        return { content: [{ type: "text" as const, text: NOT_CONFIGURED }] };
      }
      const ctx = getOrgContext();
      const hits = await retrieveContext(ctx.orgId, query, limit ?? 5);
      if (hits.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No indexed documents for this org. Run index_org_documents first.",
            },
          ],
        };
      }
      const text = hits
        .map((h, i) => `[${i + 1}] (score ${h.score.toFixed(3)})\n${h.content}`)
        .join("\n\n");
      return { content: [{ type: "text" as const, text }] };
    },
  );

  server.tool(
    "index_org_documents",
    "Embed and index this org's generated documents for semantic retrieval. Run after generating or updating org documentation.",
    {},
    ANNOTATIONS.read,
    async () => {
      if (!isEmbeddingConfigured()) {
        return { content: [{ type: "text" as const, text: NOT_CONFIGURED }] };
      }
      const ctx = getOrgContext();
      const stats = await indexOrgDocuments(ctx.orgId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Indexed ${stats.chunks} chunks from ${stats.documents} document(s).`,
          },
        ],
      };
    },
  );
}
