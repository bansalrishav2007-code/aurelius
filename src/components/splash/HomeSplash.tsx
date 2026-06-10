import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AureliusMark } from "@/components/brand/AureliusMark";

const STORAGE_KEY = "aurelius_home_splash_seen";
const DISPLAY_MS = 2000;
const FADE_MS = 700;

type Phase = "checking" | "splash" | "fading" | "done";

export function HomeSplash({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("checking");

  useEffect(() => {
    if (reducedMotion) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* private browsing */
      }
      setPhase("done");
      return;
    }

    try {
      if (localStorage.getItem(STORAGE_KEY)) {
        setPhase("done");
        return;
      }
    } catch {
      setPhase("done");
      return;
    }

    setPhase("splash");
    const fadeTimer = window.setTimeout(() => setPhase("fading"), DISPLAY_MS);
    return () => window.clearTimeout(fadeTimer);
  }, [reducedMotion]);

  const finishSplash = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private browsing */
    }
    setPhase("done");
  }, []);

  const showOverlay = phase === "checking" || phase === "splash" || phase === "fading";
  const hideContent = phase !== "done";

  return (
    <>
      <div
        className="transition-opacity duration-700 ease-out"
        style={{ opacity: hideContent ? 0 : 1 }}
        aria-hidden={hideContent}
      >
        {children}
      </div>

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="home-splash"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: phase === "fading" ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              if (phase === "fading") finishSplash();
            }}
          >
            <div className="relative flex items-center justify-center">
              <div className="home-splash-glow absolute h-32 w-32 rounded-full" aria-hidden />
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <AureliusMark size={80} tone="gold" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
