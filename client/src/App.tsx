import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import JobApplicationPage from "@/pages/job-application";
import LinkedInOptimizerPage from "@/pages/linkedin-optimizer";
import SkillsTrainingPage from "@/pages/skills-training";
import { Loader2 } from "lucide-react";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/application" component={JobApplicationPage} />
        <Route path="/application/:slug" component={JobApplicationPage} />
        <Route path="/linkedin" component={LinkedInOptimizerPage} />
        <Route path="/training" component={SkillsTrainingPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
