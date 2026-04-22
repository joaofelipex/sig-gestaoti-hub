import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Monitor, Globe, Key, ShieldCheck, ChevronLeft, ChevronRight,
  Cpu, TrendingUp, Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/ativos", icon: Monitor, label: "Ativos (ITAM)" },
  { to: "/dominios", icon: Globe, label: "Domínios & DNS" },
  { to: "/licencas", icon: Key, label: "Licenças (SAM)" },
  { to: "/governanca", icon: ShieldCheck, label: "Governança" },
  { to: "/servidores", icon: Cloud, label: "Servidores" },
  { to: "/economista", icon: TrendingUp, label: "Visão Economista" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col bg-card text-foreground border-r border-border transition-all duration-300 h-screen sticky top-0 shadow-sm",
        collapsed ? "w-[72px]" : "w-[232px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border bg-secondary/50">
        <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-primary">
          <Cpu className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-primary tracking-wide">IMTS</span>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Gestão TI</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 space-y-1 bg-secondary/30">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                isActive
                  ? "bg-card text-primary shadow-sm border border-border"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-border bg-secondary/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-md text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
