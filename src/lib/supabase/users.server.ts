import { getSupabaseAdmin } from "./client.server";
import { isSupabaseConfigured } from "./config.server";

function memberNumberFromEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return `A${String((hash % 99_999) + 1).padStart(5, "0")}`;
}

export async function resolveSupabaseUserId(
  email: string,
  opts?: { fullName?: string; tier?: string },
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const normalized = email.toLowerCase();
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
    user_metadata: { full_name: opts?.fullName ?? normalized },
  });

  if (authError || !authData.user) {
    console.error("[Supabase] createUser failed:", authError?.message);
    return null;
  }

  const userId = authData.user.id;
  const { error: insertError } = await supabase.from("users").insert({
    id: userId,
    email: normalized,
    full_name: opts?.fullName ?? null,
    tier: opts?.tier ?? "principal",
    member_number: memberNumberFromEmail(normalized),
  });

  if (insertError) {
    console.error("[Supabase] users insert failed:", insertError.message);
    return userId;
  }

  return userId;
}
