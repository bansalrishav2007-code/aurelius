import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { RefObject } from "react";
import immersiveBg from "@/assets/immersive-bg.png";

export type ImmersiveVariant = "app" | "landing" | "auth";

type Props = {
  scrollRef?: RefObject<HTMLElement | null>;
  variant?: ImmersiveVariant;
};

export function ImmersiveBackground({ scrollRef, variant = "app" }: Props) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    layoutEffect: false,
  });

  const sceneY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, 72]);
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : 1.08]);
  const veilOpacity = useTransform(
    scrollYProgress,
    [0, 0.4, 1],
    variant === "app"
      ? [0.22, 0.32, 0.45]
      : variant === "landing"
        ? [0.08, 0.14, 0.22]
        : [0.14, 0.22, 0.32],
  );

  return (
    <div className="immersive-bg" data-variant={variant} aria-hidden>
      <div className="immersive-bg__base" />

      <motion.div
        className="immersive-bg__scene"
        style={{ y: sceneY, scale: sceneScale }}
        data-variant={variant}
      >
        <img src={immersiveBg} alt="" className="immersive-bg__scene-img" />
        <div className="immersive-bg__scene-mask" />
      </motion.div>

      <div className="immersive-bg__vignette" />
      <motion.div className="immersive-bg__veil" style={{ opacity: veilOpacity }} />
      <div className="immersive-bg__noise" />
    </div>
  );
}
