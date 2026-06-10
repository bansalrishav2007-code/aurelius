import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  FileUp,
  Landmark,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { InrInput } from "@/components/client/InrInput";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { formatInrInput, parseInrInput } from "@/lib/format-inr-input";
import { AllocationDonut } from "@/components/charts";
import {
  IdleCashAlert,
  PortfolioHealthCard,
  TaxSnapshotSection,
  Section80CDrawer,
  WealthAlerts,
  WealthBreakdownTable,
  WealthExtractionResultsModal,
  WealthLegalEntitiesSection,
  WealthQuickActions,
  WEALTH_QUICK_ACTIONS_OFFSET_CLASS,
  AssetValueChart,
  WealthActivityTimeline,
  WealthTimeline,
  LiabilitiesSection,
} from "@/components/wealth";
import { WealthIntelligenceBrief } from "@/components/wealth/WealthIntelligenceBrief";
import { DemoFeatureLock } from "@/components/demo/DemoFeatureLock";
import {
  addWealthAssetEntry,
  addWealthLegalEntity,
  addWealthLiabilityEntry,
  confirmWealthExtraction,
  deleteWealthAssetEntry,
  dismissWealthAlert,
  downloadIntelligenceBrief,
  fetchWealthOverview,
  parseWealthDocumentUpload,
  updateWealthAssetValue,
  recordLiabilityPayment,
  updateWealthLiabilityValue,
} from "@/lib/member/client";
import { assetValueChange, formatInr, toDonutData } from "@/lib/wealth/calculations";
import { validateLiabilityName } from "@/lib/wealth/validation";
import {
  ASSET_CATEGORY_OPTIONS,
  LIABILITY_TYPE_OPTIONS,
  WEALTH_DOCUMENT_TYPES,
  suggestAssetCategory,
} from "@/lib/wealth/categories";
import {
  WEALTH_PREFILL_STORAGE_KEY,
  type WealthPrefillSuggestion,
} from "@/lib/wealth/deduction-maximiser";
import type { WealthExtractionDraft, WealthOverviewSummary } from "@/lib/wealth/types";
import { Route as AppRoute } from "@/routes/_app";

// TODO: AA integration — Setu/Finvu account aggregator for auto-sync with banks (Phase 2)

export const Route = createFileRoute("/_app/dashboard/wealth-overview")({
  head: () => ({ meta: [{ title: "Wealth Overview — Aurelius" }] }),
  component: WealthOverviewPage,
});

