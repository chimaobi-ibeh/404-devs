import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { ArrowRight, Lock, MessageSquare } from "lucide-react";

const statusColors: Record<string, string> = {
  active:  "text-signal",
  draft:   "text-gold",
  pending: "text-muted-foreground",
  ended:   "text-muted-foreground",
};

const statusDots: Record<string, string> = {
  active:  "bg-signal",
  draft:   "bg-gold",
  pending: "bg-muted-foreground",
  ended:   "bg-muted-foreground",
};

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile } = trpc.creator.getProfile.useQuery();
  const { data: earnings } = trpc.creator.getEarnings.useQuery();
  const { data: openCampaigns } = trpc.advertiser.getCampaigns.useQuery({ limit: 6 });
  const { data: myRoster } = trpc.creator.getMyRosterEntries.useQuery();

  const totalEarnings = earnings?.totalEarnings ?? 0;
  const pendingEarnings = earnings?.pendingEarnings ?? 0;
  const availableEarnings = Math.max(0, totalEarnings - pendingEarnings);
  const vyralScore = Number(profile?.vyralScore ?? 0);
  const displayName = profile?.displayName ?? user?.name ?? "Creator";

  const startConversation = trpc.messaging.startConversation.useMutation({
    onSuccess: () => setLocation("/messages"),
  });

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">Welcome</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-4xl md:text-5xl tracking-wider text-foreground">{displayName}</h1>
            {profile?.verificationStatus === "verified" && (
              <span className="font-mono text-[8px] rounded px-2 py-1 tracking-widest bg-signal/20 text-signal border border-signal/40">
                VERIFIED ✓
              </span>
            )}
            {profile?.verificationStatus === "pending" && (
              <span className="font-mono text-[8px] rounded px-2 py-1 tracking-widest bg-gold/20 text-gold border border-gold/40">
                PENDING REVIEW
              </span>
            )}
            {profile?.verificationStatus === "rejected" && (
              <span className="font-mono text-[8px] rounded px-2 py-1 tracking-widest bg-primary/10 text-primary border border-primary/40">
                NOT VERIFIED — REAPPLY
              </span>
            )}
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Earnings Card — wide */}
          <div className="md:col-span-2 bg-card border border-border rounded-lg p-4 md:p-6">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-2">CUMULATIVE EARNINGS</p>
            <div className="flex items-baseline gap-3 mb-4">
              <p className="font-mono text-5xl text-signal font-bold">${totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">AVAILABLE FOR PAYOUT</p>
                <p className="font-mono text-xl text-foreground font-bold">${availableEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">PENDING CLEARANCE</p>
                <p className="font-mono text-xl text-muted-foreground font-bold">${pendingEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Vyral Score Card */}
          <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-4">VYRAL SCORE</p>
            {/* Circular progress ring */}
            <div className="relative w-24 h-24 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#222" strokeWidth="6" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="#FF3C5F"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(vyralScore / 100) * 251.2} 251.2`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-mono text-2xl text-foreground font-bold leading-none">{vyralScore}</p>
                <p className="font-mono text-[9px] text-muted-foreground">/100</p>
              </div>
            </div>
            <span className="font-mono text-[8px] text-primary border border-primary/40 rounded px-2 py-0.5 tracking-widest">
              TOP 1% CREATOR
            </span>
          </div>
        </div>

        {/* Open Campaigns / Gigs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs text-foreground tracking-widest font-bold uppercase">OPEN CAMPAIGNS</h2>
            <button
              onClick={() => setLocation("/creator/directory")}
              className="flex items-center gap-1.5 font-mono text-[9px] text-primary tracking-widest hover:underline"
            >
              VIEW ALL <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {!openCampaigns || openCampaigns.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center">
              <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">NO OPEN CAMPAIGNS YET</p>
              <p className="text-sm text-muted-foreground">Check back soon — brands will post gigs here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {openCampaigns.filter(c => c.status === "active").slice(0, 3).map((gig) => (
                <div key={gig.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors">
                  <div className="relative h-32 bg-muted flex items-center justify-center">
                    <span className="font-mono text-[9px] text-muted-foreground">CAMPAIGN VISUAL</span>
                    <div className="absolute top-2 right-2">
                      <span className="font-mono text-[7px] border border-border bg-background/80 rounded px-1.5 py-0.5 text-muted-foreground uppercase">
                        {gig.category}
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <span className="font-mono text-[8px] text-signal bg-background/80 border border-signal/30 rounded px-1.5 py-0.5">
                        ${Number(gig.budget).toLocaleString()} BUDGET
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg tracking-wider text-foreground mb-1 uppercase">{gig.title}</h3>
                    <p className="font-mono text-[9px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">{gig.description ?? "No description provided."}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-primary text-primary-foreground font-mono text-[8px] tracking-widest rounded hover:bg-primary/90 transition-colors">
                        APPLY
                      </button>
                      <button
                        onClick={() => setLocation("/brand/profile/" + gig.advertiserId)}
                        className="px-3 py-2 border border-border font-mono text-[8px] tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground rounded transition-colors"
                      >
                        VIEW BRAND →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Campaigns table — roster entries */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-mono text-xs text-foreground tracking-widest font-bold uppercase">MY CAMPAIGNS</h2>
          </div>

          {!myRoster || myRoster.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">NOT YET ON ANY CAMPAIGNS</p>
              <p className="text-sm text-muted-foreground">Apply to open campaigns above to get started.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-5 px-5 py-2 border-b border-border bg-muted/20">
                {["CAMPAIGN", "STATUS", "DEADLINE", "MSG", "ACTION"].map((h) => (
                  <p key={h} className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">{h}</p>
                ))}
              </div>
              <div className="divide-y divide-border">
                {myRoster.map((entry: any) => (
                  <div key={entry.id} className="grid grid-cols-5 items-center px-5 py-3.5">
                    <p className="font-mono text-xs text-foreground font-bold uppercase truncate">{entry.campaign?.title ?? "—"}</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDots[entry.status] ?? "bg-muted-foreground"}`} />
                      <span className={`font-mono text-[9px] tracking-widest uppercase ${statusColors[entry.status] ?? "text-muted-foreground"}`}>{entry.status}</span>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {entry.campaign?.deadline ? new Date(entry.campaign.deadline).toLocaleDateString() : "—"}
                    </p>
                    <button
                      onClick={() => startConversation.mutate({ campaignId: entry.campaignId })}
                      disabled={startConversation.isPending}
                      title="Message brand"
                      className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button className="font-mono text-[9px] text-primary tracking-widest hover:underline text-left">VIEW →</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
