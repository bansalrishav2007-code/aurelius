import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Subtle vertical shift while scrolling through section */
  depth?: "shallow" | "medium" | "deep";
};

const depthMap = {
  shallow: [12, -8],
  medium: [24, -16],
  deep: [40, -28],
} as const;

export function ParallaxSection({ children, className, id, depth = "shallow" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const [from, to] = depthMap[depth];
  const y = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [from, to]);

  return (
    <motion.section ref={ref} id={id} style={{ y }} className={cn("parallax-section", className)}>
      {children}
    </motion.section>
  );
}
