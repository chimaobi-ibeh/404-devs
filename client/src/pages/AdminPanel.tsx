import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { AlertTriangle, Activity, Clock } from "lucide-react";

type TabKey = "SYSTEM HEALTH" | "DISPUTES" | "VERIFICATIONS";

export default function AdminPanel() {
  const { data: analytics } = trpc.admin.getDashboard.useQuery();
  const { data: disputes, refetch: refetchDisputes } = trpc.admin.getDisputes.useQuery({ limit: 50, offset: 0 });
  const { data: pendingCreators, refetch: refetchPending } = trpc.admin.getPendingCreators.useQuery();
  const [activeTab, setActiveTab] = useState<TabKey>("SYSTEM HEALTH");
  const [selectedDisputeId, setSelectedDisputeId] = useState<number | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const tabs: TabKey[] = ["SYSTEM HEALTH", "DISPUTES", "VERIFICATIONS"];

  const stats = (analytics?.stats as any) ?? {};

  const verifyCreator = trpc.admin.verifyCreator.useMutation({ onSuccess: () => refetchPending() });
  const resolveDispute = trpc.admin.resolveDispute.useMutation({
    onSuccess: () => {
      setSelectedDisputeId(null);
      setResolutionText("");
      refetchDisputes();
    },
  });

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-6xl tracking-wider text-foreground leading-none">
            COMMAND
            <br />
            CENTER
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
            <p className="font-mono text-xs text-signal tracking-widest">
              AUTHENTICATED ADMINISTRATIVE SESSION 0x7F22A9...
            </p>
          </div>
        </div>

        {/* Stat Chips */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-lg">
            <div>
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest">TOTAL VOLUME</p>
              <p className="font-mono text-lg text-foreground font-bold">
                ${((stats.platformRevenue ?? 0) / 1000000).toFixed(1)}M
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest">ACTIVE DISPUTES</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-lg text-foreground font-bold">{disputes?.length ?? 0}</p>
                <span className="font-mono text-[7px] text-orange-400 border border-orange-400/40 rounded px-1 py-0.5 tracking-widest">
                  Urgent
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-lg">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest">VERIFICATION QUEUE</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-lg text-foreground font-bold">{pendingCreators?.length ?? 0}</p>
                <span className="font-mono text-[7px] text-muted-foreground border border-border rounded px-1 py-0.5 tracking-widest">
                  Avg: 4h
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 font-mono text-xs tracking-widest transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="col-span-2 space-y-6">
            {activeTab === "SYSTEM HEALTH" && (
              <>
                {/* Flagged Content Log */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="font-mono text-xs text-foreground tracking-widest font-bold">FLAGGED_CONTENT_LOG</h2>
                  </div>
                  <div className="px-5 py-8 text-center">
                    <p className="font-mono text-xs text-muted-foreground">No flagged content at this time.</p>
                  </div>
                </div>

                {/* Platform Stats */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="font-mono text-xs text-foreground tracking-widest font-bold">PLATFORM_STATS</h2>
                  </div>
                  <div className="divide-y divide-border">
                    {[
                      { label: "TOTAL USERS", value: stats.totalUsers ?? "—", color: "text-foreground" },
                      { label: "ACTIVE CAMPAIGNS", value: stats.activeCampaigns ?? "—", color: "text-signal" },
                      { label: "PLATFORM REVENUE", value: `$${(stats.platformRevenue ?? 0).toFixed(2)}`, color: "text-gold" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-5 py-3.5">
                        <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">{item.label}</p>
                        <p className={`font-mono text-sm font-bold ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "DISPUTES" && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-mono text-xs text-foreground tracking-widest font-bold">DISPUTE RESOLUTION</h2>
                </div>
                {disputes && disputes.length > 0 ? (
                  <div className="divide-y divide-border">
                    {disputes.map((dispute: any) => (
                      <div key={dispute.id} className="px-5 py-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-mono text-xs text-foreground font-bold">Dispute #{dispute.id}</p>
                          <span className="font-mono text-[8px] text-gold border border-gold/40 rounded px-1.5 py-0.5 tracking-widest">
                            {dispute.status}
                          </span>
                        </div>
                        <p className="font-mono text-[9px] text-muted-foreground mb-3">{dispute.reason}</p>
                        <button
                          onClick={() =>
                            setSelectedDisputeId(
                              selectedDisputeId === dispute.id ? null : dispute.id
                            )
                          }
                          className="font-mono text-[8px] text-foreground border border-border rounded px-3 py-1.5 hover:border-foreground transition-colors tracking-widest"
                        >
                          {selectedDisputeId === dispute.id ? "COLLAPSE" : "REVIEW"}
                        </button>

                        {selectedDisputeId === dispute.id && (
                          <div className="mt-3 p-3 bg-muted/20 rounded border border-border space-y-3">
                            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Resolution</p>
                            <textarea
                              value={resolutionText}
                              onChange={(e) => setResolutionText(e.target.value)}
                              placeholder="Enter resolution details…"
                              rows={3}
                              className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  resolveDispute.mutate({
                                    disputeId: dispute.id,
                                    resolution: resolutionText,
                                    status: "resolved",
                                  })
                                }
                                disabled={resolveDispute.isPending}
                                className="font-mono text-[8px] text-signal border border-signal/40 rounded px-3 py-1.5 hover:bg-signal/10 transition-colors tracking-widest disabled:opacity-40"
                              >
                                RESOLVE
                              </button>
                              <button
                                onClick={() =>
                                  resolveDispute.mutate({
                                    disputeId: dispute.id,
                                    resolution: resolutionText,
                                    status: "closed",
                                  })
                                }
                                disabled={resolveDispute.isPending}
                                className="font-mono text-[8px] text-muted-foreground border border-border rounded px-3 py-1.5 hover:border-foreground hover:text-foreground transition-colors tracking-widest disabled:opacity-40"
                              >
                                CLOSE
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p className="font-mono text-xs text-muted-foreground">NO OPEN DISPUTES</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "VERIFICATIONS" && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-mono text-xs text-foreground tracking-widest font-bold">IDENTITY VERIFICATION</h2>
                </div>
                {pendingCreators && pendingCreators.length > 0 ? (
                  <div className="divide-y divide-border">
                    {pendingCreators.map((creator: any) => (
                      <div key={creator.id} className="flex items-center justify-between px-5 py-4">
                        <div>
                          <p className="font-mono text-xs text-foreground font-bold">{creator.displayName}</p>
                          <p className="font-mono text-[9px] text-muted-foreground">
                            {creator.niche} · {creator.tier} · {creator.totalFollowers.toLocaleString()} followers
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => verifyCreator.mutate({ creatorId: creator.id, verified: true })}
                            disabled={verifyCreator.isPending}
                            className="font-mono text-[8px] text-signal border border-signal/40 rounded px-2 py-1 hover:bg-signal/10 transition-colors tracking-widest disabled:opacity-40"
                          >
                            APPROVE
                          </button>
                          <button
                            onClick={() => verifyCreator.mutate({ creatorId: creator.id, verified: false })}
                            disabled={verifyCreator.isPending}
                            className="font-mono text-[8px] text-primary border border-primary/40 rounded px-2 py-1 hover:bg-primary/10 transition-colors tracking-widest disabled:opacity-40"
                          >
                            REJECT
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p className="font-mono text-xs text-muted-foreground">NO PENDING VERIFICATIONS</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel — Telemetry */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-3.5 h-3.5 text-signal" />
                <p className="font-mono text-xs text-foreground tracking-widest font-bold">SYSTEM_TELEMETRY</p>
              </div>

              <div className="space-y-4">
                {/* Real stats as relative bars */}
                {[
                  { label: "TOTAL USERS", value: stats.totalUsers ?? 0, max: Math.max(stats.totalUsers ?? 1, 1), color: "bg-primary", display: stats.totalUsers ?? "—" },
                  { label: "ACTIVE CAMPAIGNS", value: stats.activeCampaigns ?? 0, max: Math.max(stats.activeCampaigns ?? 1, 1), color: "bg-signal", display: stats.activeCampaigns ?? "—" },
                  { label: "PENDING VERIF.", value: pendingCreators?.length ?? 0, max: Math.max(pendingCreators?.length ?? 1, 1), color: "bg-gold", display: pendingCreators?.length ?? "—" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{item.label}</p>
                      <p className="font-mono text-[8px] text-foreground">{item.display}</p>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.color}`}
                        style={{ width: item.max > 0 ? `${Math.min((item.value / item.max) * 100, 100)}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Core Logs */}
            <div className="bg-black/50 rounded border border-border p-4">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3 uppercase">LIVE_CORE_LOGS</p>
              <div className="space-y-2">
                {[
                  { tag: "OK", color: "text-signal", msg: "Auth service — all nodes healthy" },
                  { tag: "WARN", color: "text-gold", msg: "DB query latency spike: 142ms" },
                  { tag: "OK", color: "text-signal", msg: "Campaign sync complete — 24 records" },
                  { tag: "INFO", color: "text-muted-foreground", msg: "Rate limit check — 0 violations" },
                  { tag: "ERROR", color: "text-primary", msg: "Webhook retry: creator/payout #882" },
                  { tag: "OK", color: "text-signal", msg: "Monitoring cycle complete" },
                ].map((log, i) => (
                  <div key={i} className="flex items-start gap-2 font-mono text-[9px]">
                    <span className={`shrink-0 ${log.color}`}>[{log.tag}]</span>
                    <span className="text-muted-foreground leading-relaxed">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div>
                <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">TOTAL USERS</p>
                <p className="font-mono text-lg text-foreground font-bold">{stats.totalUsers ?? "—"}</p>
              </div>
              <div>
                <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">ACTIVE CAMPAIGNS</p>
                <p className="font-mono text-lg text-foreground font-bold">{stats.activeCampaigns ?? "—"}</p>
              </div>
              <div>
                <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">PLATFORM REVENUE</p>
                <p className="font-mono text-lg text-signal font-bold">${((stats.platformRevenue ?? 0)).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
