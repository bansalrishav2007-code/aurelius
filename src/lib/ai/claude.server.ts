import { ensureServerEnv, getAnthropicApiKey } from "@/lib/env.server";

export type ClaudeMessage = {
  role: "user" | "assistant";
  content: string;
};

function getApiKey(): string | undefined {
  ensureServerEnv();
  return getAnthropicApiKey();
}

function getModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";
}

export function isClaudeConfigured(): boolean {
  return Boolean(getApiKey());
}

function openAiSseChunk(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
}

const MIN_MAX_TOKENS = 1024;

export async function streamClaudeCompletion(opts: {
  system: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Claude is not configured. Set ANTHROPIC_API_KEY in your server environment.");
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    signal: opts.signal,
    body: JSON.stringify({
      model: getModel(),
      max_tokens: Math.min(2000, Math.max(MIN_MAX_TOKENS, opts.maxTokens ?? 2000)),
      system: opts.system,
      messages: opts.messages,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error("[Claude API] Stream request failed:", upstream.status, text);
    throw new Error(text || `Claude API error (${upstream.status})`);
  }

  const reader = upstream.body?.getReader();
  if (!reader) throw new Error("No Claude response stream.");

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };
              const text =
                json.type === "content_block_delta" && json.delta?.text
                  ? json.delta.text
                  : json.type === "message_delta" && (json as { delta?: { text?: string } }).delta?.text
                    ? (json as { delta?: { text?: string } }).delta!.text
                    : null;
              if (text) {
                controller.enqueue(new TextEncoder().encode(openAiSseChunk(text)));
              }
            } catch {
              /* skip */
            }
          }
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function createClaudeCompletion(opts: {
  system?: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Claude is not configured. Set ANTHROPIC_API_KEY in your server environment.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      max_tokens: Math.min(2000, Math.max(MIN_MAX_TOKENS, opts.maxTokens ?? 2000)),
      system: opts.system,
      messages: opts.messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text;
    try {
      const json = JSON.parse(text) as { error?: { message?: string } };
      detail = json.error?.message ?? text;
    } catch {
      /* use raw text */
    }
    console.error("[Claude API] Completion failed:", res.status, detail);
    if (res.status === 401) {
      throw new Error("Invalid ANTHROPIC_API_KEY. Check your server environment configuration.");
    }
    throw new Error(detail || `Claude API error (${res.status})`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const block = data.content?.find((c) => c.type === "text");
  return block?.text?.trim() ?? "";
}
