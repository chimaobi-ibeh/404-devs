import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { CheckCircle, Circle, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

export default function ContentApproval() {
  const [, params] = useRoute("/brand/content-approval/:campaignId");
  const campaignId = params?.campaignId ? parseInt(params.campaignId) : 0;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState<Record<number, "approved" | "revision">>({});

  const { data: campaign } = trpc.advertiser.getCampaign.useQuery({ id: campaignId }, { enabled: !!campaignId });
  const { data: submissions = [], refetch } = trpc.advertiser.getContentSubmissions.useQuery(
    { campaignId },
    { enabled: !!campaignId }
  );

  const approveContent = trpc.advertiser.approveContent.useMutation({
    onSuccess: () => {
      setDone((d) => ({ ...d, [sub.id]: "approved" }));
      setFeedback("");
      refetch();
    },
  });
  const requestRevision = trpc.advertiser.requestRevision.useMutation({
    onSuccess: () => {
      setDone((d) => ({ ...d, [sub.id]: "revision" }));
      setFeedback("");
      refetch();
    },
  });

  const pending = (submissions as any[]).filter((s) => s.draftStatus === "draft_submitted" || s.draftStatus === "pending");
  const sub = pending[selectedIndex] ?? (submissions as any[])[selectedIndex];

  if (!campaignId) {
    return (
      <AppLayout>
        <div className="p-8 font-mono text-sm text-muted-foreground">INVALID CAMPAIGN</div>
      </AppLayout>
    );
  }

  if ((submissions as any[]).length === 0) {
    return (
      <AppLayout>
        <div className="p-8">
          <h1 className="font-display text-3xl tracking-wider text-foreground mb-2">REVIEW SUBMISSIONS</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-widest mb-8">
            Campaign: <span className="text-foreground">{campaign?.title ?? `#${campaignId}`}</span>
          </p>
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="font-mono text-xs text-muted-foreground tracking-widest">NO SUBMISSIONS YET</p>
            <p className="font-mono text-[9px] text-muted-foreground mt-2">
              Creators will submit their draft content here once they're ready.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const allSubs = submissions as any[];
  const total = allSubs.length;

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2">
            <h1 className="font-display text-3xl md:text-4xl tracking-wider text-foreground">REVIEW SUBMISSIONS</h1>
            <span className="font-mono text-[9px] text-gold border border-gold/40 rounded px-2 py-0.5 tracking-widest">
              {pending.length} PENDING
            </span>
          </div>
          <p className="font-mono text-xs text-muted-foreground tracking-widest">
            Campaign: <span className="text-foreground">{campaign?.title ?? `#${campaignId}`}</span>
          </p>
        </div>

        {/* Submission selector */}
        {total > 1 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {allSubs.map((s, i) => {
              const statusColor =
                s.draftStatus === "approved" ? "border-signal text-signal" :
                s.draftStatus === "revision_requested" ? "border-gold text-gold" :
                "border-border text-muted-foreground";
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelectedIndex(i); setFeedback(""); }}
                  className={`shrink-0 px-3 py-1.5 rounded border font-mono text-[9px] tracking-widest transition-colors ${
                    i === selectedIndex ? "bg-primary/10 border-primary text-primary" : statusColor + " hover:border-foreground hover:text-foreground"
                  }`}
                >
                  CREATOR #{s.creatorId}
                  <span className="ml-1.5 opacity-60">{s.draftStatus?.toUpperCase().replace("_", " ") ?? "PENDING"}</span>
                </button>
              );
            })}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <button
                onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                disabled={selectedIndex === 0}
                className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="font-mono text-[9px] text-muted-foreground w-10 text-center">
                {selectedIndex + 1}/{total}
              </span>
              <button
                onClick={() => setSelectedIndex((i) => Math.min(total - 1, i + 1))}
                disabled={selectedIndex === total - 1}
                className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {sub && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Main Panel */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Submission status */}
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">SUBMISSION DETAILS</p>
                  <span className={`font-mono text-[8px] border rounded px-2 py-0.5 tracking-widest uppercase ${
                    sub.draftStatus === "approved" ? "text-signal border-signal/40" :
                    sub.draftStatus === "revision_requested" ? "text-gold border-gold/40" :
                    "text-muted-foreground border-border"
                  }`}>{sub.draftStatus?.replace(/_/g, " ") ?? "PENDING"}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-muted-foreground w-20">CREATOR</span>
                    <span className="font-mono text-xs text-foreground font-bold">#{sub.creatorId}</span>
                  </div>
                  {sub.submittedAt && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-muted-foreground w-20">SUBMITTED</span>
                      <span className="font-mono text-xs text-foreground">
                        {new Date(sub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-muted-foreground w-20">REVISIONS</span>
                    <span className="font-mono text-xs text-foreground">{sub.revisionCount ?? 0} / 1 used</span>
                  </div>
                </div>
              </div>

              {/* Draft content link */}
              {sub.draftUrl ? (
                <div className="bg-card border border-border rounded-lg p-5">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">SUBMITTED CONTENT</p>
                  <a
                    href={sub.draftUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-mono text-xs text-primary hover:underline break-all"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {sub.draftUrl}
                  </a>
                  {sub.draftThumbnailUrl && (
                    <img
                      src={sub.draftThumbnailUrl}
                      alt="Draft thumbnail"
                      className="mt-3 rounded-lg max-h-48 object-cover border border-border"
                    />
                  )}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg p-5">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">SUBMITTED CONTENT</p>
                  <p className="font-mono text-xs text-muted-foreground">No content URL submitted yet.</p>
                </div>
              )}

              {/* Previous advertiser notes */}
              {sub.advertiserNotes && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-2">PREVIOUS NOTES</p>
                  <div className="border-l-2 border-gold pl-4">
                    <p className="text-xs text-foreground leading-relaxed">{sub.advertiserNotes}</p>
                  </div>
                </div>
              )}

              {/* Feedback & Actions */}
              {(sub.draftStatus === "draft_submitted" || sub.draftStatus === "pending") && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">FEEDBACK / NOTES</p>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Add feedback for the creator (optional for approval, required for revision)..."
                    className="w-full h-24 bg-background border border-border rounded p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-foreground/50"
                  />
                  {(approveContent.error || requestRevision.error) && (
                    <p className="font-mono text-[9px] text-destructive mt-2">
                      {approveContent.error?.message ?? requestRevision.error?.message}
                    </p>
                  )}
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => {
                        if (!feedback.trim()) return;
                        requestRevision.mutate({ submissionId: sub.id, notes: feedback });
                      }}
                      disabled={requestRevision.isPending || !feedback.trim()}
                      className="flex-1 py-2.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                      title={!feedback.trim() ? "Add feedback notes before requesting revision" : ""}
                    >
                      {requestRevision.isPending ? "REQUESTING..." : "REQUEST REVISION"}
                    </button>
                    <button
                      onClick={() => approveContent.mutate({ submissionId: sub.id })}
                      disabled={approveContent.isPending}
                      className="flex-1 py-2.5 bg-signal text-background font-mono text-xs tracking-widest rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {approveContent.isPending ? "APPROVING..." : "APPROVE SUBMISSION"}
                    </button>
                  </div>
                </div>
              )}

              {/* Already actioned state */}
              {sub.draftStatus === "approved" && (
                <div className="bg-signal/10 border border-signal/30 rounded-lg p-5 text-center">
                  <CheckCircle className="w-6 h-6 text-signal mx-auto mb-2" />
                  <p className="font-mono text-xs text-signal tracking-widest">SUBMISSION APPROVED</p>
                </div>
              )}
              {sub.draftStatus === "revision_requested" && (
                <div className="bg-gold/10 border border-gold/30 rounded-lg p-5 text-center">
                  <p className="font-mono text-xs text-gold tracking-widest">REVISION REQUESTED — AWAITING RESUBMISSION</p>
                </div>
              )}
            </div>

            {/* Right Panel — Campaign Brief */}
            <div>
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-xs text-foreground tracking-widest font-bold">CAMPAIGN BRIEF</p>
                  <span className="font-mono text-[8px] text-muted-foreground tracking-widest">
                    CID-{campaignId.toString().padStart(3, "0")}
                  </span>
                </div>

                {campaign ? (
                  <>
                    {campaign.deliverables && (
                      <div className="mb-4">
                        <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">DELIVERABLES</p>
                        <p className="text-xs text-foreground leading-relaxed">{campaign.deliverables}</p>
                      </div>
                    )}

                    {campaign.contentDos && (
                      <div className="mb-4">
                        <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">DO'S</p>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-signal shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground leading-relaxed">{campaign.contentDos}</p>
                        </div>
                      </div>
                    )}

                    {campaign.contentDonts && (
                      <div className="mb-4">
                        <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">DON'TS</p>
                        <div className="flex items-start gap-2">
                          <Circle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground leading-relaxed">{campaign.contentDonts}</p>
                        </div>
                      </div>
                    )}

                    {(campaign as any).requiredHashtags && (
                      <div className="mb-4">
                        <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">REQUIRED HASHTAGS</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {(() => {
                            try {
                              const tags = typeof (campaign as any).requiredHashtags === "string"
                                ? JSON.parse((campaign as any).requiredHashtags)
                                : ((campaign as any).requiredHashtags ?? []);
                              return (tags as string[]).map((t) => (
                                <span key={t} className="font-mono text-[8px] border border-border rounded px-2 py-1 text-muted-foreground">
                                  #{t}
                                </span>
                              ));
                            } catch { return null; }
                          })()}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">REVISION ALLOWANCE</p>
                      <p className="font-mono text-sm text-foreground font-bold">
                        {sub.revisionCount ?? 0}/1 USED
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    {[80, 60, 40].map((w) => (
                      <div key={w} className={`h-3 w-${w} bg-muted animate-pulse rounded`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
