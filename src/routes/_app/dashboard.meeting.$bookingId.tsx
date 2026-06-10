import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Video } from "lucide-react";
import { fetchBookingMeeting } from "@/lib/experts/client";

export const Route = createFileRoute("/_app/dashboard/meeting/$bookingId")({
  head: () => ({ meta: [{ title: "Video Consultation — Aurelius" }] }),
  component: MeetingPage,
});

function MeetingPage() {
  const { bookingId } = Route.useParams();
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [expertName, setExpertName] = useState("");
  const [canJoin, setCanJoin] = useState(false);
  const [joinOpensAt, setJoinOpensAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBookingMeeting(bookingId)
      .then((d) => {
        setExpertName(d.booking.expertName);
        setCanJoin(d.canJoin);
        setJoinOpensAt(d.joinOpensAt);
        setMeetingUrl(d.meetingUrl ?? d.booking.meetingUrl ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load meeting"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const minsUntil = Math.max(0, Math.floor((new Date(joinOpensAt).getTime() - Date.now()) / 60_000));

  if (loading) {
    return <p className="p-10 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading meeting…</p>;
  }

  return (
    <div className="p-5 lg:p-10 max-w-[1200px] mx-auto">
      <Link to="/dashboard/bookings" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to bookings
      </Link>

      <h1 className="font-display text-2xl mb-2">Session with {expertName}</h1>

      {!canJoin ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Video className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Meeting starts in {minsUntil} minutes</p>
          <p className="text-xs text-muted-foreground mt-2">Join opens 10 minutes before your scheduled time.</p>
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : meetingUrl ? (
        <div className="rounded-2xl overflow-hidden border border-border/40 aspect-video bg-black">
          <iframe
            src={meetingUrl}
            allow="camera; microphone; fullscreen; display-capture"
            className="w-full h-full min-h-[480px]"
            title="Aurelius consultation"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Meeting room is being prepared. Refresh shortly.</p>
      )}
    </div>
  );
}
