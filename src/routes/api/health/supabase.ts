import { createFileRoute } from "@tanstack/react-router";
import { testSupabaseConnection } from "@/lib/supabase/client.server";
import { isSupabaseConfigured } from "@/lib/supabase/config.server";

export const Route = createFileRoute("/api/health/supabase")({
  server: {
    handlers: {
      GET: async () => {
        if (!isSupabaseConfigured()) {
          return Response.json({
            connected: false,
            configured: false,
            message: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env",
          });
        }
        const result = await testSupabaseConnection();
        return Response.json({ configured: true, ...result });
      },
    },
  },
});
