import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";

export type MembershipSettings = {
  inviteOnlyMode: boolean;
  updatedAt: string;
};

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-membership-settings.json");
  return dataPathPromise;
}

const DEFAULT: MembershipSettings = {
  inviteOnlyMode: true,
  updatedAt: new Date().toISOString(),
};

let cache: MembershipSettings | null = null;

export async function getMembershipSettings(): Promise<MembershipSettings> {
  if (cache) return structuredClone(cache);
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    cache = JSON.parse(await readFile(path, "utf-8")) as MembershipSettings;
    return structuredClone(cache);
  } catch {
    await writeFile(path, JSON.stringify(DEFAULT, null, 2), "utf-8");
    cache = DEFAULT;
    return structuredClone(DEFAULT);
  }
}

export async function setInviteOnlyMode(enabled: boolean): Promise<MembershipSettings> {
  const settings: MembershipSettings = {
    inviteOnlyMode: enabled,
    updatedAt: new Date().toISOString(),
  };
  cache = settings;
  const path = await getDataPath();
  await writeFile(path, JSON.stringify(settings, null, 2), "utf-8");
  return structuredClone(settings);
}
