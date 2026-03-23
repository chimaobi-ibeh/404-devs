import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    if (token) {
      setAccessToken(token);
    } else {
      setError("Invalid or expired reset link");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to reset password");
      }
      setSuccess(true);
      setTimeout(() => setLocation("/auth"), 2000);
    } catch (err: any) {
      setError(err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center">
          <img src="/logo.png" alt="Vyral" className="h-7 w-auto" />
        </a>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-2">Reset your password</h1>
          <p className="text-muted-foreground mb-8">Enter a new password for your account.</p>

          {success ? (
            <div className="text-center space-y-4">
              <p className="font-mono text-sm text-signal tracking-widest">PASSWORD UPDATED SUCCESSFULLY</p>
              <p className="text-muted-foreground text-sm">Redirecting to sign in…</p>
            </div>
          ) : error && !accessToken ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={() => setLocation("/auth")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" size="lg" disabled={loading || !accessToken}>
                {loading ? "Updating…" : "Set New Password"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setLocation("/auth")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
