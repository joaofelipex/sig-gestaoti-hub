import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import AssetsPage from "@/pages/AssetsPage";
import DomainsPage from "@/pages/DomainsPage";
import LicensesPage from "@/pages/LicensesPage";
import GovernancePage from "@/pages/GovernancePage";
import EconomistPage from "@/pages/EconomistPage";
import ServersPage from "@/pages/ServersPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ativos" element={<AssetsPage />} />
            <Route path="/dominios" element={<DomainsPage />} />
            <Route path="/licencas" element={<LicensesPage />} />
            <Route path="/governanca" element={<GovernancePage />} />
            <Route path="/economista" element={<EconomistPage />} />
            <Route path="/servidores" element={<ServersPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
