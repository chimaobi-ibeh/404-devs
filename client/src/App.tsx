import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";

// Pages
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import BrandDashboard from "./pages/BrandDashboard";
import CreatorDashboard from "./pages/CreatorDashboard";
import CampaignCreate from "./pages/CampaignCreate";
import CampaignDetail from "./pages/CampaignDetail";
import CreatorDirectory from "./pages/CreatorDirectory";
import VyralMatch from "./pages/VyralMatch";
import ContentApproval from "./pages/ContentApproval";
import CreatorEarnings from "./pages/CreatorEarnings";
import AdminPanel from "./pages/AdminPanel";
import ProfilePage from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";
import ContentCalendarPage from "./pages/ContentCalendarPage";
import BrandProfilePage from "./pages/BrandProfilePage";
import CreatorProfilePage from "./pages/CreatorProfilePage";
import CreatorCampaignView from "./pages/CreatorCampaignView";
import CampaignMarketplace from "./pages/CampaignMarketplace";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// ─── Access rules ─────────────────────────────────────────────────────────────
// admin can access everything
// advertiser: brand routes + directory + profile
// creator: creator routes + directory + profile
const ACCESS: Record<string, (role: string) => boolean> = {
  any:        () => true,
  advertiser: (r) => r === "advertiser" || r === "admin",
  creator:    (r) => r === "creator"    || r === "admin",
  shared:     (r) => r !== undefined,   // any authenticated user
  admin:      (r) => r === "admin",
};

function ProtectedRoute({
  component: Component,
  allow = "shared",
}: {
  component: React.ComponentType;
  allow?: keyof typeof ACCESS;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  if (!ACCESS[allow](user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted-foreground">ACCESS DENIED — insufficient role</p>
      </div>
    );
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/reset-password" component={ResetPasswordPage} />

      {/* All authenticated users */}
      <Route path="/onboarding"><ProtectedRoute component={OnboardingPage} /></Route>
      <Route path="/profile"><ProtectedRoute component={ProfilePage} /></Route>
      <Route path="/creator/directory"><ProtectedRoute component={CreatorDirectory} /></Route>
      <Route path="/messages"><ProtectedRoute component={MessagesPage} /></Route>
      <Route path="/calendar"><ProtectedRoute component={ContentCalendarPage} /></Route>

      {/* Advertiser + Admin */}
      <Route path="/brand/dashboard"><ProtectedRoute component={BrandDashboard} allow="advertiser" /></Route>
      <Route path="/brand/campaigns/new"><ProtectedRoute component={CampaignCreate} allow="advertiser" /></Route>
      <Route path="/brand/campaigns/:id/edit"><ProtectedRoute component={CampaignCreate} allow="advertiser" /></Route>
      <Route path="/brand/campaigns/:id"><ProtectedRoute component={CampaignDetail} allow="advertiser" /></Route>
      <Route path="/brand/vyral-match/:campaignId"><ProtectedRoute component={VyralMatch} allow="advertiser" /></Route>
      <Route path="/brand/content-approval/:campaignId"><ProtectedRoute component={ContentApproval} allow="advertiser" /></Route>

      {/* Creator + Admin */}
      <Route path="/creator/dashboard"><ProtectedRoute component={CreatorDashboard} allow="creator" /></Route>
      <Route path="/creator/campaigns/:id"><ProtectedRoute component={CreatorCampaignView} allow="creator" /></Route>
      <Route path="/creator/marketplace"><ProtectedRoute component={CampaignMarketplace} allow="creator" /></Route>
      <Route path="/creator/earnings"><ProtectedRoute component={CreatorEarnings} allow="creator" /></Route>
      <Route path="/brand/profile/:id"><ProtectedRoute component={BrandProfilePage} allow="creator" /></Route>
      <Route path="/creator/profile/:id"><ProtectedRoute component={CreatorProfilePage} /></Route>

      {/* Admin only */}
      <Route path="/admin"><ProtectedRoute component={AdminPanel} allow="admin" /></Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
