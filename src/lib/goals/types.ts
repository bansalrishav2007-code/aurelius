import type { GoalCategory } from "./categories";

export type GoalStatus = "active" | "completed";
export type GoalPriority = "high" | "medium" | "low";
export type GoalTrackStatus = "on_track" | "at_risk" | "achieved";

export type GoalAiAdvice = {
  realisticAssessment: string;
  recommendedMonthly: string;
  bestInstruments: string;
  risks: string;
  sharpAdvice: string;
  generatedAt: string;
};

export type GoalMilestone = {
  id: string;
  title: string;
  completed: boolean;
};

export type MemberGoal = {
  id: string;
  memberEmail: string;
  title: string;
  description?: string;
  category?: GoalCategory;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  priority: GoalPriority;
  status: GoalStatus;
  milestones?: GoalMilestone[];
  aiSuggestion?: string;
  aiAdvice?: GoalAiAdvice;
  createdAt: string;
  updatedAt: string;
};

export type EnrichedGoal = MemberGoal & {
  progressPercent: number;
  gapAmount: number;
  monthlySavingNeeded: number | null;
  monthsRemaining: number | null;
  trackStatus: GoalTrackStatus;
  isOverdue?: boolean;
};

export type GoalsStore = {
  goals: MemberGoal[];
};
