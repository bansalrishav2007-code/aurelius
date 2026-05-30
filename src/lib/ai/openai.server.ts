export type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class OpenAIConfigError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured.");
    this.name = "OpenAIConfigError";
  }
}

export class OpenAIRequestError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "OpenAIRequestError";
    this.status = status;
    this.detail = detail;
  }
}

const DEFAULT_MODEL = "gpt-4o";
const OPENAI_BASE = (process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? "120000");

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new OpenAIConfigError();
  return key;
}

export const MAX_CHAT_MESSAGES = 40;
export const MAX_MESSAGE_CHARS = 12_000;

/** Trim and validate client-supplied history before sending upstream. */
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
    .slice(-MAX_CHAT_MESSAGES)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.trim().slice(0, MAX_MESSAGE_CHARS),
    }));
}

function mapOpenAIError(status: number, detail: string): OpenAIRequestError {
  let message = "OpenAI request failed.";
  try {
    const parsed = JSON.parse(detail) as { error?: { message?: string } };
    if (parsed.error?.message) message = parsed.error.message;
  } catch {
    if (detail) message = detail.slice(0, 200);
  }

  if (status === 401) {
    return new OpenAIRequestError("Invalid OpenAI API key.", status, detail);
  }
  if (status === 429) {
    return new OpenAIRequestError("Rate limit reached. Please try again shortly.", status, detail);
  }
  if (status === 503 || status === 502) {
    return new OpenAIRequestError("OpenAI is temporarily unavailable.", status, detail);
  }
  return new OpenAIRequestError(message, status, detail);
}

function mergeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted) return a;
  if (b.aborted) return b;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  a.addEventListener("abort", onAbort);
  b.addEventListener("abort", onAbort);
  return controller.signal;
}

async function openAIFetch(
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  const apiKey = getOpenAIApiKey();
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const mergedSignal = signal
    ? mergeAbortSignals(signal, timeoutController.signal)
    : timeoutController.signal;

  try {
    const res = await fetch(`${OPENAI_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: mergedSignal,
    });
    return res;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new OpenAIRequestError("Request timed out or was cancelled.", 408);
    }
    throw new OpenAIRequestError(
      "Failed to connect to OpenAI.",
      502,
      e instanceof Error ? e.message : undefined,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Stream a chat completion as an SSE Response (OpenAI-compatible). */
export async function streamChatCompletion(opts: {
  messages: OpenAIChatMessage[];
  model?: string;
  signal?: AbortSignal;
}): Promise<Response> {
  const upstream = await openAIFetch(
    "/chat/completions",
    {
      model: opts.model ?? getOpenAIModel(),
      messages: opts.messages,
      stream: true,
      temperature: 0.4,
    },
    opts.signal,
  );

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    throw mapOpenAIError(upstream.status, text);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/** Non-streaming completion — used by document analysis and other tools. */
export async function createChatCompletion(opts: {
  messages: OpenAIChatMessage[];
  model?: string;
  jsonMode?: boolean;
  signal?: AbortSignal;
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model ?? getOpenAIModel(),
    messages: opts.messages,
    stream: false,
    temperature: 0.3,
  };
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const upstream = await openAIFetch("/chat/completions", body, opts.signal);

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    throw mapOpenAIError(upstream.status, text);
  }

  const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export function openAIErrorResponse(error: unknown): Response {
  if (error instanceof OpenAIConfigError) {
    return Response.json(
      { error: "AI service unavailable. Configure OPENAI_API_KEY on the server." },
      { status: 503 },
    );
  }
  if (error instanceof OpenAIRequestError) {
    return Response.json(
      { error: error.message, detail: error.detail },
      { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
    );
  }
  console.error("[OpenAI]", error);
  return Response.json({ error: "Unexpected AI service error." }, { status: 500 });
}
