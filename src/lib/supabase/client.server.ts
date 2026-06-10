import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "./config.server";

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;
let connectionLogged = false;

/** Server-only admin client (bypasses RLS). Never expose to the browser. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  }
  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (!connectionLogged) {
      connectionLogged = true;
      console.log("Supabase connected:", adminClient ? "YES" : "NO");
    }
  }
  return adminClient;
}

/** Public anon client for browser-safe operations (when needed). */
export function getSupabaseAnon(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;
  anonClient ??= createClient(url, key, { auth: { persistSession: false } });
  return anonClient;
}

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  message: string;
}> {
  if (!isSupabaseConfigured()) {
    return { connected: false, tablesReady: false, message: "Supabase env vars missing" };
  }
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) {
      if (
        error.code === "42P01" ||
        error.code === "PGRST205" ||
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return {
          connected: true,
          tablesReady: false,
          message: "Connected but tables not created — run supabase/migrations SQL in dashboard",
        };
      }
      return { connected: false, tablesReady: false, message: error.message };
    }
    return { connected: true, tablesReady: true, message: "Supabase connected and schema ready" };
  } catch (err) {
    return {
      connected: false,
      tablesReady: false,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
