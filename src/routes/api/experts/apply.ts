import { createFileRoute } from "@tanstack/react-router";
import { submitExpertApplication } from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/experts/apply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          fullName?: string;
          email?: string;
          qualification?: string;
          councilNumber?: string;
          specialisation?: string;
          yearsExperience?: number;
          linkedIn?: string;
          credentialsNote?: string;
        };

        if (!body.fullName?.trim() || !body.email?.trim() || !body.qualification?.trim()) {
          return Response.json({ error: "Name, email, and qualification are required." }, { status: 400 });
        }

        const application = await submitExpertApplication({
          fullName: body.fullName.trim(),
          email: body.email.trim().toLowerCase(),
          qualification: body.qualification.trim(),
          councilNumber: body.councilNumber?.trim() ?? "",
          specialisation: body.specialisation?.trim() ?? "General",
          yearsExperience: Number(body.yearsExperience) || 0,
          linkedIn: body.linkedIn?.trim(),
          credentialsNote: body.credentialsNote?.trim(),
        });

        return Response.json({ ok: true, applicationId: application.id });
      },
    },
  },
});
