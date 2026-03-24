import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Search, ArrowRight, Banknote } from "lucide-react";

const categoryOptions = ["music", "app", "brand", "event", "challenge"];
const contentTypeOptions = ["video", "story", "reel", "hashtag", "dance_challenge", "trend", "review"];

export default function CampaignMarketplace() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [contentType, setContentType] = useState("");

  const { data: campaigns = [], isLoading } = trpc.creator.getAvailableCampaigns.useQuery({ limit: 50 });

  const filtered = campaigns.filter((c) => {
    const matchSearch =
      search === "" ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "" || c.category === category;
    const matchType = contentType === "" || c.contentType === contentType;
    return matchSearch && matchCategory && matchType;
  });

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">BROWSE</p>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider text-foreground">CAMPAIGN MARKETPLACE</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            {filtered.length} open campaign{filtered.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="SEARCH CAMPAIGNS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2.5 font-mono text-xs text-muted-foreground focus:outline-none focus:border-foreground/50"
          >
            <option value="">ALL CATEGORIES</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2.5 font-mono text-xs text-muted-foreground focus:outline-none focus:border-foreground/50"
          >
            <option value="">ALL CONTENT TYPES</option>
            {contentTypeOptions.map((t) => (
              <option key={t} value={t}>{t.replace("_", " ").toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Campaign List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-lg p-16 text-center">
            <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">NO CAMPAIGNS FOUND</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or check back soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => setLocation(`/creator/campaigns/${campaign.id}`)}
                className="w-full text-left bg-card border border-border rounded-lg p-4 md:p-5 hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Tags row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-mono text-[7px] border border-border rounded px-1.5 py-0.5 text-muted-foreground tracking-widest uppercase">
                        {campaign.category}
                      </span>
                      <span className="font-mono text-[7px] border border-border rounded px-1.5 py-0.5 text-muted-foreground tracking-widest uppercase">
                        {campaign.contentType?.replace("_", " ")}
                      </span>
                      <span className="font-mono text-[7px] border border-border rounded px-1.5 py-0.5 text-muted-foreground tracking-widest uppercase">
                        {campaign.castingMode?.replace("_", " ")}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-display text-xl md:text-2xl tracking-wider text-foreground uppercase mb-1 group-hover:text-primary transition-colors truncate">
                      {campaign.title}
                    </h3>

                    {/* Description */}
                    {campaign.description && (
                      <p className="font-mono text-[9px] text-muted-foreground leading-relaxed line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                  </div>

                  {/* Right side: budget + deadline + arrow */}
                  <div className="shrink-0 text-right space-y-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <Banknote className="w-3 h-3 text-signal" />
                      <p className="font-mono text-sm text-signal font-bold">
                        {Number(campaign.budget).toLocaleString()}
                      </p>
                    </div>
                    <p className="font-mono text-[8px] text-muted-foreground">
                      Deadline {new Date(campaign.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
