import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, Clock, Star, Video, X } from "lucide-react";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import { SERVICE_TYPE_LABELS } from "@/lib/experts/service-types";
import type { ExpertBooking } from "@/lib/experts/types";

type EnrichedBooking = ExpertBooking & { expertName: string; expertPhotoUrl?: string };

type Props = {
  booking: EnrichedBooking;
  onCancel?: (id: string) => void;
  onAcceptSuggested?: (id: string) => void;
  onRate?: (id: string, rating: number, review: string) => void;
  busy?: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function minutesUntil(iso: string) {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 60_000));
}

function statusBadge(status: ExpertBooking["status"]) {
  const map: Record<string, { label: string; className: string }> = {
    pending_expert: { label: "⏳ AWAITING CONFIRMATION", className: "text-amber-400" },
    confirmed: { label: "✅ CONFIRMED", className: "text-emerald-400" },
    rejected: { label: "❌ DECLINED", className: "text-destructive" },
    completed: { label: "✓ COMPLETED", className: "text-muted-foreground" },
    cancelled: { label: "CANCELLED", className: "text-muted-foreground" },
    pending_payment: { label: "⏳ PENDING", className: "text-amber-400" },
  };
  const s = map[status] ?? { label: status, className: "" };
  return <span className={`text-[10px] uppercase tracking-wider font-medium ${s.className}`}>{s.label}</span>;
}

export function BookingTimelineCard({ booking, onCancel, onAcceptSuggested, onRate, busy }: Props) {
  const service = SERVICE_TYPE_LABELS[booking.serviceType] ?? "Consultation";
  const startMs = new Date(booking.scheduledAt).getTime();
  const canJoin = booking.status === "confirmed" && Date.now() >= startMs - 10 * 60_000;
  const mins = minutesUntil(booking.scheduledAt);
  const isPast = new Date(booking.scheduledAt).getTime() < Date.now() && booking.status === "completed";

  return (
    <article className="glass rounded-2xl p-5 border border-border/40">
      <div className="flex items-start gap-4">
        <ExpertAvatar name={booking.expertName} photoUrl={booking.expertPhotoUrl} />
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg">{booking.expertName}</p>
          <p className="text-sm text-muted-foreground">{service} Session</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatWhen(booking.scheduledAt)}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{booking.durationMinutes} minutes</span>
          </div>
          <div className="mt-2">{statusBadge(booking.status)}</div>
          {booking.agenda && (
            <p className="text-xs text-muted-foreground mt-3 p-3 rounded-lg bg-muted/20 line-clamp-2">{booking.agenda}</p>
          )}
          {booking.status === "rejected" && booking.declineReason && (
            <p className="text-xs text-destructive mt-2">Reason: {booking.declineReason}</p>
          )}
          {booking.suggestedTime && booking.status === "rejected" && (
            <p className="text-xs text-gold mt-1">Suggested: {formatWhen(booking.suggestedTime)}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/30">
        {booking.status === "confirmed" && (
          <>
            {canJoin && booking.meetingUrl ? (
              <Link
                to="/dashboard/meeting/$bookingId"
                params={{ bookingId: booking.id }}
                className="h-8 px-3 rounded-lg bg-[#c9a84c] text-[#0a0e1a] text-xs inline-flex items-center gap-1 font-medium"
              >
                <Video className="h-3 w-3" /> Join Meeting
              </Link>
            ) : (
              <span className="h-8 px-3 rounded-lg hairline text-xs inline-flex items-center gap-1 text-muted-foreground">
                <Video className="h-3 w-3" /> Meeting starts in {mins} min
              </span>
            )}
            {onCancel && (
              <button type="button" disabled={busy === booking.id} onClick={() => onCancel(booking.id)} className="h-8 px-3 rounded-lg hairline text-xs">
                Cancel
              </button>
            )}
          </>
        )}
        {["pending_expert", "pending_payment"].includes(booking.status) && onCancel && (
          <button type="button" disabled={busy === booking.id} onClick={() => onCancel(booking.id)} className="h-8 px-3 rounded-lg hairline text-xs inline-flex items-center gap-1">
            <X className="h-3 w-3" /> Cancel Request
          </button>
        )}
        {booking.status === "rejected" && booking.suggestedTime && onAcceptSuggested && (
          <>
            <button type="button" disabled={busy === booking.id} onClick={() => onAcceptSuggested(booking.id)} className="h-8 px-3 rounded-lg bg-foreground text-background text-xs">
              Accept New Time
            </button>
            <button type="button" disabled={busy === booking.id} onClick={() => onCancel?.(booking.id)} className="h-8 px-3 rounded-lg hairline text-xs">
              Decline
            </button>
          </>
        )}
        {isPast && !booking.memberRating && onRate && (
          <RatingInline bookingId={booking.id} onRate={onRate} busy={busy} />
        )}
        {booking.memberRating && (
          <span className="text-xs text-gold inline-flex items-center gap-0.5">
            {Array.from({ length: booking.memberRating }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-gold" />
            ))}
          </span>
        )}
      </div>
    </article>
  );
}

function RatingInline({
  bookingId,
  onRate,
  busy,
}: {
  bookingId: string;
  onRate: (id: string, rating: number, review: string) => void;
  busy?: string;
}) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-8 px-3 rounded-lg hairline text-xs">
        Rate session
      </button>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)}>
            <Star className={`h-4 w-4 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <input
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Optional review"
        className="w-full h-8 px-3 rounded-lg hairline text-xs"
      />
      <button
        type="button"
        disabled={!rating || busy === bookingId}
        onClick={() => { onRate(bookingId, rating, review); setOpen(false); }}
        className="h-8 px-3 rounded-lg bg-foreground text-background text-xs"
      >
        Submit
      </button>
    </div>
  );
}
