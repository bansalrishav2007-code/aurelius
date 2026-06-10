import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { resolveDataDir } from "@/lib/data-path.server";

const BACKUP_RETENTION_DAYS = 30;
const DATA_RETENTION_YEARS = 7;

export async function runDailyBackup(): Promise<{ backupDir: string; filesCopied: number }> {
  const dataDir = await resolveDataDir();
  const stamp = new Date().toISOString().slice(0, 10);
  const backupRoot = join(dataDir, "backups", stamp);
  await mkdir(backupRoot, { recursive: true });

  const entries = await readdir(dataDir);
  let filesCopied = 0;

  for (const name of entries) {
    if (name === "backups") continue;
    const src = join(dataDir, name);
    const info = await stat(src);
    if (!info.isFile()) continue;
    await copyFile(src, join(backupRoot, name));
    filesCopied += 1;
  }

  await pruneOldBackups(join(dataDir, "backups"));
  return { backupDir: backupRoot, filesCopied };
}

async function pruneOldBackups(backupsDir: string) {
  try {
    const dirs = await readdir(backupsDir);
    const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const dir of dirs) {
      const full = join(backupsDir, dir);
      const info = await stat(full);
      if (info.isDirectory() && info.mtimeMs < cutoff) {
        const { rm } = await import("node:fs/promises");
        await rm(full, { recursive: true, force: true });
      }
    }
  } catch {
    /* backups dir may not exist yet */
  }
}

export const DATA_RETENTION_POLICY = {
  activeYears: DATA_RETENTION_YEARS,
  deletedAccountHoldDays: 30,
  backupIntervalHours: 24,
} as const;
