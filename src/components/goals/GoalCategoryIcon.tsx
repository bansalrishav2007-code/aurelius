import {
  Briefcase,
  Building2,
  GraduationCap,
  Landmark,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { GoalCategory } from "@/lib/goals/categories";

type Props = { category?: GoalCategory; className?: string };

export function GoalCategoryIcon({ category, className = "h-5 w-5" }: Props) {
  switch (category) {
    case "Tax":
    case "Tax Planning":
      return <Scale className={`${className} text-amber-400`} />;
    case "Legal":
    case "Legal Structure":
      return <Landmark className={`${className} text-sky-400`} />;
    case "Investment":
      return <TrendingUp className={`${className} text-emerald-400`} />;
    case "Property":
      return <Building2 className={`${className} text-violet-400`} />;
    case "Retirement":
      return <Landmark className={`${className} text-[#c9a84c]`} />;
    case "Education":
      return <GraduationCap className={`${className} text-violet-400`} />;
    case "Business":
      return <Briefcase className={`${className} text-emerald-400`} />;
    default:
      return <Target className={`${className} text-muted-foreground`} />;
  }
}
