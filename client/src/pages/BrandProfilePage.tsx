import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { CheckCircle } from "lucide-react";

export default function BrandProfilePage() {
  const [, params] = useRoute("/brand/profile/:id");
  const brandUserId = params?.id ? parseInt(params.id) : 0;

  const { data: profile } = trpc.advertiser.getPublicProfile.useQuery(
    { userId: brandUserId },
    { enabled: !!brandUserId }
  );
  const { data: activeCampaigns = [] } = trpc.advertiser.getPublicCampaigns.useQuery(
    { userId: brandUserId },
    { enabled: !!brandUserId }
  );

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl">
        {/* Brand header card */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-start gap-5">
            {/* Logo placeholder */}
            <div className="w-16 h-16 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="font-display text-2xl text-primary">
                {(profile?.companyName ?? "B")[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-3xl tracking-wider text-foreground">
                  {profile?.companyName ?? `BRAND #${brandUserId}`}
                </h1>
                {profile?.verificationStatus === "verified" && (
                  <CheckCircle className="w-5 h-5 text-signal shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {profile?.industry && (
                  <span className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground border border-border rounded px-2 py-0.5">
                    {profile.industry}
                  </span>
                )}
                {profile?.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[9px] text-primary hover:underline tracking-widest"
                  >
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {profile?.description && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">ABOUT</p>
            <p className="text-sm text-foreground leading-relaxed">{profile.description}</p>
          </div>
        )}

        {/* Active campaigns */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-mono text-xs font-bold tracking-widest uppercase">ACTIVE CAMPAIGNS</h2>
          </div>

          {activeCampaigns.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-mono text-xs text-muted-foreground">NO ACTIVE CAMPAIGNS</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activeCampaigns.map((campaign: any) => (
                <div key={campaign.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-bold text-foreground uppercase truncate">
                      {campaign.title}
                    </p>
                    {campaign.description && (
                      <p className="font-mono text-[9px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {campaign.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {campaign.category && (
                        <span className="font-mono text-[8px] text-muted-foreground border border-border rounded px-1.5 py-0.5 tracking-widest uppercase">
                          {campaign.category}
                        </span>
                      )}
                      {campaign.budget && (
                        <span className="font-mono text-[8px] text-signal">
                          ${Number(campaign.budget).toLocaleString()} BUDGET
                        </span>
                      )}
                      {campaign.deadline && (
                        <span className="font-mono text-[8px] text-muted-foreground">
                          Deadline: {new Date(campaign.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-[7px] text-signal border border-signal/40 rounded px-2 py-0.5 tracking-widest shrink-0 mt-1">
                    ● ACTIVE
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
