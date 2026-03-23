import React, { useRef, useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard, TrendingUp, DollarSign, Users, Bell,
  HelpCircle, LogOut, User, Megaphone, Shield,
  FileText, Check, CheckCheck, MessageSquare, Calendar,
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

// ─── Role-specific sidebar links ─────────────────────────────────────────────
function getSidebarLinks(role: string) {
  if (role === "advertiser") return [
    { icon: LayoutDashboard, label: "Dashboard",      path: "/brand/dashboard" },
    { icon: Megaphone,       label: "Campaigns",      path: "/brand/dashboard" },
    { icon: Users,           label: "Find Creators",  path: "/creator/directory" },
    { icon: FileText,        label: "Content",        path: "/brand/dashboard" },
    { icon: TrendingUp,      label: "Analytics",      path: "/brand/dashboard" },
    { icon: MessageSquare,   label: "Messages",       path: "/messages" },
    { icon: Calendar,        label: "Calendar",       path: "/calendar" },
    { icon: User,            label: "Profile",        path: "/profile" },
  ];
  if (role === "creator") return [
    { icon: LayoutDashboard, label: "Dashboard",  path: "/creator/dashboard" },
    { icon: DollarSign,      label: "Earnings",   path: "/creator/earnings" },
    { icon: Users,           label: "Marketplace",path: "/creator/directory" },
    { icon: MessageSquare,   label: "Messages",   path: "/messages" },
    { icon: Calendar,        label: "Calendar",   path: "/calendar" },
    { icon: User,            label: "Profile",    path: "/profile" },
  ];
  // admin
  return [
    { icon: Shield,          label: "Command Ctr", path: "/admin" },
    { icon: LayoutDashboard, label: "Brand Hub",   path: "/brand/dashboard" },
    { icon: Megaphone,       label: "Creator Hub", path: "/creator/dashboard" },
    { icon: Users,           label: "Directory",   path: "/creator/directory" },
    { icon: TrendingUp,      label: "Analytics",   path: "/admin" },
    { icon: MessageSquare,   label: "Messages",    path: "/messages" },
    { icon: User,            label: "Profile",     path: "/profile" },
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

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function AppLayout({ children }: AppLayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const role = user?.role ?? "creator";
  const sidebarLinks = getSidebarLinks(role);
  const initial = (user?.name ?? user?.email ?? "V")[0].toUpperCase();

  const { data: unreadMessages } = trpc.messaging.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);

  async function handleLogout() {
    await logout();
    setLocation("/auth");
  }

  // Auto-detect active sidebar link from current path
  function isActive(path: string) {
    if (path === "/brand/dashboard" || path === "/creator/dashboard" || path === "/admin") {
      return location === path;
    }
    return location.startsWith(path);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Hidden on mobile, visible on tablet+ */}
      <aside className="fixed left-0 top-0 h-full w-52 bg-card border-r border-border flex flex-col z-40 hidden md:flex">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">
              {role.toUpperCase()} CONSOLE
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {sidebarLinks.map(({ icon: Icon, label, path }) => {
            const active = isActive(path);
            return (
              <button
                key={label}
                onClick={() => setLocation(path)}
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

      {/* Top bar - Responsive positioning */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center px-4 md:px-6 z-40 md:left-52">
        <img src={isDark ? "/logo.png" : "/logo-light.png"} alt="Vyral" className="h-6 md:h-7 w-auto" />

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
          <div className="hidden sm:flex items-center gap-2 pl-2 md:pl-3 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">{role}</p>
              <p className="font-mono text-[10px] text-foreground truncate max-w-[100px] md:max-w-[140px]">{user?.email ?? user?.name ?? "—"}</p>
            </div>
            <button
              onClick={() => setLocation("/profile")}
              className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center hover:border-primary/60 transition-colors"
            >
              <span className="font-mono text-xs text-primary font-bold">{initial}</span>
            </button>
            <button onClick={handleLogout} title="Sign out" className="hidden md:flex w-8 h-8 items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation - Only visible on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border md:hidden z-40 flex overflow-x-auto">
        {sidebarLinks.map(({ icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <button
              key={label}
              onClick={() => setLocation(path)}
              className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
                active
                  ? "text-primary border-t-2 border-primary"
                  : "text-muted-foreground border-t-2 border-transparent"
              }`}
              title={label}
            >
              <Icon className="w-5 h-5" />
              <span className="font-mono text-[8px] tracking-wider mt-0.5 leading-none">{label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      <main className="mt-14 mb-16 md:mb-0 md:ml-52 min-h-screen bg-background md:pb-0 pb-4">
        {children}
      </main>
    </div>
  );
}
