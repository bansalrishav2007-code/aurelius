import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VaultDocument } from "@/lib/vault/types";
import { analyzeDocument, deleteVaultDocument, fetchVaultDocuments } from "@/lib/platform/client";
import { Upload, FileText, ShieldCheck, Search, Trash2, Sparkles, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/vault")({
  head: () => ({ meta: [{ title: "Document Vault — Aureliuss" }] }),
  component: VaultPage,
});

const categories = ["All", "ITR", "Form 16", "GST", "Financials", "Property", "Legal", "Remittance", "Investments", "Other"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function VaultPage() {
  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selected, setSelected] = useState<VaultDocument | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { documents } = await fetchVaultDocuments();
    setDocs(documents);
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Unable to load vault."));
  }, [load]);

  const filtered = docs.filter(
    (d) => (cat === "All" || d.category === cat) && d.name.toLowerCase().includes(query.toLowerCase()),
  );

  async function uploadFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("PDF files only.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast.success(`${data.name} secured in vault.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this document?")) return;
    await deleteVaultDocument(id);
    if (selected?.id === id) setSelected(null);
    await load();
    toast.success("Document removed.");
  }

  async function handleAnalyze(doc: VaultDocument) {
    setAnalyzing(doc.id);
    try {
      const { analysis } = await analyzeDocument(doc.id);
      setSelected({ ...doc, status: "analyzed", analysis });
      await load();
      toast.success("Intelligence report generated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  }

  return (
    <div className="p-5 lg:p-10 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <div>
          <p className="label-caps mb-2 inline-flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-success" /> Secure Vault
          </p>
          <h1 className="font-display text-4xl tracking-tight">Document Vault</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">ITRs, GST filings, deeds, and agreements — encrypted, indexed, and AI-ready.</p>
        </div>
        <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />
          AES-256 · India-resident
        </div>
      </header>

      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />

      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`relative rounded-2xl border border-dashed transition-all cursor-pointer p-12 text-center mb-8 panel-muted ${dragging ? "border-gold bg-gold/5" : "border-border/60 hover:border-gold/30"}`}
      >
        {uploading ? (
          <Loader2 className="h-7 w-7 mx-auto text-gold animate-spin mb-4" />
        ) : (
          <Upload className="h-7 w-7 mx-auto text-muted-foreground mb-4" strokeWidth={1.3} />
        )}
        <p className="text-sm font-medium">{uploading ? "Encrypting and storing…" : "Drop PDFs here or browse"}</p>
        <p className="text-xs text-muted-foreground mt-2">ITR · Form 16 · GST · Balance sheets · Property · Legal · Max 20MB</p>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vault…" className="w-full field-input pl-9" />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`px-3.5 h-10 rounded-lg text-xs whitespace-nowrap transition-all ${cat === c ? "bg-foreground text-background" : "hairline panel-muted text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-3">
          {filtered.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelected(d)}
              className={`group panel-elevated rounded-2xl p-5 cursor-pointer lift ${selected?.id === d.id ? "ring-1 ring-gold/40" : ""}`}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-gold/10 grid place-items-center hairline">
                  <FileText className="h-5 w-5 text-gold-muted" strokeWidth={1.4} />
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }} className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-sm font-medium truncate mb-1">{d.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(d.sizeBytes)} · {new Date(d.uploadedAt).toLocaleDateString("en-IN")}</p>
              <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between">
                <span className="label-caps !text-[10px]">{d.category}</span>
                <span className="text-[10px] text-success capitalize">{d.status}</span>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && <div className="col-span-2 text-center py-16 text-muted-foreground text-sm panel-muted rounded-2xl">No documents yet. Upload your first filing.</div>}
        </div>

        <div className="panel-elevated rounded-2xl p-6 h-fit sticky top-24">
          {!selected ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Sparkles className="h-6 w-6 mx-auto text-gold/60 mb-4" />
              Select a document for AI intelligence
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2 mb-4">
                <h2 className="font-display text-lg tracking-tight truncate">{selected.name}</h2>
                <button type="button" onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              {!selected.analysis ? (
                <button type="button" disabled={analyzing === selected.id} onClick={() => handleAnalyze(selected)} className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  {analyzing === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate intelligence report
                </button>
              ) : (
                <div className="space-y-4 text-xs text-muted-foreground leading-relaxed max-h-[60vh] overflow-y-auto">
                  <section><p className="label-caps mb-2">Summary</p><p>{selected.analysis.summary}</p></section>
                  <section><p className="label-caps mb-2">Plain English</p><p>{selected.analysis.plainEnglish}</p></section>
                  {selected.analysis.complianceConcerns.length > 0 && (
                    <section><p className="label-caps mb-2">Compliance flags</p><ul className="list-disc pl-4 space-y-1">{selected.analysis.complianceConcerns.map((c) => <li key={c}>{c}</li>)}</ul></section>
                  )}
                  {selected.analysis.discussionPoints.length > 0 && (
                    <section><p className="label-caps mb-2">Discuss with CA / counsel</p><ul className="list-disc pl-4 space-y-1">{selected.analysis.discussionPoints.map((c) => <li key={c}>{c}</li>)}</ul></section>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
