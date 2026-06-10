import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import {
  addLegalEntity,
  addWealthAsset,
  addWealthLiability,
  applyWealthExtraction,
  deleteWealthAsset,
  deleteWealthLiability,
  dismissWealthAlert,
  getMemberWealthOverview,
  recordLiabilityPayment,
  updateWealthAssetValue,
  updateWealthLiabilityValue,
} from "@/lib/wealth/store.server";
import { validateLiabilityName } from "@/lib/wealth/validation";
import type {
  AssetCategory,
  LegalEntity,
  LiabilityPaymentType,
  LiabilityType,
  WealthExtractionDraft,
} from "@/lib/wealth/types";

export const Route = createFileRoute("/api/member/wealth-overview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { buildDemoWealthOverview } = await import("@/lib/wealth/demo-data.server");
          return Response.json(buildDemoWealthOverview(auth.session.email, auth.session.fullName));
        }

        const overview = await getMemberWealthOverview(auth.session.email);
        return Response.json(overview);
      },
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Wealth data entry");
        }

        const body = (await request.json().catch(() => ({}))) as {
          action?:
            | "add_asset"
            | "add_liability"
            | "confirm_extraction"
            | "delete_asset"
            | "delete_liability"
            | "update_asset_value"
            | "update_liability_value"
            | "record_liability_payment"
            | "dismiss_alert"
            | "add_legal_entity";
          name?: string;
          category?: AssetCategory;
          type?: LiabilityType;
          value?: number;
          originalValue?: number;
          dateAdded?: string;
          notes?: string;
          id?: string;
          date?: string;
          paymentType?: LiabilityPaymentType;
          draft?: WealthExtractionDraft;
          alertId?: string;
          entity?: Partial<LegalEntity> & { name: string };
        };

        const email = auth.session.email;

        if (body.action === "add_asset") {
          if (!body.name?.trim() || body.value == null || !body.category) {
            return Response.json({ error: "Asset name, category, and value are required." }, { status: 400 });
          }
          await addWealthAsset(email, {
            name: body.name,
            category: body.category,
            value: Number(body.value),
            dateAdded: body.dateAdded,
            notes: body.notes,
          });
        } else if (body.action === "add_liability") {
          if (!body.name?.trim() || body.value == null || !body.type) {
            return Response.json({ error: "Liability name, type, and value are required." }, { status: 400 });
          }
          const nameCheck = validateLiabilityName(body.name);
          if (!nameCheck.ok) {
            return Response.json({ error: nameCheck.error }, { status: 400 });
          }
          await addWealthLiability(email, {
            name: body.name,
            type: body.type,
            value: Number(body.value),
            originalValue: body.originalValue != null ? Number(body.originalValue) : undefined,
            dateAdded: body.dateAdded,
            notes: body.notes,
          });
        } else if (body.action === "delete_asset") {
          if (!body.id) return Response.json({ error: "Asset id required." }, { status: 400 });
          await deleteWealthAsset(email, body.id);
        } else if (body.action === "delete_liability") {
          if (!body.id) return Response.json({ error: "Liability id required." }, { status: 400 });
          await deleteWealthLiability(email, body.id);
        } else if (body.action === "confirm_extraction") {
          if (!body.draft) return Response.json({ error: "Extraction draft required." }, { status: 400 });
          for (const l of body.draft.liabilities) {
            const check = validateLiabilityName(l.name);
            if (!check.ok) return Response.json({ error: check.error }, { status: 400 });
          }
          await applyWealthExtraction(email, body.draft);
        } else if (body.action === "update_asset_value") {
          if (!body.id || body.value == null) {
            return Response.json({ error: "Asset id and value required." }, { status: 400 });
          }
          const updated = await updateWealthAssetValue(email, body.id, Number(body.value));
          if (!updated) return Response.json({ error: "Asset not found." }, { status: 404 });
        } else if (body.action === "update_liability_value") {
          if (!body.id || body.value == null) {
            return Response.json({ error: "Liability id and value required." }, { status: 400 });
          }
          const updated = await updateWealthLiabilityValue(email, body.id, Number(body.value));
          if (!updated) return Response.json({ error: "Liability not found." }, { status: 404 });
        } else if (body.action === "record_liability_payment") {
          if (!body.id || body.value == null || !body.date) {
            return Response.json({ error: "Liability id, payment amount, and date required." }, { status: 400 });
          }
          const updated = await recordLiabilityPayment(email, body.id, {
            amount: Number(body.value),
            date: body.date,
            type: body.paymentType ?? body.type ?? "emi",
            notes: body.notes,
          });
          if (!updated) return Response.json({ error: "Payment could not be recorded." }, { status: 400 });
        } else if (body.action === "dismiss_alert") {
          if (!body.alertId) return Response.json({ error: "Alert id required." }, { status: 400 });
          await dismissWealthAlert(email, body.alertId);
        } else if (body.action === "add_legal_entity") {
          if (!body.entity?.name?.trim()) {
            return Response.json({ error: "Entity name required." }, { status: 400 });
          }
          await addLegalEntity(email, body.entity);
        } else {
          return Response.json({ error: "Invalid action." }, { status: 400 });
        }

        const { prepareAndScheduleIntelligenceRefresh } = await import("@/lib/wealth/intelligence.server");
        await prepareAndScheduleIntelligenceRefresh(email, auth.memberId, {
          fullName: auth.session.fullName,
          profession: auth.session.profession,
          firm: auth.session.firm,
        });

        const overview = await getMemberWealthOverview(email);
        return Response.json(overview);
      },
    },
  },
});
