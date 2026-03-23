import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { CheckCircle, ExternalLink } from "lucide-react";

const platformColors: Record<string, string> = {
  instagram: "text-pink-400 border-pink-400/40",
  tiktok: "text-foreground border-border",
  youtube: "text-red-400 border-red-400/40",
  x: "text-sky-400 border-sky-400/40",
  twitch: "text-purple-400 border-purple-400/40",
};

export default function CreatorProfilePage() {
  const [, params] = useRoute("/creator/profile/:id");
  const creatorProfileId = params?.id ? parseInt(params.id) : 0;

  const { data: profile, isLoading } = trpc.creator.getPublicProfile.useQuery(
    { creatorProfileId },
    { enabled: !!creatorProfileId }
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 space-y-4">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="p-8 font-mono text-sm text-muted-foreground">CREATOR NOT FOUND</div>
      </AppLayout>
    );
  }

  const vyralScore = Number(profile.vyralScore ?? 0);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-3xl">
        {/* Header card */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
              {profile.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-2xl text-primary">
                  {(profile.displayName ?? "C")[0].toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="font-display text-3xl tracking-wider text-foreground">
                  {profile.displayName ?? profile.userName ?? `Creator #${profile.id}`}
                </h1>
                {profile.verificationStatus === "verified" && (
                  <CheckCircle className="w-5 h-5 text-signal shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {profile.niche && (
                  <span className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground border border-border rounded px-2 py-0.5">
                    {profile.niche}
                  </span>
                )}
                {profile.tier && (
                  <span className="font-mono text-[9px] tracking-widest uppercase text-primary border border-primary/40 rounded px-2 py-0.5">
                    {profile.tier}
                  </span>
                )}
                {profile.country && (
                  <span className="font-mono text-[9px] text-muted-foreground">{profile.country}</span>
                )}
              </div>
            </div>

            {/* Vyral Score */}
            <div className="shrink-0 text-right">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">VYRAL SCORE</p>
              <p className="font-mono text-2xl text-primary font-bold">{vyralScore}</p>
              <p className="font-mono text-[8px] text-muted-foreground">/100</p>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">BIO</p>
            <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">FOLLOWERS</p>
            <p className="font-mono text-xl font-bold text-foreground">
              {Number(profile.totalFollowers ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">ENGAGEMENT</p>
            <p className="font-mono text-xl font-bold text-foreground">
              {Number(profile.engagementRate ?? 0).toFixed(2)}%
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">CAMPAIGNS</p>
            <p className="font-mono text-xl font-bold text-foreground">
              {profile.portfolioItems?.length ?? 0}
            </p>
          </div>
        </div>

        {/* Social Accounts */}
        {profile.socialAccounts && profile.socialAccounts.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-mono text-xs font-bold tracking-widest uppercase">SOCIAL ACCOUNTS</h2>
            </div>
            <div className="divide-y divide-border">
              {profile.socialAccounts.map((account: any) => (
                <div key={account.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-[9px] border rounded px-1.5 py-0.5 tracking-widest uppercase ${platformColors[account.platform] ?? "text-muted-foreground border-border"}`}>
                      {account.platform}
                    </span>
                    <div>
                      <p className="font-mono text-xs text-foreground font-bold">@{account.username}</p>
                      <p className="font-mono text-[8px] text-muted-foreground">
                        {Number(account.followers ?? 0).toLocaleString()} followers • {Number(account.engagementRate ?? 0).toFixed(2)}% engagement
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {account.verificationStatus === "verified" && (
                      <CheckCircle className="w-3.5 h-3.5 text-signal" />
                    )}
                    {account.profileUrl && (
                      <a href={account.profileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {profile.portfolioItems && profile.portfolioItems.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-mono text-xs font-bold tracking-widest uppercase">PORTFOLIO</h2>
            </div>
            <div className="divide-y divide-border">
              {profile.portfolioItems.map((item: any) => (
                <div key={item.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-bold text-foreground uppercase truncate">{item.campaignTitle}</p>
                    {item.brand && (
                      <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{item.brand}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="font-mono text-[8px] text-muted-foreground border border-border rounded px-1.5 py-0.5 uppercase">{item.platform}</span>
                      {item.completedAt && (
                        <span className="font-mono text-[8px] text-muted-foreground">
                          {new Date(item.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.contentUrl && (
                    <a href={item.contentUrl} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
