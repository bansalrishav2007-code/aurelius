import { getAnthropicApiKey } from "@/lib/env.server";
import { getAiSettings } from "./settings.server";
import {
  anonymiseQuestion,
  estimateCostUsd,
  estimateTokens,
  logAiCall,
  type AiProvider,
} from "./cost-tracking.server";
import {
  createClaudeCompletion,
  isClaudeConfigured,
  type ClaudeMessage,
} from "./claude.server";
import {
  createChatCompletion,
  isOpenAIConfigured,
  streamChatCompletion,
  type OpenAIChatMessage,
} from "./openai.server";

export type AureliusAiFeature =
  | "advisor_chat"
  | "wealth_brief"
  | "tax_calculator"
  | "market_intel"
  | "goals"
  | "expert_briefing"
  | "document"
  | "general";

const CLAUDE_FIRST_BYTE_TIMEOUT_MS = 10_000;
const CLAUDE_RETRY_DELAY_MS = 3_000;
export const AURELIUS_AI_BUSY_MESSAGE =
  "Our AI advisor is temporarily busy. Please try again in a moment.";
export const AURELIUS_AI_THINKING_MESSAGE = "Aurelius is thinking… please wait a moment.";

export function isAureliusAiConfigured(): boolean {
  return isClaudeConfigured() || isOpenAIConfigured();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function inputText(system: string, messages: ClaudeMessage[]): string {
  return system + messages.map((m) => m.content).join("");
}

async function recordCall(opts: {
  provider: AiProvider;
  feature: AureliusAiFeature;
  memberEmail?: string;
  system: string;
  messages: ClaudeMessage[];
  output: string;
  responseTimeMs: number;
  success: boolean;
  fallback?: boolean;
  errorCode?: string;
  question?: string;
}) {
  const inputTokens = estimateTokens(inputText(opts.system, opts.messages));
  const outputTokens = estimateTokens(opts.output);
  await logAiCall({
    provider: opts.provider,
    feature: opts.feature,
    memberEmail: opts.memberEmail,
    inputTokens,
    outputTokens,
    costUsd: estimateCostUsd(opts.provider, inputTokens, outputTokens),
    responseTimeMs: opts.responseTimeMs,
    success: opts.success,
    fallback: opts.fallback,
    errorCode: opts.errorCode,
    questionHash: opts.question ? anonymiseQuestion(opts.question) : undefined,
  });
}

async function tryClaudeCompletion(
  system: string,
  messages: ClaudeMessage[],
  maxTokens?: number,
): Promise<string> {
  const start = Date.now();
  const result = await Promise.race([
    createClaudeCompletion({ system, messages, maxTokens }),
    sleep(CLAUDE_FIRST_BYTE_TIMEOUT_MS).then(() => {
      throw new Error("CLAUDE_TIMEOUT");
    }),
  ]);
  if (!result.trim()) throw new Error("CLAUDE_EMPTY");
  return result;
}

export async function createAureliusCompletion(opts: {
  system: string;
  messages: ClaudeMessage[];
  feature: AureliusAiFeature;
  memberEmail?: string;
  maxTokens?: number;
}): Promise<string> {
  if (!isAureliusAiConfigured()) {
    throw new Error("AI not configured");
  }

  const settings = await getAiSettings();
  const question = opts.messages[opts.messages.length - 1]?.content ?? "";
  const start = Date.now();

  async function runOpenAi(fallback: boolean): Promise<string> {
    if (!isOpenAIConfigured()) throw new Error("OPENAI_UNAVAILABLE");
    const openAiMessages: OpenAIChatMessage[] = [
      { role: "system", content: opts.system },
      ...opts.messages,
    ];
    const text = await createChatCompletion({
      messages: openAiMessages,
      maxTokens: opts.maxTokens,
    });
    await recordCall({
      provider: "openai",
      feature: opts.feature,
      memberEmail: opts.memberEmail,
      system: opts.system,
      messages: opts.messages,
      output: text,
      responseTimeMs: Date.now() - start,
      success: true,
      fallback,
      question,
    });
    return text;
  }

  if (settings.primaryProvider === "gpt") {
    return runOpenAi(false);
  }

  if (isClaudeConfigured()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await tryClaudeCompletion(opts.system, opts.messages, opts.maxTokens);
        await recordCall({
          provider: "claude",
          feature: opts.feature,
          memberEmail: opts.memberEmail,
          system: opts.system,
          messages: opts.messages,
          output: text,
          responseTimeMs: Date.now() - start,
          success: true,
          question,
        });
        return text;
      } catch (err) {
        console.error(`[Aurelius AI] Claude attempt ${attempt + 1} failed (${opts.feature}):`, err);
        if (attempt === 0) await sleep(CLAUDE_RETRY_DELAY_MS);
      }
    }
  }

  if (settings.primaryProvider === "claude" && !isOpenAIConfigured()) {
    await logAiCall({
      provider: "claude",
      feature: opts.feature,
      memberEmail: opts.memberEmail,
      inputTokens: estimateTokens(inputText(opts.system, opts.messages)),
      outputTokens: 0,
      costUsd: 0,
      responseTimeMs: Date.now() - start,
      success: false,
      errorCode: "CLAUDE_FAILED",
      questionHash: question ? anonymiseQuestion(question) : undefined,
    });
    throw new Error(AURELIUS_AI_BUSY_MESSAGE);
  }

  if (isOpenAIConfigured()) {
    return runOpenAi(true);
  }

  throw new Error(AURELIUS_AI_BUSY_MESSAGE);
}

