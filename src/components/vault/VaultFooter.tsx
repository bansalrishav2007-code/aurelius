import { format } from "date-fns";
import { Shield } from "lucide-react";

type Props = {
  lastSecurityScan?: string | null;
};

export function VaultFooter({ lastSecurityScan }: Props) {
  return (
    <div className="mt-10 text-center space-y-2">
      <p className="text-xs text-muted-foreground">
        Vault Secured — AES-256 Encrypted. Your data never leaves India.
      </p>
      {lastSecurityScan && (
        <p className="text-[10px] text-muted-foreground/70 inline-flex items-center justify-center gap-1.5">
          <Shield className="h-3 w-3 text-[#c9a84c]/60" />
          Last security scan: {format(new Date(lastSecurityScan), "d MMM yyyy, h:mm a")}
        </p>
      )}
    </div>
  );
}
