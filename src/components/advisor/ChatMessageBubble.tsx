import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Briefcase,
  Check,
  Copy,
  FolderLock,
  Lock,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { TypingIndicator } from "./TypingIndicator";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

function extractActionItem(content: string): string {
  const actionMatch = content.match(/Action:\s*(.+)/i);
  if (actionMatch) return actionMatch[1]!.trim();
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullet = [...lines].reverse().find((l) => /^[-•*]\s/.test(l) || /^\d+\./.test(l));
  if (bullet) return bullet.replace(/^[-•*\d.]+\s*/, "");
  const sentences = content.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences[sentences.length - 1] ?? "Review this guidance with your Aurelius expert.";
}

function formatTime(iso?: string) {
  if (!iso) return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessageBubble({
  msg,
  streaming,
  isDemo,
  onRegenerate,
}: {
  msg: ChatMsg;
  streaming?: boolean;
  isDemo?: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const time = formatTime(msg.createdAt);

  if (msg.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-end gap-1">
        <div className="bg-[#1a2d4a] border border-primary/30 rounded-2xl rounded-tr-md px-5 py-3 max-w-[85%] text-sm leading-relaxed text-foreground">
          {msg.content}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">{time}</span>
      </motion.div>
    );
  }

  const isEmpty = streaming && !msg.content;
  const isUnavailable = msg.content.includes("AI Advisor is temporarily unavailable");
  const isError = msg.content.startsWith("_") || isUnavailable;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-gold/70 grid place-items-center shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-background" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Aurelius</span>
          <Lock className="h-3 w-3 text-muted-foreground" title="Private & encrypted" />
          <span className="text-[10px] text-muted-foreground">{time}</span>
        </div>
        {isEmpty ? (
          <TypingIndicator />
        ) : (
          <>
            <div
              className={`rounded-2xl rounded-tl-md px-5 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                isUnavailable
                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-200/90"
                  : "bg-card/80 border-l-2 border-gold text-foreground/90"
              }`}
            >
              {isUnavailable ? msg.content.replace(/^_|_$/g, "") : msg.content}
              {streaming && <span className="inline-block w-1.5 h-3.5 bg-gold/80 align-middle ml-0.5 animate-pulse" />}
            </div>
            {!streaming && msg.content && !isError && (
              <>
                <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-xs max-w-lg">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Your action item</p>
                  <p>{extractActionItem(msg.content)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isDemo}
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/member/chat/save-response", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ title: "Advisor note", content: msg.content }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);
                        toast.success(`Saved to vault as ${data.name}`);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Save failed");
                      }
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <FolderLock className="h-3 w-3" /> Save to vault
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(msg.content);
                        setCopied(true);
                        toast.success("Copied.");
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        toast.error("Unable to copy.");
                      }
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <Link
                    to="/dashboard/experts"
                    search={{ context: msg.content.slice(0, 500) }}
                    className="text-[10px] text-gold hover:underline inline-flex items-center gap-1"
                  >
                    <Briefcase className="h-3 w-3" /> Discuss with expert
                  </Link>
                  {onRegenerate && (
                    <button
                      type="button"
                      onClick={onRegenerate}
                      className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" /> Regenerate
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
