import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Trash2, Sun, Moon, Bell, Shield, Eye, EyeOff } from "lucide-react";

// ─── Reusable toggle switch ───────────────────────────────────────────────────
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

// ─── Section heading ──────────────────────────────────────────────────────────
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
            <Input
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              className="pr-9 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">New Password</Label>
          <div className="relative">
            <Input
              type={showNext ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              className="pr-9 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowNext((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">Confirm New Password</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="font-mono text-xs"
          />
        </div>

        <Button type="submit" disabled={loading} size="sm" className="font-mono text-xs tracking-widest">
          {loading ? "UPDATING..." : "UPDATE PASSWORD"}
        </Button>
      </form>
    </div>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────
function DangerZoneSection() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete account");
        return;
      }
      await logout();
      setLocation("/auth");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-destructive/30 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2">
        <Trash2 className="w-4 h-4 text-destructive" />
        <span className="font-mono text-xs tracking-widest uppercase font-bold text-destructive">Danger Zone</span>
      </div>
      <p className="font-mono text-xs text-muted-foreground mb-4">
        Permanently delete your account and all associated data. This cannot be undone.
      </p>
      {!confirming ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
          className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground font-mono text-xs tracking-widest"
        >
          DELETE ACCOUNT
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="font-mono text-xs text-destructive">Are you absolutely sure? This action is irreversible.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={handleDelete}
              className="font-mono text-xs tracking-widest"
            >
              {loading ? "DELETING..." : "YES, DELETE MY ACCOUNT"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
              className="font-mono text-xs tracking-widest"
            >
              CANCEL
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────────
function AppearanceSection() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-foreground font-medium">Theme</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
            {theme === "dark" ? "Dark mode is active" : "Light mode is active"}
          </p>
        </div>
        <Toggle on={theme === "dark"} onToggle={() => toggleTheme?.()} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => theme !== "light" && toggleTheme?.()}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border font-mono text-xs tracking-widest transition-colors ${
            theme === "light"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sun className="w-3.5 h-3.5" /> LIGHT
        </button>
        <button
          onClick={() => theme !== "dark" && toggleTheme?.()}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border font-mono text-xs tracking-widest transition-colors ${
            theme === "dark"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Moon className="w-3.5 h-3.5" /> DARK
        </button>
      </div>
    </div>
  );
}

// ─── Notifications ─────────────────────────────────────────────────────────────
const NOTIFICATION_PREFS = [
  { key: "campaign_updates",   label: "Campaign updates",   desc: "When a campaign you're in changes status" },
  { key: "payout_alerts",      label: "Payout alerts",      desc: "When a payout is released or completed" },
  { key: "new_messages",       label: "New messages",       desc: "When you receive a direct message" },
  { key: "application_status", label: "Application status", desc: "When your application is accepted or rejected" },
  { key: "platform_news",      label: "Platform news",      desc: "Product updates and announcements from Vyral" },
] as const;

function NotificationsSection() {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem("vyral_notif_prefs") ?? "{}"); } catch { return {}; }
  })();
  const defaults = Object.fromEntries(NOTIFICATION_PREFS.map((p) => [p.key, true]));
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ ...defaults, ...stored });

  function toggle(key: string) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    localStorage.setItem("vyral_notif_prefs", JSON.stringify(updated));
    toast.success("Preference saved");
  }

  return (
    <div className="space-y-2">
      {NOTIFICATION_PREFS.map(({ key, label, desc }) => (
        <div key={key} className="bg-card border border-border rounded-lg px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-foreground font-medium">{label}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
          </div>
          <Toggle on={prefs[key]} onToggle={() => toggle(key)} />
        </div>
      ))}
      <p className="font-mono text-[10px] text-muted-foreground pt-1 px-1">
        In-app notifications are always on. These toggles control email notifications (coming soon).
      </p>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-2">
          <h1 className="font-mono text-sm tracking-widest uppercase font-bold text-foreground">Settings</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">{user?.email}</p>
        </div>

        {/* ── Account ── */}
        <SectionHeading icon={Shield} label="Account" />

        <div className="bg-card border border-border rounded-lg p-5 mb-4">
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Email</p>
              <p className="font-mono text-xs text-foreground mt-0.5">{user?.email ?? "—"}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Role</p>
              <p className="font-mono text-xs text-foreground mt-0.5 uppercase">{user?.role ?? "—"}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Member Since</p>
              <p className="font-mono text-xs text-foreground mt-0.5">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-4">
          <ChangePasswordSection />
          <DangerZoneSection />
        </div>

        {/* ── Appearance ── */}
        <SectionHeading icon={Sun} label="Appearance" />
        <div className="mb-4">
          <AppearanceSection />
        </div>

        {/* ── Notifications ── */}
        <SectionHeading icon={Bell} label="Notifications" />
        <div className="pb-12">
          <NotificationsSection />
        </div>

      </div>
    </AppLayout>
  );
}
