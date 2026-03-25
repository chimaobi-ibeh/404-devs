import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { TrendingUp } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  active:    "text-signal border-signal/40",
  draft:     "text-gold border-gold/40",
  completed: "text-muted-foreground border-border",
  paused:    "text-destructive border-destructive/40",
};

export default function BrandAnalyticsPage() {
  const [, setLocation] = useLocation();
  const { data: campaigns = [], isLoading } = trpc.advertiser.getCampaigns.useQuery({ limit: 100 });

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const totalCampaigns  = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const draftCampaigns  = campaigns.filter((c) => c.status === "draft");
  const completedCampaigns = campaigns.filter((c) => c.status === "completed");

  const totalBudget    = campaigns.reduce((s, c) => s + Number(c.budget ?? 0), 0);
  const totalFees      = campaigns.reduce((s, c) => s + Number(c.platformFee ?? 0), 0);
  const activeBudget   = activeCampaigns.reduce((s, c) => s + Number(c.budget ?? 0), 0);
  const completedSpend = completedCampaigns.reduce((s, c) => s + Number(c.budget ?? 0), 0);

  // Budget utilisation: completed spend out of total budget
  const utilisation = totalBudget > 0 ? Math.round((completedSpend / totalBudget) * 100) : 0;

  // Category breakdown
  const byCategory = campaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="font-display text-3xl md:text-5xl tracking-wider text-foreground">ANALYTICS</h1>
          <p className="text-muted-foreground text-sm mt-1">Campaign performance and spend overview</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted/30 animate-pulse rounded-lg" />)}
          </div>
        ) : totalCampaigns === 0 ? (
          <div className="bg-card border border-border rounded-lg p-16 text-center">
            <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-mono text-xs text-muted-foreground tracking-widest">NO DATA YET</p>
            <p className="font-mono text-[9px] text-muted-foreground mt-2">Analytics will populate once you create campaigns.</p>
            <button
              onClick={() => setLocation("/brand/campaigns/new")}
              className="mt-4 font-mono text-[9px] text-primary tracking-widest hover:underline"
            >
              CREATE FIRST CAMPAIGN →
            </button>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="bg-card border border-border rounded-lg p-5">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">TOTAL BUDGET</p>
                <p className="font-mono text-2xl text-signal font-bold">{fmt(totalBudget)}</p>
                <p className="font-mono text-[9px] text-muted-foreground mt-1">+{fmt(totalFees)} FEES</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">ACTIVE BUDGET</p>
                <p className="font-mono text-2xl text-foreground font-bold">{fmt(activeBudget)}</p>
                <p className="font-mono text-[9px] text-muted-foreground mt-1">{activeCampaigns.length} CAMPAIGN{activeCampaigns.length !== 1 ? "S" : ""}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">COMPLETED SPEND</p>
                <p className="font-mono text-2xl text-foreground font-bold">{fmt(completedSpend)}</p>
                <p className="font-mono text-[9px] text-muted-foreground mt-1">{completedCampaigns.length} COMPLETED</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">UTILISATION</p>
                <p className="font-mono text-2xl text-foreground font-bold">{utilisation}%</p>
                <p className="font-mono text-[9px] text-muted-foreground mt-1">OF TOTAL BUDGET SPENT</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Campaign breakdown */}
              <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
                <h2 className="font-mono text-xs text-foreground tracking-widest uppercase font-bold mb-4">CAMPAIGN BREAKDOWN</h2>

                {/* Status summary bar */}
                <div className="flex gap-4 mb-5">
                  {[
                    { label: "ACTIVE",    count: activeCampaigns.length,    color: "bg-signal" },
                    { label: "DRAFT",     count: draftCampaigns.length,     color: "bg-gold" },
                    { label: "COMPLETED", count: completedCampaigns.length, color: "bg-muted-foreground" },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="font-mono text-[9px] text-muted-foreground tracking-widest">{count} {label}</span>
                    </div>
                  ))}
                </div>

                {/* Budget utilisation bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[9px] text-muted-foreground tracking-widest">BUDGET UTILISATION</span>
                    <span className="font-mono text-[9px] text-foreground">{utilisation}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-signal rounded-full transition-all duration-700"
                      style={{ width: `${utilisation}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-mono text-[9px] text-muted-foreground">{fmt(completedSpend)} spent</span>
                    <span className="font-mono text-[9px] text-muted-foreground">{fmt(totalBudget)} total</span>
                  </div>
                </div>

                {/* Per-campaign table */}
                <div className="space-y-px">
                  <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 pb-2 border-b border-border">
                    {["CAMPAIGN", "BUDGET", "STATUS", ""].map((h) => (
                      <span key={h} className="font-mono text-[9px] text-muted-foreground tracking-widest">{h}</span>
                    ))}
                  </div>
                  {campaigns.slice(0, 8).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setLocation(`/brand/campaigns/${c.id}`)}
                      className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 py-2.5 border-b border-border/50 hover:bg-muted/10 cursor-pointer transition-colors"
                    >
                      <p className="font-mono text-xs text-foreground truncate">{c.title}</p>
                      <p className="font-mono text-xs text-signal">{fmt(Number(c.budget))}</p>
                      <span className={`font-mono text-[9px] border rounded px-1.5 py-0.5 tracking-widest self-center w-fit ${STATUS_STYLES[c.status] ?? "text-muted-foreground border-border"}`}>
                        {c.status.toUpperCase()}
                      </span>
                      <span className="font-mono text-[9px] text-primary tracking-widest">→</span>
                    </div>
                  ))}
                  {campaigns.length > 8 && (
                    <button
                      onClick={() => setLocation("/brand/campaigns")}
                      className="w-full pt-3 font-mono text-[9px] text-primary tracking-widest hover:underline text-center"
                    >
                      VIEW ALL {campaigns.length} CAMPAIGNS →
                    </button>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Category breakdown */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <h2 className="font-mono text-xs text-foreground tracking-widest uppercase font-bold mb-4">BY CATEGORY</h2>
                  {topCategories.length === 0 ? (
                    <p className="font-mono text-[9px] text-muted-foreground">NO DATA</p>
                  ) : (
                    <div className="space-y-3">
                      {topCategories.map(([cat, count]) => {
                        const pct = Math.round((count / totalCampaigns) * 100);
                        return (
                          <div key={cat}>
                            <div className="flex justify-between mb-1">
                              <span className="font-mono text-[9px] text-foreground uppercase">{cat}</span>
                              <span className="font-mono text-[9px] text-muted-foreground">{count} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Summary log */}
                <div className="bg-black/50 rounded border border-border p-4">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3 uppercase">SYSTEM LOG</p>
                  <div className="space-y-2">
                    <div className="flex gap-2 font-mono text-[10px]">
                      <span className="text-signal shrink-0">[OK]</span>
                      <span className="text-muted-foreground">Active campaigns: {activeCampaigns.length}</span>
                    </div>
                    <div className="flex gap-2 font-mono text-[10px]">
                      <span className="text-gold shrink-0">[INFO]</span>
                      <span className="text-muted-foreground">Draft campaigns: {draftCampaigns.length}</span>
                    </div>
                    <div className="flex gap-2 font-mono text-[10px]">
                      <span className="text-muted-foreground shrink-0">[INFO]</span>
                      <span className="text-muted-foreground">Total allocated: {fmt(totalBudget)}</span>
                    </div>
                    <div className="flex gap-2 font-mono text-[10px]">
                      <span className="text-muted-foreground shrink-0">[INFO]</span>
                      <span className="text-muted-foreground">Platform fees: {fmt(totalFees)}</span>
                    </div>
                    <div className="flex gap-2 font-mono text-[10px]">
                      <span className="text-signal shrink-0">[OK]</span>
                      <span className="text-muted-foreground">Completed spend: {fmt(completedSpend)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
