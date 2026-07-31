import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/components/AuthPage";
import { Skeleton } from "@/components/ui/skeleton";
import { I18nProvider } from "@/lib/i18n";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-background animate-fade-in">
    {/* Header skeleton */}
    <div className="border-b border-border px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
    </div>
    {/* Content skeleton */}
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">
      <div className="text-center space-y-3">
        <Skeleton className="h-7 w-72 mx-auto" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  </div>
);

const AppContent = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
