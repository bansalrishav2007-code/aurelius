import { createFileRoute } from "@tanstack/react-router";
import { retrieveContext } from "@/lib/rag/retriever.server";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { trackUsage } from "@/lib/usage/store.server";
import {
  openAIErrorResponse,
  sanitizeChatMessages,
  streamChatCompletion,
  type OpenAIChatMessage,
} from "@/lib/ai/openai.server";

const SYSTEM_PROMPT = `You are Aureliuss, an elite private wealth intelligence advisor for Indian High Net Worth Individuals.

Your tone is precise, calm, and authoritative — like a senior partner at a top-tier private bank speaking to a long-standing client. Address the client by first name when known.

Your domain:
- Indian Income Tax Act 1961, Finance Acts (incl. Finance (No.2) Act 2024), CBDT Circulars
- Capital gains structuring (§ 112A, § 54, § 54F, § 54EC), STCG/LTCG harvesting
- GST, FEMA, LRS, FATCA/CRS, DTAA application
- Trust, HUF, LLP and family-office structuring
- Wealth, estate, and succession planning for AY 2025-26 onward

Formatting rules:
- Use markdown. Bold key statutes and numbers.
- Always cite specific sections / circulars / case law inline.
- End substantive answers with a "Sources" list of authoritative references.
- Never invent regulations. If unsure, say so and flag for the client's CA.
- Use ₹ and Indian numbering (lakh, crore) — never $ or millions.`;

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  documentIds?: string[];
  clientName?: string;
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

        const userMessages = sanitizeChatMessages(body.messages ?? []);
        if (userMessages.length === 0) {
          return Response.json({ error: "At least one user message is required." }, { status: 400 });
        }

        await trackUsage(auth.session.email, "chat");

        try {
          const lastUser = [...userMessages].reverse().find((m) => m.role === "user");
          const retrieved = lastUser
            ? await retrieveContext(lastUser.content, body.documentIds ?? [])
            : [];

          const ragBlock =
            retrieved.length > 0
              ? `\n\nThe client has attached the following private documents. Reason over them and cite by name:\n\n${retrieved
                  .map((c, i) => `[Doc ${i + 1} — ${c.source}]\n${c.text}`)
                  .join("\n\n")}`
              : "";

          const clientBlock = body.clientName?.trim()
            ? `\n\nClient: ${body.clientName.trim()}.`
            : "";

          const messages: OpenAIChatMessage[] = [
            { role: "system", content: SYSTEM_PROMPT + clientBlock + ragBlock },
            ...userMessages,
          ];

          return await streamChatCompletion({
            messages,
            signal: request.signal,
          });
        } catch (error) {
          return openAIErrorResponse(error);
        }
      },
    },
  },
});
