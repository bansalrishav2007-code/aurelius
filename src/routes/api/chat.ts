import { createFileRoute } from "@tanstack/react-router";
import { buildAureliusAdvisorSystemPrompt } from "@/lib/ai/advisor-prompt.server";
import { fetchLiveAdvisorData, formatLiveDataBlock } from "@/lib/ai/live-data.server";
import { sanitizeChatMessages } from "@/lib/ai/openai.server";
import {
  AURELIUS_AI_BUSY_MESSAGE,
  createAureliusCompletion,
  isAureliusAiConfigured,
  streamAureliusCompletion,
} from "@/lib/ai/router.server";
import { AI_RATE_LIMIT_MESSAGE, checkAiRateLimit, consumeAiQuery } from "@/lib/ai/rate-limit.server";
import { retrieveContext } from "@/lib/rag/retriever.server";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { logPrivacyAudit } from "@/lib/privacy/audit.server";
import { formatMemoryForPrompt } from "@/lib/privacy/memory.server";
import { buildUserContextPromptBlock, getUserVaultData } from "@/lib/privacy/context.server";

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  documentIds?: string[];
  clientName?: string;
  conversationId?: string;
  regenerate?: boolean;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        let body: ChatRequest;
        try {
          body = (await request.json()) as ChatRequest;
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        let userMessages = sanitizeChatMessages(body.messages ?? []);
        if (body.regenerate && userMessages.length > 0 && userMessages[userMessages.length - 1]?.role === "assistant") {
          userMessages = userMessages.slice(0, -1);
        }

        if (userMessages.length === 0) {
          return Response.json({ error: "At least one user message is required." }, { status: 400 });
        }

        if (!isAureliusAiConfigured()) {
          return Response.json({ error: AURELIUS_AI_BUSY_MESSAGE }, { status: 503 });
        }

        if (auth.session.isDemo) {
          const { consumeDemoAiQuota } = await import("@/lib/demo/quota.server");
          const quota = await consumeDemoAiQuota(
            auth.session.email,
            auth.session.aiQuotaDaily ?? 5,
          );
          if (!quota.allowed) {
            return Response.json(
              {
                error: "Daily demo limit reached. Upgrade to unlock unlimited access.",
                code: "DEMO_AI_LIMIT",
              },
              { status: 429 },
            );
          }
        } else {
          const rate = await checkAiRateLimit(auth.session.email, auth.session.tier);
          if (!rate.allowed) {
            return Response.json(
              { error: AI_RATE_LIMIT_MESSAGE, code: "RATE_LIMIT" },
              { status: 429 },
            );
          }
          await consumeAiQuery(auth.session.email);
        }

        try {
          const userContext = await getUserVaultData({
            memberId: auth.memberId,
            memberEmail: auth.session.email,
            fullName: auth.session.fullName,
            profession: auth.session.profession,
            firm: auth.session.firm,
            sessionId: body.conversationId,
          });

          const lastUser = [...userMessages].reverse().find((m) => m.role === "user");
          const [retrieved, liveData] = await Promise.all([
            lastUser
              ? retrieveContext(lastUser.content, body.documentIds ?? [], auth.session.email)
              : Promise.resolve([]),
            lastUser
              ? fetchLiveAdvisorData(lastUser.content, userContext.wealth?.taxSnapshot)
              : Promise.resolve(null),
          ]);

          const ragBlock =
            retrieved.length > 0
              ? `\n\nAttached private documents (cite by name):\n${retrieved
                  .map((c, i) => `[Doc ${i + 1} — ${c.source}]\n${c.text}`)
                  .join("\n\n")}`
              : "";

          const clientName =
            body.clientName?.trim() ||
            auth.session.firstName ||
            auth.session.fullName.split(/\s+/)[0] ||
            "Principal";

          const conversationHistory = userMessages
            .slice(-20)
            .map((m) => `${m.role === "user" ? "User" : "Aurelius"}: ${m.content}`)
            .join("\n");

          const systemPrompt = buildAureliusAdvisorSystemPrompt({
            clientName,
            tier: auth.session.tier,
            memberId: auth.memberId,
            feature: "advisor_chat",
            userContext,
            wealthBlock: buildUserContextPromptBlock(userContext),
            memoryBlock: formatMemoryForPrompt(userContext.memory) || undefined,
            conversationHistory,
            goalsSummary: userContext.goals.length
              ? userContext.goals.map((g) => `- ${g.title} (${g.status})`).join("\n")
              : undefined,
            documentsSummary: userContext.documents.length
              ? `${userContext.documents.length} documents in vault`
              : undefined,
            intelligenceBrief: userContext.intelligenceBrief ?? undefined,
            liveDataBlock: liveData ? formatLiveDataBlock(liveData) : undefined,
            ragBlock,
          });

          await logPrivacyAudit(auth.memberId, {
            action: "ai_chat",
            detail: `AI chat: ${userContext.memory.length} memory entries, live=${Boolean(liveData)}, docs=${retrieved.length}`,
            sessionId: body.conversationId,
          });

          if (request.headers.get("accept")?.includes("text/event-stream") || true) {
            return await streamAureliusCompletion({
              system: systemPrompt,
              messages: userMessages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              feature: "advisor_chat",
              memberEmail: auth.session.email,
              maxTokens: 2000,
              signal: request.signal,
            });
          }

          const text = await createAureliusCompletion({
            system: systemPrompt,
            messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
            feature: "advisor_chat",
            memberEmail: auth.session.email,
            maxTokens: 2000,
          });
          return Response.json({ content: text });
        } catch (error) {
          console.error("[Aurelius AI] Chat error:", error instanceof Error ? error.message : error);
          return Response.json({ error: AURELIUS_AI_BUSY_MESSAGE }, { status: 502 });
        }
      },
    },
  },
});
