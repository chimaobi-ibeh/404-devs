import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Filter, Download, X } from "lucide-react";
import { toast } from "sonner";

const niches = ["#TECH_CORE", "#LIFESTYLE_X", "#GAMING_PRO"];
const platforms = ["TIKTOK", "REELS", "X"];

export default function VyralMatch() {
  const [, params] = useRoute("/brand/vyral-match/:campaignId");
  const campaignId = params?.campaignId ? parseInt(params.campaignId) : 0;

  const { data: matches, isLoading, refetch } = trpc.vyralMatch.getMatches.useQuery({ campaignId });
  const acceptMatch = trpc.vyralMatch.acceptMatch.useMutation({
    onSuccess: () => { toast.success("Creator invited to campaign"); setInviteModal(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [showFilter, setShowFilter] = useState(true);
  const [activePlatforms, setActivePlatforms] = useState<string[]>([]);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(0);
  const [inviteModal, setInviteModal] = useState<{ scoreId: number; creatorId: number } | null>(null);
  const [feeInput, setFeeInput] = useState("");

  const togglePlatform = (p: string) =>
    setActivePlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const toggleNiche = (n: string) =>
    setSelectedNiches((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);

  // Apply filters to real match data
  const filteredMatches = (matches ?? []).filter((m) => {
    if (minScore > 0 && Number(m.totalScore) < minScore) return false;
    if (selectedNiches.length > 0) {
      const reason = m.matchReason.toLowerCase();
      const anyMatch = selectedNiches.some((n) =>
        reason.includes(n.replace("#", "").replace(/_/g, " ").toLowerCase())
      );
      if (!anyMatch) return false;
    }
    return true;
  });

  const topScore = matches && matches.length > 0 ? Math.round(Number(matches[0].totalScore)) : null;

  function handleExport() {
    if (!matches || matches.length === 0) { toast.error("No matches to export"); return; }
    const rows = ["Creator ID,Total Score,Niche Score,Engagement Score,Tier Score,Match Reason"];
    matches.forEach((m) => {
      rows.push(
        `${m.creatorId},${m.totalScore},${m.nicheScore},${m.engagementScore},${m.tierScore},"${m.matchReason.replace(/"/g, "'")}"`
      );
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyral-match-campaign-${campaignId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[9px] text-signal border border-signal/40 rounded px-2 py-0.5 tracking-widest">
                ALGORITHM V4.2
              </span>
              <span className="font-mono text-[9px] text-muted-foreground tracking-widest">
                QRY: VY-{campaignId.toString().padStart(3, "0")}
              </span>
            </div>
            <h1 className="font-display text-5xl tracking-wider">
              <span className="text-foreground">ENGINE MATCH: </span>
              <span className="text-primary italic">
                {topScore !== null ? `${topScore}% CONFIDENCE` : isLoading ? "SCANNING..." : "NO MATCHES YET"}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilter((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 border font-mono text-xs tracking-widest transition-colors rounded ${
                showFilter
                  ? "border-foreground text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              FILTER
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-border font-mono text-xs tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground transition-colors rounded"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Left Filter Panel */}
          {showFilter && (
            <div className="w-56 shrink-0 space-y-5">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[9px] text-foreground tracking-widest font-bold uppercase">REFINE RESULTS</p>
                  <span className="font-mono text-[8px] text-signal border border-signal/40 rounded px-1.5 py-0.5 tracking-widest animate-pulse">
                    LIVE_UPDATE
                  </span>
                </div>

                {/* Platform Affinity */}
                <div className="mb-5">
                  <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">PLATFORM AFFINITY</p>
                  <div className="flex flex-wrap gap-1.5">
                    {platforms.map((p) => (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className={`px-2 py-1 rounded font-mono text-[8px] tracking-widest transition-colors ${
                          activePlatforms.includes(p)
                            ? "border border-foreground text-foreground"
                            : "border border-border text-muted-foreground hover:border-foreground/50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fit Score Minimum */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">MIN FIT SCORE</p>
                    <span className="font-mono text-[8px] text-foreground">{minScore > 0 ? `${minScore}%` : "ALL"}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={95}
                    step={5}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-full accent-signal h-1"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="font-mono text-[8px] text-muted-foreground">0%</span>
                    <span className="font-mono text-[8px] text-muted-foreground">95%</span>
                  </div>
                </div>

                {/* Niche Selection */}
                <div className="mb-5">
                  <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">NICHE SELECTION</p>
                  <div className="space-y-2">
                    {niches.map((niche) => (
                      <label key={niche} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedNiches.includes(niche)}
                          onChange={() => toggleNiche(niche)}
                          className="w-3 h-3 accent-signal"
                        />
                        <span className="font-mono text-[9px] text-muted-foreground tracking-wider">{niche}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Creator Insight */}
                <div className="bg-muted/30 rounded border border-border p-3 mb-4">
                  <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-1">CREATOR INSIGHT</p>
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                    "Top-tier creators in your niche show 3x higher engagement than average profiles."
                  </p>
                </div>

                {/* Reset filters */}
                {(selectedNiches.length > 0 || minScore > 0 || activePlatforms.length > 0) && (
                  <button
                    onClick={() => { setSelectedNiches([]); setMinScore(0); setActivePlatforms([]); }}
                    className="w-full py-2 border border-border text-muted-foreground font-mono text-[8px] tracking-widest rounded hover:border-foreground hover:text-foreground transition-colors"
                  >
                    CLEAR FILTERS
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Creator Cards Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredMatches.length > 0 ? (
              <div>
                {/* Featured card (top match) */}
                <div className="bg-card border border-primary/30 rounded-lg p-5 mb-4">
                  <div className="flex items-start gap-5">
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-lg bg-muted border border-border overflow-hidden grayscale">
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-mono text-xs text-muted-foreground">IMG</span>
                        </div>
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 font-mono text-[8px] bg-signal text-background px-1.5 py-0.5 rounded tracking-widest">
                        {filteredMatches[0].totalScore}% FIT
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-2xl tracking-wider text-foreground mb-1">
                        CREATOR #{filteredMatches[0].creatorId}
                      </h3>
                      <p className="font-mono text-[9px] text-muted-foreground mb-3">{filteredMatches[0].matchReason}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mb-4">
                        {[
                          { label: "NICHE SCORE", val: `${filteredMatches[0].nicheScore}` },
                          { label: "ENGAGEMENT SCORE", val: `${filteredMatches[0].engagementScore}` },
                          { label: "TIER SCORE", val: `${filteredMatches[0].tierScore}` },
                        ].map((stat) => (
                          <div key={stat.label}>
                            <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{stat.label}</p>
                            <p className="font-mono text-sm text-foreground font-bold">{stat.val}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setInviteModal({ scoreId: filteredMatches[0].id, creatorId: filteredMatches[0].creatorId })}
                        className="px-4 py-2 bg-primary text-primary-foreground font-mono text-[9px] tracking-widest rounded hover:bg-primary/90 transition-colors"
                      >
                        INVITE TO CAMPAIGN (PRIORITY)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Other cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {filteredMatches.slice(1).map((match) => (
                    <div key={match.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors">
                      <div className="relative">
                        <div className="h-32 bg-muted grayscale flex items-center justify-center">
                          <span className="font-mono text-[9px] text-muted-foreground">PROFILE PHOTO</span>
                        </div>
                        <span className="absolute top-2 right-2 font-mono text-[8px] bg-signal text-background px-1.5 py-0.5 rounded tracking-widest">
                          {match.totalScore}% FIT
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-lg tracking-wider text-foreground mb-1">
                          CREATOR #{match.creatorId}
                        </h3>
                        <p className="font-mono text-[8px] text-muted-foreground mb-3 line-clamp-2">{match.matchReason}</p>
                        <div className="flex gap-4 mb-3">
                          <div>
                            <p className="font-mono text-[7px] text-muted-foreground tracking-widest">NICHE SCORE</p>
                            <p className="font-mono text-xs text-foreground font-bold">{match.nicheScore}</p>
                          </div>
                          <div>
                            <p className="font-mono text-[7px] text-muted-foreground tracking-widest">AVG ENG</p>
                            <p className="font-mono text-xs text-foreground font-bold">{match.engagementScore}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setInviteModal({ scoreId: match.id, creatorId: match.creatorId })}
                          className="w-full py-1.5 border border-border font-mono text-[8px] tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors rounded"
                        >
                          INVITE TO CAMPAIGN
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredMatches.length < (matches?.length ?? 0) && (
                  <p className="mt-4 font-mono text-[9px] text-muted-foreground text-center tracking-widest">
                    {(matches?.length ?? 0) - filteredMatches.length} RESULTS HIDDEN BY FILTERS
                  </p>
                )}
              </div>
            ) : matches && matches.length > 0 ? (
              <div className="bg-card border border-border rounded-lg p-16 text-center">
                <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-2">NO MATCHES PASS CURRENT FILTERS</p>
                <button
                  onClick={() => { setSelectedNiches([]); setMinScore(0); setActivePlatforms([]); }}
                  className="font-mono text-[9px] text-primary tracking-widest hover:underline"
                >
                  CLEAR FILTERS →
                </button>
              </div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-lg p-16 text-center">
                <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-2">NO MATCHES GENERATED YET</p>
                <p className="font-mono text-[9px] text-muted-foreground">Run Vyral Match from the campaign detail page to generate creator matches.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Fee Modal */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-foreground font-bold tracking-widest">SET CREATOR FEE</p>
              <button onClick={() => setInviteModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground mb-4">
              Creator #{inviteModal.creatorId} — enter the fee (₦) you'll pay this creator for the campaign.
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 50,000"
              value={feeInput ? Number(feeInput).toLocaleString("en-NG") : ""}
              onChange={(e) => setFeeInput(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const fee = parseFloat(feeInput);
                  if (!fee || fee <= 0) { toast.error("Enter a valid fee amount"); return; }
                  acceptMatch.mutate({ scoreId: inviteModal.scoreId, creatorFee: fee });
                }}
                disabled={acceptMatch.isPending}
                className="flex-1 py-2 bg-primary text-primary-foreground font-mono text-[9px] tracking-widest rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {acceptMatch.isPending ? "SENDING..." : "CONFIRM INVITE"}
              </button>
              <button
                onClick={() => setInviteModal(null)}
                className="px-4 py-2 border border-border font-mono text-[9px] tracking-widest text-muted-foreground hover:text-foreground rounded"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
