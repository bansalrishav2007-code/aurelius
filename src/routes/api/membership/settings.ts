import { createFileRoute } from "@tanstack/react-router";
import { getMembershipSettings } from "@/lib/membership/settings.server";

export const Route = createFileRoute("/api/membership/settings")({
  server: {
    handlers: {
      GET: async () => {
        const settings = await getMembershipSettings();
        return Response.json({ inviteOnlyMode: settings.inviteOnlyMode });
      },
    },
  },
});
