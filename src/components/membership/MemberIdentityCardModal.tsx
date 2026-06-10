import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";

export type IdentityCardData = {
  fullName: string;
  memberNumber: string;
  memberSince: string;
  planBadge: string;
  validThrough: string;
  status: string;
  welcomeMessage: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatTierLabel(planBadge: string): string {
  const upper = planBadge.toUpperCase().replace(/\s*—\s*/g, " · ").replace(/\s*-\s*/g, " · ");
  if (upper.includes("PRINCIPAL")) return "PRINCIPAL · TIER I";
  if (upper.includes("PATRIARCH") || upper.includes("FOUNDING")) return "PATRIARCH · PREMIUM";
  if (upper.includes("FAMILY OFFICE")) return "FAMILY OFFICE · CHARTER";
  return upper;
}

function formatMemberSinceShort(memberSince: string): string {
  const d = new Date(memberSince);
  if (Number.isNaN(d.getTime())) return memberSince;
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatValidShort(validThrough: string): string {
  if (/lifetime/i.test(validThrough)) return "VALID · LIFETIME";
  const d = new Date(validThrough);
  if (Number.isNaN(d.getTime())) return `VALID ${validThrough}`;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `VALID ${dd}.${mm}.${yy}`;
}

function parseMemberNumber(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || target <= 0) {
      setValue(target);
      return;
    }
    setValue(0);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.floor(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setValue(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);

  return value;
}

function GoldLogo({ size = 20 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-sm bg-gradient-to-br from-[#e8d5a3] via-[#c9a84c] to-[#8b6914] text-[#0a0a0f] font-bold leading-none"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden
    >
      A
    </div>
  );
}

function DecorativeQr() {
  const cells = [
    [1, 1, 1, 0, 1, 1, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 1],
    [0, 0, 0, 0, 0, 1, 0],
    [1, 1, 0, 1, 0, 1, 1],
    [0, 1, 1, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 0],
  ];
  return (
    <div className="member-card-qr" aria-hidden>
      {cells.flat().map((on, i) => (
        <span key={i} className={on ? "member-card-qr-on" : ""} />
      ))}
    </div>
  );
}

function MemberCardFace({
  card,
  displayNumber,
  flipped,
}: {
  card: IdentityCardData;
  displayNumber: string;
  flipped: boolean;
}) {
  const tier = formatTierLabel(card.planBadge);
  const since = formatMemberSinceShort(card.memberSince);
  const valid = formatValidShort(card.validThrough);
  const isActive = !/suspend|preview|guest/i.test(card.status);

  if (flipped) {
    return (
      <div className="member-card-surface member-card-back-inner">
        <div className="member-card-grain" aria-hidden />
        <div className="member-card-shimmer" aria-hidden />
        <div className="member-card-glare" aria-hidden />

        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          <div className="member-card-back-logo">A</div>
          <p className="member-card-back-tagline mt-4">
            Your place in the Aurelius
            <br />
            circle is reserved.
          </p>
          <DecorativeQr />
          <p className="member-card-back-footer mt-3">Encrypted · Invitation Only · Private</p>
        </div>
      </div>
    );
  }

  return (
    <div className="member-card-surface member-card-front-inner">
      <div className="member-card-grain" aria-hidden />
      <div className="member-card-shimmer" aria-hidden />
      <div className="member-card-glare" aria-hidden />

      <div className="relative z-10 h-full flex flex-col px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <GoldLogo size={18} />
            <p className="member-card-brand mt-1.5">AURELIUS PRIVATE</p>
          </div>
          <div className="text-right">
            <span className="member-card-plan-pill">{card.planBadge}</span>
            <p className="member-card-number mt-2">No. {displayNumber}</p>
          </div>
        </div>

        <div className="flex-1 flex mt-2 min-h-0">
          <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
            <h2 id="member-card-title" className="member-card-name truncate">
              {card.fullName}
            </h2>
            <p className="member-card-tier mt-1">{tier}</p>
            <div className="mt-4">
              <p className="member-card-label">MEMBER SINCE</p>
              <p className="member-card-since">{since}</p>
            </div>
            <p className="member-card-status mt-2">
              <span className={`member-card-status-dot ${isActive ? "is-active" : ""}`} aria-hidden />
              {isActive ? "ACTIVE" : card.status.toUpperCase()}
            </p>
          </div>

          <div className="flex flex-col items-end justify-between shrink-0 w-[88px]">
            <div className="member-card-holo" aria-hidden />
            <p className="member-card-valid">{valid}</p>
          </div>
        </div>

        <div className="mt-auto pt-2">
          <div className="member-card-divider" />
          <p className="member-card-footer-text">PRIVATE WEALTH INTELLIGENCE</p>
        </div>
      </div>
    </div>
  );
}

export function MemberIdentityCardModal({ open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<IdentityCardData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const numericMemberNo = card ? parseMemberNumber(card.memberNumber) : 0;
  const counted = useCountUp(numericMemberNo, open && !!card && !loading);
  const displayNumber =
    card?.memberNumber.startsWith("DEMO")
      ? card.memberNumber.replace("DEMO-", "")
      : String(counted).padStart(5, "0");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) {
      setFlipped(false);
      setTilt({ x: 0, y: 0 });
      return;
    }

    setLoading(true);
    fetch("/api/member/identity-card", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { card?: IdentityCardData; error?: string }) => {
        if (d.card) setCard(d.card);
      })
      .catch(() => setCard(null))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isMobile || !sceneRef.current) return;
      const rect = sceneRef.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({
        x: Math.max(-15, Math.min(15, -py * 30)),
        y: Math.max(-15, Math.min(15, px * 30)),
      });
    },
    [isMobile],
  );

  const handlePointerLeave = useCallback(() => {
    if (!isMobile) setTilt({ x: 0, y: 0 });
  }, [isMobile]);

  async function handleDownload() {
    if (!cardRef.current || !card) return;
    setDownloading(true);
    const wasFlipped = flipped;
    if (wasFlipped) setFlipped(false);
    await new Promise((r) => setTimeout(r, wasFlipped ? 400 : 0));

    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0a0f",
        scale: 2,
        useCORS: true,
      });
      const slug = card.fullName.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "Member";
      const link = document.createElement("a");
      link.download = `Aurelius_Member_${slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      /* optional */
    } finally {
      if (wasFlipped) setFlipped(true);
      setDownloading(false);
    }
  }

  if (!open) return null;

  const flipRotate = flipped ? 180 : 0;
  const transform = isMobile
    ? undefined
    : `rotateX(${tilt.x}deg) rotateY(${tilt.y + flipRotate}deg)`;

  return (
    <div
      className="member-card-overlay fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="member-card-modal relative w-full max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="member-card-title"
      >
        <div className="absolute -top-1 right-0 z-20 flex items-center gap-2">
          {card && !loading && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="member-card-icon-btn"
              aria-label="Download card as PNG"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </button>
          )}
          <button type="button" onClick={onClose} className="member-card-icon-btn" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="member-card-loading">
            <Loader2 className="h-8 w-8 text-[#c9a84c] animate-spin" />
          </div>
        ) : card ? (
          <div
            ref={sceneRef}
            className={`member-card-scene ${isMobile ? "is-mobile" : ""}`}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            <div
              ref={cardRef}
              className={`member-card-shell member-card-enter ${isMobile ? "is-mobile-spin" : ""}`}
              style={transform ? { transform } : undefined}
              onClick={() => setFlipped((f) => !f)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFlipped((f) => !f);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={flipped ? "Show front of membership card" : "Show back of membership card"}
            >
              <MemberCardFace card={card} displayNumber={displayNumber} flipped={false} />
              <MemberCardFace card={card} displayNumber={displayNumber} flipped />
            </div>
            <p className="member-card-hint">{isMobile ? "Auto-rotating · Tap to hold" : "Hover to tilt · Click to flip"}</p>
          </div>
        ) : (
          <div className="member-card-loading text-sm text-muted-foreground">
            Unable to load your membership card.
          </div>
        )}
      </div>

      <style>{`
        .member-card-overlay {
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(8px);
          animation: member-card-overlay-in 0.35s ease;
        }
        @keyframes member-card-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .member-card-icon-btn {
          height: 36px;
          width: 36px;
          border-radius: 9999px;
          border: 1px solid rgba(201, 168, 76, 0.35);
          background: #0a0a0f;
          color: rgba(201, 168, 76, 0.85);
          display: grid;
          place-items: center;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .member-card-icon-btn:hover:not(:disabled) {
          color: #c9a84c;
          border-color: rgba(201, 168, 76, 0.6);
          background: rgba(201, 168, 76, 0.08);
        }
        .member-card-icon-btn:disabled { opacity: 0.5; }

        .member-card-loading {
          width: min(380px, 90vw);
          aspect-ratio: 380 / 240;
          margin: 0 auto;
          border-radius: 16px;
          border: 1px solid rgba(201, 168, 76, 0.3);
          background: #0a0a0f;
          display: grid;
          place-items: center;
        }

        .member-card-scene {
          perspective: 1000px;
          width: min(380px, 90vw);
          margin: 2rem auto 0;
        }

        .member-card-shell {
          position: relative;
          width: 100%;
          aspect-ratio: 380 / 240;
          transform-style: preserve-3d;
          transition: transform 0.1s ease;
          cursor: pointer;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(135deg, #c9a84c 0%, #8b6914 50%, #c9a84c 100%);
          box-shadow:
            0 25px 60px rgba(0, 0, 0, 0.8),
            0 0 40px rgba(201, 168, 76, 0.15);
          animation: member-card-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes member-card-rise {
          from { opacity: 0; transform: translateY(28px) rotateX(8deg); }
          to { opacity: 1; transform: translateY(0) rotateX(0); }
        }

        .member-card-scene.is-mobile .member-card-shell.is-mobile-spin {
          animation: member-card-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                     member-card-spin 10s linear infinite;
        }
        @keyframes member-card-spin {
          0% { transform: rotateY(0deg); }
          45% { transform: rotateY(0deg); }
          55% { transform: rotateY(180deg); }
          95% { transform: rotateY(180deg); }
          100% { transform: rotateY(360deg); }
        }

        .member-card-surface {
          position: absolute;
          inset: 0;
          border-radius: 15px;
          overflow: hidden;
          backface-visibility: hidden;
          background: #0a0a0f;
        }
        .member-card-back-inner {
          transform: rotateY(180deg);
        }

        .member-card-grain {
          position: absolute;
          inset: 0;
          opacity: 0.35;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
          mix-blend-mode: soft-light;
        }

        .member-card-shimmer {
          position: absolute;
          inset: -40% -60%;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 38%,
            rgba(201, 168, 76, 0.07) 44%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(201, 168, 76, 0.09) 56%,
            transparent 62%
          );
          animation: member-card-shimmer-sweep 3s ease-in-out infinite;
        }
        @keyframes member-card-shimmer-sweep {
          0%, 100% { transform: translateX(-30%) skewX(-12deg); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(30%) skewX(-12deg); opacity: 1; }
          85% { opacity: 0; }
        }

        .member-card-glare {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            ellipse 80% 60% at 20% 10%,
            rgba(255, 255, 255, 0.07) 0%,
            transparent 55%
          );
          transition: opacity 0.15s ease;
        }

        .member-card-brand {
          font-family: Inter, system-ui, sans-serif;
          font-size: 8px;
          letter-spacing: 3px;
          color: #c9a84c;
          font-weight: 500;
        }
        .member-card-plan-pill {
          display: inline-block;
          font-family: Inter, system-ui, sans-serif;
          font-size: 7px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 3px 7px;
          border-radius: 9999px;
          border: 1px solid rgba(201, 168, 76, 0.45);
          color: #c9a84c;
          background: rgba(201, 168, 76, 0.08);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .member-card-number {
          font-family: "Courier New", Courier, monospace;
          font-size: 11px;
          color: #c9a84c;
          letter-spacing: 0.5px;
        }
        .member-card-name {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 22px;
          line-height: 1.15;
          color: #fff;
          font-weight: 500;
        }
        .member-card-tier {
          font-family: Inter, system-ui, sans-serif;
          font-size: 9px;
          letter-spacing: 2px;
          color: #c9a84c;
          font-weight: 500;
        }
        .member-card-label {
          font-family: Inter, system-ui, sans-serif;
          font-size: 7px;
          letter-spacing: 1.5px;
          color: rgba(156, 163, 175, 0.9);
        }
        .member-card-since {
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          color: #fff;
          margin-top: 2px;
        }
        .member-card-status {
          font-family: Inter, system-ui, sans-serif;
          font-size: 8px;
          letter-spacing: 1.5px;
          color: #34d399;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .member-card-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #6b7280;
        }
        .member-card-status-dot.is-active {
          background: #34d399;
          box-shadow: 0 0 8px rgba(52, 211, 153, 0.65);
          animation: member-card-pulse 2.5s ease-in-out infinite;
        }
        @keyframes member-card-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.75; }
        }
        .member-card-holo {
          width: 52px;
          height: 52px;
          border-radius: 9999px;
          background: conic-gradient(
            from 0deg,
            #c9a84c,
            #e8c96d,
            #6ee7b7,
            #93c5fd,
            #c4b5fd,
            #f9a8d4,
            #c9a84c
          );
          opacity: 0.55;
          filter: blur(0.2px);
          animation: member-card-holo-spin 6s linear infinite;
          box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.15);
        }
        @keyframes member-card-holo-spin {
          to { transform: rotate(360deg); }
        }
        .member-card-valid {
          font-family: "Courier New", Courier, monospace;
          font-size: 9px;
          letter-spacing: 0.5px;
          color: #c9a84c;
          text-align: right;
        }
        .member-card-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.5), transparent);
          margin-bottom: 6px;
        }
        .member-card-footer-text {
          font-family: Inter, system-ui, sans-serif;
          font-size: 7px;
          letter-spacing: 4px;
          color: rgba(156, 163, 175, 0.85);
          text-align: center;
        }

        .member-card-back-logo {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          background: linear-gradient(135deg, #e8d5a3, #c9a84c, #8b6914);
          color: #0a0a0f;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 36px;
          font-weight: 600;
          display: grid;
          place-items: center;
          box-shadow: 0 0 30px rgba(201, 168, 76, 0.25);
        }
        .member-card-back-tagline {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 13px;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.88);
        }
        .member-card-back-footer {
          font-family: Inter, system-ui, sans-serif;
          font-size: 8px;
          letter-spacing: 1.5px;
          color: rgba(156, 163, 175, 0.9);
        }
        .member-card-qr {
          display: grid;
          grid-template-columns: repeat(7, 5px);
          gap: 2px;
          margin-top: 14px;
        }
        .member-card-qr span {
          width: 5px;
          height: 5px;
          border-radius: 1px;
          background: rgba(201, 168, 76, 0.12);
        }
        .member-card-qr .member-card-qr-on {
          background: rgba(201, 168, 76, 0.75);
        }

        .member-card-hint {
          margin-top: 14px;
          text-align: center;
          font-family: Inter, system-ui, sans-serif;
          font-size: 10px;
          color: rgba(156, 163, 175, 0.7);
          letter-spacing: 0.3px;
        }
      `}</style>
    </div>
  );
}
