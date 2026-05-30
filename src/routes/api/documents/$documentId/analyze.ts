import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { getDocument, updateDocument } from "@/lib/vault/store.server";
import { trackUsage } from "@/lib/usage/store.server";
import type { DocumentAnalysis } from "@/lib/vault/types";
import { createChatCompletion, isOpenAIConfigured, openAIErrorResponse } from "@/lib/ai/openai.server";

export const Route = createFileRoute("/api/documents/$documentId/analyze")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const doc = await getDocument(params.documentId, auth.session.email);
        if (!doc) return Response.json({ error: "Document not found." }, { status: 404 });

        if (!isOpenAIConfigured()) {
          const fallback: DocumentAnalysis = {
            summary: `${doc.name} has been received and queued for intelligence review.`,
            plainEnglish: `This ${doc.category} document is securely stored. Configure OPENAI_API_KEY to enable AI analysis.`,
            complianceConcerns: [
              "Verify all statutory due dates against your compliance calendar.",
              "Confirm figures match your filed returns.",
            ],
            discussionPoints: [
              "Review any discrepancies with your CA before the next filing.",
              "Discuss entity-level implications if this affects a trust or HUF.",
            ],
            keyFacts: [
              `Document: ${doc.name}`,
              `Category: ${doc.category}`,
              `Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString("en-IN")}`,
            ],
            generatedAt: new Date().toISOString(),
          };
          await updateDocument(doc.id, auth.session.email, { status: "analyzed", analysis: fallback });
          await trackUsage(auth.session.email, "analyze");
          return Response.json({ analysis: fallback });
        }

        const prompt = `You are Aureliuss document intelligence. Analyze this private wealth document metadata and produce a structured briefing for an Indian HNWI principal.

Document name: ${doc.name}
Category: ${doc.category}
Size: ${(doc.sizeBytes / 1024).toFixed(1)} KB

Respond in JSON only with keys: summary, plainEnglish, complianceConcerns (array), discussionPoints (array), keyFacts (array). Be precise, institutional, and India-specific where relevant.`;

        let analysis: DocumentAnalysis;

        try {
          const raw = await createChatCompletion({
            messages: [{ role: "user", content: prompt }],
            jsonMode: true,
            signal: request.signal,
          });

          try {
            const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")) as Omit<
              DocumentAnalysis,
              "generatedAt"
            >;
            analysis = { ...parsed, generatedAt: new Date().toISOString() };
          } catch {
            analysis = {
              summary: raw.slice(0, 400) || "Analysis complete.",
              plainEnglish: raw.slice(0, 800) || "See summary for details.",
              complianceConcerns: [],
              discussionPoints: ["Review with your CA or counsel."],
              keyFacts: [doc.name],
              generatedAt: new Date().toISOString(),
            };
          }
        } catch (error) {
          if (error instanceof Error && "status" in error) {
            const res = openAIErrorResponse(error);
            const payload = (await res.json()) as { error?: string };
            analysis = {
              summary: "Automated analysis temporarily unavailable.",
              plainEnglish: payload.error ?? "Retry analysis shortly.",
              complianceConcerns: [],
              discussionPoints: [],
              keyFacts: [doc.name],
              generatedAt: new Date().toISOString(),
            };
          } else {
            analysis = {
              summary: "Automated analysis temporarily unavailable.",
              plainEnglish: "Your document is stored securely. Retry analysis shortly.",
              complianceConcerns: [],
              discussionPoints: [],
              keyFacts: [doc.name],
              generatedAt: new Date().toISOString(),
            };
          }
        }

        await updateDocument(doc.id, auth.session.email, { status: "analyzed", analysis });
        await trackUsage(auth.session.email, "analyze");
        return Response.json({ analysis });
      },
    },
  },
});
