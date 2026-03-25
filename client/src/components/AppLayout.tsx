import React, { useRef, useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard, TrendingUp, DollarSign, Users, Bell,
  HelpCircle, LogOut, User, Megaphone, Shield,
  FileText, Check, CheckCheck, MessageSquare, Calendar,
  Menu, X, Settings,
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

// ─── Role-specific sidebar links ─────────────────────────────────────────────
function getSidebarLinks(role: string) {
  if (role === "advertiser") return [
    { icon: LayoutDashboard, label: "Dashboard",     path: "/brand/dashboard" },
    { icon: Megaphone,       label: "Campaigns",     path: "/brand/campaigns" },
    { icon: FileText,        label: "Content",       path: "/brand/content" },
    { icon: TrendingUp,      label: "Analytics",     path: "/brand/analytics" },
    { icon: Users,           label: "Find Creators", path: "/creator/directory" },
    { icon: MessageSquare,   label: "Messages",      path: "/messages" },
    { icon: Calendar,        label: "Calendar",      path: "/calendar" },
    { icon: User,            label: "Profile",       path: "/profile" },
    { icon: Settings,        label: "Settings",      path: "/settings" },
  ];
  if (role === "creator") return [
    { icon: LayoutDashboard, label: "Dashboard",  path: "/creator/dashboard" },
    { icon: DollarSign,      label: "Earnings",   path: "/creator/earnings" },
    { icon: Users,           label: "Marketplace",path: "/creator/marketplace" },
    { icon: MessageSquare,   label: "Messages",   path: "/messages" },
    { icon: Calendar,        label: "Calendar",   path: "/calendar" },
    { icon: User,            label: "Profile",    path: "/profile" },
    { icon: Settings,        label: "Settings",   path: "/settings" },
  ];
  // admin
  return [
    { icon: Shield,        label: "Dashboard",     path: "/admin" },
    { icon: Users,         label: "Users",         path: "/admin/users" },
    { icon: CheckCheck,    label: "Verifications", path: "/admin/verifications" },
    { icon: FileText,      label: "Disputes",      path: "/admin/disputes" },
    { icon: TrendingUp,    label: "System Health", path: "/admin/system" },
    { icon: Settings,      label: "Settings",      path: "/admin/settings" },
  ];
}

// ─── Notifications Dropdown ───────────────────────────────────────────────────
function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [], refetch } = trpc.creator.getNotifications.useQuery(
    { limit: 20 },
    { refetchOnWindowFocus: false }
  );
  const markRead = trpc.creator.markNotificationRead.useMutation({ onSuccess: () => refetch() });
  const markAll  = trpc.creator.markAllNotificationsRead.useMutation({ onSuccess: () => refetch() });

  const unread = notifications.filter((n: any) => !n.isRead).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-primary text-[8px] text-primary-foreground font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-mono text-xs tracking-widest uppercase text-foreground font-bold">
              NOTIFICATIONS {unread > 0 && <span className="text-primary">({unread})</span>}
            </span>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground hover:text-foreground tracking-widest uppercase transition-colors"
              >
                <CheckCheck className="w-3 h-3" /> MARK ALL READ
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="font-mono text-xs text-muted-foreground tracking-widest">NO NOTIFICATIONS</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead.mutate({ notificationId: n.id })}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${
                    !n.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className={!n.isRead ? "" : "pl-3.5"}>
                      <p className="font-mono text-xs text-foreground leading-relaxed">{n.message}</p>
                      <p className="font-mono text-[9px] text-muted-foreground mt-1 tracking-widest">
                        {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {n.isRead && <Check className="w-3 h-3 text-muted-foreground ml-auto shrink-0 mt-0.5" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar nav links (shared between desktop sidebar and mobile drawer) ──────
function SidebarNav({
  links,
  location,
  isActive,
  onNavigate,
}: {
  links: { icon: React.ElementType; label: string; path: string }[];
  location: string;
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
}) {
  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      {links.map(({ icon: Icon, label, path }) => {
        const active = isActive(path);
        return (
          <button
            key={label}
            onClick={() => onNavigate(path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors ${
              active
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : ""}`} />
            <span className="font-mono text-xs tracking-wider uppercase">{label}</span>
            {active && <span className="ml-auto w-1 h-4 rounded-full bg-primary" />}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function AppLayout({ children }: AppLayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const role = user?.role ?? "creator";
  const sidebarLinks = getSidebarLinks(role);
  const initial = (user?.name ?? user?.email ?? "V")[0].toUpperCase();

  const { data: unreadMessages } = trpc.messaging.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  // Close drawer and scroll to top on route change
  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  async function handleLogout() {
    await logout();
    setLocation("/auth");
  }

  function isActive(path: string) {
    if (path === "/brand/dashboard") return location === path;
    if (path === "/admin") return location === path;
    if (path === "/creator/dashboard") return location === path;
    if (path === "/admin/users") return location === path || location.startsWith("/admin/users");
    if (path === "/brand/campaigns") return location === path || location.startsWith("/brand/campaigns/");
    return location === path || location.startsWith(path + "/");
  }

  function navigate(path: string) {
    setLocation(path);
    setDrawerOpen(false);
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 h-full w-52 bg-card border-r border-border flex-col z-40 hidden md:flex">
        <div className="p-4 border-b border-border">
          <img src={isDark ? "/logo.png" : "/logo-light.png"} alt="Vyral" className="h-8 w-auto mb-2" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
            <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">
              {role} console
            </p>
          </div>
        </div>

        <SidebarNav links={sidebarLinks} location={location} isActive={isActive} onNavigate={navigate} />

        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="w-3 h-3" />
              <span className="font-mono text-[9px] tracking-wider">SUPPORT</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span className="font-mono text-[9px] tracking-wider">LOGOUT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile slide-in drawer ───────────────────────────────────── */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-card border-r border-border flex flex-col z-50 md:hidden transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <img src={isDark ? "/logo.png" : "/logo-light.png"} alt="Vyral" className="h-8 w-auto mb-1" />
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">
                {role} console
              </p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0"
          >
            <span className="font-mono text-sm text-primary font-bold">{initial}</span>
          </button>
          <div className="min-w-0">
            <p className="font-mono text-xs text-foreground truncate">{user?.name ?? user?.email ?? "—"}</p>
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">{role}</p>
          </div>
        </div>

        <SidebarNav links={sidebarLinks} location={location} isActive={isActive} onNavigate={navigate} />

        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1 py-2 text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="font-mono text-[9px] tracking-wider">SUPPORT</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="font-mono text-[9px] tracking-wider">LOGOUT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Top header ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center px-4 md:px-6 z-40 md:left-52">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors mr-3"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo — mobile only (desktop shows in sidebar) */}
        <img src={isDark ? "/logo.png" : "/logo-light.png"} alt="Vyral" className="h-7 w-auto md:hidden" />

        <div className="flex-1" />

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setLocation("/messages")}
            className="relative w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Messages"
          >
            <MessageSquare className="w-4 h-4" />
            {(unreadMessages ?? 0) > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-primary text-[8px] text-primary-foreground font-bold flex items-center justify-center">
                {(unreadMessages as number) > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </button>

          <NotificationsDropdown />

          <div className="flex items-center gap-2 pl-2 md:pl-3 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">{role}</p>
              <p className="font-mono text-[10px] text-foreground truncate max-w-[100px] md:max-w-[140px]">
                {user?.name ?? user?.email ?? "—"}
              </p>
            </div>
            <button
              onClick={() => setLocation("/profile")}
              className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center hover:border-primary/60 transition-colors"
            >
              <span className="font-mono text-xs text-primary font-bold">{initial}</span>
            </button>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="hidden md:flex w-8 h-8 items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="mt-14 md:ml-52 min-h-screen bg-background">
        {children}
      </main>
    </div>
  );
}