function formatUpdated(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function WealthOverviewPage() {
  const { session } = AppRoute.useRouteContext();
  const isDemo = session.isDemo === true;
  const [overview, setOverview] = useState<WealthOverviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryTab, setEntryTab] = useState<"manual" | "upload">("manual");
  const [draft, setDraft] = useState<WealthExtractionDraft | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [assetName, setAssetName] = useState("");
  const [assetCategory, setAssetCategory] = useState("");
  const [assetValue, setAssetValue] = useState("");
  const [assetDate, setAssetDate] = useState(new Date().toISOString().slice(0, 10));
  const [assetNotes, setAssetNotes] = useState("");

  const [liabilityName, setLiabilityName] = useState("");
  const [liabilityType, setLiabilityType] = useState("home_loan");
  const [liabilityValue, setLiabilityValue] = useState("");
  const [liabilityOriginal, setLiabilityOriginal] = useState("");
  const [liabilityDate, setLiabilityDate] = useState(new Date().toISOString().slice(0, 10));
  const [liabilityNotes, setLiabilityNotes] = useState("");
  const [liabilityError, setLiabilityError] = useState<string | null>(null);

  const assetFormRef = useRef<HTMLFormElement>(null);
  const liabilityFormRef = useRef<HTMLFormElement>(null);
  const uploadFormRef = useRef<HTMLFormElement>(null);

  const [docType, setDocType] = useState("itr");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [section80cOpen, setSection80cOpen] = useState(false);
  const [prefillQueue, setPrefillQueue] = useState<WealthPrefillSuggestion[]>([]);
  const [prefillIndex, setPrefillIndex] = useState(0);
  const [pendingPrefills, setPendingPrefills] = useState<WealthPrefillSuggestion[] | null>(null);

  function applyPrefill(prefill: WealthPrefillSuggestion) {
    setEntryTab("manual");
    setAssetName(prefill.name);
    setAssetCategory(prefill.category);
    setAssetValue(formatInrInput(prefill.value));
    setAssetNotes(prefill.notes ?? "");
    requestAnimationFrame(() => {
      assetFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  async function load() {
    const data = await fetchWealthOverview();
    setOverview(data);
  }

  useEffect(() => {
    load()
      .catch(() => toast.error("Unable to load wealth overview."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    const raw = sessionStorage.getItem(WEALTH_PREFILL_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as WealthPrefillSuggestion[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      sessionStorage.removeItem(WEALTH_PREFILL_STORAGE_KEY);
      setPendingPrefills(parsed);
    } catch {
      sessionStorage.removeItem(WEALTH_PREFILL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (loading || !pendingPrefills?.length) return;
    setPrefillQueue(pendingPrefills);
    setPrefillIndex(0);
    applyPrefill(pendingPrefills[0]);
    setPendingPrefills(null);
    toast.info("Suggested investments from Deduction Maximiser — review and confirm each add.");
  }, [loading, pendingPrefills]);

  useEffect(() => {
    if (overview?.profile.intelligenceReport?.status !== "generating") return;
    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [overview?.profile.intelligenceReport?.status]);

  const donutData = useMemo(
    () => toDonutData(overview?.allocation ?? []),
    [overview?.allocation],
  );

  const suggestedCategory = useMemo(
    () => (assetName.trim() ? suggestAssetCategory(assetName) : null),
    [assetName],
  );

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    const value = parseInrInput(assetValue);
    if (!assetName.trim() || !assetCategory || !Number.isFinite(value) || value <= 0) {
      if (!assetCategory) toast.error("Please select a category.");
      return;
    }
    setSaving(true);
    try {
      const data = await addWealthAssetEntry({
        name: assetName,
        category: assetCategory,
        value,
        dateAdded: assetDate,
        notes: assetNotes || undefined,
      });
      setOverview(data);
      const nextIndex = prefillIndex + 1;
      if (prefillQueue.length > 0 && nextIndex < prefillQueue.length) {
        setPrefillIndex(nextIndex);
        applyPrefill(prefillQueue[nextIndex]);
        toast.success(`Asset added. Next suggestion (${nextIndex + 1} of ${prefillQueue.length}).`);
      } else {
        setPrefillQueue([]);
        setPrefillIndex(0);
        setAssetName("");
        setAssetCategory("");
        setAssetValue("");
        setAssetNotes("");
        toast.success("Asset added — your Intelligence Brief is being prepared.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add asset.");
    } finally {
      setSaving(false);
    }
  }

  const liabilityNameValid = useMemo(() => validateLiabilityName(liabilityName), [liabilityName]);

  async function handleAddLiability(e: React.FormEvent) {
    e.preventDefault();
    const value = parseInrInput(liabilityValue);
    const originalAmount = liabilityOriginal.trim() ? parseInrInput(liabilityOriginal) : value;
    const nameCheck = validateLiabilityName(liabilityName);
    if (!nameCheck.ok) {
      setLiabilityError(nameCheck.error);
      toast.error(nameCheck.error);
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Outstanding amount is required.");
      return;
    }
    setLiabilityError(null);
    setSaving(true);
    try {
      const data = await addWealthLiabilityEntry({
        name: liabilityName,
        type: liabilityType,
        value,
        originalValue: originalAmount >= value ? originalAmount : value,
        dateAdded: liabilityDate,
        notes: liabilityNotes || undefined,
      });
      setOverview(data);
      setLiabilityName("");
      setLiabilityValue("");
      setLiabilityOriginal("");
      setLiabilityNotes("");
      toast.success("Liability recorded — Intelligence Brief updating.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add liability.");
    } finally {
      setSaving(false);
    }
  }

  async function handleParseDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile && !pastedText.trim()) {
      toast.error("Upload a file or paste document text for AI parsing.");
      return;
    }
    setParsing(true);
    try {
      const form = new FormData();
      form.set("documentType", docType);
      if (uploadFile) form.set("file", uploadFile);
      if (pastedText.trim()) form.set("pastedText", pastedText.trim());
      const { draft: extracted } = await parseWealthDocumentUpload(form);
      setDraft(extracted ?? null);
      toast.success("AI extraction ready — review in the results modal.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Document parse failed.");
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirmDraft() {
    if (!draft) return;
    setSaving(true);
    try {
      const data = await confirmWealthExtraction(draft);
      setOverview(data);
      setDraft(null);
      setUploadFile(null);
      setPastedText("");
      toast.success("Wealth data saved — Intelligence Brief generating.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save extraction.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAsset(id: string) {
    if (!confirm("Remove this asset from your wealth overview?")) return;
    try {
      const data = await deleteWealthAssetEntry(id);
      setOverview(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const cashFd = useMemo(() => {
    const total = overview?.totalAssets ?? 0;
    const cash = overview?.profile.assets.filter((a) => a.category === "cash_fd").reduce((s, a) => s + a.value, 0) ?? 0;
    return { cash, pct: total > 0 ? Math.round((cash / total) * 100) : 0 };
  }, [overview]);

  if (loading) {
    return (
      <div className="p-5 lg:p-10 max-w-[1440px] mx-auto min-w-0 overflow-x-hidden">
        <PageSkeleton rows={6} />
      </div>
    );
  }

  const profile = overview?.profile;
  const tax = profile?.taxSnapshot;
  const unused80CHeadroom = Math.max(
    0,
    (tax?.limit80C ?? 1_50_000) - (tax?.used80C ?? 0),
  );

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <WealthQuickActions
        isDemo={isDemo}
        onAddAsset={() => {
          setEntryTab("manual");
          assetFormRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
        onAddLiability={() => {
          setEntryTab("manual");
          liabilityFormRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
        onUpload={() => {
          setEntryTab("upload");
          uploadFormRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
        onDownloadReport={() => downloadIntelligenceBrief().catch(() => toast.error("Report download failed."))}
      />

      <div className={`${WEALTH_QUICK_ACTIONS_OFFSET_CLASS} max-w-[1440px] mx-auto p-5 lg:p-10 space-y-8`}>
      <PageHeader
        title="Wealth Overview"
        subtitle="Your private net worth command centre — data stays in your vault, visible only to you."
      >
        <Link to="/dashboard/vault" className="text-sm hairline rounded-full px-4 py-2 inline-flex items-center gap-2">
          <Upload className="h-3.5 w-3.5" /> Vault
        </Link>
      </PageHeader>

      <WealthAlerts
        alerts={overview?.alerts}
        isDemo={isDemo}
        onAlertClick={(alert) => {
          if (alert.id === "unused-80c") setSection80cOpen(true);
        }}
        onDismiss={async (id) => {
          const data = await dismissWealthAlert(id);
          setOverview(data);
        }}
      />

      <Section80CDrawer
        open={section80cOpen}
        onClose={() => setSection80cOpen(false)}
        unusedAmount={unused80CHeadroom}
      />

      <IdleCashAlert cashAmount={cashFd.cash} cashPct={cashFd.pct} />

      {prefillQueue.length > 0 && (
        <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="text-[#c9a84c] font-medium">From Deduction Maximiser:</span>{" "}
            Suggestion {prefillIndex + 1} of {prefillQueue.length} — confirm below to add to your portfolio.
          </p>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setPrefillQueue([]);
              setPrefillIndex(0);
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="glass rounded-3xl p-6 lg:p-8 border border-gold/15 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Total net worth</p>
          <p className="font-display text-4xl lg:text-6xl text-gold tabular-nums tracking-tight">
            {formatInr(overview?.netWorth ?? 0)}
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            Assets {formatInr(overview?.totalAssets ?? 0)} − Liabilities {formatInr(overview?.totalLiabilities ?? 0)}
          </p>
          {overview?.monthOverMonth ? (
            <div
              className={`inline-flex items-center gap-1.5 mt-4 text-sm font-medium ${
                overview.monthOverMonth.direction === "up"
                  ? "text-success"
                  : overview.monthOverMonth.direction === "down"
                    ? "text-red-400"
                    : "text-muted-foreground"
              }`}
            >
              {overview.monthOverMonth.direction === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : overview.monthOverMonth.direction === "down" ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              <span>
                {overview.monthOverMonth.change >= 0 ? "+" : ""}
                {formatInr(overview.monthOverMonth.change)} ({overview.monthOverMonth.changePercent >= 0 ? "+" : ""}
                {overview.monthOverMonth.changePercent}%) vs last month
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-4">Month-over-month change available after your first full month of data.</p>
          )}
          {profile?.updatedAt && (
            <p className="text-[11px] text-muted-foreground mt-2">Last updated {formatUpdated(profile.updatedAt)}</p>
          )}
        </div>
      </section>

      <PortfolioHealthCard health={overview?.healthScore} />

      <WealthIntelligenceBrief
        report={profile?.intelligenceReport}
        isDemo={isDemo}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl flex items-center gap-2">
              <Landmark className="h-4 w-4 text-gold" /> Asset breakdown
            </h2>
            {profile?.updatedAt && (
              <span className="text-[10px] text-muted-foreground">Updated {formatUpdated(profile.updatedAt)}</span>
            )}
          </div>
          <AllocationDonut data={donutData} />
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {(overview?.allocation ?? []).map((slice) => (
              <div key={slice.category} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: slice.color }} />
                  {slice.name}
                </div>
                <p className="text-sm font-medium mt-1">{formatInr(slice.value)}</p>
                <p className="text-xs text-gold">{slice.percent}% of portfolio</p>
              </div>
            ))}
            {(overview?.allocation ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground sm:col-span-2">Add assets to see your breakdown.</p>
            )}
          </div>
        </section>

        <TaxSnapshotSection tax={tax} updatedAt={tax?.updatedAt} />
      </div>

      <WealthActivityTimeline profile={profile} />
      <WealthTimeline snapshots={profile?.portfolioSnapshots} crossedMilestones={profile?.crossedMilestones} />
      {(profile?.assets ?? []).length > 0 && <AssetValueChart assets={profile?.assets ?? []} />}

      <WealthLegalEntitiesSection
        entities={profile?.legalEntities ?? []}
        isDemo={isDemo}
        onSave={async (entity) => {
          const data = await addWealthLegalEntity(entity);
          setOverview(data);
          toast.success("Legal entity saved.");
        }}
      />

      <LiabilitiesSection
        liabilities={profile?.liabilities ?? []}
        totalAssets={overview?.totalAssets ?? 0}
        totalLiabilities={overview?.totalLiabilities ?? 0}
        isDemo={isDemo}
        saving={saving}
        onRecordPayment={async (liabilityId, input) => {
          setSaving(true);
          try {
            const data = await recordLiabilityPayment(liabilityId, input);
            setOverview(data);
            toast.success(input.type === "full_closure" ? "Loan closed — net worth updated." : "Payment recorded.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Payment failed.");
          } finally {
            setSaving(false);
          }
        }}
        onUpdateAmount={async (liabilityId, value) => {
          setSaving(true);
          try {
            const data = await updateWealthLiabilityValue(liabilityId, value);
            setOverview(data);
            toast.success("Liability amount updated.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Update failed.");
          } finally {
            setSaving(false);
          }
        }}
      />

      <WealthBreakdownTable
        assets={profile?.assets ?? []}
        totalAssets={overview?.totalAssets ?? 0}
        isDemo={isDemo}
        onDelete={handleDeleteAsset}
        onUpdateValue={async (id, value) => {
          const data = await updateWealthAssetValue(id, value);
          setOverview(data);
          toast.success("Asset value updated.");
        }}
      />


      {isDemo ? (
        <DemoFeatureLock
          title="Wealth entry locked in demo"
          description="Sample wealth data is shown above. Full membership unlocks manual entry and document parsing."
        />
      ) : (
        <section className="glass rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="font-display text-xl">Add wealth data</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manual entry or document upload — everything is stored in your private vault.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEntryTab("manual")}
              className={`rounded-full px-4 py-2 text-xs ${entryTab === "manual" ? "bg-foreground text-background" : "hairline"}`}
            >
              Manual entry
            </button>
            <button
              type="button"
              onClick={() => setEntryTab("upload")}
              className={`rounded-full px-4 py-2 text-xs ${entryTab === "upload" ? "bg-foreground text-background" : "hairline"}`}
            >
              Document upload
            </button>
          </div>

          {entryTab === "manual" ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <form ref={assetFormRef} onSubmit={handleAddAsset} className="scroll-mt-28 space-y-3 rounded-xl border border-border/60 p-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5" /> Add asset
                </h3>
                <input
                  className="field-input"
                  placeholder="Asset name"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  required
                />
                <select
                  className="field-input"
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {ASSET_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {suggestedCategory && !assetCategory && (
                  <button
                    type="button"
                    className="text-xs text-gold text-left hover:underline"
                    onClick={() => setAssetCategory(suggestedCategory)}
                  >
                    Suggested: {ASSET_CATEGORY_OPTIONS.find((o) => o.value === suggestedCategory)?.label} — tap to apply
                  </button>
                )}
                <InrInput value={assetValue} onChange={setAssetValue} placeholder="₹0" required className="field-input tabular-nums" />
                <input type="date" className="field-input" value={assetDate} onChange={(e) => setAssetDate(e.target.value)} />
                <textarea className="field-input resize-none" rows={2} placeholder="Notes (optional)" value={assetNotes} onChange={(e) => setAssetNotes(e.target.value)} />
                <button
                  type="submit"
                  disabled={saving || !assetCategory}
                  className="w-full h-10 rounded-xl bg-foreground text-background text-sm disabled:opacity-40"
                >
                  Add asset
                </button>
              </form>

              <form ref={liabilityFormRef} onSubmit={handleAddLiability} className="scroll-mt-28 space-y-3 rounded-xl border border-border/60 p-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5" /> Add liability
                </h3>
                <input
                  className={`field-input ${liabilityError || !liabilityNameValid.ok ? "border-destructive/50" : ""}`}
                  placeholder="e.g. Home loan — HDFC"
                  value={liabilityName}
                  onChange={(e) => {
                    setLiabilityName(e.target.value);
                    setLiabilityError(null);
                  }}
                  required
                />
                {liabilityName.trim() && !liabilityNameValid.ok && (
                  <p className="text-xs text-destructive">{liabilityNameValid.error}</p>
                )}
                {liabilityError && <p className="text-xs text-destructive">{liabilityError}</p>}
                <select className="field-input" value={liabilityType} onChange={(e) => setLiabilityType(e.target.value)}>
                  {LIABILITY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <InrInput
                  value={liabilityOriginal}
                  onChange={setLiabilityOriginal}
                  label="Original loan amount (₹)"
                  placeholder="₹50,00,000"
                  className="field-input tabular-nums"
                />
                <InrInput
                  value={liabilityValue}
                  onChange={setLiabilityValue}
                  label="Outstanding amount (₹)"
                  placeholder="₹40,00,000"
                  required
                  className="field-input tabular-nums"
                />
                <input type="date" className="field-input" value={liabilityDate} onChange={(e) => setLiabilityDate(e.target.value)} />
                <textarea className="field-input resize-none" rows={2} placeholder="Notes (optional)" value={liabilityNotes} onChange={(e) => setLiabilityNotes(e.target.value)} />
                <button
                  type="submit"
                  disabled={saving || !liabilityNameValid.ok || !liabilityValue.trim()}
                  className="w-full h-10 rounded-xl bg-foreground text-background text-sm disabled:opacity-40"
                >
                  Add liability
                </button>
              </form>
            </div>
          ) : (
            <form ref={uploadFormRef} onSubmit={handleParseDocument} className="scroll-mt-28 space-y-3 rounded-xl border border-border/60 p-4 max-w-2xl">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <FileUp className="h-3.5 w-3.5" /> Upload & parse
              </h3>
              <p className="text-xs text-muted-foreground">
                Supports ITR, CA statement, bank statement, MF statement, NSDL CAS (PDF / CSV / Excel).
              </p>
              <select className="field-input" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {WEALTH_DOCUMENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="file"
                accept=".pdf,.csv,.xlsx,.xls"
                className="field-input"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              <textarea
                className="field-input resize-none"
                rows={4}
                placeholder="Optional: paste key figures or tables for better AI extraction"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
              <button type="submit" disabled={parsing} className="h-10 px-5 rounded-xl bg-foreground text-background text-sm inline-flex items-center gap-2">
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Parse with AI
              </button>
            </form>
          )}

        </section>
      )}

      <WealthExtractionResultsModal
        open={!!draft}
        draft={draft}
        saving={saving}
        onChange={setDraft}
        onConfirm={handleConfirmDraft}
        onDiscard={() => setDraft(null)}
      />
    </div>
    </div>
  );
}
