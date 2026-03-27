import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Shield, User, ChevronDown, ChevronUp, Plus, Trash2, Camera, CreditCard, Check } from "lucide-react";
import { toast } from "sonner";

const NIGERIAN_BANKS = [
  { code: "044", name: "Access Bank" }, { code: "023", name: "Citibank Nigeria" },
  { code: "050", name: "EcoBank Nigeria" }, { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" }, { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" }, { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" }, { code: "082", name: "Keystone Bank" },
  { code: "526", name: "Kuda MFB" }, { code: "090175", name: "Moniepoint MFB" },
  { code: "076", name: "Polaris Bank" }, { code: "221", name: "Stanbic IBTC Bank" },
  { code: "232", name: "Sterling Bank" }, { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa" }, { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" }, { code: "057", name: "Zenith Bank" },
  { code: "999992", name: "OPay" }, { code: "999991", name: "PalmPay" },
] as const;

const PLATFORMS = ["instagram", "tiktok", "youtube", "x", "twitch"] as const;
type Platform = typeof PLATFORMS[number];

export default function ProfilePage() {
  const { user } = useAuth();
  const role = user?.role ?? "creator";

  const { data: advertiserProfile } = trpc.advertiser.getProfile.useQuery(undefined, {
    enabled: role === "advertiser" || role === "admin",
  });
  const { data: creatorProfile } = trpc.creator.getProfile.useQuery(undefined, {
    enabled: role === "creator" || role === "admin",
  });
  const { data: socialAccounts, refetch: refetchSocial } = trpc.creator.getSocialAccounts.useQuery(undefined, {
    enabled: role === "creator" || role === "admin",
  });
  const { data: portfolioItems, refetch: refetchPortfolio } = trpc.creator.getPortfolio.useQuery(undefined, {
    enabled: role === "creator" || role === "admin",
  });

  const updateAdvertiser = trpc.advertiser.updateProfile.useMutation();
  const updateCreator = trpc.creator.updateProfile.useMutation();
  const upsertSocialAccount = trpc.creator.upsertSocialAccount.useMutation({ onSuccess: () => refetchSocial() });
  const deleteSocialAccount = trpc.creator.deleteSocialAccount.useMutation({ onSuccess: () => refetchSocial() });
  const addPortfolioItem = trpc.creator.addPortfolioItem.useMutation({ onSuccess: () => refetchPortfolio() });
  const deletePortfolioItem = trpc.creator.deletePortfolioItem.useMutation({ onSuccess: () => refetchPortfolio() });

  // Advertiser fields
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  // Creator core fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [niche, setNiche] = useState("");
  const [followers, setFollowers] = useState("");

  // Extended profile fields
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contentLanguages, setContentLanguages] = useState("");
  const [extendedExpanded, setExtendedExpanded] = useState(false);

  // Social account form
  const [showSocialForm, setShowSocialForm] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState<Platform>("instagram");
  const [socialUsername, setSocialUsername] = useState("");
  const [socialFollowers, setSocialFollowers] = useState("");
  const [socialEngagement, setSocialEngagement] = useState("");
  const [socialProfileUrl, setSocialProfileUrl] = useState("");

  // Photo upload
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Portfolio form
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [portBrand, setPortBrand] = useState("");
  const [portTitle, setPortTitle] = useState("");
  const [portPlatform, setPortPlatform] = useState<Platform>("instagram");
  const [portContentUrl, setPortContentUrl] = useState("");
  const [portCompletedAt, setPortCompletedAt] = useState("");
  const [portImpressions, setPortImpressions] = useState("");
  const [portReach, setPortReach] = useState("");
  const [portEngagement, setPortEngagement] = useState("");
  const [portViews, setPortViews] = useState("");

  useEffect(() => {
    if (advertiserProfile) {
      setCompanyName(advertiserProfile.companyName ?? "");
      setIndustry(advertiserProfile.industry ?? "");
      setWebsite(advertiserProfile.website ?? "");
      setDescription(advertiserProfile.description ?? "");
    }
  }, [advertiserProfile]);

  useEffect(() => {
    if (creatorProfile) {
      setDisplayName(creatorProfile.displayName ?? "");
      setBio(creatorProfile.bio ?? "");
      setNiche(creatorProfile.niche ?? "");
      setFollowers(String(creatorProfile.totalFollowers ?? 0));
      if ((creatorProfile as any).profileImageUrl) {
        setPhotoPreview((creatorProfile as any).profileImageUrl);
      }
      setFullName((creatorProfile as any).fullName ?? "");
      setDateOfBirth((creatorProfile as any).dateOfBirth ?? "");
      setCountry((creatorProfile as any).country ?? "");
      setPhoneNumber((creatorProfile as any).phoneNumber ?? "");
      const langs = (creatorProfile as any).contentLanguages;
      if (Array.isArray(langs)) setContentLanguages(langs.join(", "));
      else if (typeof langs === "string") {
        try { setContentLanguages(JSON.parse(langs).join(", ")); } catch { setContentLanguages(langs); }
      }
    }
  }, [creatorProfile]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const res = await fetch("/api/upload/profile-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        const body = await res.json();
        if (body.url) {
          updateCreator.mutate({ profileImageUrl: body.url });
          setPhotoPreview(body.url);
        }
      } finally {
        setPhotoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  const isSaving = updateAdvertiser.isPending || updateCreator.isPending;
  const saved = updateAdvertiser.isSuccess || updateCreator.isSuccess;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (role === "advertiser" || (role === "admin" && advertiserProfile)) {
      updateAdvertiser.mutate({ companyName, industry, website, description });
    } else if (role === "creator" || (role === "admin" && creatorProfile)) {
      const langs = contentLanguages
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
      updateCreator.mutate({
        displayName,
        bio,
        niche,
        totalFollowers: Number(followers) || 0,
        fullName: fullName || undefined,
        dateOfBirth: dateOfBirth || undefined,
        country: country || undefined,
        phoneNumber: phoneNumber || undefined,
        contentLanguages: langs.length > 0 ? langs : undefined,
      });
    }
  }

  function handleAddSocialAccount(e: React.FormEvent) {
    e.preventDefault();
    upsertSocialAccount.mutate({
      platform: socialPlatform,
      username: socialUsername,
      followers: Number(socialFollowers) || 0,
      engagementRate: Number(socialEngagement) || 0,
      profileUrl: socialProfileUrl || undefined,
    });
    setSocialUsername("");
    setSocialFollowers("");
    setSocialEngagement("");
    setSocialProfileUrl("");
    setShowSocialForm(false);
  }

  function handleAddPortfolioItem(e: React.FormEvent) {
    e.preventDefault();
    const metrics: any = {};
    if (portImpressions) metrics.impressions = Number(portImpressions);
    if (portReach) metrics.reach = Number(portReach);
    if (portEngagement) metrics.engagement = Number(portEngagement);
    if (portViews) metrics.views = Number(portViews);
    addPortfolioItem.mutate({
      brand: portBrand || undefined,
      campaignTitle: portTitle,
      platform: portPlatform,
      contentUrl: portContentUrl || undefined,
      completedAt: portCompletedAt || undefined,
      metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
    });
    setPortBrand("");
    setPortTitle("");
    setPortContentUrl("");
    setPortCompletedAt("");
    setPortImpressions("");
    setPortReach("");
    setPortEngagement("");
    setPortViews("");
    setShowPortfolioForm(false);
  }

  const initial = (user?.name ?? user?.email ?? "U")[0].toUpperCase();
  const roleBadgeColor = role === "admin" ? "text-primary border-primary/40 bg-primary/10"
    : role === "advertiser" ? "text-gold border-gold/40 bg-gold/10"
    : "text-signal border-signal/40 bg-signal/10";

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-6xl tracking-wider text-foreground">YOUR PROFILE</h1>
          <p className="text-muted-foreground mt-1">Manage your account and public information.</p>
        </div>

        {/* Avatar + account info */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6 flex items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} className="w-20 h-20 rounded-full object-cover border-2 border-primary/30" alt="Profile" />
              ) : (
                <span className="font-display text-4xl text-primary">{initial}</span>
              )}
            </div>
            {(role === "creator" || (role === "admin" && creatorProfile != null)) && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-50"
                  title="Upload photo"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-lg truncate">{user?.name ?? user?.email ?? "—"}</p>
            <p className="text-muted-foreground text-sm truncate">{user?.email}</p>
            {photoUploading && (
              <p className="font-mono text-[9px] text-primary tracking-widest mt-1">UPLOADING PHOTO…</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`font-mono text-[9px] tracking-widest uppercase border rounded px-2 py-0.5 ${roleBadgeColor}`}>
                {role}
              </span>
              {role === "admin" && (
                <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground tracking-widest uppercase">
                  <Shield className="w-3 h-3" /> PLATFORM ADMIN
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={handleSave} className="bg-card border border-border rounded-lg p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
              {role === "advertiser" ? "Brand Info" : role === "creator" ? "Creator Info" : "Profile Info"}
            </span>
          </div>

          {(role === "advertiser" || (role === "admin" && advertiserProfile)) && (
            <>
              <div className="space-y-1.5">
                <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Company Name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Industry</Label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Fashion, Tech…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Website</Label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What your brand does…" />
              </div>
            </>
          )}

          {(role === "creator" || (role === "admin" && creatorProfile)) && (
            <>
              <div className="space-y-1.5">
                <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Display Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your creator name" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Bio</Label>
                <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What you create…" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Niche</Label>
                  <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Fashion, Gaming…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Total Followers</Label>
                  <Input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="50000" />
                </div>
              </div>

              {/* Extended Profile */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExtendedExpanded(!extendedExpanded)}
                  className="w-full flex items-center justify-between px-4 py-3 font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>EXTENDED PROFILE</span>
                  {extendedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {extendedExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Full Name</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your legal name" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1.5">
                        <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Date of Birth</Label>
                        <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Country</Label>
                        <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Phone Number</Label>
                      <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 555 000 0000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Content Languages (comma-separated)</Label>
                      <Input value={contentLanguages} onChange={(e) => setContentLanguages(e.target.value)} placeholder="English, Spanish, French" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {role === "admin" && !advertiserProfile && !creatorProfile && (
            <p className="text-sm text-muted-foreground font-mono">
              Admin account — no creator or brand profile attached.
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isSaving} className="font-mono tracking-widest uppercase">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "SAVING…" : "SAVE CHANGES"}
            </Button>
            {saved && (
              <span className="font-mono text-xs text-signal tracking-widest">✓ SAVED</span>
            )}
          </div>
        </form>

        {/* Social Accounts Section */}
        {(role === "creator" || (role === "admin" && creatorProfile)) && (
          <div className="bg-card border border-border rounded-lg p-6 mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Social Accounts</span>
              <button
                onClick={() => setShowSocialForm(!showSocialForm)}
                className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest uppercase text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-3 h-3" /> ADD ACCOUNT
              </button>
            </div>

            {showSocialForm && (
              <form onSubmit={handleAddSocialAccount} className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Platform</Label>
                    <select
                      value={socialPlatform}
                      onChange={(e) => setSocialPlatform(e.target.value as Platform)}
                      className="w-full bg-card border border-border rounded px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-foreground/50"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>{p.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Username</Label>
                    <Input value={socialUsername} onChange={(e) => setSocialUsername(e.target.value)} placeholder="@handle" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Followers</Label>
                    <Input type="number" value={socialFollowers} onChange={(e) => setSocialFollowers(e.target.value)} placeholder="50000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Engagement Rate (%)</Label>
                    <Input type="number" step="0.01" value={socialEngagement} onChange={(e) => setSocialEngagement(e.target.value)} placeholder="4.5" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Profile URL</Label>
                  <Input value={socialProfileUrl} onChange={(e) => setSocialProfileUrl(e.target.value)} placeholder="https://instagram.com/…" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={upsertSocialAccount.isPending} className="font-mono text-xs tracking-widest uppercase">
                    SAVE
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowSocialForm(false)} className="font-mono text-xs tracking-widest uppercase">
                    CANCEL
                  </Button>
                </div>
              </form>
            )}

            {socialAccounts && socialAccounts.length > 0 ? (
              <div className="space-y-2">
                {socialAccounts.map((acct: any) => (
                  <div key={acct.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="font-mono text-[9px] tracking-widest uppercase text-primary border border-primary/30 rounded px-1.5 py-0.5 mr-2">
                        {acct.platform}
                      </span>
                      <span className="font-mono text-xs text-foreground">{acct.username}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {acct.followers >= 1000000
                          ? `${(acct.followers / 1000000).toFixed(1)}M`
                          : `${(acct.followers / 1000).toFixed(0)}K`} followers
                      </span>
                      <span className="font-mono text-[9px] text-muted-foreground">{acct.engagementRate}% eng</span>
                      <button
                        onClick={() => deleteSocialAccount.mutate({ accountId: acct.id })}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">No social accounts linked yet.</p>
            )}
          </div>
        )}

        {/* Portfolio / Media Kit Section */}
        {(role === "creator" || (role === "admin" && creatorProfile)) && (
          <div className="bg-card border border-border rounded-lg p-6 mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Portfolio / Media Kit</span>
              <button
                onClick={() => setShowPortfolioForm(!showPortfolioForm)}
                className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest uppercase text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-3 h-3" /> ADD ITEM
              </button>
            </div>

            {showPortfolioForm && (
              <form onSubmit={handleAddPortfolioItem} className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Campaign Title *</Label>
                    <Input value={portTitle} onChange={(e) => setPortTitle(e.target.value)} placeholder="Summer Launch" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Brand</Label>
                    <Input value={portBrand} onChange={(e) => setPortBrand(e.target.value)} placeholder="Acme Corp" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Platform</Label>
                    <select
                      value={portPlatform}
                      onChange={(e) => setPortPlatform(e.target.value as Platform)}
                      className="w-full bg-card border border-border rounded px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-foreground/50"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>{p.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Completed At</Label>
                    <Input type="date" value={portCompletedAt} onChange={(e) => setPortCompletedAt(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Content URL</Label>
                  <Input value={portContentUrl} onChange={(e) => setPortContentUrl(e.target.value)} placeholder="https://…" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 md:gap-2">
                  <div className="space-y-1.5">
                    <Label className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">Impressions</Label>
                    <Input type="number" value={portImpressions} onChange={(e) => setPortImpressions(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">Reach</Label>
                    <Input type="number" value={portReach} onChange={(e) => setPortReach(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">Engagement</Label>
                    <Input type="number" value={portEngagement} onChange={(e) => setPortEngagement(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">Views</Label>
                    <Input type="number" value={portViews} onChange={(e) => setPortViews(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addPortfolioItem.isPending} className="font-mono text-xs tracking-widest uppercase">
                    SAVE
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowPortfolioForm(false)} className="font-mono text-xs tracking-widest uppercase">
                    CANCEL
                  </Button>
                </div>
              </form>
            )}

            {portfolioItems && portfolioItems.length > 0 ? (
              <div className="space-y-3">
                {portfolioItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-mono text-xs text-foreground font-bold">{item.campaignTitle}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.brand && <span className="font-mono text-[9px] text-muted-foreground">{item.brand}</span>}
                        <span className="font-mono text-[9px] tracking-widest uppercase text-primary border border-primary/30 rounded px-1 py-0.5">
                          {item.platform}
                        </span>
                      </div>
                      {item.metrics && (
                        <div className="flex gap-3 mt-1">
                          {(item.metrics as any).impressions && (
                            <span className="font-mono text-[8px] text-muted-foreground">{(item.metrics as any).impressions.toLocaleString()} impr</span>
                          )}
                          {(item.metrics as any).views && (
                            <span className="font-mono text-[8px] text-muted-foreground">{(item.metrics as any).views.toLocaleString()} views</span>
                          )}
                          {(item.metrics as any).engagement && (
                            <span className="font-mono text-[8px] text-muted-foreground">{(item.metrics as any).engagement.toLocaleString()} eng</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deletePortfolioItem.mutate({ itemId: item.id })}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">No portfolio items yet.</p>
            )}
          </div>
        )}

        {/* Bank account (creators only) */}
        {role === "creator" && <BankAccountSection />}

        {/* Account info (read-only) */}
        <div className="bg-card border border-border rounded-lg p-6 mt-6">
          <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Account</span>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">Email</span>
              <span className="font-mono text-xs text-foreground">{user?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">Role</span>
              <span className={`font-mono text-xs uppercase border rounded px-2 py-0.5 ${roleBadgeColor}`}>{role}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">Member Since</span>
              <span className="font-mono text-xs text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Bank Account Section ───────────────────────────────────────────────────────

function BankAccountSection() {
  const { data: bankAccount, refetch } = trpc.creator.getBankAccount.useQuery();
  const updateBank = trpc.creator.updateBankAccount.useMutation({ onSuccess: () => { refetch(); setEditing(false); } });

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (bankAccount) {
      setBankCode(bankAccount.bankCode ?? "");
      setAccountNumber(bankAccount.accountNumber ?? "");
      setAccountName(bankAccount.accountName ?? "");
    }
  }, [bankAccount]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!accountName.trim()) { toast.error("Please enter your account name"); return; }
    updateBank.mutate({ bankCode, accountNumber, accountName: accountName.trim() });
  }

  const bankName = NIGERIAN_BANKS.find((b) => b.code === bankCode)?.name;

  return (
    <div className="bg-card border border-border rounded-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono text-xs tracking-widest uppercase text-foreground font-bold">Payout Bank Account</span>
        </div>
        {bankAccount && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="font-mono text-[9px] text-muted-foreground hover:text-foreground tracking-widest transition-colors"
          >
            EDIT
          </button>
        )}
      </div>

      {bankAccount && !editing ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Bank</span>
            <span className="font-mono text-xs text-foreground">{bankName ?? bankAccount.bankCode}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Account Number</span>
            <span className="font-mono text-xs text-foreground">••••••{bankAccount.accountNumber.slice(-4)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Account Name</span>
            <span className="font-mono text-xs text-foreground flex items-center gap-1.5">
              <Check className="w-3 h-3 text-signal" />{bankAccount.accountName}
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">Bank</Label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              required
              className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-foreground/50"
            >
              <option value="">Select bank…</option>
              {NIGERIAN_BANKS.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">Account Number (10 digits)</Label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="0123456789"
              maxLength={10}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">Account Name</Label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Enter your account name"
              required
            />
          </div>
          {updateBank.error && (
            <p className="font-mono text-[9px] text-destructive">{updateBank.error.message}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={updateBank.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-mono text-[9px] tracking-widest rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              {updateBank.isPending ? "SAVING…" : "SAVE ACCOUNT"}
            </button>
            {bankAccount && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 border border-border font-mono text-[9px] tracking-widest text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                CANCEL
              </button>
            )}
          </div>
        </form>
      )}
      <p className="font-mono text-[9px] text-muted-foreground mt-3">
        Your earnings will be sent to this account.
      </p>
    </div>
  );
}

