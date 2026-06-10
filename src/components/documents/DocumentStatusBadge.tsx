import type { DocumentDisplayStatus } from "@/lib/documents/filters";

type Props = {
  status: DocumentDisplayStatus;
  onClick?: () => void;
};

const STYLES: Record<DocumentDisplayStatus, string> = {
  analysed: "bg-gold/15 text-gold border-gold/30",
  received: "bg-muted/40 text-muted-foreground border-border/50",
  processing: "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  shared: "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

const LABELS: Record<DocumentDisplayStatus, string> = {
  analysed: "Analysed",
  received: "Received",
  processing: "Processing",
  failed: "Failed",
  shared: "Shared",
};

export function DocumentStatusBadge({ status, onClick }: Props) {
  const clickable = status === "analysed" && onClick;
  const Tag = clickable ? "button" : "span";

  return (
    <Tag
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      className={`text-[10px] font-medium px-2 py-0.5 rounded-md border capitalize inline-flex items-center gap-1 ${STYLES[status]} ${clickable ? "hover:bg-gold/25 cursor-pointer" : ""}`}
    >
      {LABELS[status]}
    </Tag>
  );
}
