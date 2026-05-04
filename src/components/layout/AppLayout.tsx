import { Outlet, useNavigate } from "react-router-dom";
import { Bell, Cpu, LogOut, Moon, Plus, Search, Sun, User, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
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
import { cn } from "@/lib/utils";
import { APP_TAB_DEFAULTS, TabsProvider, useAppTabs } from "./TabsContext";

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function TabBar() {
  const { tabs, activePath, closeTab, setActive, openTab } = useAppTabs();
  const allModules = Object.values(APP_TAB_DEFAULTS).filter((t) => !t.pinned);
  const openPaths = new Set(tabs.map((t) => t.path));

  return (
    <div className="relative flex items-end gap-0.5 overflow-x-auto overflow-y-hidden scrollbar-none px-1 -mb-px">
      {tabs.map((tab) => {
        const active = tab.path === activePath;
        const Icon = tab.icon;
        return (
          <div
            key={tab.path}
            onClick={() => setActive(tab.path)}
            className={cn(
              "group relative flex items-center gap-2.5 pl-3.5 pr-2 h-11 min-w-[160px] max-w-[230px] cursor-pointer select-none",
              "rounded-t-xl transition-all duration-200",
              active
                ? "bg-card text-foreground shadow-[0_-1px_0_0_hsl(var(--border))_inset,1px_-1px_0_0_hsl(var(--border))_inset,-1px_-1px_0_0_hsl(var(--border))_inset] z-10"
                : "bg-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            {/* Indicador superior animado */}
            <span
              className={cn(
                "absolute top-0 left-3 right-3 h-[2px] rounded-full transition-all duration-300",
                active ? "bg-primary opacity-100 scale-x-100" : "bg-transparent opacity-0 scale-x-0",
              )}
            />

            {/* Ícone */}
            {Icon && (
              <div
                className={cn(
                  "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/60 text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary",
                )}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
              </div>
            )}

            {/* Labels */}
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span
                className={cn(
                  "text-[12.5px] font-semibold truncate tracking-tight",
                  active ? "text-foreground" : "",
                )}
              >
                {tab.label}
              </span>
              {tab.sublabel && (
                <span className="text-[10px] text-muted-foreground truncate font-medium">
                  {tab.sublabel}
                </span>
              )}
            </div>

            {/* Botão fechar */}
            {!tab.pinned ? (
              <button
                aria-label={`Fechar ${tab.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.path);
                }}
                className={cn(
                  "shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all",
                  "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            ) : (
              <div className="w-2" />
            )}
          </div>
        );
      })}

      {/* Botão "+" para abrir nova aba/módulo */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Abrir módulo"
            className="shrink-0 w-9 h-9 mb-1 ml-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72 p-1.5">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Módulos disponíveis
          </div>
          {allModules.map((m) => {
            const Icon = m.icon;
            const isOpen = openPaths.has(m.path);
            return (
              <DropdownMenuItem
                key={m.path}
                onClick={() => openTab(m)}
                className="cursor-pointer flex items-center gap-3 py-2 rounded-md"
              >
                {Icon && (
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-4 h-4" strokeWidth={2.25} />
                  </div>
                )}
                <div className="flex flex-col leading-tight flex-1 min-w-0">
                  <span className="text-[13px] font-semibold truncate">{m.label}</span>
                  {m.sublabel && (
                    <span className="text-[10px] text-muted-foreground truncate">{m.sublabel}</span>
                  )}
                </div>
                {isOpen && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-success/10 text-success border-success/30 shrink-0">
                    aberto
                  </Badge>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function LayoutChrome() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { openTab } = useAppTabs();

  const alerts = useMemo(() => {
    const items: { label: string; type: string; route: string }[] = [];
    domains.forEach((d) => {
      const days = daysUntil(d.expirationDate);
      if (days <= 30 && days > 0) items.push({ label: `${d.url} expira em ${days}d`, type: "warning", route: "/dominios" });
      if (days <= 0) items.push({ label: `${d.url} expirado!`, type: "critical", route: "/dominios" });
      const sslDays = daysUntil(d.sslExpiration);
      if (sslDays <= 30 && sslDays > 0) items.push({ label: `SSL ${d.url} expira em ${sslDays}d`, type: "warning", route: "/dominios" });
    });
    servers.forEach((s) => {
      if (s.status === "Offline" || s.status === "Degradado") items.push({ label: `${s.name} está ${s.status}`, type: "critical", route: "/servidores" });
      const cd = daysUntil(s.contractEnd);
      if (cd <= 30 && cd > 0) items.push({ label: `Contrato ${s.name} vence em ${cd}d`, type: "warning", route: "/servidores" });
    });
    assets.forEach((a) => {
      if (a.status === "Manutenção") items.push({ label: `${a.brand} ${a.model} em manutenção`, type: "warning", route: "/ativos" });
    });
    return items;
  }, []);

  const searchResults = useMemo(() => {
    if (searchValue.length < 2) return [];
    const q = searchValue.toLowerCase();
    const results: { label: string; sub: string; route: string }[] = [];
    assets.forEach((a) => {
      if (`${a.brand} ${a.model} ${a.serialNumber}`.toLowerCase().includes(q))
        results.push({ label: `${a.brand} ${a.model}`, sub: a.id, route: "/ativos" });
    });
    domains.forEach((d) => {
      if (d.url.toLowerCase().includes(q)) results.push({ label: d.url, sub: d.registrar, route: "/dominios" });
    });
    licenses.forEach((l) => {
      if (l.software.toLowerCase().includes(q)) results.push({ label: l.software, sub: l.vendor, route: "/licencas" });
    });
    servers.forEach((s) => {
      if (`${s.name} ${s.purpose} ${s.provider}`.toLowerCase().includes(q))
        results.push({ label: s.name, sub: s.provider, route: "/servidores" });
    });
    return results.slice(0, 8);
  }, [searchValue]);

  const navigateAndOpen = (route: string) => {
    const def = APP_TAB_DEFAULTS[route];
    if (def) openTab(def);
    else navigate(route);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header horizontal estilo navegador */}
      <header className="bg-[hsl(var(--tab-bar))] border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="flex items-stretch gap-3 px-3 sm:px-4 h-16">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 pr-3 border-r border-border shrink-0"
            aria-label="Início IMTS"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
              <Cpu className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:block text-[16px] font-extrabold tracking-tight text-foreground">
              IMTS
            </span>
          </button>

          {/* Tab bar */}
          <div className="flex-1 min-w-0 flex items-center">
            <TabBar />
          </div>

          {/* Busca */}
          <div className="hidden md:block relative w-72 my-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar... (Ctrl+K)"
              className="pl-10 bg-background border-border h-10 rounded-full shadow-sm text-[13px]"
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center justify-between"
                    onMouseDown={() => { navigateAndOpen(r.route); setSearchValue(""); setSearchOpen(false); }}
                  >
                    <div>
                      <p className="text-[13px] font-medium text-foreground leading-tight">{r.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{r.sub}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{r.route.replace("/", "")}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ações + perfil */}
          <div className="flex items-center gap-2 my-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-muted"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === "dark" ? "Modo claro" : "Modo escuro"}</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative h-10 w-10 rounded-full hover:bg-muted transition-colors flex items-center justify-center">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {alerts.length > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                      {alerts.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-auto">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[13px] font-semibold text-foreground">Alertas ({alerts.length})</p>
                </div>
                {alerts.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum alerta</div>
                ) : (
                  alerts.map((a, i) => (
                    <DropdownMenuItem key={i} onClick={() => navigateAndOpen(a.route)} className="cursor-pointer">
                      <div className={`w-2 h-2 rounded-full shrink-0 mr-2 ${a.type === "critical" ? "bg-destructive" : "bg-warning"}`} />
                      <span className="text-xs">{a.label}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <UserPill />
          </div>
        </div>
      </header>

      {/* Busca mobile */}
      <div className="md:hidden px-3 py-2 border-b border-border bg-[hsl(var(--tab-bar))]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-10 h-10 rounded-full text-[13px]"
            value={searchValue}
            onChange={(e) => { setSearchValue(e.target.value); setSearchOpen(true); }}
          />
        </div>
      </div>

      <main className="flex-1 px-3 py-5 sm:px-6 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}

function UserPill() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const meta = (user?.user_metadata ?? {}) as { nome?: string; full_name?: string; organizacao?: string };
  const displayName = meta.nome || meta.full_name || user?.email?.split("@")[0] || "Usuário";
  const org = meta.organizacao || "Minha organização";
  const initials = displayName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 pl-3 pr-3 py-1.5 rounded-full bg-background border border-border shadow-sm ml-1 hover:bg-muted transition-colors">
          <div className="hidden md:block text-right leading-tight">
            <p className="text-[13px] font-semibold text-foreground">{displayName}</p>
            <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground">{org}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">{initials || <User className="w-4 h-4" />}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-[13px] font-semibold text-foreground truncate">{displayName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
        </div>
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout() {
  return (
    <TabsProvider>
      <LayoutChrome />
    </TabsProvider>
  );
}
