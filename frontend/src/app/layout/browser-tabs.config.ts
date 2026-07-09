export interface BrowserTabDef {
  path: string;
  title: string;
  subtitle?: string;
  icon?: string;
  exact?: boolean;
}

/** Rotas que podem aparecer como abas no header. */
export const BROWSER_TAB_ROUTES: BrowserTabDef[] = [
  { path: '/dashboard', title: 'Painel', subtitle: 'Visão', icon: 'fas fa-chart-pie', exact: true },
  { path: '/economista', title: 'Economista', subtitle: 'BI', icon: 'fas fa-chart-line' },
  { path: '/empresas', title: 'Empresas', subtitle: 'Org.', icon: 'fas fa-building' },
  { path: '/ativos', title: 'Ativos', subtitle: 'ITAM', icon: 'fas fa-laptop' },
  { path: '/dominios', title: 'Domínios', subtitle: 'DNS', icon: 'fas fa-globe' },
  { path: '/licencas', title: 'Licenças', subtitle: 'SAM', icon: 'fas fa-key' },
  { path: '/servidores', title: 'Servidores', subtitle: 'Infra', icon: 'fas fa-server' },
  { path: '/manutencao', title: 'Manutenção', subtitle: 'Ops', icon: 'fas fa-wrench' },
  { path: '/movimentacoes', title: 'Movimentações', subtitle: 'Ops', icon: 'fas fa-exchange-alt' },
  { path: '/estoque', title: 'Estoque', subtitle: 'Ops', icon: 'fas fa-boxes' },
  { path: '/governanca', title: 'Governança', subtitle: 'Gov.', icon: 'fas fa-shield-alt' },
  { path: '/pagamentos', title: 'Pagamentos', subtitle: 'Fin.', icon: 'fas fa-wallet' },
  { path: '/alertas', title: 'Alertas', subtitle: 'Avisos', icon: 'fas fa-bell' },
  { path: '/dados-base', title: 'Dados & base', subtitle: 'Sistema', icon: 'fas fa-database' },
  { path: '/configuracoes', title: 'Configurações', subtitle: 'Conta', icon: 'fas fa-user-cog' },
];

const STORAGE_KEY = 'sig.browser-tabs.v1';
const DEFAULT_PATH = '/dashboard';

interface StoredTabs {
  paths: string[];
  active: string;
}

export function normalizeBrowserTabPath(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const match = BROWSER_TAB_ROUTES.find((r) =>
    r.exact ? clean === r.path : clean === r.path || clean.startsWith(`${r.path}/`),
  );
  return match?.path ?? '';
}

export function findBrowserTabDef(path: string): BrowserTabDef | undefined {
  return BROWSER_TAB_ROUTES.find((r) => r.path === path);
}

export function readStoredBrowserTabs(): StoredTabs | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTabs;
    if (!Array.isArray(parsed.paths) || !parsed.paths.length) return null;
    const paths = parsed.paths.filter((p) => !!findBrowserTabDef(p));
    if (!paths.length) return null;
    const active = paths.includes(parsed.active) ? parsed.active : paths[paths.length - 1];
    return { paths, active };
  } catch {
    return null;
  }
}

export function writeStoredBrowserTabs(state: StoredTabs): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export function defaultBrowserTabsState(): StoredTabs {
  return { paths: [DEFAULT_PATH], active: DEFAULT_PATH };
}
