import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ImmersiveBackground, type ImmersiveVariant } from "./ImmersiveBackground";

type Props = {
  children: ReactNode;
  variant?: ImmersiveVariant;
  className?: string;
};

/** Full-viewport scene: fixed cinematic background + document scroll (landing, login). */
export function ImmersiveScene({ children, variant = "landing", className }: Props) {
  return (
    <div className={cn("immersive-scene immersive-scene--document", className)}>
      <ImmersiveBackground variant={variant} />
      <div className="immersive-scene__content relative z-10">{children}</div>
    </div>
  );
}
