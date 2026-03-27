import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Megaphone, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "advertiser" | "creator";

export default function OnboardingPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [, setLocation] = useLocation();
  const { logout, refresh } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Advertiser fields
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");

  // Creator fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [niche, setNiche] = useState("");
  const [followers, setFollowers] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const createAdvertiserProfile = trpc.advertiser.createProfile.useMutation({
    onSuccess: async () => { await refresh(); setLocation("/brand/dashboard"); },
  });

  const createCreatorProfile = trpc.creator.createProfile.useMutation({
    onSuccess: async () => { await refresh(); setLocation("/creator/dashboard"); },
  });

  const isPending = createAdvertiserProfile.isPending || createCreatorProfile.isPending;
  const error = createAdvertiserProfile.error?.message || createCreatorProfile.error?.message;

  function handleRoleSelect(role: Role) {
    setSelectedRole(role);
    setStep(2);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRole === "advertiser") {
      createAdvertiserProfile.mutate({
        companyName: companyName || "My Brand",
        industry: industry || undefined,
        website: website || undefined,
      });
    } else {
      createCreatorProfile.mutate({
        displayName: displayName || "Creator",
        bio: bio || undefined,
        niche: niche || "general",
        totalFollowers: Number(followers) || 0,
        engagementRate: 0,
        fullName: fullName || undefined,
        country: country || undefined,
        dateOfBirth: dateOfBirth || undefined,
      });
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border">
        <img
          src={isDark ? "/logo.png" : "/logo-light.png"}
          alt="Vyral"
          className="h-9 w-auto"
        />
        <div className="flex items-center gap-4">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="font-mono text-xs text-muted-foreground hover:text-foreground tracking-widest uppercase transition-colors"
            >
              ← BACK
            </button>
          )}
          <button
            onClick={async () => { await logout(); setLocation("/auth"); }}
            className="font-mono text-xs text-muted-foreground hover:text-foreground tracking-widest uppercase transition-colors"
          >
            SIGN OUT
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">

        {/* ── STEP 1: Role picker ── */}
        {step === 1 && (
          <>
            <div className="flex items-center gap-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
              <span className="font-mono text-xs text-signal tracking-widest uppercase">STEP 1 OF 2 — SELECT ROLE</span>
            </div>

            <div className="text-center mb-4">
              <h1 className="font-display text-[80px] leading-none tracking-wider text-foreground">
                CHOOSE YOUR
              </h1>
              <h1 className="font-display text-[80px] leading-none tracking-wider text-primary italic">
                TRANSMISSION
              </h1>
            </div>

            <p className="text-muted-foreground text-center mb-12 max-w-lg">
              Select your operational role. Are you deploying capital or scaling influence?
            </p>

            <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
              {/* Advertiser */}
              <button
                onClick={() => handleRoleSelect("advertiser")}
                className="relative group text-left rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-primary hover:shadow-md focus:outline-none"
                style={{ minHeight: "380px" }}
              >
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: isDark ? "repeating-linear-gradient(45deg,#ffffff,#ffffff 1px,transparent 1px,transparent 12px)" : "repeating-linear-gradient(45deg,#000000,#000000 1px,transparent 1px,transparent 12px)" }} />
                <div className="relative p-8 flex flex-col h-full" style={{ minHeight: "380px" }}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded border border-primary/30 bg-primary/10 flex items-center justify-center">
                      <Megaphone className="w-6 h-6 text-primary" />
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground tracking-widest border border-border rounded px-2 py-1">SYSTEM_ACCESS_01</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    <h2 className="font-display text-5xl tracking-wider text-foreground mb-4">ADVERTISER</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">Launch campaigns, track real-time ROI, and access the network of elite creators.</p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex-1 h-px bg-primary/50" />
                    <span className="font-mono text-[9px] text-primary tracking-widest">SELECT →</span>
                  </div>
                </div>
              </button>

              {/* Creator */}
              <button
                onClick={() => handleRoleSelect("creator")}
                className="relative group text-left rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-gold hover:shadow-md focus:outline-none"
                style={{ minHeight: "380px" }}
              >
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: isDark ? "repeating-linear-gradient(45deg,#ffffff,#ffffff 1px,transparent 1px,transparent 12px)" : "repeating-linear-gradient(45deg,#000000,#000000 1px,transparent 1px,transparent 12px)" }} />
                <div className="relative p-8 flex flex-col h-full" style={{ minHeight: "380px" }}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded border border-gold/30 bg-gold/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-gold" />
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground tracking-widest border border-border rounded px-2 py-1">SYSTEM_ACCESS_02</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    <h2 className="font-display text-5xl tracking-wider text-foreground mb-4">CREATOR</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">Monetize your content, join the global roster, and secure premium brand contracts.</p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex-1 h-px bg-gold/50" />
                    <span className="font-mono text-[9px] text-gold tracking-widest">SELECT →</span>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Profile info ── */}
        {step === 2 && selectedRole && (
          <div className="w-full max-w-lg">
            <div className="flex items-center gap-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
              <span className="font-mono text-xs text-signal tracking-widest uppercase">
                STEP 2 OF 2 — {selectedRole === "advertiser" ? "BRAND PROFILE" : "CREATOR PROFILE"}
              </span>
            </div>

            <h1 className="font-display text-6xl tracking-wider text-foreground mb-2">
              {selectedRole === "advertiser" ? "YOUR BRAND" : "YOUR PROFILE"}
            </h1>
            <p className="text-muted-foreground mb-10">
              {selectedRole === "advertiser"
                ? "Tell us about your company. You can update this anytime."
                : "Set up your creator identity. You can update this anytime."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {selectedRole === "advertiser" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Company Name *</Label>
                    <Input
                      placeholder="Acme Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Industry</Label>
                    <Input
                      placeholder="e.g. Fashion, Tech, Music"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Website</Label>
                    <Input
                      placeholder="https://yourcompany.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Display Name *</Label>
                    <Input
                      placeholder="Your creator name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Bio</Label>
                    <Input
                      placeholder="What you create..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Niche</Label>
                    <Input
                      placeholder="e.g. Fashion, Gaming, Beauty"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Total Followers (across all platforms)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 50000"
                      value={followers}
                      onChange={(e) => setFollowers(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Full Name</Label>
                    <Input
                      placeholder="Your legal name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Country</Label>
                    <Input
                      placeholder="e.g. United States"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Date of Birth</Label>
                    <Input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                    />
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-destructive font-mono">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full font-mono tracking-widest uppercase"
                size="lg"
                disabled={isPending}
              >
                {isPending ? "SETTING UP..." : (
                  <span className="flex items-center gap-2">
                    LAUNCH DASHBOARD <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between px-8 py-4 border-t border-border">
        <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">© 2025 VYRAL • ALL SYSTEMS OPERATIONAL</span>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${step === 1 ? "bg-primary" : "bg-muted-foreground"}`} />
          <span className={`w-1.5 h-1.5 rounded-full ${step === 2 ? "bg-primary" : "bg-muted-foreground"}`} />
        </div>
      </footer>
    </div>
  );
}
