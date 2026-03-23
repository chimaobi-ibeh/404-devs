import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Play, CheckCircle, Circle } from "lucide-react";

const mockBrief = {
  id: "VY-CA-082",
  coreMessage: "Showcase the product's speed and reliability in an authentic, creator-native style. Prioritize storytelling over hard-sell.",
  requirements: [
    { text: "Product must be shown in use for at least 10 seconds", done: true },
    { text: "Include verbal call-to-action with discount code", done: true },
    { text: "Brand logo visible in frame during CTA", done: false },
    { text: "No competitor brand mentions or logos", done: true },
  ],
  visualGuidelines: ["DARK_AESTHETIC", "NO_FILTERS"],
  revisionUsed: 0,
  revisionTotal: 1,
};

export default function ContentApproval() {
  const [, params] = useRoute("/brand/content-approval/:campaignId");
  const campaignId = params?.campaignId ?? "unknown";
  const [feedback, setFeedback] = useState("");

  const approveContent = trpc.advertiser.approveContent.useMutation();
  const requestRevision = trpc.advertiser.requestRevision.useMutation();

  // Note: actual calls require a submissionId from the loaded submission
  const handleApprove = () => {
    // approveContent.mutate({ submissionId: ... });
  };

  const handleRevision = () => {
    // requestRevision.mutate({ submissionId: ..., notes: feedback });
  };

  return (
    <AppLayout activeNav="CAMPAIGNS">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-4xl tracking-wider text-foreground">REVIEW SUBMISSION</h1>
            <span className="font-mono text-[9px] text-gold border border-gold/40 rounded px-2 py-0.5 tracking-widest">
              PENDING REVIEW
            </span>
          </div>
          <p className="font-mono text-xs text-muted-foreground tracking-widest">
            Creator: <span className="text-foreground">@creator_handle</span> &nbsp;•&nbsp; Campaign ID: {campaignId}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="col-span-2 space-y-6">
            {/* Video Player Placeholder */}
            <div className="bg-black rounded-lg border border-border overflow-hidden">
              <div className="relative aspect-video flex items-center justify-center bg-black">
                <button className="w-16 h-16 rounded-full border-2 border-foreground/30 flex items-center justify-center hover:border-foreground transition-colors group">
                  <Play className="w-6 h-6 text-foreground/60 group-hover:text-foreground ml-0.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
                  {/* Progress bar */}
                  <div className="h-1 bg-foreground/20 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-primary rounded-full w-1/3" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-muted-foreground">0:12</span>
                    <span className="font-mono text-[9px] text-muted-foreground">0:35</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Proposed Caption */}
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">PROPOSED CAPTION</p>
              <div className="border-l-2 border-primary pl-4">
                <p className="text-sm text-foreground leading-relaxed">
                  "Finally found a tool that keeps up with my workflow. Real talk — this thing is fast.
                  Try it free with code CREATOR20 at checkout. Link in bio. 🚀 #sponsored #TechLife #CreatorTools"
                </p>
              </div>
            </div>

            {/* Feedback & Actions */}
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">FEEDBACK / NOTES</p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add feedback for the creator (optional for approval, required for revision)..."
                className="w-full h-24 bg-background border border-border rounded p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-foreground/50"
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleRevision}
                  disabled={requestRevision.isPending}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {requestRevision.isPending ? "REQUESTING..." : "REQUEST REVISION"}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approveContent.isPending}
                  className="flex-1 py-2.5 bg-signal text-background font-mono text-xs tracking-widest rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {approveContent.isPending ? "APPROVING..." : "APPROVE SUBMISSION"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel — Campaign Brief */}
          <div>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-xs text-foreground tracking-widest font-bold">CAMPAIGN BRIEF</p>
                <span className="font-mono text-[8px] text-muted-foreground tracking-widest">{mockBrief.id}</span>
              </div>

              {/* Core Message */}
              <div className="mb-5">
                <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">THE CORE MESSAGE</p>
                <p className="text-xs text-foreground leading-relaxed">{mockBrief.coreMessage}</p>
              </div>

              {/* Requirements */}
              <div className="mb-5">
                <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-3">MANDATORY REQUIREMENTS</p>
                <div className="space-y-2">
                  {mockBrief.requirements.map((req, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {req.done ? (
                        <CheckCircle className="w-3.5 h-3.5 text-signal shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-border shrink-0 mt-0.5" />
                      )}
                      <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">{req.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Guidelines */}
              <div className="mb-5">
                <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">VISUAL GUIDELINES</p>
                <div className="flex gap-2 flex-wrap">
                  {mockBrief.visualGuidelines.map((g) => (
                    <span key={g} className="font-mono text-[8px] border border-border rounded px-2 py-1 text-muted-foreground">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Revision Allowance */}
              <div>
                <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase mb-2">REVISION ALLOWANCE</p>
                <p className="font-mono text-sm text-foreground font-bold">
                  {mockBrief.revisionUsed}/{mockBrief.revisionTotal} USED
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
