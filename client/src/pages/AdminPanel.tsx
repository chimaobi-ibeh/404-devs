import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { AlertTriangle, Activity, Clock } from "lucide-react";

type TabKey = "SYSTEM HEALTH" | "DISPUTES" | "VERIFICATIONS";

const flaggedContent = [
  { id: 1, type: "IP_VIOLATION", title: "Unauthorized brand usage detected in post #4821", severity: "CRITICAL" },
  { id: 2, type: "SPAM_REPORT", title: "Duplicate content detected across 3 accounts", severity: "CRITICAL" },
  { id: 3, type: "IP_VIOLATION", title: "Unlicensed audio in campaign VY-092 content", severity: "CRITICAL" },
];

const pendingApplications = [
  { id: 1, name: "PULSE CREATOR", score: 87.4, label: "AI_MATCH" },
  { id: 2, name: "DRIFT_NOVA", score: 92.1, label: "AI_MATCH" },
  { id: 3, name: "ECHO STREAM", score: 78.3, label: "AI_MATCH" },
];

const telemetry = [
  { label: "CPU_LATENCY", value: 34, color: "bg-signal" },
  { label: "MEMORY_LOAD", value: 68, color: "bg-gold" },
  { label: "TRAFFIC_INLET", value: 82, color: "bg-primary" },
];

export default function AdminPanel() {
  const { data: analytics } = trpc.admin.getDashboard.useQuery();
  const { data: disputes } = trpc.admin.getDisputes.useQuery({ limit: 50, offset: 0 });
  const [activeTab, setActiveTab] = useState<TabKey>("SYSTEM HEALTH");

  const tabs: TabKey[] = ["SYSTEM HEALTH", "DISPUTES", "VERIFICATIONS"];

  const stats = (analytics?.stats as any) ?? {};

  return (
    <AppLayout activeNav="ANALYTICS" activeSidebar="Insights">
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
                ${((stats.platformRevenue || 14200000) / 1000000).toFixed(1)}M
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest">ACTIVE DISPUTES</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-lg text-foreground font-bold">{disputes?.length ?? 24}</p>
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
                <p className="font-mono text-lg text-foreground font-bold">142</p>
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
                    <span className="font-mono text-[8px] text-primary border border-primary/40 rounded px-2 py-0.5 tracking-widest">
                      {flaggedContent.length} CRITICAL ALERTS
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {flaggedContent.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`font-mono text-[7px] border rounded px-1.5 py-0.5 tracking-widest shrink-0 ${
                            item.type === "IP_VIOLATION"
                              ? "text-primary border-primary/40"
                              : "text-gold border-gold/40"
                          }`}>
                            {item.type}
                          </span>
                          <p className="font-mono text-[10px] text-foreground">{item.title}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button className="font-mono text-[8px] text-muted-foreground border border-border rounded px-2 py-1 hover:border-foreground hover:text-foreground transition-colors tracking-widest">
                            DETAILS
                          </button>
                          <button className="font-mono text-[8px] text-signal border border-signal/40 rounded px-2 py-1 hover:bg-signal/10 transition-colors tracking-widest">
                            RESOLVE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Applications */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="font-mono text-xs text-foreground tracking-widest font-bold">PENDING_APPLICATIONS</h2>
                  </div>
                  <div className="divide-y divide-border">
                    {pendingApplications.map((app) => (
                      <div key={app.id} className="flex items-center justify-between px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                            <span className="font-mono text-[8px] text-muted-foreground">{app.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-mono text-xs text-foreground font-bold">{app.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[7px] text-signal border border-signal/40 rounded px-1 py-0.5 tracking-widest">
                                {app.label}
                              </span>
                              <span className="font-mono text-[8px] text-muted-foreground">Score: {app.score}</span>
                            </div>
                          </div>
                        </div>
                        <button className="font-mono text-[8px] text-foreground border border-border rounded px-3 py-1.5 hover:border-signal hover:text-signal transition-colors tracking-widest">
                          VERIFY
                        </button>
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
                        <button className="font-mono text-[8px] text-foreground border border-border rounded px-3 py-1.5 hover:border-foreground transition-colors tracking-widest">
                          REVIEW
                        </button>
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
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-mono text-xs text-foreground tracking-widest font-bold mb-4">IDENTITY VERIFICATION</h2>
                <p className="font-mono text-xs text-muted-foreground">Verification queue loaded from PENDING_APPLICATIONS above.</p>
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
                {telemetry.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{item.label}</p>
                      <p className="font-mono text-[8px] text-foreground">{item.value}%</p>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.color}`}
                        style={{ width: `${item.value}%` }}
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
