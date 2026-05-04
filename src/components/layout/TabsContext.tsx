import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home, Laptop, Globe, KeyRound, ShieldCheck, Server,
  Wrench, ArrowLeftRight, Boxes, LineChart, LucideIcon,
} from "lucide-react";

export interface TabDescriptor {
  /** Rota base (sem hash). Usada como id e para navegação. */
  path: string;
  /** Título principal da aba (linha 1). */
  label: string;
  /** Subtítulo opcional (linha 2, menor). */
  sublabel?: string;
  /** Aba "Início" não pode ser fechada. */
  pinned?: boolean;
  /** Ícone do módulo (lucide). */
  icon?: LucideIcon;
}

interface TabsContextValue {
  tabs: TabDescriptor[];
  activePath: string;
  openTab: (tab: TabDescriptor) => void;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const HOME_TAB: TabDescriptor = {
  path: "/",
  label: "Início",
  sublabel: "Seja Bem Vindo(a)",
  pinned: true,
  icon: Home,
};

/** Mapeia uma rota → descriptor padrão. Garante que abertura por URL direta funcione. */
const ROUTE_DEFAULTS: Record<string, TabDescriptor> = {
  "/": HOME_TAB,
  "/ativos":         { path: "/ativos",         label: "Ativos",           sublabel: "ITAM",                icon: Laptop },
  "/dominios":       { path: "/dominios",       label: "Domínios",         sublabel: "DNS & SSL",           icon: Globe },
  "/licencas":       { path: "/licencas",       label: "Licenças",         sublabel: "SAM",                 icon: KeyRound },
  "/governanca":     { path: "/governanca",     label: "Governança",       sublabel: "Acessos & DR",        icon: ShieldCheck },
  "/servidores":     { path: "/servidores",     label: "Servidores",       sublabel: "Infra & Cloud",       icon: Server },
  "/manutencao":     { path: "/manutencao",     label: "Manutenção",       sublabel: "Garantia & 60%",      icon: Wrench },
  "/movimentacoes":  { path: "/movimentacoes",  label: "Movimentações",    sublabel: "Termos & Histórico",  icon: ArrowLeftRight },
  "/estoque":        { path: "/estoque",        label: "Estoque",          sublabel: "Almoxarifado TI",     icon: Boxes },
  "/economista":     { path: "/economista",     label: "Visão Economista", sublabel: "Financeiro",          icon: LineChart },
};

export function TabsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<TabDescriptor[]>([HOME_TAB]);

  // Sempre que a rota mudar, garantir que a aba existe e é a ativa.
  useEffect(() => {
    const path = location.pathname;
    const def = ROUTE_DEFAULTS[path];
    if (!def) return; // 404 ou rota não mapeada
    setTabs((prev) => {
      if (prev.some((t) => t.path === path)) return prev;
      return [...prev, def];
    });
  }, [location.pathname]);

  const value = useMemo<TabsContextValue>(() => ({
    tabs,
    activePath: location.pathname,
    openTab: (tab) => {
      setTabs((prev) => (prev.some((t) => t.path === tab.path) ? prev : [...prev, tab]));
      navigate(tab.path);
    },
    closeTab: (path) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.path === path);
        if (idx === -1) return prev;
        const tab = prev[idx];
        if (tab.pinned) return prev;
        const next = prev.filter((t) => t.path !== path);
        // Se fechou a ativa, navegar para a vizinha (anterior, ou Início).
        if (location.pathname === path) {
          const fallback = next[idx - 1] ?? next[idx] ?? HOME_TAB;
          navigate(fallback.path);
        }
        return next;
      });
    },
    setActive: (path) => navigate(path),
  }), [tabs, location.pathname, navigate]);

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useAppTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("useAppTabs deve ser usado dentro de TabsProvider");
  return ctx;
}

export const APP_TAB_DEFAULTS = ROUTE_DEFAULTS;
