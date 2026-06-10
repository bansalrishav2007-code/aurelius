import { getSupabaseAdmin } from "./client.server";
import { isSupabaseConfigured } from "./config.server";
import { resolveSupabaseUserId } from "./users.server";

export async function insertGoal(
  email: string,
  goal: {
    title: string;
    category?: string;
    targetAmount?: number;
    currentAmount?: number;
    targetDate?: string;
    priority?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("goals")
    .insert({
      user_id: userId,
      title: goal.title,
      category: goal.category,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount ?? 0,
      target_date: goal.targetDate,
      priority: goal.priority ?? "medium",
      status: goal.status ?? "active",
      metadata: goal.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Supabase] insert goal:", error.message);
    return null;
  }
  return data.id as string;
}

export async function insertDocument(
  email: string,
  doc: {
    name: string;
    category?: string;
    filePath?: string;
    fileSize?: number;
    fileType?: string;
    status?: string;
    aiSummary?: string;
  },
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("documents")
    .insert({
      user_id: userId,
      name: doc.name,
      category: doc.category,
      file_path: doc.filePath,
      file_size: doc.fileSize,
      file_type: doc.fileType,
      status: doc.status ?? "received",
      ai_summary: doc.aiSummary,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Supabase] insert document:", error.message);
    return null;
  }
  return data.id as string;
}

export async function upsertAiSession(
  email: string,
  sessionId: string | null,
  title: string,
  messages: unknown[],
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return null;

  const supabase = getSupabaseAdmin();
  if (sessionId) {
    const { error } = await supabase
      .from("ai_sessions")
      .update({ title, messages, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", userId);
    if (error) console.error("[Supabase] update ai_session:", error.message);
    return sessionId;
  }

  const { data, error } = await supabase
    .from("ai_sessions")
    .insert({ user_id: userId, title, messages })
    .select("id")
    .single();

  if (error) {
    console.error("[Supabase] insert ai_session:", error.message);
    return null;
  }
  return data.id as string;
}

export async function insertTaxCalculation(
  email: string,
  calc: {
    financialYear: string;
    incomeData: unknown;
    deductionsData: unknown;
    tdsData: unknown;
    oldRegimeTax: number;
    newRegimeTax: number;
    recommendedRegime: string;
  },
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return;

  const { error } = await getSupabaseAdmin().from("tax_calculations").insert({
    user_id: userId,
    financial_year: calc.financialYear,
    income_data: calc.incomeData,
    deductions_data: calc.deductionsData,
    tds_data: calc.tdsData,
    old_regime_tax: calc.oldRegimeTax,
    new_regime_tax: calc.newRegimeTax,
    recommended_regime: calc.recommendedRegime,
  });
  if (error) console.error("[Supabase] insert tax:", error.message);
}

export async function insertNotification(
  email: string,
  notification: { title: string; message: string; type?: string },
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return;

  const { error } = await getSupabaseAdmin().from("notifications").insert({
    user_id: userId,
    title: notification.title,
    message: notification.message,
    type: notification.type ?? "system",
  });
  if (error) console.error("[Supabase] insert notification:", error.message);
}

export async function uploadDocumentToStorage(
  email: string,
  filePath: string,
  fileBytes: Uint8Array,
  contentType: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return null;

  const storagePath = `${userId}/${filePath}`;
  const { error } = await getSupabaseAdmin().storage.from("documents").upload(storagePath, fileBytes, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.error("[Supabase] storage upload:", error.message);
    return null;
  }
  return storagePath;
}
