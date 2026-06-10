import { ensureServerEnv, getOpenAiApiKey } from "@/lib/env.server";

export type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getApiKey(): string | undefined {
  ensureServerEnv();
  return getOpenAiApiKey();
}

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o";
}

function getApiBase(): string {
  return (process.env.OPENAI_API_BASE?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getApiKey());
}

export function isAiChatConfigured(): boolean {
  return isOpenAIConfigured();
}

export function sanitizeChatMessages(
  messages: Array<{ role: string; content: string }>,
): OpenAIChatMessage[] {
  return messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.trim(),
    }))
    .slice(-50);
}

async function callOpenAI(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("OpenAI is not configured. Set OPENAI_API_KEY in your server environment.");
  }

  const res = await fetch(`${getApiBase()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text;
    let code: string | undefined;
    try {
      const json = JSON.parse(text) as { error?: { message?: string; code?: string } };
      detail = json.error?.message ?? text;
      code = json.error?.code;
    } catch {
      /* use raw text */
    }
    if (res.status === 429 || code === "insufficient_quota") {
      throw new Error(
        "OpenAI quota exceeded. Add billing credits at platform.openai.com or use a key with available balance.",
      );
    }
    if (res.status === 401) {
      throw new Error("Invalid OPENAI_API_KEY. Check your server environment configuration.");
    }
    throw new Error(detail || `OpenAI API error (${res.status})`);
  }

  return res;
}

export async function streamChatCompletion(opts: {
  messages: OpenAIChatMessage[];
  signal?: AbortSignal;
}): Promise<Response> {
  const upstream = await callOpenAI(
    {
      model: getModel(),
      messages: opts.messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    },
    opts.signal,
  );

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function createChatCompletion(opts: {
  messages: OpenAIChatMessage[];
  maxTokens?: number;
}): Promise<string> {
  const res = await callOpenAI({
    model: getModel(),
    messages: opts.messages,
    stream: false,
    temperature: 0.7,
    max_tokens: opts.maxTokens ?? 2000,
  });

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export function openAIErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "AI service unavailable.";
  const status = message.includes("not configured") ? 503 : 502;
  return Response.json({ error: message }, { status });
}
