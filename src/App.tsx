import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import AssetsPage from "@/pages/AssetsPage";
import DomainsPage from "@/pages/DomainsPage";
import LicensesPage from "@/pages/LicensesPage";
import GovernancePage from "@/pages/GovernancePage";
import EconomistPage from "@/pages/EconomistPage";
import ServersPage from "@/pages/ServersPage";
import MaintenancePage from "@/pages/MaintenancePage";
import MovementsPage from "@/pages/MovementsPage";
import InventoryPage from "@/pages/InventoryPage";
import PaymentsPage from "@/pages/PaymentsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/ativos" element={<AssetsPage />} />
                  <Route path="/dominios" element={<DomainsPage />} />
                  <Route path="/licencas" element={<LicensesPage />} />
                  <Route path="/governanca" element={<GovernancePage />} />
                  <Route path="/economista" element={<EconomistPage />} />
                  <Route path="/servidores" element={<ServersPage />} />
                  <Route path="/manutencao" element={<MaintenancePage />} />
                  <Route path="/movimentacoes" element={<MovementsPage />} />
                  <Route path="/estoque" element={<InventoryPage />} />
                  <Route path="/pagamentos" element={<PaymentsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
