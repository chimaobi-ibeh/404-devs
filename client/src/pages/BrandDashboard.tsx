import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Plus, Rocket } from "lucide-react";

export default function BrandDashboard() {
  const [, setLocation] = useLocation();
  const { data: campaigns, isLoading } = trpc.advertiser.getCampaigns.useQuery({ limit: 20 });


  const activeCampaigns = campaigns?.filter((c) => c.status === "active") ?? [];
  const draftCampaigns = campaigns?.filter((c) => c.status === "draft") ?? [];
  const totalBudget = campaigns?.reduce((sum, c) => sum + Number(c.budget ?? 0), 0) ?? 0;

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 md:mb-8">
          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-5xl tracking-wider text-foreground">ADVERTISER_HUB</h1>
            <p className="text-muted-foreground text-sm mt-1">Command center for your campaign operations</p>
          </div>
          <button
            onClick={() => setLocation("/brand/campaigns/new")}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors shrink-0"
          >
            <Rocket className="w-4 h-4" />
            QUICK LAUNCH
          </button>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {/* Total Budget */}
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">TOTAL BUDGET</p>
            <p className="font-mono text-2xl text-signal font-bold">
              ${totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Active Campaigns */}
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">ACTIVE CAMPAIGNS</p>
            <div className="flex items-baseline gap-1">
              {isLoading ? (
                <div className="h-7 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <p className="font-mono text-2xl text-foreground font-bold">{activeCampaigns.length}</p>
                  <p className="font-mono text-xs text-muted-foreground">/20 LIMIT</p>
                </>
              )}
            </div>
          </div>

          {/* Total Campaigns */}
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">TOTAL CAMPAIGNS</p>
            <p className="font-mono text-2xl text-foreground font-bold">{campaigns?.length ?? 0}</p>
          </div>

          {/* Drafts */}
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">DRAFTS</p>
            <div className="flex items-center gap-3">
              <p className="font-mono text-2xl text-foreground font-bold">{draftCampaigns.length}</p>
              {draftCampaigns.length > 0 && (
                <span className="font-mono text-[8px] text-primary border border-primary/40 rounded px-1.5 py-0.5 tracking-widest">
                  PENDING LAUNCH
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left column: Active Campaigns + System Logs */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Active Campaigns Section */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-mono text-xs text-foreground tracking-widest uppercase font-bold">ACTIVE CAMPAIGNS</h2>
                <button className="font-mono text-[9px] text-primary tracking-widest hover:underline">VIEW ALL RECORDS →</button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : activeCampaigns.length > 0 ? (
                <div className="space-y-3">
                  {activeCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center gap-4 p-3 rounded border border-border hover:border-primary/30 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/brand/campaigns/${campaign.id}`)}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <span className="font-mono text-[8px] text-muted-foreground">IMG</span>
                      </div>

                      {/* Campaign Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-base tracking-wider text-foreground truncate">
                          {campaign.title.toUpperCase().replace(/\s+/g, "_")}
                        </p>
                        <p className="font-mono text-[9px] text-muted-foreground tracking-widest">
                          CID: VY-{campaign.id.toString().padStart(3, "0")} • {campaign.category.toUpperCase()}
                        </p>
                      </div>

                      {/* Budget */}
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm text-signal font-bold">${Number(campaign.budget).toLocaleString()}</p>
                        <p className="font-mono text-[8px] text-muted-foreground">BUDGET</p>
                      </div>

                      {/* Deadline */}
                      <div className="text-right shrink-0">
                        <p className="font-mono text-xs text-foreground">{new Date(campaign.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                        <p className="font-mono text-[8px] text-muted-foreground">DEADLINE</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="font-mono text-xs text-muted-foreground">NO ACTIVE CAMPAIGNS</p>
                  <button
                    onClick={() => setLocation("/brand/campaigns/new")}
                    className="mt-3 font-mono text-[9px] text-primary tracking-widest hover:underline"
                  >
                    CREATE CAMPAIGN →
                  </button>
                </div>
              )}
            </div>

            {/* Campaign Summary */}
            <div className="bg-black/50 rounded border border-border p-4">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3 uppercase">CAMPAIGN SUMMARY</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 font-mono text-[10px]">
                  <span className="shrink-0 text-signal">[OK]</span>
                  <span className="text-muted-foreground">Active campaigns: {activeCampaigns.length}</span>
                </div>
                <div className="flex items-start gap-2 font-mono text-[10px]">
                  <span className="shrink-0 text-gold">[INFO]</span>
                  <span className="text-muted-foreground">Draft campaigns pending launch: {draftCampaigns.length}</span>
                </div>
                <div className="flex items-start gap-2 font-mono text-[10px]">
                  <span className="shrink-0 text-muted-foreground">[INFO]</span>
                  <span className="text-muted-foreground">Total allocated budget: ${totalBudget.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Drafts Queue */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <h2 className="font-mono text-xs text-foreground tracking-widest uppercase font-bold mb-4">DRAFTS_QUEUE</h2>

              {draftCampaigns.length > 0 ? (
                <div className="space-y-3">
                  {draftCampaigns.slice(0, 4).map((campaign) => (
                    <div key={campaign.id} className="p-3 rounded border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[8px] text-muted-foreground border border-border rounded px-1.5 py-0.5 tracking-widest uppercase">
                          DRAFT
                        </span>
                      </div>
                      <p className="font-mono text-xs text-foreground font-bold mb-1 truncate">
                        {campaign.title}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground mb-3 line-clamp-2">
                        {campaign.description}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLocation(`/brand/campaigns/${campaign.id}`)}
                          className="flex-1 py-1 border border-border font-mono text-[8px] tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground transition-colors rounded"
                        >
                          REVIEW
                        </button>
                        <button className="flex-1 py-1 border border-primary/40 font-mono text-[8px] tracking-widest text-primary hover:bg-primary/10 transition-colors rounded">
                          EDIT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Placeholder draft cards */}
                  {["SUMMER_LAUNCH_V2", "TECH_COLLAB_Q4"].map((title, i) => (
                    <div key={i} className="p-3 rounded border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[8px] text-muted-foreground border border-border rounded px-1.5 py-0.5 tracking-widest">
                          DRAFT
                        </span>
                      </div>
                      <p className="font-mono text-xs text-foreground font-bold mb-1">{title}</p>
                      <p className="font-mono text-[9px] text-muted-foreground mb-3">
                        Awaiting final configuration and launch approval.
                      </p>
                      <div className="flex gap-2">
                        <button className="flex-1 py-1 border border-border font-mono text-[8px] tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground transition-colors rounded">
                          REVIEW
                        </button>
                        <button className="flex-1 py-1 border border-primary/40 font-mono text-[8px] tracking-widest text-primary hover:bg-primary/10 transition-colors rounded">
                          EDIT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick action */}
            <button
              onClick={() => setLocation("/brand/campaigns/new")}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-mono text-[9px] tracking-widest">NEW CAMPAIGN</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
