import { FileImage, FileSpreadsheet, FileText, FileType } from "lucide-react";
import type { VaultDocument } from "@/lib/vault/types";

type Props = {
  doc: Pick<VaultDocument, "name" | "mimeType">;
  className?: string;
};

export function DocumentFileIcon({ doc, className = "h-5 w-5" }: Props) {
  const lower = doc.name.toLowerCase();
  if (doc.mimeType.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(lower)) {
    return <FileImage className={`${className} text-violet-400`} />;
  }
  if (
    doc.mimeType.includes("spreadsheet") ||
    doc.mimeType.includes("excel") ||
    /\.(xlsx|xls)$/i.test(lower)
  ) {
    return <FileSpreadsheet className={`${className} text-emerald-400`} />;
  }
  if (doc.mimeType.includes("wordprocessing") || /\.docx$/i.test(lower)) {
    return <FileType className={`${className} text-blue-400`} />;
  }
  if (doc.mimeType === "application/pdf" || /\.pdf$/i.test(lower)) {
    return <FileText className={`${className} text-red-400`} />;
  }
  return <FileText className={`${className} text-[#c9a84c]`} />;
}
