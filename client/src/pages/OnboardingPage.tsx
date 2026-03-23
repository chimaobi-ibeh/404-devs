import { useTheme } from "@/contexts/ThemeContext";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Megaphone, Zap } from "lucide-react";

export default function OnboardingPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  const createAdvertiserProfile = trpc.advertiser.createProfile.useMutation({
    onSuccess: () => setLocation("/brand/dashboard"),
  });

  const createCreatorProfile = trpc.creator.createProfile.useMutation({
    onSuccess: () => setLocation("/creator/dashboard"),
  });

  const handleSelect = (role: "advertiser" | "creator") => {
    if (role === "advertiser") {
      createAdvertiserProfile.mutate({ companyName: "My Brand", industry: "", description: "" });
    } else {
      createCreatorProfile.mutate({ displayName: "Creator", niche: "", totalFollowers: 0, engagementRate: 0 });
    }
  };

  const isPending = createAdvertiserProfile.isPending || createCreatorProfile.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal Nav */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border">
        <img
          src={isDark ? "/logo.png" : "/logo-light.png"}
          alt="Vyral"
          className="h-7 w-auto"
        />
        <button
          onClick={async () => { await logout(); setLocation("/auth"); }}
          className="font-mono text-xs text-muted-foreground hover:text-foreground tracking-widest uppercase transition-colors"
        >
          SIGN OUT
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
          <span className="font-mono text-xs text-signal tracking-widest uppercase">AWAITING INPUT...</span>
        </div>

        {/* Headline */}
        <div className="text-center mb-4">
          <h1 className="font-display text-[80px] leading-none tracking-wider text-foreground">
            CHOOSE YOUR
          </h1>
          <h1 className="font-display text-[80px] leading-none tracking-wider text-primary italic">
            TRANSMISSION
          </h1>
        </div>

        {/* Subtext */}
        <p className="text-muted-foreground text-center mb-12 max-w-lg">
          Select your operational protocols. Are you deploying capital or scaling influence?
        </p>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Advertiser Card */}
          <button
            onClick={() => !isPending && handleSelect("advertiser")}
            disabled={isPending}
            className="relative group text-left rounded-lg border border-border overflow-hidden transition-all hover:border-primary focus:outline-none disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #111111 0%, #0A0A0A 100%)",
              minHeight: "400px",
            }}
          >
            {/* Diagonal pattern overlay */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  #ffffff,
                  #ffffff 1px,
                  transparent 1px,
                  transparent 12px
                )`,
              }}
            />
            <div className="relative p-8 flex flex-col h-full" style={{ minHeight: "400px" }}>
              {/* Top row */}
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded border border-primary/30 bg-primary/10 flex items-center justify-center">
                  <Megaphone className="w-6 h-6 text-primary" />
                </div>
                <span className="font-mono text-[9px] text-muted-foreground tracking-widest border border-border rounded px-2 py-1">
                  SYSTEM_ACCESS_01
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-end">
                <h2 className="font-display text-5xl tracking-wider text-foreground mb-4">
                  ADVERTISER
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Launch high-velocity campaigns, track real-time ROI, and harness the network of elite creators.
                </p>
              </div>

              {/* Hover indicator */}
              <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex-1 h-px bg-primary/50" />
                <span className="font-mono text-[9px] text-primary tracking-widest">SELECT →</span>
              </div>
            </div>
          </button>

          {/* Creator Card */}
          <button
            onClick={() => !isPending && handleSelect("creator")}
            disabled={isPending}
            className="relative group text-left rounded-lg border border-border overflow-hidden transition-all hover:border-gold focus:outline-none disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #111111 0%, #0A0A0A 100%)",
              minHeight: "400px",
            }}
          >
            {/* Diagonal pattern overlay */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  #ffffff,
                  #ffffff 1px,
                  transparent 1px,
                  transparent 12px
                )`,
              }}
            />
            <div className="relative p-8 flex flex-col h-full" style={{ minHeight: "400px" }}>
              {/* Top row */}
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded border border-gold/30 bg-gold/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-gold" />
                </div>
                <span className="font-mono text-[9px] text-muted-foreground tracking-widest border border-border rounded px-2 py-1">
                  SYSTEM_ACCESS_02
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-end">
                <h2 className="font-display text-5xl tracking-wider text-foreground mb-4">
                  CREATOR
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Monetize your content stream, join the global roster, and secure premium brand contracts.
                </p>
              </div>

              {/* Hover indicator */}
              <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex-1 h-px bg-gold/50" />
                <span className="font-mono text-[9px] text-gold tracking-widest">SELECT →</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-8 py-4 border-t border-border">
        <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">
          © 2024 VYRAL_CORE SYSTEM • PRIVACY TERMS STATUS: OPERATIONAL
        </span>
        <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">
          LATENCY: 12MS &nbsp; SECURITY: ENCRYPTED
        </span>
      </footer>
    </div>
  );
}
