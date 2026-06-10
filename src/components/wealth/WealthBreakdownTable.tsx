import { useMemo, useState } from "react";
import { formatInr, assetValueChange } from "@/lib/wealth/calculations";
import { ASSET_CATEGORY_META } from "@/lib/wealth/categories";
import type { WealthAsset } from "@/lib/wealth/types";
import { Download, FileSpreadsheet } from "lucide-react";

type SortKey = "name" | "category" | "value" | "percent" | "dateAdded" | "updatedAt";

export function WealthBreakdownTable({
  assets,
  totalAssets,
  onDelete,
  onUpdateValue,
  isDemo,
}: {
  assets: WealthAsset[];
  totalAssets: number;
  onDelete?: (id: string) => void;
  onUpdateValue?: (id: string, value: number) => void;
  isDemo?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("value");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const filtered = useMemo(() => {
    let list = [...assets];
    if (category !== "all") list = list.filter((a) => a.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sort === "name") cmp = a.name.localeCompare(b.name);
      else if (sort === "category") cmp = a.category.localeCompare(b.category);
      else if (sort === "value") cmp = a.value - b.value;
      else if (sort === "percent") cmp = (a.value / totalAssets) - (b.value / totalAssets);
      else if (sort === "dateAdded") cmp = a.dateAdded.localeCompare(b.dateAdded);
      else cmp = a.updatedAt.localeCompare(b.updatedAt);
      return asc ? cmp : -cmp;
    });
    return list;
  }, [assets, category, search, sort, asc, totalAssets]);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(key: SortKey) {
    if (sort === key) setAsc(!asc);
    else {
      setSort(key);
      setAsc(false);
    }
  }

  function exportCsv() {
    const header = ["Name", "Category", "Current Value", "% Portfolio", "Change", "Date Added", "Last Updated"];
    const lines = filtered.map((a) => {
      const ch = assetValueChange(a);
      const pct = totalAssets > 0 ? Math.round((a.value / totalAssets) * 100) : 0;
      return [
        a.name,
        ASSET_CATEGORY_META[a.category].label,
        a.value,
        `${pct}%`,
        ch.changePercent != null ? `${ch.changePercent}%` : "",
        a.dateAdded,
        new Date(a.updatedAt).toLocaleDateString("en-IN"),
      ];
    });
    const csv = [header, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wealth-portfolio-breakdown.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const rows = filtered.map((a) => {
      const ch = assetValueChange(a);
      const pct = totalAssets > 0 ? Math.round((a.value / totalAssets) * 100) : 0;
      return `<tr>
        <td>${a.name}</td>
        <td>${ASSET_CATEGORY_META[a.category].label}</td>
        <td>${formatInr(a.value)}</td>
        <td>${pct}%</td>
        <td>${ch.changePercent != null ? `${ch.changePercent}%` : "—"}</td>
        <td>${a.dateAdded}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><title>Wealth Portfolio Breakdown</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}</style></head>
      <body><h1>Wealth Portfolio Breakdown</h1><p>Generated ${new Date().toLocaleString("en-IN")}</p>
      <table><thead><tr><th>Asset</th><th>Category</th><th>Value</th><th>%</th><th>Change</th><th>Added</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  if (assets.length === 0) {
    return (
      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl mb-2">Portfolio breakdown</h2>
        <p className="text-sm text-muted-foreground">Add assets to see your full breakdown table.</p>
      </section>
    );
  }

  return (
    <section className="glass rounded-2xl p-6 space-y-4 overflow-x-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h2 className="font-display text-xl">Portfolio breakdown</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" onClick={exportCsv} className="hairline h-9 px-3 rounded-lg text-xs inline-flex items-center gap-1">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button type="button" onClick={exportPdf} className="hairline h-9 px-3 rounded-lg text-xs inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search assets…"
            className="field-input h-9 text-xs w-40"
          />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(0); }}
            className="field-input h-9 text-xs"
          >
            <option value="all">All categories</option>
            {Object.entries(ASSET_CATEGORY_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
            {(["name", "category", "value", "percent", "dateAdded", "updatedAt"] as SortKey[]).map((k) => (
              <th key={k} className="text-left py-2 pr-3 cursor-pointer hover:text-foreground" onClick={() => toggleSort(k)}>
                {k === "percent" ? "% portfolio" : k.replace(/([A-Z])/g, " $1")}
              </th>
            ))}
            <th className="text-left py-2">Change</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const ch = assetValueChange(a);
            const pct = totalAssets > 0 ? Math.round((a.value / totalAssets) * 100) : 0;
            return (
              <tr key={a.id} className="border-b border-border/20">
                <td className="py-2.5 pr-3 font-medium">{a.name}</td>
                <td className="py-2.5 pr-3 capitalize text-muted-foreground">{ASSET_CATEGORY_META[a.category].label}</td>
                <td className="py-2.5 pr-3 tabular-nums">
                  {editingId === a.id ? (
                    <input
                      className="field-input h-8 w-28 text-xs"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && onUpdateValue) {
                          const v = Number(editValue.replace(/,/g, ""));
                          if (v > 0) onUpdateValue(a.id, v);
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    formatInr(a.value)
                  )}
                </td>
                <td className="py-2.5 pr-3">{pct}%</td>
                <td className="py-2.5 pr-3 text-xs">{a.dateAdded}</td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground">{new Date(a.updatedAt).toLocaleDateString("en-IN")}</td>
                <td className={`py-2.5 pr-3 text-xs ${ch.direction === "up" ? "text-success" : ch.direction === "down" ? "text-red-400" : "text-muted-foreground"}`}>
                  {ch.changePercent === null ? (
                    "—"
                  ) : (
                    <span className="inline-flex items-center gap-0.5">
                      {ch.direction === "up" ? (
                        <>▲ {ch.changePercent}%</>
                      ) : ch.direction === "down" ? (
                        <>▼ {Math.abs(ch.changePercent)}%</>
                      ) : (
                        `${ch.changePercent}%`
                      )}
                    </span>
                  )}
                </td>
                <td className="py-2.5">
                  {!isDemo && (
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        className="text-gold"
                        onClick={() => { setEditingId(a.id); setEditValue(String(a.value)); }}
                      >
                        Update
                      </button>
                      {onDelete && (
                        <button type="button" className="text-destructive" onClick={() => onDelete(a.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pages > 1 && (
        <div className="flex justify-center gap-2 text-xs">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="hairline px-3 py-1 rounded-lg disabled:opacity-40">
            Prev
          </button>
          <span className="py-1 text-muted-foreground">{page + 1} / {pages}</span>
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="hairline px-3 py-1 rounded-lg disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </section>
  );
}
