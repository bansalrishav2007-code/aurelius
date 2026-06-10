import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Grid3X3, LayoutList, Lock, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { DocumentAnalysis, VaultDocument } from "@/lib/vault/types";
import {
  bulkDeleteVaultDocuments,
  bulkDownloadVaultDocuments,
  bulkMoveVaultDocuments,
  deleteVaultDocument,
  fetchVaultDocuments,
  updateVaultCategory,
  updateVaultExpiry,
  uploadVaultFile,
  vaultDocumentUrl,
} from "@/lib/platform/client";
import {
  categoryMatchesFilter,
  displayCategory,
  VAULT_FILTER_TABS,
  type VaultFilterTab,
  type VaultUploadCategory,
} from "@/lib/vault/categories";
import {
  getLastSecurityScan,
  getRecentlyViewedIds,
  recordRecentlyViewed,
  recordSecurityScan,
} from "@/lib/vault/recently-viewed";
import { ErrorBoundary } from "@/components/client/ErrorBoundary";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { EmptyState } from "@/components/client/EmptyState";
import { DemoFeatureLock } from "@/components/demo/DemoFeatureLock";
import { VaultUploadZone } from "@/components/vault/VaultUploadZone";
import { VaultCategoryModal } from "@/components/vault/VaultCategoryModal";
import { VaultStatsBar } from "@/components/vault/VaultStatsBar";
import { VaultDocumentCard } from "@/components/vault/VaultDocumentCard";
import { VaultListRow } from "@/components/vault/VaultListRow";
import { VaultPreviewPanel } from "@/components/vault/VaultPreviewPanel";
import { VaultRecentlyViewed } from "@/components/vault/VaultRecentlyViewed";
import { VaultBulkBar } from "@/components/vault/VaultBulkBar";
import { VaultShareModal } from "@/components/vault/VaultShareModal";
import { VaultAssistantModal } from "@/components/vault/VaultAssistantModal";
import { VaultFooter } from "@/components/vault/VaultFooter";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard/vault")({
  head: () => ({ meta: [{ title: "Vault — Aurelius" }] }),
  component: VaultPage,
});

type SortKey = "date" | "name" | "category";
type ViewMode = "grid" | "list";

type PendingUpload = {
  file: File;
  documentId: string;
  suggestedCategory?: string;
};

