import { createFileRoute, redirect } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { AI_ADVISOR_SUGGESTED_QUESTIONS } from "@/lib/ai/prompts";
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Menu,
  Mic,
  Paperclip,
  PanelRight,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ChatContextPanel, ChatContextPanelOverlay } from "@/components/advisor/ChatContextPanel";
import { ChatMessageBubble, type ChatMsg } from "@/components/advisor/ChatMessageBubble";
import { ChatSidebar } from "@/components/advisor/ChatSidebar";
import { PortfolioHealthModal } from "@/components/wealth/PortfolioHealthModal";
import { Section80CDrawer } from "@/components/wealth/Section80CDrawer";
import { DemoModeBadge } from "@/components/demo/DemoModeBadge";
import { Route as AppRoute } from "@/routes/_app";
import type { Conversation } from "@/lib/chat/conversations.server";
import {
  createConversation,
  deleteConversation,
  exportChatConversation,
  fetchChatContext,
  fetchConversation,
  fetchConversations,
  fetchAdvisorTriggers,
  generateConversationTitle,
  saveConversationMessages,
} from "@/lib/platform/client";

const AI_UNAVAILABLE_MSG = "AI Advisor is temporarily unavailable. Please try again shortly.";

export const Route = createFileRoute("/_app/chat")({
  head: () => ({ meta: [{ title: "AI Advisor — Aurelius" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/ai-advisor" });
  },
});

type Attachment = { id: string; name: string; documentId: string };

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function needsLiveData(text: string) {
  return /\b(nifty|sensex|market|sgb|sovereign gold|itr|advance tax)\b/i.test(text);
}

export function ChatPage({ preloadMessage }: { preloadMessage?: string }) {
  const { session } = AppRoute.useRouteContext();
  const clientName = session.firstName ?? session.fullName.split(/\s+/)[0] ?? "Principal";
  const isDemo = session.isDemo === true;

  const [history, setHistory] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [demoQuotaRemaining, setDemoQuotaRemaining] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [contextData, setContextData] = useState<Awaited<ReturnType<typeof fetchChatContext>> | null>(null);
  const [triggers, setTriggers] = useState<Awaited<ReturnType<typeof fetchAdvisorTriggers>>["triggers"]>([]);
  const [listening, setListening] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [section80cOpen, setSection80cOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);

  const demoLimitReached = isDemo && demoQuotaRemaining !== null && demoQuotaRemaining <= 0;
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const preloadedRef = useRef(false);

  const loadHistory = useCallback(async () => {
    try {
      const { conversations } = await fetchConversations();
      setHistory(conversations);
    } catch {
      /* empty */
    }
  }, []);

  useEffect(() => {
    loadHistory();
    fetch("/api/chat/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { configured?: boolean; demo?: { quotaRemaining?: number } }) => {
        setAiReady(Boolean(d.configured));
        if (d.demo) setDemoQuotaRemaining(d.demo.quotaRemaining ?? 0);
      })
      .catch(() => setAiReady(false));

    fetchChatContext().then(setContextData).catch(() => undefined);
    fetchAdvisorTriggers()
      .then((d) => setTriggers(d.triggers))
      .catch(() => undefined);
  }, [loadHistory]);

  useEffect(() => {
    if (preloadMessage && !preloadedRef.current && aiReady !== false) {
      preloadedRef.current = true;
      send(preloadMessage);
    }
  }, [preloadMessage, aiReady]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, fetchingLive]);

  async function startNewConversation() {
    abortRef.current?.abort();
    const { conversation } = await createConversation();
    setConversationId(conversation.id);
    setMessages([]);
    setAttachments([]);
    setShowHistory(false);
    await loadHistory();
  }

  async function openConversation(id: string) {
    abortRef.current?.abort();
    const { conversation } = await fetchConversation(id);
    setConversationId(conversation.id);
    setMessages(
      conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    );
    setShowHistory(false);
  }

  async function handleDeleteConversation(id: string) {
    if (!confirm("Delete this conversation permanently?")) return;
    try {
      await deleteConversation(id);
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
      }
      await loadHistory();
      toast.success("Conversation deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  async function streamChat(
    nextMessages: ChatMsg[],
    activeConvId: string,
    opts?: { regenerate?: boolean },
  ) {
    const controller = new AbortController();
    abortRef.current = controller;
    const assistantId = crypto.randomUUID();
    const now = new Date().toISOString();

    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "", createdAt: now }]);
    setStreaming(true);

    const lastUser = [...nextMessages].reverse().find((m) => m.role === "user");
    if (lastUser && needsLiveData(lastUser.content)) setFetchingLive(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          documentIds: attachments.map((a) => a.documentId),
          clientName,
          conversationId: activeConvId,
          regenerate: opts?.regenerate,
        }),
      });

      setFetchingLive(false);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        const code = (err as { code?: string }).code;
        if (code === "DEMO_AI_LIMIT") setDemoQuotaRemaining(0);
        const apiError = (err as { error?: string; detail?: string }).error;
        const detail = (err as { detail?: string }).detail;
        if (detail) console.error("[AI Advisor] API error detail:", detail);
        throw new Error(apiError || AI_UNAVAILABLE_MSG);
      }

      if (isDemo && demoQuotaRemaining !== null) {
        setDemoQuotaRemaining(Math.max(0, demoQuotaRemaining - 1));
      }
      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data:")) continue;
          const payload = trimmedLine.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              acc += delta;
              setMessages((m) =>
                m.map((msg) => (msg.id === assistantId ? { ...msg, content: acc } : msg)),
              );
            }
          } catch {
            /* ignore */
          }
        }
      }

      if (!acc) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId ? { ...msg, content: "_No response received. Please try again._" } : msg,
          ),
        );
      } else if (activeConvId) {
        const userMsg = [...nextMessages].reverse().find((m) => m.role === "user");
        const isFirstExchange = nextMessages.filter((m) => m.role === "user").length === 1;
        if (userMsg) {
          await saveConversationMessages(
            activeConvId,
            [
              { role: "user", content: userMsg.content },
              { role: "assistant", content: acc },
            ],
            attachments.map((a) => a.documentId),
          );
          await loadHistory();
          if (isFirstExchange && !opts?.regenerate) {
            generateConversationTitle(activeConvId, userMsg.content)
              .then(() => loadHistory())
              .catch((err) => console.error("[AI Advisor] Title generation failed:", err));
          }
        }
      }

      return acc;
    } catch (e) {
      setFetchingLive(false);
      const message = e instanceof Error ? e.message : "Unknown error";
      if (message !== "The user aborted a request.") {
        const display =
          message.includes("temporarily unavailable") || message.includes("not configured")
            ? AI_UNAVAILABLE_MSG
            : AI_UNAVAILABLE_MSG;
        console.error("[AI Advisor] Stream error:", message);
        toast.error(display);
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, content: display } : msg)),
        );
      }
      return null;
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  const send = async (text: string, opts?: { regenerate?: boolean }) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    if (aiReady === false) {
      toast.error("Aurelius AI is temporarily unavailable. Please try again shortly.");
      return;
    }
    if (demoLimitReached) {
      toast.error("Daily demo limit reached.");
      return;
    }

    let activeId = conversationId;
    if (!activeId) {
      const { conversation } = await createConversation();
      activeId = conversation.id;
      setConversationId(activeId);
    }

    const now = new Date().toISOString();
    let nextMessages: ChatMsg[];

    if (opts?.regenerate) {
      const withoutLast = messages.filter((_, i) => i < messages.length - 1);
      nextMessages = withoutLast;
      setMessages(withoutLast);
    } else {
      const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: now };
      nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
    }

    await streamChat(nextMessages, activeId, opts);
  };

  async function handleRegenerate() {
    if (!conversationId || streaming || messages.length < 2) return;
    const withoutAssistant = messages.slice(0, -1);
    setMessages(withoutAssistant);
    await streamChat(withoutAssistant, conversationId, { regenerate: true });
  }

  async function handleExport() {
    if (messages.length === 0) {
      toast.error("Nothing to export yet.");
      return;
    }
    setExporting(true);
    try {
      const { name } = await exportChatConversation(
        messages.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      );
      toast.success(`Exported to vault: ${name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("PDF files only.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", credentials: "include", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAttachments((a) => [...a, { id: crypto.randomUUID(), name: data.name, documentId: data.documentId }]);
      toast.success(`${data.name} attached.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 bg-background">
      <aside className="hidden xl:flex flex-col w-72 border-r border-border/50 bg-sidebar/40 shrink-0">
        <ChatSidebar
          history={history}
          conversationId={conversationId}
          search={sidebarSearch}
          onSearchChange={setSidebarSearch}
          onNew={startNewConversation}
          onOpen={openConversation}
          onDelete={handleDeleteConversation}
        />
      </aside>

      {showHistory && (
        <div className="xl:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <aside
            className="absolute left-0 top-0 bottom-0 w-[min(18rem,85vw)] bg-sidebar border-r border-border shadow-luxury flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <p className="text-sm font-medium">Conversations</p>
              <button type="button" onClick={() => setShowHistory(false)} className="p-1 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ChatSidebar
              history={history}
              conversationId={conversationId}
              search={sidebarSearch}
              onSearchChange={setSidebarSearch}
              onNew={startNewConversation}
              onOpen={openConversation}
              onDelete={handleDeleteConversation}
            />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-2 px-4 lg:px-6 py-3 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={() => setShowHistory(true)} className="xl:hidden hairline rounded-lg p-2">
              <Menu className="h-4 w-4" />
            </button>
            <Sparkles className="h-4 w-4 text-gold shrink-0" />
            <span className="font-display text-lg truncate">AI Advisor</span>
            {isDemo && <DemoModeBadge compact />}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {aiReady === false && (
              <span className="text-[10px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Offline
              </span>
            )}
            <button
              type="button"
              onClick={() => setContextOpen((o) => !o)}
              className="lg:hidden hairline rounded-lg p-2"
              title="Wealth context"
            >
              <PanelRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={empty || exporting || isDemo}
              className="text-xs hairline rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </div>

        {triggers.length > 0 && empty && (
          <div className="px-4 lg:px-6 py-2 space-y-2 border-b border-border/30">
            {triggers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => send(t.preloadMessage)}
                className={`w-full text-left text-xs rounded-xl px-4 py-3 border transition-colors ${
                  t.severity === "urgent"
                    ? "border-red-400/30 bg-red-400/5"
                    : t.severity === "warning"
                      ? "border-gold/30 bg-gold/5"
                      : "border-border/50 bg-card/40"
                }`}
              >
                {t.message}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {empty ? (
            <div className="h-full flex flex-col items-center justify-center px-6 py-10">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-2xl w-full"
              >
                <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-primary to-gold/60 grid place-items-center mb-6">
                  <Sparkles className="h-5 w-5 text-background" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-3">
                  Good {timeGreeting()}, {clientName}.
                </h1>
                <p className="text-muted-foreground text-sm">What would you like to explore today?</p>
                <div className="mt-8 grid sm:grid-cols-2 gap-3 text-left">
                  {AI_ADVISOR_SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      disabled={streaming || aiReady === false || demoLimitReached}
                      className="p-4 rounded-xl hairline hover:border-gold/30 hover:bg-gold/5 transition-colors text-left text-sm disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 space-y-6">
              {fetchingLive && (
                <p className="text-xs text-gold animate-pulse text-center">Fetching live data…</p>
              )}
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <ChatMessageBubble
                    key={m.id}
                    msg={m}
                    isDemo={isDemo}
                    streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
                    onRegenerate={
                      m.role === "assistant" && i === messages.length - 1 && !streaming
                        ? handleRegenerate
                        : undefined
                    }
                  />
                ))}
              </AnimatePresence>
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border/50 p-4 lg:px-6 shrink-0">
          {demoLimitReached && (
            <div className="max-w-3xl mx-auto mb-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-muted-foreground">
              Daily demo limit reached.{" "}
              <a href="/waitlist" className="text-gold hover:underline">
                Apply for membership
              </a>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="max-w-3xl mx-auto"
          >
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-2 text-[11px] hairline rounded-md px-2.5 py-1.5">
                    <FileText className="h-3 w-3 text-gold" /> {a.name}
                    <button type="button" onClick={() => setAttachments((arr) => arr.filter((x) => x.id !== a.id))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="glass-strong rounded-2xl p-2 flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || isDemo}
                className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted/50 text-muted-foreground disabled:opacity-40"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </button>
              <button
                type="button"
                disabled={streaming || demoLimitReached}
                onClick={() => {
                  const SR =
                    (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ??
                    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition })
                      .webkitSpeechRecognition;
                  if (!SR) {
                    toast.error("Voice input not supported in this browser.");
                    return;
                  }
                  const rec = new SR();
                  rec.lang = "en-IN";
                  rec.onstart = () => setListening(true);
                  rec.onend = () => setListening(false);
                  rec.onresult = (e: SpeechRecognitionEvent) => {
                    const text = e.results[0]?.[0]?.transcript;
                    if (text) setInput((prev) => (prev ? `${prev} ${text}` : text));
                  };
                  rec.onerror = () => {
                    setListening(false);
                    toast.error("Could not capture voice.");
                  };
                  rec.start();
                }}
                className={`h-9 w-9 grid place-items-center rounded-lg ${listening ? "text-gold" : "text-muted-foreground"}`}
              >
                <Mic className="h-4 w-4" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about your wealth, tax, portfolio, or markets…"
                rows={1}
                disabled={aiReady === false || demoLimitReached}
                className="flex-1 bg-transparent resize-none px-2 py-2 text-sm focus:outline-none max-h-40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming || aiReady === false || demoLimitReached}
                className="h-9 w-9 grid place-items-center rounded-lg bg-foreground text-background disabled:opacity-30"
              >
                {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden lg:contents">
        <ChatContextPanel
          data={contextData}
          open={contextOpen}
          onToggle={() => setContextOpen((o) => !o)}
          onHealthClick={() => setHealthModalOpen(true)}
          onAlertClick={(id) => {
            if (id === "unused-80c") setSection80cOpen(true);
          }}
        />
      </div>

      {contextOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80" onClick={() => setContextOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-[min(18rem,85vw)]"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatContextPanelOverlay
              data={contextData}
              onClose={() => setContextOpen(false)}
              onHealthClick={() => setHealthModalOpen(true)}
              onAlertClick={(id) => {
                if (id === "unused-80c") setSection80cOpen(true);
              }}
            />
          </div>
        </div>
      )}

      <Section80CDrawer
        open={section80cOpen}
        onClose={() => setSection80cOpen(false)}
        unusedAmount={contextData?.unused80CHeadroom}
      />
      <PortfolioHealthModal
        open={healthModalOpen}
        health={contextData?.healthScore}
        onClose={() => setHealthModalOpen(false)}
      />
    </div>
  );
}
