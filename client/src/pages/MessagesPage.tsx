import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Send } from "lucide-react";

export default function MessagesPage() {
  const { user } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = trpc.messaging.getConversations.useQuery();
  const { data: messages = [], refetch: refetchMessages } = trpc.messaging.getMessages.useQuery(
    { conversationId: activeConversationId! },
    { enabled: activeConversationId !== null }
  );

  const sendMessage = trpc.messaging.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
    },
  });

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  const activeConversation = conversations.find((c: any) => c.id === activeConversationId);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left: Conversation List */}
        <div className="w-72 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="font-mono text-xs font-bold tracking-widest uppercase">MESSAGES</h1>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {conversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="font-mono text-xs text-muted-foreground tracking-widest">NO CONVERSATIONS YET.</p>
              </div>
            ) : (
              conversations.map((conv: any) => {
                const isActive = conv.id === activeConversationId;
                const otherPartyLabel =
                  user?.role === "creator"
                    ? `Brand #${conv.advertiserId}`
                    : `Creator #${conv.creatorId}`;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors ${
                      isActive ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase truncate">
                          Campaign #{conv.campaignId}
                        </p>
                        <p className="font-mono text-xs text-foreground font-bold truncate mt-0.5">
                          {otherPartyLabel}
                        </p>
                        {conv.lastMessageAt && (
                          <p className="font-mono text-[8px] text-muted-foreground mt-1">
                            {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                      {/* Unread dot placeholder */}
                      <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0 opacity-0 group-has-unread:opacity-100" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Thread */}
        <div className="flex-1 flex flex-col">
          {activeConversationId === null ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
                  SELECT A CONVERSATION
                </p>
                <p className="font-mono text-[9px] text-muted-foreground mt-2">
                  Choose a conversation from the left to view messages.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-5 py-3 border-b border-border bg-card shrink-0">
                <p className="font-mono text-xs font-bold text-foreground tracking-widest uppercase">
                  {activeConversation
                    ? `Campaign #${activeConversation.campaignId}`
                    : "Conversation"}
                </p>
                {activeConversation && (
                  <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                    {user?.role === "creator"
                      ? `Brand #${activeConversation.advertiserId}`
                      : `Creator #${activeConversation.creatorId}`}
                  </p>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="font-mono text-xs text-muted-foreground tracking-widest">
                      NO MESSAGES YET. SAY HELLO.
                    </p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isOwn = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-mono text-[8px] text-muted-foreground tracking-widest">
                            {isOwn ? "YOU" : "THEM"}
                          </span>
                          <span className="font-mono text-[8px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          className={`max-w-sm px-3 py-2 rounded-lg text-xs font-mono leading-relaxed ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-card border border-border text-foreground"
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
                    className="flex-1 bg-background border border-border rounded px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 resize-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sendMessage.isPending}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded font-mono text-xs tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    SEND
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
