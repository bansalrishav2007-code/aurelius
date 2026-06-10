import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    const value = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.log("Supabase connected: NO (missing env vars)");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("Supabase connected:", supabase ? "YES" : "NO");

const { error } = await supabase.from("users").select("id").limit(1);

if (error) {
  const missingTable =
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message.includes("does not exist") ||
    error.message.includes("schema cache");
  if (missingTable) {
    console.log("Tables ready: NO — run supabase/migrations/*.sql in Supabase SQL Editor");
    process.exit(0);
  }
  console.log("Connection error:", error.message);
  process.exit(1);
}

console.log("Tables ready: YES");
console.log("Result: Supabase connected: YES");
