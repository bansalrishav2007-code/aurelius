import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ChatPage } from "./chat";

const searchSchema = z.object({
  preload: z.string().optional(),
});

export const Route = createFileRoute("/_app/dashboard/ai-advisor")({
  head: () => ({ meta: [{ title: "AI Advisor — Aurelius" }] }),
  validateSearch: searchSchema,
  component: AiAdvisorPage,
});

function AiAdvisorPage() {
  const { preload } = Route.useSearch();
  return <ChatPage preloadMessage={preload} />;
}
