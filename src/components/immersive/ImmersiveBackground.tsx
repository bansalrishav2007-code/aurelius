import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { RefObject } from "react";
import immersiveBg from "@/assets/immersive-bg.png";
import immersiveBgHd from "@/assets/immersive-bg-hd.jpg";

export type ImmersiveVariant = "app" | "landing" | "auth";

type Props = {
  scrollRef?: RefObject<HTMLElement | null>;
  variant?: ImmersiveVariant;
};

export function ImmersiveBackground({ scrollRef, variant = "app" }: Props) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll(
    scrollRef
      ? { container: scrollRef, layoutEffect: false }
      : { layoutEffect: false },
  );

  const sceneY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, 96]);
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : 1.1]);
  const ambientOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reduceMotion ? [0.5, 0.5, 0.5] : [0.55, 0.75, 0.6],
  );
  const veilOpacity = useTransform(
    scrollYProgress,
    [0, 0.4, 1],
    variant === "app"
      ? [0.22, 0.32, 0.45]
      : variant === "landing"
        ? [0.04, 0.07, 0.12]
        : [0.1, 0.16, 0.24],
  );

  return (
    <div className="immersive-bg" data-variant={variant} aria-hidden>
      <div className="immersive-bg__base" />

      <motion.div
        className="immersive-bg__scene"
        style={{ y: sceneY, scale: sceneScale }}
        data-variant={variant}
      >
        <picture>
          <source
            media="(min-width: 768px)"
            srcSet={variant === "landing" ? immersiveBgHd : immersiveBg}
          />
          <img
            src={variant === "landing" ? immersiveBgHd : immersiveBg}
            alt=""
            className="immersive-bg__scene-img"
            decoding="async"
            fetchPriority={variant === "landing" ? "high" : "low"}
          />
        </picture>
        <div className="immersive-bg__scene-mask" />
      </motion.div>

      <motion.div
        className="immersive-bg__ambient"
        style={{ opacity: ambientOpacity }}
        data-variant={variant}
      />
      <div className="immersive-bg__vignette" />
      <motion.div className="immersive-bg__veil" style={{ opacity: veilOpacity }} />
      <div className="immersive-bg__noise" />
    </div>
  );
}
