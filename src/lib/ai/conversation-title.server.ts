import { createAureliusCompletion } from "./router.server";

export async function generateConversationTitle(firstUserMessage: string): Promise<string> {
  const trimmed = firstUserMessage.trim().slice(0, 500);
  if (!trimmed) return "New conversation";

  try {
    const title = await createAureliusCompletion({
      system:
        "You are Aurelius. Generate a short conversation title (max 6 words) from the user's first message. Return only the title, no quotes.",
      messages: [{ role: "user", content: trimmed }],
      feature: "general",
      maxTokens: 64,
    });
    return title.replace(/^["']|["']$/g, "").slice(0, 80) || "New conversation";
  } catch {
    return trimmed.slice(0, 48) + (trimmed.length > 48 ? "…" : "");
  }
}
