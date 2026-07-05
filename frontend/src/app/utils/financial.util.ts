import type {
  Budget,
  Domain,
  FinancialContract,
  License,
  Payment,
  Server,
} from '../services/dashboard.service';

/** Custo mensal de uma licença — mesma regra do Painel principal. */
export function licenseMonthlyCost(license: License): number {
  const seats = license.totalLicenses || license.usedLicenses || 0;
  const monthlyFactor = license.type === 'Mensal' ? 1 : 1 / 12;
  return (license.costPerUnit || 0) * seats * monthlyFactor;
}

export function serversMonthlyCost(servers: Server[]): number {
  return servers.reduce((s, x) => s + (x.monthlyCost || 0), 0);
}

export function domainsMonthlyCost(domains: Domain[]): number {
  return domains.reduce((s, d) => s + (d.renewalCost || 0) / 12, 0);
}

/** Custo operacional mensal de TI (servidores + licenças + domínios) — alinhado ao Painel. */
export function operationalMonthlyCost(
  servers: Server[],
  licenses: License[],
  domains: Domain[],
): number {
  const lic = licenses.reduce((s, l) => s + licenseMonthlyCost(l), 0);
  return Math.round(serversMonthlyCost(servers) + lic + domainsMonthlyCost(domains));
}

export function operationalCostBreakdown(
  servers: Server[],
  licenses: License[],
  domains: Domain[],
): { servers: number; licenses: number; domains: number } {
  const serverCost = Math.round(serversMonthlyCost(servers));
  const licCost = Math.round(licenses.reduce((s, l) => s + licenseMonthlyCost(l), 0));
  const domCost = Math.round(domainsMonthlyCost(domains));
  return { servers: serverCost, licenses: licCost, domains: domCost };
}

export function contractsAnnualCost(contracts: FinancialContract[]): number {
  return contracts.reduce((s, c) => s + (c.monthlyCost || 0) * 12, 0);
}

export function budgetsTotal(budgets: Budget[]): number {
  return budgets.reduce((s, b) => s + (b.annualBudget || 0), 0);
}

/** Total de pagamentos registrados num ano (competência ou vencimento). */
export function paymentsYearTotal(payments: Payment[], year: number): number {
  const ys = String(year);
  return payments
    .filter(
      (p) =>
        (p.competencia || '').startsWith(ys) ||
        (p.vencimento || '').slice(0, 4) === ys,
    )
    .reduce((s, p) => s + (p.valor || 0), 0);
}

export function formatBrl(v: number, maxFrac = 0): string {
  return 'R$ ' + (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: maxFrac });
}

export type SpendKind = 'CAPEX' | 'OPEX' | 'Outros';

/** Classificação CAPEX/OPEX usada no módulo economista e relatórios. */
export function classifySpendType(text: string): SpendKind {
  const k = (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (k.includes('capex') || k.includes('capital')) {
    return 'CAPEX';
  }

  if (
    k.includes('opex') ||
    k.includes('operacional') ||
    k.includes('cloud') ||
    k.includes('aws') ||
    k.includes('hosped') ||
    k.includes('licen') ||
    k.includes('assinatura') ||
    k.includes('contrato') ||
    k.includes('suporte') ||
    k.includes('manutenc') ||
    k.includes('servico') ||
    k.includes('servidor') ||
    k.includes('dominio') ||
    k.includes('pagamento')
  ) {
    return 'OPEX';
  }

  if (
    k.includes('aquisicao') ||
    k.includes('equip') ||
    k.includes('hardware') ||
    k.includes('implantacao') ||
    k.includes('projeto') ||
    k.includes('infraestrutura')
  ) {
    return 'CAPEX';
  }

  return 'Outros';
}

/** Base financeira anual consolidada: planejado + operacional + contratos. */
export function consolidatedAnnualBase(
  budgets: Budget[],
  servers: Server[],
  licenses: License[],
  domains: Domain[],
  contracts: FinancialContract[],
): {
  budgetTotal: number;
  operationalAnnual: number;
  contractsAnnual: number;
  total: number;
  monthlyOperational: number;
} {
  const budgetTotal = budgetsTotal(budgets);
  const monthlyOperational = operationalMonthlyCost(servers, licenses, domains);
  const operationalAnnual = monthlyOperational * 12;
  const contractsAnnual = contractsAnnualCost(contracts);
  return {
    budgetTotal,
    operationalAnnual,
    contractsAnnual,
    total: budgetTotal + operationalAnnual + contractsAnnual,
    monthlyOperational,
  };
}
