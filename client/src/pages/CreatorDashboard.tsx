import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { ArrowRight, Lock } from "lucide-react";

const mockGigs = [
  {
    id: 1,
    title: "NEON_RUSH_2024",
    category: "#TECH_CORE",
    niche: "#GADGETS",
    rate: "$800/POST",
    description: "Showcase our flagship device in your signature style. Authentic content only.",
    inviteOnly: false,
  },
  {
    id: 2,
    title: "SUMMIT_COLLAB_Q4",
    category: "#LIFESTYLE_X",
    niche: "#WELLNESS",
    rate: "$1,200/POST",
    description: "Join our wellness brand campaign targeting premium audiences this quarter.",
    inviteOnly: true,
  },
  {
    id: 3,
    title: "CIRCUIT_DROP_V3",
    category: "#GAMING_PRO",
    niche: "#ESPORTS",
    rate: "$600/POST",
    description: "Gaming peripheral launch — create your most viral-worthy unboxing content.",
    inviteOnly: false,
  },
];

const mockActiveCampaigns = [
  { id: 1, name: "NEON_RUSH_2024", status: "LIVE", timeLeft: "3D 14H", earnings: "$800.00" },
  { id: 2, name: "SUMMIT_COLLAB_Q4", status: "DRAFT", timeLeft: "7D 02H", earnings: "$1,200.00" },
];

const statusColors: Record<string, string> = {
  LIVE: "text-signal",
  DRAFT: "text-gold",
  PENDING: "text-muted-foreground",
};

const statusDots: Record<string, string> = {
  LIVE: "bg-signal",
  DRAFT: "bg-gold",
  PENDING: "bg-muted-foreground",
};

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile } = trpc.creator.getProfile.useQuery();
  const { data: subscription } = trpc.creator.getSubscription.useQuery();
  const { data: earnings } = trpc.creator.getEarnings.useQuery();

  if (!user || user.role !== "creator") {
    return <div className="p-8 text-muted-foreground font-mono text-sm">ACCESS DENIED</div>;
  }

  const totalEarnings = earnings?.totalEarnings ?? 42980.50;
  const vyralScore = Number(profile?.vyralScore ?? 98);

  return (
    <AppLayout activeNav="MARKETPLACE" activeSidebar="Dashboard">
      <div className="p-8">
        {/* Header */}
        <div className="mb-4">
          <h1 className="font-display text-6xl tracking-wider text-foreground">CREATOR CONSOLE</h1>
          {/* Status bar */}
          <div className="flex items-center gap-4 mt-2">
            <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
            <p className="font-mono text-xs text-signal tracking-widest">
              SYSTEM ONLINE &nbsp;|&nbsp; ACTIVE NODES: 1,204 &nbsp;|&nbsp; SIGNAL: HIGH
            </p>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Earnings Card — wide */}
          <div className="col-span-2 bg-card border border-border rounded-lg p-6">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-2">CUMULATIVE EARNINGS</p>
            <div className="flex items-baseline gap-3 mb-4">
              <p className="font-mono text-5xl text-signal font-bold">${totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              <span className="font-mono text-xs text-signal border border-signal/40 rounded px-2 py-0.5">+12.4%</span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">AVAILABLE FOR PAYOUT</p>
                <p className="font-mono text-xl text-foreground font-bold">$14,282.50</p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">PENDING CLEARANCE</p>
                <p className="font-mono text-xl text-muted-foreground font-bold">$4,120.00</p>
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

        {/* Available Gigs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs text-foreground tracking-widest font-bold uppercase">AVAILABLE GIGS</h2>
            <button
              onClick={() => setLocation("/creator/directory")}
              className="flex items-center gap-1.5 font-mono text-[9px] text-primary tracking-widest hover:underline"
            >
              VIEW ALL <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {mockGigs.map((gig) => (
              <div key={gig.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors">
                {/* Image */}
                <div className="relative h-32 bg-muted grayscale flex items-center justify-center">
                  <span className="font-mono text-[9px] text-muted-foreground">CAMPAIGN VISUAL</span>
                  {gig.inviteOnly && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-gold/20 border border-gold/40 rounded px-2 py-0.5">
                      <Lock className="w-2.5 h-2.5 text-gold" />
                      <span className="font-mono text-[7px] text-gold tracking-widest">INVITE ONLY</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <span className="font-mono text-[7px] border border-border bg-background/80 rounded px-1.5 py-0.5 text-muted-foreground">
                      {gig.category}
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <span className="font-mono text-[8px] text-signal bg-background/80 border border-signal/30 rounded px-1.5 py-0.5">
                      {gig.rate}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-display text-lg tracking-wider text-foreground mb-1">{gig.title}</h3>
                  <p className="font-mono text-[9px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">{gig.description}</p>
                  <button className="w-full py-2 bg-primary text-primary-foreground font-mono text-[8px] tracking-widest rounded hover:bg-primary/90 transition-colors">
                    ACCEPT MISSION
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Campaigns Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-mono text-xs text-foreground tracking-widest font-bold uppercase">ACTIVE CAMPAIGNS</h2>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-5 px-5 py-2 border-b border-border bg-muted/20">
            {["CAMPAIGN NAME", "STATUS", "TIME REMAINING", "EARNINGS POTENTIAL", "ACTION"].map((h) => (
              <p key={h} className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">{h}</p>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {mockActiveCampaigns.map((c) => (
              <div key={c.id} className="grid grid-cols-5 items-center px-5 py-3.5">
                <p className="font-mono text-xs text-foreground font-bold">{c.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDots[c.status]}`} />
                  <span className={`font-mono text-[9px] tracking-widest ${statusColors[c.status]}`}>{c.status}</span>
                </div>
                <p className="font-mono text-xs text-foreground">{c.timeLeft}</p>
                <p className="font-mono text-sm text-signal font-bold">{c.earnings}</p>
                <button className="font-mono text-[9px] text-primary tracking-widest hover:underline text-left">
                  VIEW →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