function VaultPage() {
  const { session } = AppRoute.useRouteContext();
  const isDemo = session.isDemo === true;

  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<VaultFilterTab>("All");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);
  const [shareDoc, setShareDoc] = useState<VaultDocument | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [securityScan, setSecurityScan] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { documents } = await fetchVaultDocuments();
    setDocs(documents);
  }, []);

  useEffect(() => {
    setRecentIds(getRecentlyViewedIds());
    setSecurityScan(getLastSecurityScan() ?? recordSecurityScan());
    load()
      .catch(() => toast.error("Unable to load vault."))
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = docs.filter((d) => {
      const matchTab = categoryMatchesFilter(d.category, filterTab);
      const matchQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        displayCategory(d.category).toLowerCase().includes(q);
      return matchTab && matchQuery;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "category") {
        return displayCategory(a.category).localeCompare(displayCategory(b.category));
      }
      return b.uploadedAt.localeCompare(a.uploadedAt);
    });

    return list;
  }, [docs, filterTab, query, sortBy]);

  const recentDocs = useMemo(
    () =>
      recentIds
        .map((id) => docs.find((d) => d.id === id))
        .filter((d): d is VaultDocument => Boolean(d)),
    [recentIds, docs],
  );

  function openDocument(doc: VaultDocument) {
    setPreviewDoc(doc);
    recordRecentlyViewed(doc.id);
    setRecentIds(getRecentlyViewedIds());
  }

  async function handleFileSelected(file: File) {
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadVaultFile(file, {
        onProgress: setUploadProgress,
      });

      if (result.needsCategory) {
        setPendingUpload({
          file,
          documentId: result.documentId,
          suggestedCategory: result.category,
        });
      } else {
        toast.success(`${result.name} uploaded securely.`);
        await load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleCategoryConfirm(category: VaultUploadCategory, expiryDate?: string) {
    if (!pendingUpload) return;
    try {
      await updateVaultCategory(pendingUpload.documentId, category);
      if (expiryDate) {
        const expiryType =
          category === "Insurance Policy" ? "insurance" : category === "Property Document" ? "property_tax" : "other";
        await updateVaultExpiry(pendingUpload.documentId, expiryDate, expiryType);
      }
      toast.success("Document tagged and stored.");
      setPendingUpload(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save category");
    }
  }

  const handleAnalysisComplete = useCallback((docId: string, analysis: DocumentAnalysis) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: "analyzed", analysis } : d)),
    );
    setPreviewDoc((prev) => (prev?.id === docId ? { ...prev, status: "analyzed", analysis } : prev));
  }, []);

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleBulkDownload() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const blob = await bulkDownloadVaultDocuments(ids);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aurelius-vault-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${ids.length} documents.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk download failed");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      await bulkDeleteVaultDocuments(ids);
      toast.success(`Deleted ${ids.length} documents.`);
      setSelectedIds(new Set());
      if (previewDoc && ids.includes(previewDoc.id)) setPreviewDoc(null);
      await load();
    } catch {
      toast.error("Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkMove(category: VaultUploadCategory) {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      await bulkMoveVaultDocuments(ids, category);
      toast.success(`Moved ${ids.length} documents to ${category}.`);
      setSelectedIds(new Set());
      await load();
    } catch {
      toast.error("Bulk move failed");
    } finally {
      setBulkBusy(false);
    }
  }

  function handleDownload(doc: VaultDocument) {
    window.open(vaultDocumentUrl(doc.id, false), "_blank", "noopener");
  }

  async function handleDelete(doc: VaultDocument) {
    try {
      await deleteVaultDocument(doc.id);
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
      toast.success("Document deleted.");
      await load();
    } catch {
      toast.error("Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="p-5 lg:p-10 max-w-[1600px] mx-auto min-w-0">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <ErrorBoundary title="Your Vault">
      <div className="p-5 lg:p-10 max-w-[1600px] mx-auto min-w-0">
        <PageHeader
          title="Vault"
          subtitle="Secure document storage with AI-powered financial insights."
        >
          <Lock className="h-4 w-4 text-[#c9a84c] self-center" />
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-[#c9a84c]/30 text-[#c9a84c] bg-[#c9a84c]/5">
            AES-256 Encrypted
          </span>
        </PageHeader>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="h-10 px-4 rounded-xl border border-[#c9a84c]/40 text-sm text-[#c9a84c] inline-flex items-center gap-2 hover:bg-[#c9a84c]/10"
          >
            <Sparkles className="h-4 w-4" />
            Ask AI about your documents
          </button>
        </div>

        <VaultStatsBar documents={docs} />

        {isDemo ? (
          <DemoFeatureLock
            title="Vault uploads locked in demo"
            description="Browse sample documents. Full membership unlocks secure uploads and AI analysis."
            className="mb-8"
          />
        ) : (
          <VaultUploadZone
            uploading={uploading}
            progress={uploadProgress}
            disabled={isDemo}
            onFileSelected={handleFileSelected}
          />
        )}

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by document name…"
              className="w-full field-input pl-9 bg-[#0a0e1a]/80"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="h-10 rounded-xl border border-border/50 bg-[#0a0e1a]/80 px-3 text-xs text-muted-foreground"
          >
            <option value="date">Sort: Date uploaded</option>
            <option value="name">Sort: Name</option>
            <option value="category">Sort: Category</option>
          </select>

          <div className="flex items-center gap-1 rounded-xl border border-border/50 p-1 bg-[#0a0e1a]/80">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                viewMode === "grid" ? "bg-[#c9a84c] text-[#0a0e1a]" : "text-muted-foreground"
              }`}
              title="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                viewMode === "list" ? "bg-[#c9a84c] text-[#0a0e1a]" : "text-muted-foreground"
              }`}
              title="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6">
          {VAULT_FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-4 h-9 rounded-lg text-xs whitespace-nowrap transition-colors ${
                filterTab === tab
                  ? "bg-[#c9a84c] text-[#0a0e1a] font-medium"
                  : "hairline panel-muted text-muted-foreground hover:border-[#c9a84c]/30"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={`flex gap-0 min-h-[500px] ${previewDoc ? "lg:gap-0" : ""}`}>
          <div className={`min-w-0 flex-1 ${previewDoc ? "lg:max-w-[55%]" : ""}`}>
            <VaultBulkBar
              count={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              onDownload={() => void handleBulkDownload()}
              onDelete={() => void handleBulkDelete()}
              onMove={(cat) => void handleBulkMove(cat)}
              busy={bulkBusy}
            />

            <VaultRecentlyViewed documents={recentDocs} onOpen={openDocument} />

            {filtered.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents yet"
                description="Upload tax returns, investment statements, property deeds, or bank statements to build your secure vault."
              />
            ) : viewMode === "grid" ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((d) => (
                  <VaultDocumentCard
                    key={d.id}
                    doc={d}
                    selected={selectedIds.has(d.id)}
                    onSelect={isDemo ? undefined : (checked) => toggleSelect(d.id, checked)}
                    onOpen={() => openDocument(d)}
                    onDownload={() => handleDownload(d)}
                    onDelete={isDemo ? undefined : () => void handleDelete(d)}
                    onShare={isDemo ? undefined : () => setShareDoc(d)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="hidden lg:flex items-center gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className="w-4" />
                  <span className="w-4" />
                  <span className="flex-1">Name</span>
                  <span className="w-28">Category</span>
                  <span className="w-16">Size</span>
                  <span className="w-24">Date</span>
                  <span className="w-32">Actions</span>
                </div>
                {filtered.map((d) => (
                  <VaultListRow
                    key={d.id}
                    doc={d}
                    selected={selectedIds.has(d.id)}
                    onSelect={isDemo ? undefined : (checked) => toggleSelect(d.id, checked)}
                    onOpen={() => openDocument(d)}
                    onDownload={() => handleDownload(d)}
                    onDelete={isDemo ? undefined : () => void handleDelete(d)}
                    onShare={isDemo ? undefined : () => setShareDoc(d)}
                  />
                ))}
              </div>
            )}
          </div>

          {previewDoc && (
            <div className="hidden lg:block w-[45%] shrink-0 sticky top-4 self-start h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-[#1a2035]">
              <VaultPreviewPanel
                doc={previewDoc}
                onClose={() => setPreviewDoc(null)}
                onAnalysisComplete={(analysis) => handleAnalysisComplete(previewDoc.id, analysis)}
                onDelete={isDemo ? undefined : () => void handleDelete(previewDoc)}
                onShare={isDemo ? undefined : () => setShareDoc(previewDoc)}
                onMoveCategory={
                  isDemo
                    ? undefined
                    : async (category) => {
                        try {
                          await updateVaultCategory(previewDoc.id, category);
                          toast.success(`Moved to ${category}.`);
                          await load();
                          setPreviewDoc((prev) => (prev ? { ...prev, category } : prev));
                        } catch {
                          toast.error("Failed to move document");
                        }
                      }
                }
              />
            </div>
          )}
        </div>

        {/* Mobile preview overlay */}
        {previewDoc && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/90">
            <div className="h-full flex flex-col">
              <VaultPreviewPanel
                doc={previewDoc}
                onClose={() => setPreviewDoc(null)}
                onAnalysisComplete={(analysis) => handleAnalysisComplete(previewDoc.id, analysis)}
                onDelete={isDemo ? undefined : () => void handleDelete(previewDoc)}
                onShare={isDemo ? undefined : () => setShareDoc(previewDoc)}
                onMoveCategory={
                  isDemo
                    ? undefined
                    : async (category) => {
                        try {
                          await updateVaultCategory(previewDoc.id, category);
                          toast.success(`Moved to ${category}.`);
                          await load();
                        } catch {
                          toast.error("Failed to move document");
                        }
                      }
                }
              />
            </div>
          </div>
        )}

        <VaultFooter lastSecurityScan={securityScan} />

        {pendingUpload && (
          <VaultCategoryModal
            fileName={pendingUpload.file.name}
            documentId={pendingUpload.documentId}
            suggestedCategory={pendingUpload.suggestedCategory}
            onConfirm={handleCategoryConfirm}
            onClose={() => {
              setPendingUpload(null);
              void load();
            }}
            onAnalysisComplete={(analysis) =>
              handleAnalysisComplete(pendingUpload.documentId, analysis)
            }
          />
        )}

        {shareDoc && (
          <VaultShareModal
            doc={shareDoc}
            onClose={() => setShareDoc(null)}
            onLinkCreated={() => void load()}
          />
        )}

        {assistantOpen && (
          <VaultAssistantModal
            onClose={() => setAssistantOpen(false)}
            onOpenDocument={(id) => {
              const doc = docs.find((d) => d.id === id);
              if (doc) openDocument(doc);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