function openAiSseFromText(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
}

export async function streamAureliusCompletion(opts: {
  system: string;
  messages: ClaudeMessage[];
  feature: AureliusAiFeature;
  memberEmail?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<Response> {
  if (!isAureliusAiConfigured()) {
    return Response.json({ error: AURELIUS_AI_BUSY_MESSAGE }, { status: 503 });
  }

  const settings = await getAiSettings();
  const question = opts.messages[opts.messages.length - 1]?.content ?? "";
  const start = Date.now();

  async function streamOpenAi(fallback: boolean): Promise<Response> {
    const openAiMessages: OpenAIChatMessage[] = [
      { role: "system", content: opts.system },
      ...opts.messages,
    ];
    const res = await streamChatCompletion({ messages: openAiMessages, signal: opts.signal });
    void logAiCall({
      provider: "openai",
      feature: opts.feature,
      memberEmail: opts.memberEmail,
      inputTokens: estimateTokens(inputText(opts.system, opts.messages)),
      outputTokens: 512,
      costUsd: estimateCostUsd("openai", estimateTokens(inputText(opts.system, opts.messages)), 512),
      responseTimeMs: Date.now() - start,
      success: true,
      fallback,
      questionHash: question ? anonymiseQuestion(question) : undefined,
    });
    return res;
  }

  if (settings.primaryProvider === "gpt" || !isClaudeConfigured()) {
    if (!isOpenAIConfigured()) {
      return Response.json({ error: AURELIUS_AI_BUSY_MESSAGE }, { status: 503 });
    }
    return streamOpenAi(false);
  }

  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": getAnthropicApiKey() ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      signal: opts.signal,
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514",
        max_tokens: opts.maxTokens ?? 2000,
        system: opts.system,
        messages: opts.messages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!claudeRes.ok || !claudeRes.body) {
      throw new Error(`Claude stream ${claudeRes.status}`);
    }

    const reader = claudeRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let gotFirstToken = false;
    const deadline = Date.now() + CLAUDE_FIRST_BYTE_TIMEOUT_MS;

    while (!gotFirstToken && Date.now() < deadline) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes("content_block_delta") || buffer.includes('"text"')) {
        gotFirstToken = true;
        break;
      }
    }

    if (!gotFirstToken) {
      await reader.cancel().catch(() => {});
      if (isOpenAIConfigured() && settings.primaryProvider === "both") {
        return streamOpenAi(true);
      }
      return Response.json({ error: AURELIUS_AI_BUSY_MESSAGE }, { status: 502 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const emitSse = (text: string) => {
          controller.enqueue(encoder.encode(openAiSseFromText(text)));
        };

        const processLine = (line: string) => {
          if (!line.startsWith("data:")) return;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") return;
          try {
            const json = JSON.parse(payload) as {
              type?: string;
              delta?: { text?: string };
            };
            if (json.type === "content_block_delta" && json.delta?.text) {
              emitSse(json.delta.text);
            }
          } catch {
            /* skip */
          }
        };

        for (const line of buffer.split("\n")) processLine(line);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) processLine(line);
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          void logAiCall({
            provider: "claude",
            feature: opts.feature,
            memberEmail: opts.memberEmail,
            inputTokens: estimateTokens(inputText(opts.system, opts.messages)),
            outputTokens: 800,
            costUsd: estimateCostUsd(
              "claude",
              estimateTokens(inputText(opts.system, opts.messages)),
              800,
            ),
            responseTimeMs: Date.now() - start,
            success: true,
            questionHash: question ? anonymiseQuestion(question) : undefined,
          });
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
  } catch (err) {
    console.error("[Aurelius AI] Claude stream failed, falling back:", err);
    if (isOpenAIConfigured()) {
      return streamOpenAi(true);
    }
    return Response.json({ error: AURELIUS_AI_BUSY_MESSAGE }, { status: 502 });
  }
}
