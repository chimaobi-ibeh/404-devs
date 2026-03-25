import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Plus, Rocket, Search } from "lucide-react";

const STATUS_FILTERS = ["all", "active", "draft", "completed", "paused"] as const;
type Filter = typeof STATUS_FILTERS[number];

const STATUS_STYLES: Record<string, string> = {
  active:    "text-signal border-signal/40",
  draft:     "text-gold border-gold/40",
  completed: "text-muted-foreground border-border",
  paused:    "text-destructive border-destructive/40",
};

export default function BrandCampaignsPage() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data: campaigns = [], isLoading } = trpc.advertiser.getCampaigns.useQuery({ limit: 100 });

  const filtered = campaigns.filter((c) => {
    const matchStatus = filter === "all" || c.status === filter;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all:       campaigns.length,
    active:    campaigns.filter((c) => c.status === "active").length,
    draft:     campaigns.filter((c) => c.status === "draft").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    paused:    campaigns.filter((c) => c.status === "paused").length,
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-5xl tracking-wider text-foreground">CAMPAIGNS</h1>
            <p className="text-muted-foreground text-sm mt-1">All your campaign operations in one place</p>
          </div>
          <button
            onClick={() => setLocation("/brand/campaigns/new")}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors shrink-0"
          >
            <Rocket className="w-4 h-4" />
            NEW CAMPAIGN
          </button>
        </div>

        {/* Filter tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded font-mono text-[9px] tracking-widest uppercase border transition-colors ${
                  filter === f
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {f} <span className="opacity-60">({counts[f]})</span>
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              className="pl-9 pr-4 py-1.5 bg-card border border-border rounded font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 w-full sm:w-56"
            />
          </div>
        </div>

        {/* Campaign list */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border">
            {["CAMPAIGN", "STATUS", "BUDGET", "DEADLINE", ""].map((h) => (
              <span key={h} className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-px">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-mono text-xs text-muted-foreground tracking-widest">
                {search ? "NO CAMPAIGNS MATCH YOUR SEARCH" : "NO CAMPAIGNS YET"}
              </p>
              <button
                onClick={() => setLocation("/brand/campaigns/new")}
                className="mt-3 inline-flex items-center gap-1.5 font-mono text-[9px] text-primary tracking-widest hover:underline"
              >
                <Plus className="w-3 h-3" /> CREATE YOUR FIRST CAMPAIGN
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setLocation(`/brand/campaigns/${c.id}`)}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-5 py-4 hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  {/* Name */}
                  <div className="min-w-0">
                    <p className="font-display text-sm tracking-wider text-foreground truncate">
                      {c.title.toUpperCase().replace(/\s+/g, "_")}
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground tracking-widest mt-0.5">
                      CID: VY-{c.id.toString().padStart(3, "0")} · {c.category.toUpperCase()}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <span className={`font-mono text-[9px] border rounded px-2 py-0.5 tracking-widest uppercase ${STATUS_STYLES[c.status] ?? "text-muted-foreground border-border"}`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Budget */}
                  <div className="flex flex-col justify-center">
                    <p className="font-mono text-sm text-signal font-bold">₦{Number(c.budget).toLocaleString()}</p>
                    <p className="font-mono text-[9px] text-muted-foreground">BUDGET</p>
                  </div>

                  {/* Deadline */}
                  <div className="flex flex-col justify-center">
                    <p className="font-mono text-xs text-foreground">
                      {new Date(c.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground">DEADLINE</p>
                  </div>

                  {/* Action */}
                  <div className="flex items-center">
                    <span className="font-mono text-[9px] text-primary tracking-widest hover:underline">VIEW →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
