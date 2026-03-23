import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Search } from "lucide-react";

const tierColors: Record<string, string> = {
  mega: "text-primary border-primary/40",
  macro: "text-gold border-gold/40",
  mid: "text-signal border-signal/40",
  micro: "text-foreground border-border",
  nano: "text-muted-foreground border-border",
};

export default function CreatorDirectory() {
  const [filters, setFilters] = useState({ niche: "", minFollowers: 0, tier: "", platform: "" });
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { data: creators } = trpc.creator.searchCreators.useQuery(filters);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const displayCreators = creators ?? [];
  const filteredCreators = displayCreators.filter(
    (c) =>
      search === "" ||
      c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCreators = filteredCreators.filter((c) => selectedIds.includes(c.id));

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-6xl tracking-wider leading-none">
              <span className="text-foreground">CREATOR</span>
              <br />
              <span className="text-primary italic">INTELLIGENCE</span>
            </h1>
            <p className="font-mono text-xs text-muted-foreground mt-2">
              Discover and hand-pick elite creators for your campaigns
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">LIVE SYSTEM STATUS</p>
            <div className="flex gap-4">
              <div>
                <p className="font-mono text-sm text-foreground font-bold">{displayCreators.length}</p>
                <p className="font-mono text-[8px] text-muted-foreground tracking-widest">ACTIVE CREATORS</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="SEARCH CREATORS, HANDLES, NICHES..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-12 pr-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
          />
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 mb-6">
          <select
            value={filters.platform}
            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
            className="bg-card border border-border rounded px-3 py-2 font-mono text-xs text-muted-foreground focus:outline-none focus:border-foreground/50"
          >
            <option value="">ALL PLATFORMS</option>
            <option value="x">X / TWITTER</option>
            <option value="tiktok">TIKTOK</option>
            <option value="instagram">INSTAGRAM</option>
            <option value="youtube">YOUTUBE</option>
            <option value="twitch">TWITCH</option>
          </select>

          <select
            value={filters.niche}
            onChange={(e) => setFilters({ ...filters, niche: e.target.value })}
            className="bg-card border border-border rounded px-3 py-2 font-mono text-xs text-muted-foreground focus:outline-none focus:border-foreground/50"
          >
            <option value="">ALL NICHES</option>
            <option value="Tech">TECH</option>
            <option value="Lifestyle">LIFESTYLE</option>
            <option value="Gaming">GAMING</option>
            <option value="Fitness">FITNESS</option>
          </select>

          <select
            value={filters.tier}
            onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
            className="bg-card border border-border rounded px-3 py-2 font-mono text-xs text-muted-foreground focus:outline-none focus:border-foreground/50"
          >
            <option value="">ALL TIERS</option>
            <option value="nano">NANO</option>
            <option value="micro">MICRO</option>
            <option value="mid">MID</option>
            <option value="macro">MACRO</option>
            <option value="mega">MEGA</option>
          </select>
        </div>

        {/* Creator Cards Grid */}
        <div className="grid grid-cols-3 gap-5">
          {filteredCreators.map((creator: any) => {
            const isSelected = selectedIds.includes(creator.id);
            const tierClass = tierColors[creator.tier] || "text-muted-foreground border-border";
            return (
              <div
                key={creator.id}
                className={`bg-card border rounded-lg overflow-hidden transition-all ${
                  isSelected ? "border-primary" : "border-border hover:border-primary/30"
                }`}
              >
                {/* Portrait */}
                <div className="relative h-48 bg-muted grayscale flex items-center justify-center">
                  <span className="font-mono text-[9px] text-muted-foreground">PROFILE PHOTO</span>

                  {/* Tier badge */}
                  <span
                    className={`absolute top-3 left-3 font-mono text-[7px] border rounded px-1.5 py-0.5 tracking-widest ${tierClass}`}
                    style={{ textTransform: "uppercase" }}
                  >
                    {creator.tier}
                  </span>

                  {creator.verificationStatus === "verified" && (
                    <span className="absolute top-3 right-3 font-mono text-[7px] rounded px-1.5 py-0.5 tracking-widest bg-signal/20 text-signal border border-signal/40">
                      VERIFIED
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <h3 className="font-display text-xl tracking-wider text-foreground">{creator.displayName}</h3>
                  <p className="font-mono text-[9px] text-muted-foreground mb-1">@{creator.displayName.toLowerCase().replace(/\s/g, "_")}</p>
                  <p className="font-mono text-[9px] text-primary mb-3 tracking-widest">
                    VYRAL SCORE {creator.vyralScore ?? "—"}
                  </p>

                  <div className="flex gap-4 mb-4">
                    <div>
                      <p className="font-mono text-[7px] text-muted-foreground tracking-widest uppercase">ENG. RATE</p>
                      <p className="font-mono text-sm text-foreground font-bold">{creator.engagementRate}%</p>
                    </div>
                    <div>
                      <p className="font-mono text-[7px] text-muted-foreground tracking-widest uppercase">AVG VIEWS</p>
                      <p className="font-mono text-sm text-foreground font-bold">
                        {creator.totalFollowers > 1000000
                          ? `${(creator.totalFollowers / 1000000).toFixed(1)}M`
                          : `${(creator.totalFollowers / 1000).toFixed(0)}K`}
                      </p>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="space-y-2">
                      <button className="w-full py-2 bg-primary text-primary-foreground font-mono text-[8px] tracking-widest rounded hover:bg-primary/90 transition-colors">
                        LAUNCH CAMPAIGN
                      </button>
                      <p className="font-mono text-[7px] text-muted-foreground text-center">
                        Est. Reach: {creator.totalFollowers > 1000000
                          ? `${(creator.totalFollowers / 1000000).toFixed(1)}M`
                          : `${(creator.totalFollowers / 1000).toFixed(0)}K`}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleSelect(creator.id)}
                      className="w-full py-2 border border-border font-mono text-[8px] tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors rounded"
                    >
                      HAND-PICK
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredCreators.length === 0 && (
          <div className="py-12 text-center">
            <p className="font-mono text-xs text-muted-foreground">NO CREATORS FOUND</p>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-primary/40 rounded-lg px-6 py-3 flex items-center gap-6 shadow-xl z-50">
          <p className="font-mono text-xs text-foreground">
            <span className="text-primary font-bold">{selectedIds.length}</span> CREATORS SELECTED
          </p>
          <button
            onClick={() => setSelectedIds([])}
            className="font-mono text-[9px] text-muted-foreground hover:text-foreground transition-colors tracking-widest"
          >
            CLEAR
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground font-mono text-[9px] tracking-widest rounded hover:bg-primary/90 transition-colors">
            LAUNCH CAMPAIGN WITH ROSTER
          </button>
        </div>
      )}
    </AppLayout>
  );
}
