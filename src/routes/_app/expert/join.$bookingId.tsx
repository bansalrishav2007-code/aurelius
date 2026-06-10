import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthSession } from "@/lib/auth/session.functions";
import { useState } from "react";
import { KeyRound, Video } from "lucide-react";
import { verifyExpertMeetingJoin } from "@/lib/experts/client";

export const Route = createFileRoute("/_app/expert/join/$bookingId")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (!session || session.role !== "EXPERT") {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Join Meeting — Expert Portal" }] }),
  component: ExpertJoinMeetingPage,
});

function ExpertJoinMeetingPage() {
  const { bookingId } = Route.useParams();
  const [code, setCode] = useState("");
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleJoin() {
    setBusy(true);
    setError("");
    try {
      const res = await verifyExpertMeetingJoin(bookingId, code);
      if (!res.canJoin) {
        setError(`Meeting opens at ${new Date(res.joinOpensAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
        return;
      }
      setMeetingUrl(res.meetingUrl ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-5 lg:p-10 max-w-[900px] mx-auto">
      <h1 className="font-display text-2xl mb-2 flex items-center gap-2"><Video className="h-5 w-5" /> Join consultation</h1>
      <p className="text-sm text-muted-foreground mb-6">Enter your expert join code to open the meeting room.</p>

      {!meetingUrl ? (
        <div className="glass rounded-2xl p-6 max-w-md space-y-4">
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <KeyRound className="h-3 w-3" /> Expert code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="w-full field-input font-mono tracking-widest"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="button"
            disabled={!code.trim() || busy}
            onClick={() => void handleJoin()}
            className="w-full h-10 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium disabled:opacity-40"
          >
            Verify & Join
          </button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-border/40 aspect-video bg-black">
          <iframe
            src={meetingUrl}
            allow="camera; microphone; fullscreen; display-capture"
            className="w-full h-full min-h-[480px]"
            title="Expert consultation"
          />
        </div>
      )}
    </div>
  );
}
