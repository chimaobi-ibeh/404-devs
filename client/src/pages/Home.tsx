import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VyralLogo } from "@/components/VyralLogo";
import { getLoginUrl } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";

/* ─── Animated counter ───────────────────────────────────────────────────── */
function Counter({
  target,
  prefix = "",
  suffix = "",
  duration = 2000,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const pct = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - pct, 3);
            setValue(Math.floor(eased * target));
            if (pct < 1) requestAnimationFrame(tick);
            else setValue(target);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── Nav ────────────────────────────────────────────────────────────────── */
function Nav({
  isAuthenticated,
  onGetStarted,
  onLogout,
}: {
  isAuthenticated: boolean;
  onGetStarted: () => void;
  onLogout: () => void;
}) {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <a href="/" className="flex items-center">
          <img
            src={isDark ? "/logo.png" : "/logo-light.png"}
            alt="Vyral"
            className="h-8 w-auto"
          />
        </a>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          <a href="#marketplace" className="hover:text-foreground transition-colors">Marketplace</a>
          <a href="#showcase" className="hover:text-foreground transition-colors">Showcase</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#about" className="hover:text-foreground transition-colors">About</a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" className="text-xs tracking-widest uppercase" onClick={() => setLocation("/brand/dashboard")}>Dashboard</Button>
              <Button size="sm" className="text-xs tracking-widest uppercase bg-primary hover:bg-primary/90" onClick={() => setLocation("/creator/dashboard")}>Creator Hub</Button>
              <Button variant="ghost" size="sm" className="text-xs tracking-widest uppercase text-muted-foreground hover:text-destructive" onClick={onLogout}>Sign Out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-xs tracking-widest uppercase" onClick={() => window.location.href = getLoginUrl()}>Login</Button>
              <Button size="sm" className="text-xs tracking-widest uppercase bg-primary hover:bg-primary/90" onClick={onGetStarted}>Get Started</Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Home() {
  const { isAuthenticated, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      setLocation("/onboarding");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav isAuthenticated={isAuthenticated} onGetStarted={handleGetStarted} onLogout={handleLogout} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-28 pb-20 overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[400px] rounded-full bg-primary/20 blur-[130px] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[350px] rounded-full bg-accent/10 blur-[110px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-accent mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            AI-Powered Creator Intelligence Live
          </p>

          <h1 className="font-display text-[clamp(5rem,14vw,11rem)] leading-[0.9] text-foreground">
            GO VIRAL.
          </h1>
          <h1
            className="font-display text-[clamp(5rem,14vw,11rem)] leading-[0.9] text-vyral-gradient mb-8"
            style={{ fontStyle: "italic", transform: "skewX(-4deg)", display: "block" }}
          >
            GET PAID.
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            The technical infrastructure for the high-frequency creator economy.
            Deploy campaigns, track engagement, and scale with cinematic precision.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              className="h-14 px-10 text-sm tracking-widest uppercase font-semibold bg-primary hover:bg-primary/90"
              onClick={handleGetStarted}
            >
              Launch Campaign 🚀
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-10 text-sm tracking-widest uppercase font-semibold border-white/20 hover:border-white/40 hover:bg-white/5"
              onClick={() => window.location.href = "#marketplace"}
            >
              Explore Marketplace
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="border-y border-border py-16">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          <div>
            <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3">Global Engagements</p>
            <p className="font-mono text-4xl font-bold text-signal">
              <Counter target={245} prefix="" suffix="M+" />
            </p>
            <div className="mt-3 h-px bg-gradient-to-r from-transparent via-signal/40 to-transparent" />
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3">Verified Creators</p>
            <p className="font-mono text-4xl font-bold text-foreground">
              <Counter target={15} suffix="K+" />
            </p>
            <div className="mt-3 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3">Creator Payouts</p>
            <p className="font-mono text-4xl font-bold text-gold">
              <Counter target={128} prefix="$" suffix="M+" />
            </p>
            <div className="mt-3 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── Feature Split ─────────────────────────────────────────────────── */}
      <section id="marketplace" className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-6">
        {/* Advertiser card */}
        <div className="bg-card border border-border rounded-2xl p-10 flex flex-col justify-between min-h-[360px]">
          <div>
            <p className="text-xs tracking-widest uppercase text-primary mb-4 font-semibold">For Advertisers</p>
            <h2 className="font-display text-5xl leading-tight text-foreground mb-6">
              PRECISION SCALE AT THE SPEED OF SOCIAL.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Access real-time inventory of viral trends. Deploy budgets into high-impact content backed by neural-network sentiment analysis.
            </p>
          </div>
          <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-signal">✓</span> Trend Prediction Engine</li>
            <li className="flex items-center gap-2"><span className="text-signal">✓</span> Automated Content Targeting</li>
            <li className="flex items-center gap-2"><span className="text-signal">✓</span> Escrow-backed Payments</li>
          </ul>
        </div>

        {/* Creator card */}
        <div className="bg-card border border-border rounded-2xl p-10 flex flex-col justify-between min-h-[360px]">
          <div>
            <p className="text-xs tracking-widest uppercase text-gold mb-4 font-semibold">For Creators</p>
            <h2 className="font-display text-5xl leading-tight text-foreground mb-6">
              MONETIZE YOUR INFLUENCE. NO MIDDLEMEN.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Apply to campaigns, submit content, and get paid automatically the moment your post is verified — no chasing invoices.
            </p>
          </div>
          {/* Mini earnings mock */}
          <div className="mt-8 bg-background rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground tracking-widest uppercase">Current Balance</span>
              <span className="font-mono text-signal font-bold">+$2,450.00</span>
            </div>
            <div className="flex items-end gap-2 h-12">
              {[3, 5, 4, 7, 6, 8, 10].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-signal/30"
                  style={{ height: `${h * 10}%`, opacity: 0.4 + i * 0.08 }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature cards ────────────────────────────────────────────────── */}
      <section id="showcase" className="max-w-7xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {/* Trending Now — provided image, grayscale */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="relative h-52 overflow-hidden">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFT_HbvrPTakDWtVpX0fPr4dlhdAI91ouiUGz5_9IFo4JOhDr-a7hFHWdYgpCbsXXhhljnxeyjzar_qSTXmfWgTImWPRMLSQl_JWcyKeGQGGRX3Sml1DcZuWAImjGba4D29XRcoSPh44YE-_Z7QhmYZveeLmquZCOuc9HHyxe1Eg-U1m6hBgjn2HCDqhSnLbYwloU0ovrHavx0pH2ETlWL7dfsm3mR72YzNDQx2CP1AAULXGXrBelBm3xEihMx__HYe8tcyMUMaWbT"
              alt="Live Marketplace"
              className="w-full h-full object-cover"
              style={{ filter: "grayscale(100%) contrast(1.05)" }}
            />
            {/* gradient overlay so text is always legible */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute bottom-3 left-4 text-[10px] tracking-widest uppercase text-white/70 font-mono">
              Live Marketplace
            </span>
          </div>
          <div className="p-6 flex-1">
            <h3 className="font-display text-2xl mb-2 text-foreground">TRENDING NOW</h3>
            <p className="text-sm text-muted-foreground">Browse live campaigns across every niche and category in real time.</p>
          </div>
        </div>

        {/* Verified Rights */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="relative h-52 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80&fit=crop&crop=center"
              alt="Verified Rights"
              className="w-full h-full object-cover"
              style={{ filter: "grayscale(30%) contrast(1.05)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute top-4 left-4 w-9 h-9 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center text-primary border border-primary/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <div className="p-6 flex-1">
            <h3 className="font-display text-2xl mb-3 text-foreground">VERIFIED RIGHTS</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Instant smart-contract based licensing for every piece of content. IP secured before a penny is paid.
            </p>
          </div>
        </div>

        {/* Instant Payouts */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="relative h-52 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&fit=crop&crop=center"
              alt="Instant Payouts"
              className="w-full h-full object-cover"
              style={{ filter: "grayscale(30%) contrast(1.05)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute top-4 left-4 w-9 h-9 rounded-full bg-signal/20 backdrop-blur-sm flex items-center justify-center text-signal border border-signal/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div className="p-6 flex-1">
            <h3 className="font-display text-2xl mb-3 text-foreground">INSTANT PAYOUTS</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Creators get paid the moment campaign milestones are met. No delays, no excuses.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto bg-primary rounded-3xl p-16 text-center">
          <h2 className="font-display text-6xl text-white mb-4 leading-tight">
            THE NETWORK IS WAITING.
          </h2>
          <p className="text-white/70 text-lg mb-10">
            Join 15,000+ top-tier creators and leading brands already scaling on VYRAL Intelligence.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              className="h-14 px-10 text-sm tracking-widest uppercase font-semibold bg-foreground text-background hover:bg-foreground/90"
              onClick={handleGetStarted}
            >
              Create Account
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-10 text-sm tracking-widest uppercase font-semibold border-white/40 text-white hover:bg-white/10"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={isDark ? "/logo.png" : "/logo-light.png"} alt="Vyral" className="h-6 w-auto" />
          <div className="flex gap-8 text-xs tracking-widest uppercase text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">API</a>
            <a href="#" className="hover:text-foreground transition-colors">Status</a>
          </div>
          <span className="text-xs text-muted-foreground">© 2026 Vyral Intelligence. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
