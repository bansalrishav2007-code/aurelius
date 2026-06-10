import { Plus, Search, Trash2 } from "lucide-react";
import type { Conversation } from "@/lib/chat/conversations.server";

export function ChatSidebar({
  history,
  conversationId,
  search,
  onSearchChange,
  onNew,
  onOpen,
  onDelete,
}: {
  history: Conversation[];
  conversationId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? history.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q)),
      )
    : history;

  return (
    <>
      <div className="p-4 space-y-3 border-b border-border/40">
        <button
          type="button"
          onClick={onNew}
          className="w-full bg-foreground text-background rounded-xl h-10 text-sm font-medium inline-flex items-center justify-center gap-2"
        >
          <Plus className="h-3.5 w-3.5" /> New chat
        </button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            className="field-input h-9 pl-9 text-xs w-full"
          />
        </div>
      </div>
      <div className="px-2 pb-4 overflow-y-auto space-y-0.5 flex-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-4">No conversations found.</p>
        ) : (
          filtered.map((c) => {
            const preview = c.messages.find((m) => m.role === "user")?.content ?? c.title;
            return (
              <div
                key={c.id}
                className={`group flex items-start gap-1 rounded-lg ${
                  conversationId === c.id ? "bg-sidebar-accent/50" : "hover:bg-sidebar-accent/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className="flex-1 text-left px-3 py-2.5 min-w-0"
                >
                  <p className="text-xs truncate font-medium">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{preview}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {new Date(c.updatedAt).toLocaleDateString("en-IN")}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive shrink-0"
                  title="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
