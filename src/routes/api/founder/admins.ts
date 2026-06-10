import { createFileRoute } from "@tanstack/react-router";
import { createAdminAccount, requireSuperAdmin } from "@/lib/auth/founder.service.server";

export const Route = createFileRoute("/api/founder/admins")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cookie = request.headers.get("cookie");
        if (!(await requireSuperAdmin(cookie))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }
        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          fullName?: string;
          password?: string;
          role?: "ADMIN" | "member";
        };
        if (!body.email || !body.fullName || !body.password) {
          return Response.json({ error: "Email, name, and password are required." }, { status: 400 });
        }
        const result = await createAdminAccount({
          email: body.email,
          fullName: body.fullName,
          password: body.password,
          role: body.role,
        });
        if ("error" in result) {
          return Response.json({ error: result.error }, { status: 400 });
        }
        return Response.json({ member: result });
      },
    },
  },
});
