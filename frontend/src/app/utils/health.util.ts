import type { ActionItem, Alert, Asset, Domain, License, RiskItem, Server } from '../services/dashboard.service';

export function healthScoreColor(score: number): string {
  return score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
}

/** Saúde operacional — mesma lógica do Painel principal. */
export function computeOperationalHealth(input: {
  assets: Asset[];
  domains: Domain[];
  servers: Server[];
  alerts: Alert[];
  assetsInUse: number;
  criticalAlerts: number;
  domainsExpiring: number;
}): { score: number; hint: string } {
  const { assets, domains, servers, assetsInUse, criticalAlerts, domainsExpiring } = input;
  const expiredDomains = domains.filter((d) => d.status === 'Expirado').length;
  const unassignedAssets = assets.filter((a) => a.status === 'Em uso' && !a.assignedTo).length;
  const offlineServers = servers.filter((s) =>
    ['offline', 'manutenção', 'manutencao'].includes(String(s.status || '').toLowerCase()),
  ).length;
  const inUseAssets = Math.max(1, assetsInUse);

  const penalties = [
    { label: 'alertas críticos', value: Math.min(25, criticalAlerts * 5), count: criticalAlerts },
    { label: 'domínios expirados', value: Math.min(25, expiredDomains * 12), count: expiredDomains },
    { label: 'domínios a vencer', value: Math.min(15, domainsExpiring * 3), count: domainsExpiring },
    { label: 'servidores indisponíveis', value: Math.min(20, offlineServers * 10), count: offlineServers },
    {
      label: 'ativos sem responsável',
      value: Math.min(10, Math.round((unassignedAssets / inUseAssets) * 10)),
      count: unassignedAssets,
    },
  ];
  const totalPenalty = penalties.reduce((sum, p) => sum + p.value, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));
  const mainFactor = penalties
    .filter((p) => p.value > 0 && p.count > 0)
    .sort((a, b) => b.value - a.value)[0];
  const hint = mainFactor
    ? `Operacional · ${mainFactor.count} ${mainFactor.label}`
    : 'Operacional · sem impactos críticos';
  return { score, hint };
}

/** Saúde de governança — riscos e conformidade. */
export function computeGovernanceHealth(risks: RiskItem[]): { score: number; hint: string } {
  const critical = risks.filter((r) => r.severity === 'Crítico').length;
  const high = risks.filter((r) => r.severity === 'Alto').length;
  let score = 100;
  score -= critical * 15;
  score -= high * 8;
  score = Math.max(0, Math.min(100, score));
  const hint =
    critical > 0
      ? `Governança · ${critical} risco(s) crítico(s)`
      : high > 0
        ? `Governança · ${high} risco(s) alto(s)`
        : 'Governança · riscos controlados';
  return { score, hint };
}

/** Saúde financeira — economia e execução de ações. */
export function computeFinancialHealth(input: {
  actions: ActionItem[];
  totalSavings: number;
  doneSavings: number;
  overdueCount: number;
  isDone: (status: string) => boolean;
  isOpen: (status: string) => boolean;
}): { score: number; hint: string } {
  const { actions, totalSavings, doneSavings, overdueCount, isDone, isOpen } = input;
  const doneActions = actions.filter((a) => isDone(a.status)).length;
  const savingsCaptureRate = totalSavings > 0 ? Math.min(100, (doneSavings / totalSavings) * 100) : 0;
  const completionRate = actions.length > 0 ? (doneActions / actions.length) * 100 : 70;
  const captureComponent = totalSavings > 0 ? savingsCaptureRate : actions.length ? 45 : 70;
  const overduePenalty = Math.min(35, overdueCount * 12);
  const score = Math.round(
    Math.min(100, Math.max(0, captureComponent * 0.45 + completionRate * 0.35 + (100 - overduePenalty) * 0.2)),
  );
  const openCount = actions.filter((a) => isOpen(a.status)).length;
  const hint =
    overdueCount > 0
      ? `Financeiro · ${overdueCount} ação(ões) vencida(s)`
      : openCount > 0
        ? `Financeiro · ${openCount} ação(ões) em aberto`
        : 'Financeiro · carteira em dia';
  return { score, hint };
}

/** Índice unificado de saúde de TI (média ponderada dos três eixos). */
export function computeCompositeHealth(
  operational: number,
  governance: number,
  financial: number,
): { score: number; hint: string } {
  const score = Math.round(operational * 0.45 + governance * 0.3 + financial * 0.25);
  const parts = [
    { label: 'operacional', value: operational },
    { label: 'governança', value: governance },
    { label: 'financeiro', value: financial },
  ].sort((a, b) => a.value - b.value);
  const weakest = parts[0];
  const hint = `Índice TI · ${weakest.label} ${weakest.value}% (menor eixo)`;
  return { score, hint };
}
