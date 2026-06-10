import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { decryptJson, encryptJson } from "./encryption.server";

const VAULT_ROOT = join(process.cwd(), ".data", "user-vault");

/** Per-user isolated storage — one directory per member ID, never shared. */
export function userVaultDir(memberId: string): string {
  const safe = memberId.replace(/[^a-zA-Z0-9_-]/g, "");
  return join(VAULT_ROOT, safe);
}

export async function readUserEncryptedFile<T>(memberId: string, filename: string, fallback: T): Promise<T> {
  const dir = userVaultDir(memberId);
  await mkdir(dir, { recursive: true });
  const path = join(dir, filename);
  try {
    const raw = await readFile(path, "utf-8");
    return decryptJson<T>(raw);
  } catch {
    return structuredClone(fallback);
  }
}

export async function writeUserEncryptedFile<T>(memberId: string, filename: string, data: T): Promise<void> {
  const dir = userVaultDir(memberId);
  await mkdir(dir, { recursive: true });
  const path = join(dir, filename);
  await writeFile(path, encryptJson(data), "utf-8");
}

export async function deleteUserEncryptedFile(memberId: string, filename: string): Promise<void> {
  const path = join(userVaultDir(memberId), filename);
  try {
    await writeFile(path, "", "utf-8");
  } catch {
    /* file may not exist */
  }
}
