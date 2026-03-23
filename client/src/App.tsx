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

function ProtectedRoute({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
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

  if (adminOnly && user.role !== "admin") {
    return <NotFound />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />

      {/* Protected */}
      <Route path="/onboarding">
        <ProtectedRoute component={OnboardingPage} />
      </Route>
      <Route path="/brand/dashboard">
        <ProtectedRoute component={BrandDashboard} />
      </Route>
      <Route path="/brand/campaigns/new">
        <ProtectedRoute component={CampaignCreate} />
      </Route>
      <Route path="/brand/campaigns/:id">
        <ProtectedRoute component={CampaignDetail} />
      </Route>
      <Route path="/brand/vyral-match/:campaignId">
        <ProtectedRoute component={VyralMatch} />
      </Route>
      <Route path="/brand/content-approval/:campaignId">
        <ProtectedRoute component={ContentApproval} />
      </Route>
      <Route path="/creator/dashboard">
        <ProtectedRoute component={CreatorDashboard} />
      </Route>
      <Route path="/creator/directory">
        <ProtectedRoute component={CreatorDirectory} />
      </Route>
      <Route path="/creator/earnings">
        <ProtectedRoute component={CreatorEarnings} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminPanel} adminOnly />
      </Route>

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
