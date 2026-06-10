import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { createIntroductionRequest, getExpertById } from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/member/experts/$expertId/introduction")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Expert introductions");
        }

        const expert = await getExpertById(params.expertId);
        if (!expert || expert.status !== "active") {
          return Response.json({ error: "Expert not found." }, { status: 404 });
        }

        const body = (await request.json().catch(() => ({}))) as {
          message?: string;
          contactMethod?: "email" | "call" | "video";
        };

        const message = body.message?.trim();
        if (!message) {
          return Response.json({ error: "Message is required." }, { status: 400 });
        }

        const contactMethod = body.contactMethod ?? "email";
        if (!["email", "call", "video"].includes(contactMethod)) {
          return Response.json({ error: "Invalid contact method." }, { status: 400 });
        }

        const intro = await createIntroductionRequest({
          expertId: params.expertId,
          memberEmail: auth.session.email,
          memberName: auth.session.fullName ?? auth.session.email,
          message,
          contactMethod,
        });

        if (!intro) {
          return Response.json({ error: "Expert not found." }, { status: 404 });
        }

        return Response.json({
          ok: true,
          message:
            "Your introduction request has been sent. Aurelius will facilitate the connection within 48 hours.",
        });
      },
    },
  },
});
