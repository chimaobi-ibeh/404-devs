import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Lock, Sun, Moon, Settings, Eye, EyeOff, AlertTriangle } from "lucide-react";

// ─── Reusable toggle (same as SettingsPage) ───────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors overflow-hidden ${
        on ? "bg-primary" : "bg-muted border border-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-8 pb-3 border-b border-border mb-4">
      <Icon className="w-4 h-4 text-primary" />
      <h2 className="font-mono text-xs tracking-widest uppercase font-bold text-foreground">{label}</h2>
    </div>
  );
}

// ─── Change Password ──────────────────────────────────────────────────────────
function ChangePasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { toast.error("New passwords do not match"); return; }
    if (next.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to change password"); return; }
      toast.success("Password changed successfully");
      setCurrent(""); setNext(""); setConfirm("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="w-4 h-4 text-primary" />
        <span className="font-mono text-xs tracking-widest uppercase font-bold text-foreground">Change Password</span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">Current Password</Label>
          <div className="relative">
            <Input type={showCurrent ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} required className="pr-9 font-mono text-xs" />
            <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">New Password</Label>
          <div className="relative">
            <Input type={showNext ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} required className="pr-9 font-mono text-xs" />
            <button type="button" onClick={() => setShowNext(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showNext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">Confirm New Password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="font-mono text-xs" />
        </div>
        <Button type="submit" disabled={loading} size="sm" className="font-mono text-xs tracking-widest">
          {loading ? "UPDATING..." : "UPDATE PASSWORD"}
        </Button>
      </form>
    </div>
  );
}

// ─── Platform Settings ────────────────────────────────────────────────────────
function PlatformSettingsSection() {
  const { data: settings, refetch } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: () => { toast.success("Settings saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [feePct, setFeePct] = useState("");
  const [proPrice, setProPrice] = useState("");
  const [autoApprovalDays, setAutoApprovalDays] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setFeePct(settings.platform_fee_pct ?? "5");
    setProPrice(settings.pro_price ?? "1200");
    setAutoApprovalDays(settings.auto_approval_days ?? "7");
    setMaintenanceMode(settings.maintenance_mode === "true");
  }, [settings]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const fee = parseFloat(feePct);
    if (isNaN(fee) || fee < 0 || fee > 100) { toast.error("Fee must be between 0 and 100"); return; }
    const price = parseInt(proPrice);
    if (isNaN(price) || price < 0) { toast.error("Pro price must be a positive number"); return; }
    const days = parseInt(autoApprovalDays);
    if (isNaN(days) || days < 1) { toast.error("Auto-approval days must be at least 1"); return; }
    updateSettings.mutate({
      settings: {
        platform_fee_pct: feePct,
        pro_price: proPrice,
        auto_approval_days: autoApprovalDays,
        maintenance_mode: String(maintenanceMode),
      },
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSave} className="bg-card border border-border rounded-lg p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
              Platform Fee (%)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={feePct}
                onChange={(e) => setFeePct(e.target.value)}
                className="font-mono text-xs max-w-[120px]"
              />
              <span className="font-mono text-xs text-muted-foreground">% of campaign budget</span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Currently charged when advertisers pay for a campaign.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
              Pro Subscription Price (₦/mo)
            </Label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">₦</span>
              <Input
                type="number"
                min="0"
                step="100"
                value={proPrice}
                onChange={(e) => setProPrice(e.target.value)}
                className="font-mono text-xs max-w-[140px]"
              />
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Monthly fee charged to creators for Pro access.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
              Auto-approval after (days)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="30"
                value={autoApprovalDays}
                onChange={(e) => setAutoApprovalDays(e.target.value)}
                className="font-mono text-xs max-w-[100px]"
              />
              <span className="font-mono text-xs text-muted-foreground">days</span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Content submissions are auto-approved after this many days with no review.
            </p>
          </div>
        </div>

        <Button type="submit" disabled={updateSettings.isPending} size="sm" className="font-mono text-xs tracking-widest">
          {updateSettings.isPending ? "SAVING..." : "SAVE CHANGES"}
        </Button>
      </form>

      {/* Maintenance mode — separate card because it's high-impact */}
      <div className={`border rounded-lg p-5 ${maintenanceMode ? "bg-destructive/5 border-destructive/30" : "bg-card border-border"}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {maintenanceMode && <AlertTriangle className="w-4 h-4 text-destructive" />}
              <p className="font-mono text-xs font-bold text-foreground tracking-wide">Maintenance Mode</p>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
              {maintenanceMode
                ? "Site is currently in maintenance mode. Regular users will see a maintenance page."
                : "When enabled, regular users will see a maintenance message. Admin access is unaffected."}
            </p>
          </div>
          <Toggle
            on={maintenanceMode}
            onToggle={() => {
              const next = !maintenanceMode;
              setMaintenanceMode(next);
              updateSettings.mutate({ settings: { maintenance_mode: String(next) } });
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="mb-2">
          <h1 className="font-mono text-sm tracking-widest uppercase font-bold text-foreground">Admin Settings</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">Platform configuration and account management</p>
        </div>

        {/* ── Account ── */}
        <SectionHeading icon={Lock} label="Account" />
        <ChangePasswordSection />

        {/* ── Appearance ── */}
        <SectionHeading icon={Sun} label="Appearance" />
        <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-foreground font-medium">Theme</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
              {theme === "dark" ? "Dark mode is active" : "Light mode is active"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => theme !== "light" && toggleTheme?.()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs tracking-widest transition-colors ${
                theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="w-3 h-3" /> LIGHT
            </button>
            <button
              onClick={() => theme !== "dark" && toggleTheme?.()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs tracking-widest transition-colors ${
                theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="w-3 h-3" /> DARK
            </button>
          </div>
        </div>

        {/* ── Platform ── */}
        <SectionHeading icon={Settings} label="Platform" />
        <div className="pb-12">
          <PlatformSettingsSection />
        </div>

      </div>
    </AppLayout>
  );
}
