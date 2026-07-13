export interface QuickSearchRoute {
  path: string;
  title: string;
  subtitle?: string;
}

/** Rotas usadas pela busca rápida do header. */
export const QUICK_SEARCH_ROUTES: QuickSearchRoute[] = [
  { path: '/dashboard', title: 'Painel', subtitle: 'Visão' },
  { path: '/economista', title: 'Economista', subtitle: 'BI' },
  { path: '/empresas', title: 'Empresas', subtitle: 'Org.' },
  { path: '/ativos', title: 'Ativos', subtitle: 'ITAM' },
  { path: '/dominios', title: 'Domínios', subtitle: 'DNS' },
  { path: '/licencas', title: 'Licenças', subtitle: 'SAM' },
  { path: '/servidores', title: 'Servidores', subtitle: 'Infra' },
  { path: '/manutencao', title: 'Manutenção', subtitle: 'Ops' },
  { path: '/movimentacoes', title: 'Movimentações', subtitle: 'Ops' },
  { path: '/estoque', title: 'Estoque', subtitle: 'Ops' },
  { path: '/governanca', title: 'Governança', subtitle: 'Gov.' },
  { path: '/pagamentos', title: 'Pagamentos', subtitle: 'Fin.' },
  { path: '/alertas', title: 'Alertas', subtitle: 'Avisos' },
  { path: '/configuracoes', title: 'Configurações', subtitle: 'Conta' },
];
