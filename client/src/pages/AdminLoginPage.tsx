import { useState } from "react";
import { useLocation } from "wouter";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Invalid credentials.");
      setLocation(body.redirect ?? "/admin");
    } catch (err: any) {
      setError(err.message ?? "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="bg-[#111] border border-white/5 rounded-2xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-mono text-xs font-bold tracking-widest text-foreground">SYSTEM ACCESS</p>
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest">AUTHORISED PERSONNEL ONLY</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
            />
          </div>
          <div>
            <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase block mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
            />
          </div>

          {error && (
            <p className="font-mono text-[9px] text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? "AUTHENTICATING…" : "ACCESS SYSTEM"}
          </button>
        </form>
      </div>
    </div>
  );
}
