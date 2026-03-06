export function createSSEStream(): {
  stream: ReadableStream;
  send: (event: string, data: unknown) => void;
  close: () => void;
} {
  let controller: ReadableStreamDefaultController | null = null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    },
    cancel() {
      controller = null;
    },
  });

  function send(event: string, data: unknown) {
    if (!controller) return;
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(payload));
    } catch {
      // Stream closed
    }
  }

  function close() {
    if (!controller) return;
    try {
      send("done", { status: "complete" });
      controller.close();
    } catch {
      // Already closed
    }
    controller = null;
  }

  return { stream, send, close };
}

export type SSEEvent =
  | { type: "flow_metadata"; data: { apiName: string; label: string; description: string; processType: string } }
  | { type: "flow_element"; data: Record<string, unknown> }
  | { type: "flow_variable"; data: Record<string, unknown> }
  | { type: "thinking"; data: { text: string } }
  | { type: "usage"; data: { inputTokens: number; outputTokens: number } }
  | { type: "generation_summary"; data: { totalInputTokens: number; totalOutputTokens: number; estimatedCost: number; turns: number } }
  | { type: "clarification"; data: { question: string; options?: string[]; context?: string } }
  | { type: "assistant_message"; data: { text: string } }
  | { type: "error"; data: { message: string } }
  | { type: "done"; data: { status: string } };
