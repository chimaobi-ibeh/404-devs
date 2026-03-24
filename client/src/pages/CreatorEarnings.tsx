import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { CheckCircle, Rocket } from "lucide-react";
import { toast } from "sonner";

type TimeFilter = "1W" | "1M" | "ALL";

export default function CreatorEarnings() {
  const { data: earnings, refetch: refetchEarnings } = trpc.creator.getEarnings.useQuery();
  const { data: subscription, refetch: refetchSub } = trpc.creator.getSubscription.useQuery();
  const requestPayout = trpc.creator.requestPayout.useMutation({
    onSuccess: (data) => {
      toast.success(`₦${data.amount.toLocaleString()} sent to your bank account`);
      refetchEarnings();
    },
    onError: (e) => toast.error(e.message),
  });
  const upgradeToPro = trpc.creator.upgradeToPro.useMutation({
    onSuccess: (data) => {
      window.location.href = data.redirectUrl;
    },
    onError: (e) => toast.error(e.message),
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1M");
  const [search, setSearch] = useState("");

  // Show pro payment result toast
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pro = params.get("pro");
    if (pro === "success") { toast.success("Pro subscription activated!"); refetchSub(); }
    else if (pro === "failed") toast.error("Pro payment failed. Please try again.");
    else if (pro === "error") toast.error("Something went wrong with your Pro payment.");
  }, []);

  const totalEarnings = earnings?.totalEarnings ?? 0;
  const pendingEarnings = earnings?.pendingEarnings ?? 0;
  const payouts = earnings?.payouts ?? [];

  const statusMap: Record<string, string> = {
    completed: "PAID",
    pending: "PENDING",
    processing: "ESCROW",
    failed: "FAILED",
  };

  const statusColors: Record<string, string> = {
    PAID: "text-signal border-signal/40",
    PENDING: "text-gold border-gold/40",
    ESCROW: "text-muted-foreground border-border",
    FAILED: "text-destructive border-destructive/40",
  };

  const filtered = payouts.filter((p) => {
    if (search === "") return true;
    const label = statusMap[p.status] ?? p.status;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Wallet Balance */}
          <div className="md:col-span-2 bg-card border border-border rounded-lg p-4 md:p-6">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-2">WALLET BALANCE</p>
            <div className="flex items-baseline gap-3 mb-6">
              <p className="font-mono text-5xl text-signal font-bold">
                ₦{totalEarnings.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => requestPayout.mutate()}
                disabled={requestPayout.isPending || totalEarnings <= 0}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requestPayout.isPending ? "PROCESSING..." : "CASH OUT"}
              </button>
            </div>
          </div>

          {/* Vyral Pro Card */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-foreground tracking-widest font-bold">VYRAL PRO</p>
              <span className="font-mono text-[8px] text-gold border border-gold/40 rounded px-2 py-0.5 tracking-widest">
                PREMIUM
              </span>
            </div>
            <div className="space-y-2 mb-5">
              {[
                "Early campaign access",
                "48-hour payouts",
                "Priority support",
                "Advanced analytics",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-signal shrink-0" />
                  <span className="font-mono text-[9px] text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
            {!subscription || subscription.status !== "active" ? (
              <button
                onClick={() => upgradeToPro.mutate({ callbackUrl: `${window.location.origin}/api/payment/pro-callback` })}
                disabled={upgradeToPro.isPending}
                className="w-full py-2 border border-gold text-gold font-mono text-[9px] tracking-widest rounded hover:bg-gold/10 transition-colors disabled:opacity-50"
              >
                {upgradeToPro.isPending ? "REDIRECTING..." : "UPGRADE TO PRO — ₦1,200/mo"}
              </button>
            ) : (
              <div className="w-full py-2 border border-signal text-signal font-mono text-[9px] tracking-widest rounded text-center">
                ✓ PRO ACTIVE
              </div>
            )}
          </div>
        </div>

        {/* Pending Escrow */}
        {pendingEarnings > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
            <div className="bg-card border border-border rounded-lg p-4 md:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-2">PENDING ESCROW</p>
                  <p className="font-mono text-2xl text-foreground font-bold">
                    ₦{pendingEarnings.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Rocket className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <div className="col-span-2" />
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-mono text-xs text-foreground tracking-widest font-bold uppercase">TRANSACTION HISTORY</h2>
            <input
              type="text"
              placeholder="SEARCH STATUS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background border border-border rounded px-3 py-1.5 font-mono text-[9px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 w-48"
            />
          </div>

          {/* Table header */}
          <div className="grid grid-cols-3 px-5 py-2 border-b border-border bg-muted/20">
            {["DATE", "STATUS", "AMOUNT"].map((h) => (
              <p key={h} className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">{h}</p>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map((tx) => {
              const label = statusMap[tx.status] ?? tx.status.toUpperCase();
              return (
                <div key={tx.id} className="grid grid-cols-3 items-center px-5 py-3.5">
                  <p className="font-mono text-[9px] text-muted-foreground">
                    {new Date(tx.releaseDate ?? tx.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    }).toUpperCase()}
                  </p>
                  <div>
                    <span className={`font-mono text-[8px] border rounded px-1.5 py-0.5 tracking-widest ${statusColors[label] ?? "text-muted-foreground border-border"}`}>
                      {label}
                    </span>
                  </div>
                  <p className="font-mono text-sm text-signal font-bold">
                    ₦{Number(tx.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">NO TRANSACTIONS YET</p>
              <p className="text-sm text-muted-foreground">Payouts will appear here once you complete campaigns.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
