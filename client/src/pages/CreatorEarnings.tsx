import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { CheckCircle, Rocket } from "lucide-react";

type TimeFilter = "1W" | "1M" | "ALL";

const barHeights = [40, 65, 55, 80, 45, 90, 70, 85, 60, 95, 75, 100];

export default function CreatorEarnings() {
  const { data: earnings } = trpc.creator.getEarnings.useQuery();
  const { data: subscription } = trpc.creator.getSubscription.useQuery();
  const upgradeToPro = trpc.creator.upgradeToPro.useMutation();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1M");
  const [search, setSearch] = useState("");

  const totalEarnings = earnings?.totalEarnings ?? 14282.50;

  const mockTransactions = [
    { id: 1, date: "OCT 22, 2024", campaign: "NEON_RUSH_2024", status: "PAID", amount: "$800.00" },
    { id: 2, date: "OCT 18, 2024", campaign: "SUMMIT_COLLAB_Q4", status: "PENDING", amount: "$1,200.00" },
    { id: 3, date: "OCT 15, 2024", campaign: "CIRCUIT_DROP_V3", status: "PAID", amount: "$600.00" },
    { id: 4, date: "OCT 10, 2024", campaign: "APEX_LAUNCH_V1", status: "PAID", amount: "$950.00" },
    { id: 5, date: "OCT 05, 2024", campaign: "DRIFT_COLLAB", status: "ESCROW", amount: "$720.00" },
  ];

  const statusColors: Record<string, string> = {
    PAID: "text-signal border-signal/40",
    PENDING: "text-gold border-gold/40",
    ESCROW: "text-muted-foreground border-border",
  };

  const filtered = mockTransactions.filter(
    (t) =>
      search === "" ||
      t.campaign.toLowerCase().includes(search.toLowerCase()) ||
      t.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout activeNav="REVENUE" activeSidebar="Revenue">
      <div className="p-8">
        {/* Header */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Wallet Balance */}
          <div className="col-span-2 bg-card border border-border rounded-lg p-6">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-2">WALLET BALANCE</p>
            <div className="flex items-baseline gap-3 mb-6">
              <p className="font-mono text-5xl text-signal font-bold">
                ${totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <span className="font-mono text-xs text-signal border border-signal/40 rounded px-2 py-0.5">
                +12.4% vs last mo
              </span>
            </div>
            <div className="flex gap-3">
              <button className="px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors">
                CASH OUT
              </button>
              <button className="px-5 py-2.5 border border-border font-mono text-xs tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground transition-colors rounded">
                VIEW DETAILS
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
            {!subscription ? (
              <button
                onClick={() => upgradeToPro.mutate()}
                disabled={upgradeToPro.isPending}
                className="w-full py-2 border border-gold text-gold font-mono text-[9px] tracking-widest rounded hover:bg-gold/10 transition-colors disabled:opacity-50"
              >
                {upgradeToPro.isPending ? "PROCESSING..." : "MANAGE SUBSCRIPTION"}
              </button>
            ) : (
              <button className="w-full py-2 border border-gold text-gold font-mono text-[9px] tracking-widest rounded hover:bg-gold/10 transition-colors">
                MANAGE SUBSCRIPTION
              </button>
            )}
          </div>
        </div>

        {/* Revenue Growth Chart */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-mono text-xs text-foreground tracking-widest font-bold uppercase">REVENUE GROWTH</h2>
            <div className="flex gap-1">
              {(["1W", "1M", "ALL"] as TimeFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-3 py-1 font-mono text-[8px] tracking-widest rounded transition-colors ${
                    timeFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-2 h-32">
            {barHeights.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-signal/80 hover:bg-signal transition-colors cursor-pointer"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="font-mono text-[8px] text-muted-foreground">JAN</span>
            <span className="font-mono text-[8px] text-muted-foreground">OCT</span>
          </div>
        </div>

        {/* Pending Escrow */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-2">PENDING ESCROW</p>
                <p className="font-mono text-2xl text-foreground font-bold">$4,120.00</p>
              </div>
              <Rocket className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-mono text-[9px] text-muted-foreground mt-3">
              NEXT RELEASE: <span className="text-gold">OCT 24, 2024</span>
            </p>
          </div>
          <div className="col-span-2" />
        </div>

        {/* Transaction History */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-mono text-xs text-foreground tracking-widest font-bold uppercase">TRANSACTION HISTORY</h2>
            <input
              type="text"
              placeholder="SEARCH..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background border border-border rounded px-3 py-1.5 font-mono text-[9px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 w-48"
            />
          </div>

          {/* Table header */}
          <div className="grid grid-cols-4 px-5 py-2 border-b border-border bg-muted/20">
            {["DATE", "CAMPAIGN", "STATUS", "AMOUNT"].map((h) => (
              <p key={h} className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">{h}</p>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map((tx) => (
              <div key={tx.id} className="grid grid-cols-4 items-center px-5 py-3.5">
                <p className="font-mono text-[9px] text-muted-foreground">{tx.date}</p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                    <span className="font-mono text-[6px] text-muted-foreground">C</span>
                  </div>
                  <p className="font-mono text-[10px] text-foreground font-bold truncate">{tx.campaign}</p>
                </div>
                <div>
                  <span className={`font-mono text-[8px] border rounded px-1.5 py-0.5 tracking-widest ${statusColors[tx.status]}`}>
                    {tx.status}
                  </span>
                </div>
                <p className="font-mono text-sm text-signal font-bold">{tx.amount}</p>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="font-mono text-xs text-muted-foreground">NO TRANSACTIONS FOUND</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
