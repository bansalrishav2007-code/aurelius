import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Eye, FileText, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { EmptyState } from "@/components/client/EmptyState";
import { DocumentFileIcon } from "@/components/vault/DocumentFileIcon";
import { VaultPreviewPanel } from "@/components/vault/VaultPreviewPanel";
import { VaultShareModal } from "@/components/vault/VaultShareModal";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { DocumentAnalysisModal } from "@/components/documents/DocumentAnalysisModal";
import { DocumentsStatsBar } from "@/components/documents/DocumentsStatsBar";
import { DocumentsBulkBar } from "@/components/documents/DocumentsBulkBar";
import { displayCategory } from "@/lib/vault/categories";
import type { VaultUploadCategory } from "@/lib/vault/categories";
import {
  DOCUMENT_FILTER_TABS,
  documentMatchesFilter,
  getDocumentDisplayStatus,
  isRecentlyAdded,
  sortDocuments,
  type DocumentFilterTab,
  type DocumentSortKey,
} from "@/lib/documents/filters";
import { formatVaultSize } from "@/lib/vault/storage";
import type { DocumentAnalysis, VaultDocument } from "@/lib/vault/types";
import {
  bulkDeleteVaultDocuments,
  bulkDownloadVaultDocuments,
  bulkMoveVaultDocuments,
  createVaultShareLink,
  deleteVaultDocument,
  fetchVaultDocuments,
  updateVaultCategory,
  vaultDocumentUrl,
} from "@/lib/platform/client";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard/documents")({
  head: () => ({ meta: [{ title: "Documents — Aurelius" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { session } = AppRoute.useRouteContext();
  const isDemo = session.isDemo === true;

  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<DocumentFilterTab>("All");
  const [sortBy, setSortBy] = useState<DocumentSortKey>("date-desc");
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);
  const [analysisDoc, setAnalysisDoc] = useState<VaultDocument | null>(null);
  const [shareDoc, setShareDoc] = useState<VaultDocument | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    const { documents } = await fetchVaultDocuments();
    setDocs(documents);
  }, []);

  useEffect(() => {
    load()
      .catch(() => toast.error("Unable to load documents."))
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = docs.filter((d) => {
      const matchTab = documentMatchesFilter(d, filterTab);
      const matchQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        displayCategory(d.category).toLowerCase().includes(q);
      return matchTab && matchQuery;
    });
    return sortDocuments(list, sortBy);
  }, [docs, filterTab, query, sortBy]);

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(filtered.map((d) => d.id)));
    else setSelectedIds(new Set());
  }

  const handleAnalysisComplete = useCallback((docId: string, analysis: DocumentAnalysis) => {
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, status: "analyzed", analysis } : d)));
    setPreviewDoc((prev) => (prev?.id === docId ? { ...prev, status: "analyzed", analysis } : prev));
  }, []);

  async function handleDelete(doc: VaultDocument) {
    try {
      await deleteVaultDocument(doc.id);
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
      toast.success("Document deleted.");
      await load();
    } catch {
      toast.error("Delete failed.");
    }
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
      a.download = `aurelius-documents-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${ids.length} documents.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed.");
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
      toast.error("Bulk delete failed.");
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
      toast.success(`Moved ${ids.length} documents.`);
      setSelectedIds(new Set());
      await load();
    } catch {
      toast.error("Bulk move failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkShareExpert() {
    const ids = [...selectedIds];
    if (!ids.length || isDemo) return;
    setBulkBusy(true);
    try {
      let shared = 0;
      for (const id of ids) {
        await createVaultShareLink(id, "expert");
        shared++;
      }
      toast.success(`Created expert share links for ${shared} document(s).`);
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Share failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-5 lg:p-10 max-w-[1600px] mx-auto">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-10 max-w-[1600px] mx-auto">
      <PageHeader
        title="Documents"
        subtitle="All files secured in your private vault — indexed, analysed, and searchable."
      >
        <Link
          to="/dashboard/vault"
          className="text-sm bg-foreground text-background rounded-full px-4 py-2 inline-flex items-center gap-2"
        >
          <Upload className="h-3.5 w-3.5" /> Upload
        </Link>
      </PageHeader>

      {docs.length > 0 && <DocumentsStatsBar documents={docs} />}

      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="w-full field-input pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as DocumentSortKey)}
          className="h-10 rounded-xl border border-border/50 bg-[#0a0e1a]/80 px-3 text-xs text-muted-foreground"
        >
          <option value="date-desc">Date uploaded (newest first)</option>
          <option value="date-asc">Date uploaded (oldest first)</option>
          <option value="name">Name A–Z</option>
          <option value="size">File size (largest first)</option>
          <option value="category">Category</option>
        </select>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6">
        {DOCUMENT_FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterTab(tab)}
            className={`px-3 h-8 rounded-lg text-xs whitespace-nowrap transition-colors ${
              filterTab === tab
                ? "bg-gold text-[#0a0e1a] font-medium"
                : "hairline panel-muted text-muted-foreground hover:border-gold/30"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={`flex gap-0 min-h-[400px] ${previewDoc ? "" : ""}`}>
        <div className={`min-w-0 flex-1 ${previewDoc ? "lg:max-w-[58%]" : ""}`}>
          {!isDemo && (
            <DocumentsBulkBar
              count={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              onDownload={() => void handleBulkDownload()}
              onDelete={() => void handleBulkDelete()}
              onMove={(cat) => void handleBulkMove(cat)}
              onShareExpert={() => void handleBulkShareExpert()}
              busy={bulkBusy}
            />
          )}

          {docs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Your vault is empty"
              description="Upload your ITR, bank statements, or legal documents to get started."
              action={
                <Link
                  to="/dashboard/vault"
                  className="h-10 px-5 rounded-xl bg-gold text-[#0a0e1a] text-sm font-medium inline-flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" /> Upload documents
                </Link>
              }
            />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground glass rounded-2xl p-8 text-center">
              No documents match your filters.
            </p>
          ) : (
            <div className="glass rounded-2xl overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[900px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                    {!isDemo && (
                      <th className="py-3 px-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="h-4 w-4 accent-gold"
                        />
                      </th>
                    )}
                    <th className="py-3 px-4 font-normal">Name</th>
                    <th className="py-3 px-4 font-normal">Category</th>
                    <th className="py-3 px-4 font-normal">Size</th>
                    <th className="py-3 px-4 font-normal">Status</th>
                    <th className="py-3 px-4 font-normal">Uploaded</th>
                    <th className="py-3 px-4 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const displayStatus = getDocumentDisplayStatus(d);
                    const isNew = isRecentlyAdded(d.uploadedAt);
                    return (
                      <tr
                        key={d.id}
                        className={`border-b border-border/20 hover:bg-muted/20 cursor-pointer ${previewDoc?.id === d.id ? "bg-gold/5" : ""}`}
                        onClick={() => setPreviewDoc(d)}
                      >
                        {!isDemo && (
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(d.id)}
                              onChange={(e) => toggleSelect(d.id, e.target.checked)}
                              className="h-4 w-4 accent-gold"
                            />
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <DocumentFileIcon doc={d} className="h-4 w-4 shrink-0" />
                            <span className="font-medium truncate max-w-[200px]" title={d.name}>
                              {d.name}
                            </span>
                            {isNew && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-gold shrink-0">
                                NEW
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {displayCategory(d.category)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                          {formatVaultSize(d.sizeBytes)}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <DocumentStatusBadge
                            status={displayStatus}
                            onClick={
                              displayStatus === "analysed"
                                ? () => setAnalysisDoc(d)
                                : undefined
                            }
                          />
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                          {format(new Date(d.uploadedAt), "d MMM yyyy, HH:mm")}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <IconBtn
                              title="View"
                              onClick={() => setPreviewDoc(d)}
                              icon={<Eye className="h-3.5 w-3.5" />}
                            />
                            <IconBtn
                              title="Download"
                              onClick={() => window.open(vaultDocumentUrl(d.id, false), "_blank")}
                              icon={<Download className="h-3.5 w-3.5" />}
                            />
                            {!isDemo && (
                              <IconBtn
                                title="Delete"
                                onClick={() => void handleDelete(d)}
                                icon={<Trash2 className="h-3.5 w-3.5" />}
                                destructive
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {previewDoc && (
          <div className="hidden lg:block w-[42%] shrink-0 sticky top-4 self-start h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-[#1a2035] mt-0">
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
                        toast.error("Failed to move document.");
                      }
                    }
              }
            />
          </div>
        )}
      </div>

      {previewDoc && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/90">
          <div className="h-full flex flex-col">
            <VaultPreviewPanel
              doc={previewDoc}
              onClose={() => setPreviewDoc(null)}
              onAnalysisComplete={(analysis) => handleAnalysisComplete(previewDoc.id, analysis)}
              onDelete={isDemo ? undefined : () => void handleDelete(previewDoc)}
              onShare={isDemo ? undefined : () => setShareDoc(previewDoc)}
            />
          </div>
        </div>
      )}

      {analysisDoc && (
        <DocumentAnalysisModal doc={analysisDoc} onClose={() => setAnalysisDoc(null)} />
      )}

      {shareDoc && (
        <VaultShareModal
          doc={shareDoc}
          onClose={() => setShareDoc(null)}
          onLinkCreated={() => void load()}
        />
      )}
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  icon,
  destructive,
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
        destructive
          ? "text-muted-foreground hover:text-destructive"
          : "text-muted-foreground hover:text-gold"
      }`}
    >
      {icon}
    </button>
  );
}
