export const VAULT_STORAGE_LIMIT_BYTES = 1_073_741_824; // 1 GB

export function formatVaultSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function vaultStoragePercent(usedBytes: number): number {
  return Math.min(100, (usedBytes / VAULT_STORAGE_LIMIT_BYTES) * 100);
}

export function vaultStorageWarning(usedBytes: number): boolean {
  return vaultStoragePercent(usedBytes) >= 80;
}
