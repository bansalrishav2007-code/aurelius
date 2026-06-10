import { useRef } from "react";
import { Loader2, Shield, Upload } from "lucide-react";
import * as Progress from "@radix-ui/react-progress";

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type Props = {
  uploading: boolean;
  progress: number;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
};

export function VaultUploadZone({ uploading, progress, disabled, onFileSelected }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);

  function handleFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (file && !disabled && !uploading) onFileSelected(file);
  }

  return (
    <div className="mb-8">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          dragging.current = true;
          e.currentTarget.classList.add("border-[#c9a84c]/50", "bg-[#c9a84c]/5");
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragging.current = false;
          e.currentTarget.classList.remove("border-[#c9a84c]/50", "bg-[#c9a84c]/5");
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragging.current = false;
          e.currentTarget.classList.remove("border-[#c9a84c]/50", "bg-[#c9a84c]/5");
          handleFiles(e.dataTransfer.files);
        }}
        className="rounded-2xl border border-dashed border-border/60 bg-[#0a0e1a]/60 transition-all p-10 text-center"
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 mx-auto text-[#c9a84c] animate-spin mb-4" />
        ) : (
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
        )}

        <p className="text-sm font-medium mb-1">
          {uploading ? "Encrypting & uploading…" : "Drag & drop your documents here"}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          PDF, JPG, PNG, XLSX, DOCX — up to 20 MB
        </p>

        {!uploading && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            className="h-10 px-5 rounded-xl border border-[#c9a84c]/40 text-sm text-[#c9a84c] hover:bg-[#c9a84c]/10 disabled:opacity-50"
          >
            Browse files
          </button>
        )}

        {uploading && (
          <div className="max-w-xs mx-auto mt-4">
            <Progress.Root
              value={progress}
              className="relative h-2 w-full overflow-hidden rounded-full bg-[#1a2035]"
            >
              <Progress.Indicator
                className="h-full bg-[#c9a84c] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </Progress.Root>
            <p className="text-[10px] text-muted-foreground mt-2">{progress}%</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mt-3">
        <Shield className="h-3.5 w-3.5 text-[#c9a84c]" />
        <span className="text-[10px] uppercase tracking-wider text-[#c9a84c]/80">
          AES-256 Encrypted
        </span>
      </div>
    </div>
  );
}
