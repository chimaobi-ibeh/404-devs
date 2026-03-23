import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Send, ArrowLeft, MessageSquare } from "lucide-react";

export default function MessagesPage() {
  const { user } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const bottomRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: conversations = [], refetch: refetchConversations } = trpc.messaging.getConversations.useQuery(
    undefined,
    { refetchInterval: 10000 }
  );

  const { data: messages = [], refetch: refetchMessages } = trpc.messaging.getMessages.useQuery(
    { conversationId: activeConversationId! },
    {
      enabled: activeConversationId !== null,
      refetchInterval: 4000,
    }
  );

  const sendMessage = trpc.messaging.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
      refetchConversations();
    },
  });

  const markRead = trpc.messaging.markConversationRead.useMutation({
    onSuccess: () => {
      refetchConversations();
      utils.messaging.getUnreadCount.invalidate();
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mark as read when opening a conversation
  useEffect(() => {
    if (activeConversationId !== null) {
      markRead.mutate({ conversationId: activeConversationId });
    }
  }, [activeConversationId]);

  function handleSend() {
    if (!messageText.trim() || activeConversationId === null) return;
    sendMessage.mutate({ conversationId: activeConversationId, content: messageText.trim() });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function openConversation(id: number) {
    setActiveConversationId(id);
    setMobileView("thread");
  }

  function backToList() {
    setMobileView("list");
    setActiveConversationId(null);
  }

  const activeConversation = conversations.find((c: any) => c.id === activeConversationId);

  // The label for the other party in the active conversation
  function getOtherPartyName(conv: any) {
    if (!conv) return "";
    return user?.role === "creator" ? conv.advertiserName : conv.creatorName;
  }

  // ─── Conversation list ──────────────────────────────────────────────────────
  const ConversationList = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <h1 className="font-mono text-xs font-bold tracking-widest uppercase">MESSAGES</h1>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-12 gap-3">
            <MessageSquare className="w-8 h-8 text-muted-foreground opacity-30" />
            <p className="font-mono text-xs text-muted-foreground tracking-widest text-center">NO CONVERSATIONS YET</p>
            <p className="font-mono text-[9px] text-muted-foreground text-center leading-relaxed">
              Start one from a campaign roster or creator card.
            </p>
          </div>
        ) : (
          conversations.map((conv: any) => {
            const isActive = conv.id === activeConversationId;
            const otherName = user?.role === "creator" ? conv.advertiserName : conv.creatorName;
            const hasUnread = (conv.unreadCount ?? 0) > 0;
            return (
              <button
                key={conv.id}
                onClick={() => openConversation(conv.id)}
                className={`w-full text-left px-4 py-3.5 hover:bg-muted/40 transition-colors ${
                  isActive ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase truncate mb-0.5">
                      {conv.campaignTitle ?? `Campaign #${conv.campaignId}`}
                    </p>
                    <p className={`font-mono text-xs truncate ${hasUnread ? "text-foreground font-bold" : "text-foreground"}`}>
                      {otherName}
                    </p>
                    {conv.lastMessageAt && (
                      <p className="font-mono text-[8px] text-muted-foreground mt-1">
                        {new Date(conv.lastMessageAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                  {hasUnread && (
                    <span className="shrink-0 mt-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground font-mono text-[8px] font-bold flex items-center justify-center px-1">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  // ─── Message thread ─────────────────────────────────────────────────────────
  const MessageThread = (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-4 py-3 border-b border-border bg-card shrink-0 flex items-center gap-3">
        {/* Back button — mobile only */}
        <button
          onClick={backToList}
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-foreground tracking-widest uppercase truncate">
            {activeConversation ? (activeConversation.campaignTitle ?? `Campaign #${activeConversation.campaignId}`) : "Conversation"}
          </p>
          {activeConversation && (
            <p className="font-mono text-[9px] text-muted-foreground mt-0.5 truncate">
              {getOtherPartyName(activeConversation)}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="font-mono text-xs text-muted-foreground tracking-widest">NO MESSAGES YET. SAY HELLO.</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isOwn = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-[8px] text-muted-foreground tracking-widest">
                    {isOwn ? "YOU" : getOtherPartyName(activeConversation)}
                  </span>
                  <span className="font-mono text-[8px] text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div
                  className={`max-w-[75%] px-3.5 py-2.5 rounded-xl text-xs font-mono leading-relaxed ${
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send input */}
      <div className="px-4 py-3 border-t border-border bg-card shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={2}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || sendMessage.isPending}
            className="p-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const EmptyThread = (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <MessageSquare className="w-10 h-10 text-muted-foreground opacity-20" />
      <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">SELECT A CONVERSATION</p>
      <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
        Pick a conversation from the left, or start one from a campaign roster.
      </p>
    </div>
  );

  return (
    <AppLayout>
      {/* Full height layout */}
      <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
        {/* Conversation list — hidden on mobile when viewing thread */}
        <div className={`w-full md:w-72 border-r border-border flex-shrink-0 ${mobileView === "thread" ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
          {ConversationList}
        </div>

        {/* Thread pane — hidden on mobile when viewing list */}
        <div className={`flex-1 ${mobileView === "list" ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
          {activeConversationId === null ? EmptyThread : MessageThread}
        </div>
      </div>
    </AppLayout>
  );
}
