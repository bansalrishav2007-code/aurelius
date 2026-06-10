import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { listMemberDocuments } from "@/lib/vault/store.server";

export const Route = createFileRoute("/api/vault/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { getDemoVaultDocuments } = await import("@/lib/demo/mock-vault.server");
          return Response.json({ documents: getDemoVaultDocuments(auth.session.email) });
        }

        const docs = await listMemberDocuments(auth.session.email);

        const expiring = docs.filter((d) => {
          if (!d.expiryDate) return false;
          const days = Math.ceil(
            (new Date(d.expiryDate).getTime() - Date.now()) / 86_400_000,
          );
          return days >= 0 && days <= 30;
        });

        if (expiring.length) {
          const { addNotification, listNotifications } = await import(
            "@/lib/notifications/store.server"
          );
          const existing = await listNotifications(auth.session.email, auth.memberId);
          const recentBodies = new Set(existing.map((n) => n.body));

          for (const doc of expiring.slice(0, 3)) {
            const days = Math.ceil(
              (new Date(doc.expiryDate!).getTime() - Date.now()) / 86_400_000,
            );
            const body = `${doc.name} expires in ${days} day${days === 1 ? "" : "s"}.`;
            if (recentBodies.has(body)) continue;
            await addNotification({
              memberId: auth.memberId,
              memberEmail: auth.session.email,
              title: days <= 7 ? "Document expires soon" : "Document expiry reminder",
              body,
              category: "security",
            });
          }
        }

        return Response.json({ documents: docs });
      },
    },
  },
});
