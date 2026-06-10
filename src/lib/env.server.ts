import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let loaded = false;

/** Load .env into process.env for server routes (idempotent). */
export function ensureServerEnv(): void {
  if (loaded) return;
  loaded = true;

  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function getServerEnv(key: string): string | undefined {
  ensureServerEnv();
  return process.env[key];
}

export function getAnthropicApiKey(): string | undefined {
  ensureServerEnv();
  return process.env.ANTHROPIC_API_KEY?.trim();
}

export function getOpenAiApiKey(): string | undefined {
  ensureServerEnv();
  return process.env.OPENAI_API_KEY?.trim();
}
