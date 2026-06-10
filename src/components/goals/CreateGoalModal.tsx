import { useState } from "react";
import { X } from "lucide-react";
import { GOAL_CATEGORIES, type GoalCategory } from "@/lib/goals/categories";
import type { GoalPriority } from "@/lib/goals/types";
import { handleInrInputChange, parseInrInput } from "@/lib/format-inr-input";

export type CreateGoalInput = {
  title: string;
  description?: string;
  category: GoalCategory;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  priority: GoalPriority;
};

type Props = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (input: CreateGoalInput) => void;
};

export function CreateGoalModal({ open, saving, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GoalCategory>("Other");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<GoalPriority>("medium");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      targetAmount: targetAmount ? parseInrInput(targetAmount) : undefined,
      currentAmount: currentAmount ? parseInrInput(currentAmount) : undefined,
      targetDate: targetDate || undefined,
      priority,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-[#c9a84c]/20 bg-[#0a0e1a] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="create-goal-title"
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <h2 id="create-goal-title" className="font-display text-xl text-foreground">
            New Goal
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Goal name</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Buy second home in Goa"
              required
              className="field-input bg-[#1a2035]/50"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does success look like?"
              rows={2}
              className="field-input bg-[#1a2035]/50 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as GoalCategory)}
              className="field-input bg-[#1a2035]/50"
            >
              {GOAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">What is your target amount?</label>
              <input
                value={targetAmount}
                onChange={(e) => handleInrInputChange(e.target.value, setTargetAmount)}
                placeholder="₹80,00,000"
                className="field-input bg-[#1a2035]/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Current saved (₹)</label>
              <input
                value={currentAmount}
                onChange={(e) => handleInrInputChange(e.target.value, setCurrentAmount)}
                placeholder="₹24,00,000"
                className="field-input bg-[#1a2035]/50"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Target date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="field-input bg-[#1a2035]/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as GoalPriority)}
                className="field-input bg-[#1a2035]/50"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="w-full h-11 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium mt-6 hover:bg-[#c9a84c]/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create goal"}
        </button>
      </form>
    </div>
  );
}
