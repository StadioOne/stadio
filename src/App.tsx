import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import EventsPage from "@/pages/EventsPage";
import PricingPage from "@/pages/PricingPage";
import CategoriesPage from "@/pages/CategoriesPage";
import OriginalsPage from "@/pages/OriginalsPage";
import AuthorsPage from "@/pages/AuthorsPage";
import UsersPage from "@/pages/UsersPage";
import AuditLogPage from "@/pages/AuditLogPage";
import EdgeFunctionsPage from "@/pages/EdgeFunctionsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import AnalyticsFixturesPage from "@/pages/AnalyticsFixturesPage";
import AnalyticsOriginalsPage from "@/pages/AnalyticsOriginalsPage";
import ApiSportsSettingsPage from "@/pages/ApiSportsSettingsPage";
import CatalogPage from "@/pages/CatalogPage";
import NotFound from "@/pages/NotFound";
import "@/lib/i18n";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // For now, allow any authenticated user (role check can be enforced later)
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/originals" element={<OriginalsPage />} />
        <Route path="/authors" element={<AuthorsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/audit" element={<AuditLogPage />} />
        <Route path="/edge-functions" element={<EdgeFunctionsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/analytics/fixtures" element={<AnalyticsFixturesPage />} />
        <Route path="/analytics/originals" element={<AnalyticsOriginalsPage />} />
        <Route path="/settings/api-sports" element={<ApiSportsSettingsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
