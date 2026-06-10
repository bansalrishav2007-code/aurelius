import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { GoalCategory } from "./categories";
import { suggestMilestones } from "./milestones";
import type { GoalsStore, MemberGoal, GoalStatus, GoalPriority, GoalAiAdvice } from "./types";
import { resolveDataFile } from "@/lib/data-path.server";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-goals.json");
  return dataPathPromise;
}

let memoryStore: GoalsStore | null = null;

async function readStore(): Promise<GoalsStore> {
  if (memoryStore) return structuredClone(memoryStore);
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(DATA_PATH, "utf-8")) as GoalsStore;
    memoryStore = parsed;
    return structuredClone(parsed);
  } catch {
    const fresh = { goals: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: GoalsStore): Promise<void> {
  memoryStore = structuredClone(store);
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function listMemberGoals(memberEmail: string): Promise<MemberGoal[]> {
  const store = await readStore();
  return store.goals
    .filter((g) => g.memberEmail === memberEmail.toLowerCase())
    .map(normalizeGoal);
}

function normalizeGoal(g: MemberGoal): MemberGoal {
  return {
    ...g,
    priority: g.priority ?? "medium",
    currentAmount: g.currentAmount ?? 0,
  };
}

export async function createMemberGoal(
  memberEmail: string,
  body: {
    title: string;
    description?: string;
    category?: GoalCategory;
    targetDate?: string;
    targetAmount?: number;
    currentAmount?: number;
    priority?: GoalPriority;
    aiSuggestion?: string;
  },
): Promise<MemberGoal> {
  const store = await readStore();
  const goal: MemberGoal = {
    id: `goal-${crypto.randomUUID()}`,
    memberEmail: memberEmail.toLowerCase(),
    title: body.title.trim(),
    description: body.description?.trim(),
    category: body.category,
    targetAmount: body.targetAmount,
    currentAmount: body.currentAmount ?? 0,
    targetDate: body.targetDate,
    priority: body.priority ?? "medium",
    milestones: suggestMilestones(body.title, body.category),
    aiSuggestion: body.aiSuggestion,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.goals.unshift(goal);
  await writeStore(store);

  try {
    const { insertGoal } = await import("@/lib/supabase/data.server");
    await insertGoal(memberEmail, {
      title: goal.title,
      category: goal.category,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      priority: goal.priority,
      status: goal.status,
      metadata: { description: goal.description, milestones: goal.milestones },
    });
  } catch {
    /* Supabase optional */
  }

  return goal;
}

export async function updateMemberGoal(
  memberEmail: string,
  goalId: string,
  updates: {
    title?: string;
    description?: string;
    category?: GoalCategory;
    targetDate?: string;
    targetAmount?: number;
    currentAmount?: number;
    priority?: GoalPriority;
    status?: GoalStatus;
    aiSuggestion?: string;
    aiAdvice?: GoalAiAdvice;
  },
): Promise<MemberGoal | null> {
  const store = await readStore();
  const goal = store.goals.find((g) => g.id === goalId && g.memberEmail === memberEmail.toLowerCase());
  if (!goal) return null;
  if (updates.title) goal.title = updates.title.trim();
  if (updates.description !== undefined) goal.description = updates.description.trim();
  if (updates.category !== undefined) goal.category = updates.category;
  if (updates.targetDate !== undefined) goal.targetDate = updates.targetDate;
  if (updates.targetAmount !== undefined) goal.targetAmount = updates.targetAmount;
  if (updates.currentAmount !== undefined) goal.currentAmount = updates.currentAmount;
  if (updates.priority) goal.priority = updates.priority;
  if (updates.status) goal.status = updates.status;
  if (updates.aiSuggestion !== undefined) goal.aiSuggestion = updates.aiSuggestion;
  if (updates.aiAdvice !== undefined) goal.aiAdvice = updates.aiAdvice;
  goal.updatedAt = new Date().toISOString();
  await writeStore(store);
  return { ...goal };
}

export async function deleteMemberGoal(memberEmail: string, goalId: string): Promise<boolean> {
  const store = await readStore();
  const idx = store.goals.findIndex((g) => g.id === goalId && g.memberEmail === memberEmail.toLowerCase());
  if (idx === -1) return false;
  store.goals.splice(idx, 1);
  await writeStore(store);
  return true;
}
