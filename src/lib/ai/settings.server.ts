import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";

export type AiPrimaryProvider = "claude" | "gpt" | "both";

export type AiSettings = {
  primaryProvider: AiPrimaryProvider;
  updatedAt: string;
};

const DEFAULT: AiSettings = {
  primaryProvider: "both",
  updatedAt: new Date().toISOString(),
};

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-ai-settings.json");
  return dataPathPromise;
}

let cache: AiSettings | null = null;

export async function getAiSettings(): Promise<AiSettings> {
  if (cache) return structuredClone(cache);
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    cache = JSON.parse(await readFile(path, "utf-8")) as AiSettings;
    return structuredClone(cache);
  } catch {
    await writeFile(path, JSON.stringify(DEFAULT, null, 2), "utf-8");
    cache = DEFAULT;
    return structuredClone(DEFAULT);
  }
}

export async function setAiPrimaryProvider(primaryProvider: AiPrimaryProvider): Promise<AiSettings> {
  const settings: AiSettings = { primaryProvider, updatedAt: new Date().toISOString() };
  cache = settings;
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(settings, null, 2), "utf-8");
  return structuredClone(settings);
}
