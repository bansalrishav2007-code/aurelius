import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function resolveDataDir(): Promise<string> {
  const dir = join(process.cwd(), ".data");
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Resolves a data file path, migrating from a legacy filename if needed. */
export async function resolveDataFile(filename: string, legacyFilename?: string): Promise<string> {
  const dir = await resolveDataDir();
  await mkdir(dir, { recursive: true });
  const newPath = join(dir, filename);

  if (legacyFilename) {
    const legacyPath = join(dir, legacyFilename);
    try {
      await readFile(newPath);
    } catch {
      try {
        await readFile(legacyPath);
        await copyFile(legacyPath, newPath);
      } catch {
        /* new file will be created on first write */
      }
    }
  }

  return newPath;
}
