import { useTheme } from "@/contexts/ThemeContext";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  FileText,
  Settings,
  Bell,
  Zap,
  HelpCircle,
  Terminal,
  LogOut,
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  activeNav?: string;
  activeSidebar?: string;
}

const sidebarLinks = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/brand/dashboard" },
  { icon: TrendingUp, label: "Insights", path: "/admin" },
  { icon: DollarSign, label: "Revenue", path: "/creator/earnings" },
  { icon: FileText, label: "Contracts", path: "/creator/directory" },
  { icon: Settings, label: "Settings", path: "/" },
];

const topNavLinks = ["MARKETPLACE", "CAMPAIGNS", "ANALYTICS", "CREATORS"];

const navPaths: Record<string, string> = {
  MARKETPLACE: "/creator/directory",
  CAMPAIGNS: "/brand/dashboard",
  ANALYTICS: "/admin",
  CREATORS: "/creator/directory",
};

export default function AppLayout({ children, activeNav, activeSidebar }: AppLayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    setLocation("/auth");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Left Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-52 bg-card border-r border-border flex flex-col z-40">
        {/* Sidebar Top */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-3 h-3 text-signal" />
            <span className="font-mono text-xs text-signal font-bold tracking-widest">TERMINAL_V1</span>
            <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse ml-auto" />
          </div>
          <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">
            LIVE DATA STREAM
          </p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1">
          {sidebarLinks.map(({ icon: Icon, label, path }) => {
            const isActive = activeSidebar === label.toUpperCase() || activeSidebar === label;
            return (
              <button
                key={label}
                onClick={() => setLocation(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors text-sm ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                <span className="font-mono text-xs tracking-wider uppercase">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom */}
        <div className="p-3 border-t border-border space-y-2">
          <button className="w-full px-3 py-2 border border-gold text-gold font-mono text-xs tracking-widest rounded hover:bg-gold/10 transition-colors">
            UPGRADE TO PRO
          </button>
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="w-3 h-3" />
              <span className="font-mono text-[9px] tracking-wider">SUPPORT</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <Terminal className="w-3 h-3" />
              <span className="font-mono text-[9px] tracking-wider">LOGS</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Fixed Top Navbar */}
      <header className="fixed top-0 left-52 right-0 h-14 bg-card border-b border-border flex items-center px-6 z-40">
        {/* Logo */}
        <div className="flex items-center mr-8">
          <img
            src={isDark ? "/logo.png" : "/logo-light.png"}
            alt="Vyral"
            className="h-7 w-auto"
          />
        </div>

        {/* Nav Links */}
        <nav className="flex items-center gap-6 flex-1">
          {topNavLinks.map((link) => {
            const isActive = activeNav === link;
            return (
              <button
                key={link}
                onClick={() => setLocation(navPaths[link] || "/")}
                className={`font-mono text-xs tracking-widest uppercase pb-0.5 transition-colors ${
                  isActive
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Zap className="w-4 h-4" />
          </button>
          {/* User + Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">{user?.role ?? "user"}</p>
              <p className="font-mono text-[10px] text-foreground truncate max-w-[140px]">{user?.email ?? user?.name ?? "—"}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="font-mono text-xs text-primary font-bold">
                {(user?.name ?? user?.email ?? "V")[0].toUpperCase()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-52 mt-14 min-h-screen bg-background">
        {children}
      </main>
    </div>
  );
}
