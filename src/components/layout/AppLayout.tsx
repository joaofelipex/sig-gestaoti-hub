import { Outlet, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Bell, Moon, Search, Sun, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { domains, assets, licenses } from "@/data/mock-data";
import { servers } from "@/data/servers-data";
import { useMemo, useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function AppLayout() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const alerts = useMemo(() => {
    const items: { label: string; type: string; route: string }[] = [];
    domains.forEach(d => {
      const days = daysUntil(d.expirationDate);
      if (days <= 30 && days > 0) items.push({ label: `${d.url} expira em ${days}d`, type: 'warning', route: '/dominios' });
      if (days <= 0) items.push({ label: `${d.url} expirado!`, type: 'critical', route: '/dominios' });
      const sslDays = daysUntil(d.sslExpiration);
      if (sslDays <= 30 && sslDays > 0) items.push({ label: `SSL ${d.url} expira em ${sslDays}d`, type: 'warning', route: '/dominios' });
    });
    servers.forEach(s => {
      if (s.status === 'Offline' || s.status === 'Degradado') items.push({ label: `${s.name} está ${s.status}`, type: 'critical', route: '/servidores' });
      const cd = daysUntil(s.contractEnd);
      if (cd <= 30 && cd > 0) items.push({ label: `Contrato ${s.name} vence em ${cd}d`, type: 'warning', route: '/servidores' });
    });
    assets.forEach(a => {
      if (a.status === 'Manutenção') items.push({ label: `${a.brand} ${a.model} em manutenção`, type: 'warning', route: '/ativos' });
    });
    return items;
  }, []);

  const searchResults = useMemo(() => {
    if (searchValue.length < 2) return [];
    const q = searchValue.toLowerCase();
    const results: { label: string; sub: string; route: string }[] = [];
    assets.forEach(a => {
      if (`${a.brand} ${a.model} ${a.serialNumber}`.toLowerCase().includes(q))
        results.push({ label: `${a.brand} ${a.model}`, sub: a.id, route: '/ativos' });
    });
    domains.forEach(d => {
      if (d.url.toLowerCase().includes(q))
        results.push({ label: d.url, sub: d.registrar, route: '/dominios' });
    });
    licenses.forEach(l => {
      if (l.software.toLowerCase().includes(q))
        results.push({ label: l.software, sub: l.vendor, route: '/licencas' });
    });
    servers.forEach(s => {
      if (`${s.name} ${s.purpose} ${s.provider}`.toLowerCase().includes(q))
        results.push({ label: s.name, sub: s.provider, route: '/servidores' });
    });
    return results.slice(0, 8);
  }, [searchValue]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-secondary/80 backdrop-blur sticky top-0 z-10 shadow-sm">
          <div className="relative w-72 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar... (Ctrl+K)"
              className="pl-10 bg-card border-border h-10 shadow-sm"
              value={searchValue}
              onChange={e => { setSearchValue(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center justify-between"
                    onMouseDown={() => { navigate(r.route); setSearchValue(""); setSearchOpen(false); }}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.sub}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{r.route.replace('/', '')}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 bg-card border border-border shadow-sm hover:bg-muted"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative h-10 w-10 rounded-md bg-card border border-border shadow-sm hover:bg-muted transition-colors flex items-center justify-center">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {alerts.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                      {alerts.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-auto">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">Alertas ({alerts.length})</p>
                </div>
                {alerts.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum alerta</div>
                ) : (
                  alerts.map((a, i) => (
                    <DropdownMenuItem key={i} onClick={() => navigate(a.route)} className="cursor-pointer">
                      <div className={`w-2 h-2 rounded-full shrink-0 mr-2 ${a.type === 'critical' ? 'bg-destructive' : 'bg-warning'}`} />
                      <span className="text-xs">{a.label}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-3 pl-3 pr-3 py-1.5 rounded-md bg-card border border-border shadow-sm">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-foreground leading-tight">Felipe Miranda</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Administrador do Sistema</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
