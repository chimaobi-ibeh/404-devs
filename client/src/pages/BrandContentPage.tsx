import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { FileText, ExternalLink } from "lucide-react";

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  draft_submitted:    { label: "PENDING REVIEW", classes: "text-gold border-gold/40 bg-gold/5" },
  pending:            { label: "PENDING",         classes: "text-gold border-gold/40 bg-gold/5" },
  approved:           { label: "APPROVED",        classes: "text-signal border-signal/40 bg-signal/5" },
  revision_requested: { label: "REVISION",        classes: "text-destructive border-destructive/40 bg-destructive/5" },
};

function CampaignSubmissions({ campaignId, campaignTitle }: { campaignId: number; campaignTitle: string }) {
  const [, setLocation] = useLocation();
  const { data: submissions = [], isLoading } = trpc.advertiser.getContentSubmissions.useQuery({ campaignId });

  if (isLoading) {
    return (
      <div className="space-y-2 px-5 pb-4">
        {[1, 2].map((i) => <div key={i} className="h-12 bg-muted/30 animate-pulse rounded" />)}
      </div>
    );
  }

  if (!submissions.length) return null;

  const pending = (submissions as any[]).filter(
    (s) => s.draftStatus === "draft_submitted" || s.draftStatus === "pending"
  ).length;

  return (
    <div className="border-t border-border">
      {/* Campaign row */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/10">
        <div className="flex items-center gap-3">
          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-display text-sm tracking-wider text-foreground">
              {campaignTitle.toUpperCase().replace(/\s+/g, "_")}
            </p>
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest">
              {(submissions as any[]).length} SUBMISSION{(submissions as any[]).length !== 1 ? "S" : ""}
              {pending > 0 && <span className="text-gold ml-2">· {pending} NEED REVIEW</span>}
            </p>
          </div>
        </div>
        <button
          onClick={() => setLocation(`/brand/content-approval/${campaignId}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/40 text-primary font-mono text-[9px] tracking-widest rounded hover:bg-primary/10 transition-colors shrink-0"
        >
          <ExternalLink className="w-3 h-3" /> REVIEW ALL
        </button>
      </div>

      {/* Submission rows */}
      <div className="divide-y divide-border/50">
        {(submissions as any[]).map((s: any) => {
          const style = STATUS_STYLES[s.draftStatus] ?? { label: s.draftStatus?.toUpperCase() ?? "UNKNOWN", classes: "text-muted-foreground border-border" };
          return (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-foreground">CREATOR #{s.creatorId}</p>
                {s.submittedAt && (
                  <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                    Submitted {new Date(s.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              {s.draftUrl && (
                <a
                  href={s.draftUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="font-mono text-[9px] text-primary hover:underline flex items-center gap-1 shrink-0"
                >
                  <ExternalLink className="w-3 h-3" /> CONTENT
                </a>
              )}
              <span className={`font-mono text-[9px] border rounded px-2 py-0.5 tracking-widest shrink-0 ${style.classes}`}>
                {style.label}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground shrink-0">
                {s.revisionCount ?? 0}/1 REV
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BrandContentPage() {
  const { data: campaigns = [], isLoading: campaignsLoading } = trpc.advertiser.getCampaigns.useQuery({ limit: 100 });

  // Only show campaigns that are active or completed (ones that could have submissions)
  const relevantCampaigns = campaigns.filter((c) => c.status === "active" || c.status === "completed");

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="font-display text-3xl md:text-5xl tracking-wider text-foreground">CONTENT</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and approve creator submissions across all campaigns</p>
        </div>

        {campaignsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted/30 animate-pulse rounded-lg" />)}
          </div>
        ) : relevantCampaigns.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-16 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-mono text-xs text-muted-foreground tracking-widest">NO ACTIVE CAMPAIGNS WITH SUBMISSIONS</p>
            <p className="font-mono text-[9px] text-muted-foreground mt-2">
              Content submissions will appear here once creators submit drafts to your active campaigns.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
            {/* Table header */}
            <div className="px-5 py-3">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">
                {relevantCampaigns.length} CAMPAIGN{relevantCampaigns.length !== 1 ? "S" : ""} WITH CONTENT ACTIVITY
              </p>
            </div>
            {relevantCampaigns.map((c) => (
              <CampaignSubmissions key={c.id} campaignId={c.id} campaignTitle={c.title} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
