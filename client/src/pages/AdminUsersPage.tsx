import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Search, Users, Megaphone, Zap, Shield } from "lucide-react";

const roleColor: Record<string, string> = {
  creator:    "text-gold border-gold/40",
  advertiser: "text-primary border-primary/40",
  admin:      "text-signal border-signal/40",
};

const roleIcon: Record<string, React.ReactNode> = {
  creator:    <Zap className="w-3 h-3" />,
  advertiser: <Megaphone className="w-3 h-3" />,
  admin:      <Shield className="w-3 h-3" />,
};

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "creator" | "advertiser" | "admin">("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: users = [], isLoading } = trpc.admin.getUsers.useQuery({
    limit: 100,
    role: roleFilter === "all" ? undefined : roleFilter,
    search: debouncedSearch || undefined,
  });

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout((window as any)._userSearchTimer);
    (window as any)._userSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  }

  const roleTabs = ["all", "creator", "advertiser", "admin"] as const;
  const counts = {
    all:        users.length,
    creator:    users.filter(u => u.role === "creator").length,
    advertiser: users.filter(u => u.role === "advertiser").length,
    admin:      users.filter(u => u.role === "admin").length,
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[9px] text-signal border border-signal/40 rounded px-2 py-0.5 tracking-widest">
                ● ADMIN
              </span>
            </div>
            <h1 className="font-display text-5xl tracking-wider text-foreground">USER_REGISTRY</h1>
          </div>
          <div className="flex items-center gap-3 font-mono text-[9px] text-muted-foreground border border-border rounded px-3 py-2">
            <Users className="w-3.5 h-3.5" />
            <span>{users.length} TOTAL USERS</span>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
            />
          </div>
          <div className="flex gap-0 border border-border rounded overflow-hidden">
            {roleTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setRoleFilter(tab)}
                className={`px-4 py-2 font-mono text-[9px] tracking-widest uppercase transition-colors ${
                  roleFilter === tab
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab} {roleFilter === "all" && tab === "all" ? "" : ""}
                {tab !== "all" && <span className="ml-1 opacity-60">({counts[tab]})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-5 px-5 py-2 border-b border-border">
            {["USER", "EMAIL", "ROLE", "JOINED", "ACTION"].map(h => (
              <p key={h} className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">{h}</p>
            ))}
          </div>

          {isLoading ? (
            <div className="px-5 py-10 text-center">
              <p className="font-mono text-xs text-muted-foreground animate-pulse">LOADING USERS…</p>
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-mono text-xs text-muted-foreground">No users found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map(user => (
                <div key={user.id} className="grid grid-cols-5 items-center px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  {/* User */}
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                      <span className="font-mono text-[8px] text-muted-foreground">
                        {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-foreground font-bold truncate">
                      {user.name ?? "—"}
                    </p>
                  </div>

                  {/* Email */}
                  <p className="font-mono text-[9px] text-muted-foreground truncate pr-4">
                    {user.email ?? "—"}
                  </p>

                  {/* Role */}
                  <div className="flex items-center gap-1.5">
                    <span className={`flex items-center gap-1 font-mono text-[8px] tracking-widest border rounded px-1.5 py-0.5 uppercase ${roleColor[user.role] ?? "text-muted-foreground border-border"}`}>
                      {roleIcon[user.role]}
                      {user.role}
                    </span>
                  </div>

                  {/* Joined */}
                  <p className="font-mono text-[9px] text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>

                  {/* Action */}
                  <div className="flex items-center gap-2">
                    {user.role === "creator" && (
                      <button
                        onClick={() => setLocation(`/creator/profile/${user.id}`)}
                        className="font-mono text-[8px] tracking-widest text-muted-foreground hover:text-foreground border border-border hover:border-foreground/50 rounded px-2 py-1 transition-colors"
                      >
                        VIEW
                      </button>
                    )}
                    {user.role === "advertiser" && (
                      <button
                        onClick={() => setLocation(`/brand/profile/${user.id}`)}
                        className="font-mono text-[8px] tracking-widest text-muted-foreground hover:text-foreground border border-border hover:border-foreground/50 rounded px-2 py-1 transition-colors"
                      >
                        VIEW
                      </button>
                    )}
                    <span className="font-mono text-[8px] text-muted-foreground">
                      #{user.id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
