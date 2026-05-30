import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { mockChatStarter } from "@/lib/mock-data";
import { Sparkles, Send, Paperclip, Plus, ShieldCheck, FileText, BookOpen, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Route as AppRoute } from "@/routes/_app";
import {
  createConversation,
  fetchConversation,
  fetchConversations,
  saveConversationMessages,
} from "@/lib/platform/client";
import type { Conversation } from "@/lib/chat/conversations.server";

export const Route = createFileRoute("/_app/chat")({
  head: () => ({ meta: [{ title: "AI Copilot — Aureliuss" }] }),
  component: ChatPage,
});

type Msg = { id: string; role: "user" | "assistant"; content: string; citations?: string[] };
type Attachment = { id: string; name: string; documentId: string };

function ChatPage() {
  const { session } = AppRoute.useRouteContext();
  const clientName = session.fullName.split(/\s+/)[0] ?? "Principal";
  const [history, setHistory] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const { conversations } = await fetchConversations();
      setHistory(conversations);
    } catch {
      /* empty history ok */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function startNewConversation() {
    const { conversation } = await createConversation();
    setConversationId(conversation.id);
    setMessages([]);
    await loadHistory();
  }

  async function openConversation(id: string) {
    const { conversation } = await fetchConversation(id);
    setConversationId(conversation.id);
    setMessages(conversation.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })));
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    let activeId = conversationId;
    if (!activeId) {
      const { conversation } = await createConversation();
      activeId = conversation.id;
      setConversationId(activeId);
    }

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          documentIds: attachments.map((a) => a.documentId),
          clientName,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || err.detail || `HTTP ${res.status}`);
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
            // ignore keepalive / non-JSON lines
          }
        }
      }

      if (!acc) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: "_No response received. Please try again._" }
              : msg,
          ),
        );
      } else if (activeId) {
        await saveConversationMessages(
          activeId,
          [
            { role: "user", content: trimmed },
            { role: "assistant", content: acc },
          ],
          attachments.map((a) => a.documentId),
        );
        await loadHistory();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      if (message !== "The user aborted a request.") {
        toast.error(message);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: `_Unable to reach the AI service: ${message}_` }
              : msg,
          ),
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("PDF files only.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAttachments((a) => [
        ...a,
        { id: crypto.randomUUID(), name: data.name, documentId: data.documentId },
      ]);
      toast.success(`${data.name} attached for this conversation.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <aside className="hidden xl:flex flex-col w-72 border-r border-border/50 bg-sidebar/40 shrink-0">
        <div className="p-5">
          <button onClick={startNewConversation} className="w-full hairline bg-card hover:bg-card/70 rounded-lg h-10 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors">
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> New conversation
          </button>
        </div>
        <div className="px-3 pb-5 overflow-y-auto space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 mb-2">Recent</p>
          {history.map((c) => (
            <button key={c.id} onClick={() => openConversation(c.id)} className={`w-full text-left px-3 py-2 rounded-lg hover:bg-sidebar-accent/60 transition-colors ${conversationId === c.id ? "bg-sidebar-accent/40" : ""}`}>
              <p className="text-xs truncate">{c.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.updatedAt).toLocaleDateString("en-IN")}</p>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto">
          {empty ? (
            <div className="h-full flex flex-col items-center justify-center px-6">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-2xl">
                <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-primary to-gold/60 grid place-items-center mb-7 shadow-luxury">
                  <Sparkles className="h-5 w-5 text-background" strokeWidth={1.5} />
                </div>
                <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-4">How can I help today, {clientName}?</h1>
                <p className="text-muted-foreground text-sm">Your private wealth copilot — tax, compliance, and vault intelligence for India.</p>

                <div className="mt-12 grid sm:grid-cols-2 gap-2 text-left">
                  {mockChatStarter.map((s) => (
                    <button key={s} onClick={() => send(s)} className="group p-4 rounded-xl hairline hover:bg-card transition-colors flex items-start gap-3">
                      <BookOpen className="h-4 w-4 text-gold mt-0.5 shrink-0" strokeWidth={1.5} />
                      <span className="text-sm leading-snug">{s}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
              <AnimatePresence initial={false}>
                {messages.map((m) => <Message key={m.id} msg={m} streaming={streaming && m.id === messages[messages.length - 1]?.id} />)}
              </AnimatePresence>
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border/50 p-4 lg:p-6">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="max-w-3xl mx-auto">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-2 text-[11px] hairline rounded-md px-2.5 py-1.5 bg-muted/40">
                    <FileText className="h-3 w-3 text-gold" /> {a.name}
                    <button type="button" onClick={() => setAttachments((arr) => arr.filter((x) => x.id !== a.id))} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="glass-strong rounded-2xl p-2 flex items-end gap-2 shadow-soft focus-within:ring-1 focus-within:ring-ring/60 transition">
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors disabled:opacity-40"
                title="Attach PDF for retrieval"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" strokeWidth={1.5} />}
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask about tax structures, GST, FEMA, or upload a document…"
                rows={1}
                className="flex-1 bg-transparent resize-none px-2 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none max-h-40"
              />
              <button type="submit" disabled={!input.trim() || streaming} className="h-9 w-9 grid place-items-center rounded-lg bg-foreground text-background disabled:opacity-30 transition-opacity">
                {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={1.8} />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-3 inline-flex items-center gap-1.5 w-full justify-center">
              <ShieldCheck className="h-3 w-3 text-success" /> Encrypted session · Aureliuss cites regulatory sources
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-gold/70 grid place-items-center shrink-0 shadow-soft">
      <Sparkles className="h-3.5 w-3.5 text-background" strokeWidth={1.8} />
    </div>
  );
}

function Message({ msg, streaming }: { msg: Msg; streaming?: boolean }) {
  if (msg.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="bg-primary/15 hairline rounded-2xl rounded-tr-md px-5 py-3 max-w-[80%] text-sm leading-relaxed">
          {msg.content}
        </div>
      </motion.div>
    );
  }
  const isEmpty = streaming && !msg.content;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex gap-4">
      <Avatar />
      <div className="flex-1 min-w-0">
        {isEmpty ? (
          <div className="flex items-center gap-1.5 pt-2">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-gold"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-foreground/90">
            {msg.content.split("\n\n").map((para, i) => (
              <p key={i} className="mb-4 last:mb-0" dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-medium">$1</strong>').replace(/^(\d)\. /gm, '<span class="text-gold mr-1">$1.</span>') }} />
            ))}
            {streaming && <span className="inline-block w-1.5 h-3.5 bg-gold/80 align-middle ml-0.5 animate-pulse" />}
          </div>
        )}
        {msg.citations && (
          <div className="mt-5 pt-4 border-t border-border/40">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Sources cited</p>
            <div className="flex flex-wrap gap-1.5">
              {msg.citations.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 text-[11px] hairline rounded-md px-2 py-1 bg-muted/40">
                  <FileText className="h-2.5 w-2.5 text-gold" /> {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
