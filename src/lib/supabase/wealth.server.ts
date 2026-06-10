import type { MemberWealthProfile, WealthAsset, WealthLiability } from "@/lib/wealth/types";
import { getSupabaseAdmin } from "./client.server";
import { isSupabaseConfigured } from "./config.server";
import { resolveSupabaseUserId } from "./users.server";

function mapAssetRow(row: Record<string, unknown>, email: string): WealthAsset {
  const createdAt = (row.created_at as string) ?? new Date().toISOString();
  const value = Number(row.value ?? 0);
  const meta = (row.metadata as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    memberEmail: email,
    name: row.name as string,
    category: row.category as WealthAsset["category"],
    value,
    originalValue: Number(row.original_value ?? value),
    valueHistory: (meta.valueHistory as WealthAsset["valueHistory"]) ?? [{ value, at: createdAt }],
    dateAdded: (row.date_added as string) ?? createdAt.slice(0, 10),
    notes: (row.notes as string) ?? undefined,
    aiExtracted: meta.aiExtracted as boolean | undefined,
    sourceDocumentId: meta.sourceDocumentId as string | undefined,
    createdAt,
    updatedAt: createdAt,
  };
}

function mapLiabilityRow(row: Record<string, unknown>, email: string): WealthLiability {
  const createdAt = (row.created_at as string) ?? new Date().toISOString();
  const outstanding = Number(row.outstanding_amount ?? 0);
  const original = Number(row.original_amount ?? outstanding);
  const meta = (row.metadata as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    memberEmail: email,
    name: row.name as string,
    type: row.type as WealthLiability["type"],
    value: outstanding,
    originalValue: original,
    payments: (meta.payments as WealthLiability["payments"]) ?? [],
    status: (meta.status as WealthLiability["status"]) ?? (outstanding === 0 ? "closed" : "active"),
    dateAdded: (row.date_added as string) ?? createdAt.slice(0, 10),
    notes: (row.notes as string) ?? undefined,
    aiExtracted: meta.aiExtracted as boolean | undefined,
    sourceDocumentId: meta.sourceDocumentId as string | undefined,
    createdAt,
    updatedAt: createdAt,
  };
}

export async function loadWealthFromSupabase(
  email: string,
  profile: MemberWealthProfile,
): Promise<MemberWealthProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return null;

  const supabase = getSupabaseAdmin();
  const [assetsRes, liabilitiesRes] = await Promise.all([
    supabase.from("assets").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("liabilities").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  if (assetsRes.error && assetsRes.error.code !== "42P01") {
    console.error("[Supabase] load assets:", assetsRes.error.message);
    return null;
  }
  if (liabilitiesRes.error && liabilitiesRes.error.code !== "42P01") {
    console.error("[Supabase] load liabilities:", liabilitiesRes.error.message);
    return null;
  }

  profile.assets = (assetsRes.data ?? []).map((r) => mapAssetRow(r, email));
  profile.liabilities = (liabilitiesRes.data ?? []).map((r) => mapLiabilityRow(r, email));
  return profile;
}

export async function insertAssetToSupabase(email: string, asset: WealthAsset): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return;

  const supabase = getSupabaseAdmin();
  const isUuid = /^[0-9a-f-]{36}$/i.test(asset.id);
  const row = {
    ...(isUuid ? { id: asset.id } : {}),
    user_id: userId,
    name: asset.name,
    category: asset.category,
    value: asset.value,
    original_value: asset.originalValue ?? asset.value,
    date_added: asset.dateAdded,
    notes: asset.notes ?? null,
    metadata: {
      valueHistory: asset.valueHistory,
      aiExtracted: asset.aiExtracted,
      sourceDocumentId: asset.sourceDocumentId,
      legacyId: isUuid ? undefined : asset.id,
    },
  };

  const { error } = await supabase.from("assets").insert(row);
  if (error) console.error("[Supabase] insert asset:", error.message);
}

export async function insertLiabilityToSupabase(email: string, liability: WealthLiability): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return;

  const supabase = getSupabaseAdmin();
  const isUuid = /^[0-9a-f-]{36}$/i.test(liability.id);
  const row = {
    ...(isUuid ? { id: liability.id } : {}),
    user_id: userId,
    name: liability.name,
    type: liability.type,
    original_amount: liability.originalValue ?? liability.value,
    outstanding_amount: liability.value,
    date_added: liability.dateAdded,
    notes: liability.notes ?? null,
    metadata: {
      payments: liability.payments,
      status: liability.status,
      aiExtracted: liability.aiExtracted,
      sourceDocumentId: liability.sourceDocumentId,
      legacyId: isUuid ? undefined : liability.id,
    },
  };

  const { error } = await supabase.from("liabilities").insert(row);
  if (error) console.error("[Supabase] insert liability:", error.message);
}

export async function deleteAssetFromSupabase(email: string, assetId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return;
  const supabase = getSupabaseAdmin();
  await supabase.from("assets").delete().eq("user_id", userId).eq("id", assetId);
}

export async function deleteLiabilityFromSupabase(email: string, liabilityId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return;
  const supabase = getSupabaseAdmin();
  await supabase.from("liabilities").delete().eq("user_id", userId).eq("id", liabilityId);
}

export async function recordWealthSnapshot(
  email: string,
  netWorth: number,
  totalAssets: number,
  totalLiabilities: number,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return;
  const supabase = getSupabaseAdmin();
  await supabase.from("wealth_snapshots").insert({
    user_id: userId,
    net_worth: netWorth,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
  });
}

export async function syncProfileToSupabase(profile: MemberWealthProfile): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const email = profile.memberEmail;
  const userId = await resolveSupabaseUserId(email);
  if (!userId) return;

  const supabase = getSupabaseAdmin();
  await supabase.from("assets").delete().eq("user_id", userId);
  await supabase.from("liabilities").delete().eq("user_id", userId);

  for (const asset of profile.assets) {
    await insertAssetToSupabase(email, asset);
  }
  for (const liability of profile.liabilities) {
    await insertLiabilityToSupabase(email, liability);
  }

  const totalAssets = profile.assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = profile.liabilities.reduce((s, l) => s + l.value, 0);
  await recordWealthSnapshot(email, totalAssets - totalLiabilities, totalAssets, totalLiabilities);
}
