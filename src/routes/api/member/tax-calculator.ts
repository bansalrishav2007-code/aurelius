import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { addDocument } from "@/lib/vault/store.server";
import { upsertTaxSnapshot } from "@/lib/wealth/store.server";
import { buildTaxActionPlan } from "@/lib/wealth/tax-action-plan";
import { computeTax, FY_LABEL, type TaxCalculatorInput } from "@/lib/wealth/tax-calculator";
import { buildTaxActionPlanPdf, buildTaxReportPdf, taxPdfFileName } from "@/lib/wealth/tax-report-pdf.server";
import type { TaxActionItem } from "@/lib/wealth/tax-action-plan";

export const Route = createFileRoute("/api/member/tax-calculator")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as {
          action?:
            | "save_vault"
            | "save_snapshot"
            | "download_pdf"
            | "save_plan_vault"
            | "download_plan_pdf"
            | "save_action";
          input?: TaxCalculatorInput;
          actionItem?: TaxActionItem;
        };

        if (!body.input) {
          return Response.json({ error: "Calculation input required." }, { status: 400 });
        }

        const result = computeTax(body.input);
        const plan = buildTaxActionPlan(body.input, result);
        const email = auth.session.email;
        const name = auth.session.fullName;

        if (body.action === "save_snapshot" || body.action === "download_pdf" || body.action === "save_vault") {
          const { updateMemberPreferences } = await import("@/lib/member/preferences.server");
          await updateMemberPreferences(auth.memberId, email, {
            lastTaxInput: body.input,
            lastTaxSavedAt: new Date().toISOString(),
          });
        }

        if (body.action === "save_snapshot") {
          if (auth.session.isDemo) {
            const { demoLockedResponse } = await import("@/lib/demo/service.server");
            return demoLockedResponse("Tax snapshot update");
          }

          const winning = result.winningRegime === "old" ? result.old : result.new;
          await upsertTaxSnapshot(email, {
            assessmentYear: result.fy,
            totalIncome: result.totalGrossIncome,
            estimatedTaxFy: Math.round(winning.totalTax),
            stcg: body.input.stcg,
            ltcg: body.input.ltcg,
            stcgTax: Math.round(winning.stcgTax),
            ltcgTax: Math.round(winning.ltcgTax),
            used80C: body.input.deduction80C,
            limit80C: 150_000,
            used80D: body.input.deduction80D,
            limit80D: body.input.isSenior ? 50_000 : 25_000,
            notes: `Tax calculator · ${result.winningRegime} regime · savings ${plan.maxSave}`,
            updatedAt: new Date().toISOString(),
          });

          return Response.json({ ok: true, message: "Tax snapshot updated." });
        }

        if (body.action === "save_action" && body.actionItem) {
          if (auth.session.isDemo) {
            const { demoLockedResponse } = await import("@/lib/demo/service.server");
            return demoLockedResponse("Vault save");
          }

          const text = [
            `Aurelius Tax Recommendation`,
            `Title: ${body.actionItem.title}`,
            `Section: ${body.actionItem.section}`,
            `Potential saving: ₹${body.actionItem.taxSaved}`,
            ``,
            body.actionItem.recommendation,
          ].join("\n");

          const buffer = Buffer.from(text, "utf-8");
          const doc = await addDocument({
            memberEmail: email,
            name: `Tax_Rec_${body.actionItem.id}_${new Date().toISOString().slice(0, 10)}.txt`,
            category: "Tax Returns",
            sizeBytes: buffer.length,
            mimeType: "text/plain",
            fileBuffer: buffer,
          });

          return Response.json({ ok: true, documentId: doc.id, message: "Recommendation saved to vault." });
        }

        const planPdf = await buildTaxActionPlanPdf(name, plan, result.fy);
        const memoPdf = await buildTaxReportPdf(name, body.input, result, auth.memberId);
        const pdfBuffer = body.action === "save_plan_vault" || body.action === "download_plan_pdf" ? planPdf : memoPdf;

        if (body.action === "save_plan_vault") {
          if (auth.session.isDemo) {
            const { demoLockedResponse } = await import("@/lib/demo/service.server");
            return demoLockedResponse("Vault save");
          }

          const doc = await addDocument({
            memberEmail: email,
            name: `Tax_Action_Plan_${result.fy.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`,
            category: "Tax Returns",
            sizeBytes: planPdf.length,
            mimeType: "application/pdf",
            fileBuffer: planPdf,
          });

          return Response.json({ ok: true, documentId: doc.id, message: "Action plan saved to vault." });
        }

        if (body.action === "save_vault") {
          if (auth.session.isDemo) {
            const { demoLockedResponse } = await import("@/lib/demo/service.server");
            return demoLockedResponse("Vault save");
          }

          const doc = await addDocument({
            memberEmail: email,
            name: taxPdfFileName(name),
            category: "Tax Returns",
            sizeBytes: memoPdf.length,
            mimeType: "application/pdf",
            fileBuffer: memoPdf,
          });

          return Response.json({ ok: true, documentId: doc.id, message: "Saved to vault." });
        }

        const memoFilename = taxPdfFileName(name);

        if (body.action === "download_pdf" && !auth.session.isDemo) {
          await addDocument({
            memberEmail: email,
            name: memoFilename,
            category: "Tax Returns",
            sizeBytes: memoPdf.length,
            mimeType: "application/pdf",
            fileBuffer: memoPdf,
          });
        }

        const filename =
          body.action === "download_plan_pdf"
            ? `Aurelius_Tax_Action_Plan_${FY_LABEL.replace(/\s/g, "_")}.pdf`
            : memoFilename;

        return new Response(new Uint8Array(pdfBuffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      },
    },
  },
});
