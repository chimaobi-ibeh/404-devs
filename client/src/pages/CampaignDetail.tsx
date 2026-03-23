import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Eye, Flag, Filter } from "lucide-react";

type TabKey = "ROSTER" | "CONTENT" | "ANALYTICS" | "PAYOUTS";

const mockRoster = [
  { id: 1, name: "Luminary Kai", handle: "@luminary_kai", tier: "MACRO", status: "LIVE", engagement: "8.4%" },
  { id: 2, name: "Nova_X", handle: "@nova_x", tier: "MICRO", status: "DRAFT SUBMITTED", engagement: "6.1%" },
  { id: 3, name: "Spectral Jay", handle: "@spectral_j", tier: "MEGA", status: "PAID", engagement: "12.3%" },
  { id: 4, name: "Echo Rise", handle: "@echo_rise", tier: "NANO", status: "LIVE", engagement: "9.7%" },
];

const statusColor: Record<string, string> = {
  LIVE: "text-signal",
  "DRAFT SUBMITTED": "text-gold",
  PAID: "text-muted-foreground",
};

const statusDot: Record<string, string> = {
  LIVE: "bg-signal",
  "DRAFT SUBMITTED": "bg-gold",
  PAID: "bg-muted-foreground",
};

export default function CampaignDetail() {
  const [, params] = useRoute("/brand/campaigns/:id");
  const campaignId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("ROSTER");

  const { data: campaign, isLoading } = trpc.advertiser.getCampaign.useQuery({ id: campaignId });

  const tabs: TabKey[] = ["ROSTER", "CONTENT", "ANALYTICS", "PAYOUTS"];

  if (isLoading) {
    return (
      <AppLayout activeNav="CAMPAIGNS">
        <div className="p-8 space-y-4">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        </div>
      </AppLayout>
    );
  }

  if (!campaign) {
    return (
      <AppLayout activeNav="CAMPAIGNS">
        <div className="p-8 font-mono text-sm text-muted-foreground">CAMPAIGN NOT FOUND</div>
      </AppLayout>
    );
  }

  const campaignSlug = campaign.title.toUpperCase().replace(/\s+/g, "_");

  return (
    <AppLayout activeNav="CAMPAIGNS">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[9px] text-signal border border-signal/40 rounded px-2 py-0.5 tracking-widest uppercase">
                ● OPERATIONAL
              </span>
              <span className="font-mono text-[9px] text-muted-foreground tracking-widest">
                CID: VY-{campaignId.toString().padStart(3, "0")}-QX
              </span>
            </div>
            <h1 className="font-display text-5xl tracking-wider text-foreground">{campaignSlug}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-border font-mono text-xs tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground transition-colors rounded">
              EDIT CAMPAIGN
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors">
              LAUNCH BROADCAST
            </button>
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
          <div className="col-span-2">
            {activeTab === "ROSTER" && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h2 className="font-mono text-xs text-foreground tracking-widest font-bold">
                    ACTIVE_ROSTER <span className="text-muted-foreground">[{mockRoster.length}]</span>
                  </h2>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Filter className="w-3 h-3" />
                    <span className="font-mono text-[9px] tracking-widest">FILTER</span>
                  </button>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-4 px-5 py-2 border-b border-border">
                  {["CREATOR", "STATUS", "ENGAGEMENT", "ACTIONS"].map((h) => (
                    <p key={h} className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">{h}</p>
                  ))}
                </div>

                {/* Table rows */}
                <div className="divide-y divide-border">
                  {mockRoster.map((creator) => (
                    <div key={creator.id} className="grid grid-cols-4 items-center px-5 py-3.5">
                      {/* Creator */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                          <span className="font-mono text-[8px] text-muted-foreground">
                            {creator.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-mono text-xs text-foreground font-bold">{creator.name}</p>
                          <span className="font-mono text-[8px] text-muted-foreground border border-border/50 rounded px-1">
                            {creator.tier}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[creator.status]}`} />
                        <span className={`font-mono text-[9px] tracking-widest ${statusColor[creator.status]}`}>
                          {creator.status}
                        </span>
                      </div>

                      {/* Engagement */}
                      <p className="font-mono text-sm text-foreground font-bold">{creator.engagement}</p>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="text-muted-foreground hover:text-primary transition-colors">
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "CONTENT" && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-mono text-xs text-foreground tracking-widest font-bold mb-4">CONTENT SUBMISSIONS</h2>
                <p className="font-mono text-xs text-muted-foreground">No content submissions yet.</p>
              </div>
            )}

            {activeTab === "ANALYTICS" && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-mono text-xs text-foreground tracking-widest font-bold mb-4">ANALYTICS</h2>
                <p className="font-mono text-xs text-muted-foreground">Analytics data loading...</p>
              </div>
            )}

            {activeTab === "PAYOUTS" && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-mono text-xs text-foreground tracking-widest font-bold mb-4">PAYOUTS</h2>
                <p className="font-mono text-xs text-muted-foreground">No payouts processed yet.</p>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">TOTAL REACH</p>
                <p className="font-mono text-2xl text-foreground font-bold">1.4M</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">CONV RATE</p>
                <p className="font-mono text-2xl text-signal font-bold">3.12%</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">BUDGET</p>
                <p className="font-mono text-xl text-foreground font-bold">${campaign.budget}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">STATUS</p>
                <p className="font-mono text-xs text-foreground capitalize">{campaign.status}</p>
              </div>
            </div>

            {/* System Logs Terminal */}
            <div className="bg-black/50 rounded border border-border p-4">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3 uppercase">SYSTEM_LOGS</p>
              <div className="space-y-2">
                {[
                  { time: "14:22:01", tag: "OK", color: "text-signal", msg: "Creator @luminary_kai went LIVE" },
                  { time: "13:55:44", tag: "INFO", color: "text-muted-foreground", msg: "Content draft submitted" },
                  { time: "12:10:20", tag: "WARN", color: "text-gold", msg: "Approval deadline approaching" },
                  { time: "11:03:15", tag: "OK", color: "text-signal", msg: "Campaign metrics synced" },
                ].map((log, i) => (
                  <div key={i} className="flex items-start gap-2 font-mono text-[9px]">
                    <span className="text-muted-foreground shrink-0">{log.time}</span>
                    <span className={`shrink-0 ${log.color}`}>[{log.tag}]</span>
                    <span className="text-muted-foreground">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Find Creators button */}
            <button
              onClick={() => setLocation(`/brand/vyral-match/${campaignId}`)}
              className="w-full py-2.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors"
            >
              FIND CREATORS (VYRAL MATCH)
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
