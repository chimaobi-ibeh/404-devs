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

  const [activePlatforms, setActivePlatforms] = useState<string[]>(["TIKTOK"]);
  const [selectedNiches, setSelectedNiches] = useState<string[]>(["#TECH_CORE"]);
  const [inviteModal, setInviteModal] = useState<{ scoreId: number; creatorId: number } | null>(null);
  const [feeInput, setFeeInput] = useState("");

  const togglePlatform = (p: string) =>
    setActivePlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const toggleNiche = (n: string) =>
    setSelectedNiches((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);

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
              <span className="text-primary italic">98.4% CONFIDENCE</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-border font-mono text-xs tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground transition-colors rounded">
              <Filter className="w-3.5 h-3.5" />
              FILTER
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-border font-mono text-xs tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground transition-colors rounded">
              <Download className="w-3.5 h-3.5" />
              EXPORT
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Left Filter Panel */}
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

              {/* Fit Score Range */}
              <div className="mb-5">
                <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">FIT SCORE RANGE</p>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[8px] text-muted-foreground">70%</span>
                  <span className="font-mono text-[8px] text-muted-foreground">100%</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-signal rounded-full w-4/5" />
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

              {/* Pro Access */}
              <div>
                <p className="font-mono text-[8px] text-gold tracking-widest uppercase mb-2">PRO ACCESS</p>
                <button className="w-full py-2 border border-gold text-gold font-mono text-[8px] tracking-widest rounded hover:bg-gold/10 transition-colors">
                  UPGRADE TO PRO
                </button>
              </div>
            </div>
          </div>

          {/* Creator Cards Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : matches && matches.length > 0 ? (
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
                        {matches[0].totalScore}% FIT
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-2xl tracking-wider text-foreground mb-1">
                        CREATOR #{matches[0].creatorId}
                      </h3>
                      <p className="font-mono text-[9px] text-muted-foreground mb-3">{matches[0].matchReason}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mb-4">
                        {[
                          { label: "AUDIENCE GROWTH", val: "+24.3%" },
                          { label: "AVG CPV", val: "₦0.012" },
                          { label: "BRAND AFFINITY", val: `${matches[0].nicheScore}` },
                        ].map((stat) => (
                          <div key={stat.label}>
                            <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{stat.label}</p>
                            <p className="font-mono text-sm text-foreground font-bold">{stat.val}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setInviteModal({ scoreId: matches[0].id, creatorId: matches[0].creatorId })}
                        className="px-4 py-2 bg-primary text-primary-foreground font-mono text-[9px] tracking-widest rounded hover:bg-primary/90 transition-colors"
                      >
                        INVITE TO CAMPAIGN (PRIORITY)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Other cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {matches.slice(1).map((match) => (
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
                            <p className="font-mono text-[7px] text-muted-foreground tracking-widest">FOLLOWERS</p>
                            <p className="font-mono text-xs text-foreground font-bold">84.2K</p>
                          </div>
                          <div>
                            <p className="font-mono text-[7px] text-muted-foreground tracking-widest">AVG ENG</p>
                            <p className="font-mono text-xs text-foreground font-bold">{match.engagementScore}%</p>
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
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {/* Static placeholder cards */}
                {[
                  { name: "LUMINARY_KAI", fit: "98.4", eng: "8.4%", followers: "284K" },
                  { name: "NOVA_X", fit: "94.1", eng: "6.1%", followers: "142K" },
                  { name: "SPECTRAL_J", fit: "91.7", eng: "12.3%", followers: "512K" },
                  { name: "ECHO_RISE", fit: "89.3", eng: "9.7%", followers: "76K" },
                  { name: "PRISM_WAVE", fit: "85.5", eng: "7.2%", followers: "203K" },
                  { name: "DRIFT_CO", fit: "82.1", eng: "5.8%", followers: "94K" },
                ].map((creator, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors">
                    <div className="relative">
                      <div className="h-32 bg-muted grayscale flex items-center justify-center">
                        <span className="font-mono text-[9px] text-muted-foreground">PROFILE PHOTO</span>
                      </div>
                      <span className="absolute top-2 right-2 font-mono text-[8px] bg-signal text-background px-1.5 py-0.5 rounded tracking-widest">
                        {creator.fit}% FIT
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-lg tracking-wider text-foreground mb-1">{creator.name}</h3>
                      <div className="flex gap-1.5 mb-3">
                        <span className="font-mono text-[7px] border border-border rounded px-1 py-0.5 text-muted-foreground">#TECH_CORE</span>
                        <span className="font-mono text-[7px] border border-border rounded px-1 py-0.5 text-muted-foreground">#LIFESTYLE</span>
                      </div>
                      <div className="flex gap-4 mb-3">
                        <div>
                          <p className="font-mono text-[7px] text-muted-foreground tracking-widest">FOLLOWERS</p>
                          <p className="font-mono text-xs text-foreground font-bold">{creator.followers}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[7px] text-muted-foreground tracking-widest">AVG ENG</p>
                          <p className="font-mono text-xs text-foreground font-bold">{creator.eng}</p>
                        </div>
                      </div>
                      <button className="w-full py-1.5 border border-border font-mono text-[8px] tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors rounded">
                        INVITE TO CAMPAIGN
                      </button>
                    </div>
                  </div>
                ))}
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
              type="number"
              placeholder="e.g. 50000"
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
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
