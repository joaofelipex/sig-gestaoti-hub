// Dados auxiliares da Visão de Economista — orçamento anual e plano de ação.
// Persistência local via use-persistent-collection.

export type BudgetCategory =
  | "Produtividade"
  | "Desenvolvimento"
  | "Design"
  | "Infraestrutura"
  | "Segurança"
  | "Hardware"
  | "Domínios"
  | "Servidores";

export interface BudgetEntry {
  id: string;
  year: number;
  category: BudgetCategory;
  costCenter: string;
  annualBudget: number; // em R$
  notes?: string;
}

export const initialBudgets: BudgetEntry[] = [
  { id: "BDG-001", year: 2026, category: "Produtividade",  costCenter: "CC-120 TI Corporativo", annualBudget: 90000 },
  { id: "BDG-002", year: 2026, category: "Desenvolvimento", costCenter: "CC-210 Engenharia",    annualBudget: 120000 },
  { id: "BDG-003", year: 2026, category: "Design",          costCenter: "CC-230 Produto",       annualBudget: 36000 },
  { id: "BDG-004", year: 2026, category: "Infraestrutura",  costCenter: "CC-120 TI Corporativo", annualBudget: 150000 },
  { id: "BDG-005", year: 2026, category: "Segurança",       costCenter: "CC-120 TI Corporativo", annualBudget: 36000 },
  { id: "BDG-006", year: 2026, category: "Hardware",        costCenter: "CC-120 TI Corporativo", annualBudget: 80000 },
  { id: "BDG-007", year: 2026, category: "Domínios",        costCenter: "CC-120 TI Corporativo", annualBudget: 3000 },
  { id: "BDG-008", year: 2026, category: "Servidores",      costCenter: "CC-210 Engenharia",    annualBudget: 60000 },
];

export type ActionPriority = "Alta" | "Média" | "Baixa";
export type ActionEffort = "Baixo" | "Médio" | "Alto";
export type ActionStatus = "Pendente" | "Em andamento" | "Concluída" | "Descartada";

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  category: "Licenças" | "Hardware" | "Contratos" | "Infraestrutura" | "Governança";
  priority: ActionPriority;
  effort: ActionEffort;
  estimatedSavings: number; // anual em R$
  owner: string;
  dueDate?: string;
  status: ActionStatus;
  createdAt: string;
}

export const initialActions: ActionItem[] = [
  {
    id: "ACT-001",
    title: "Reduzir licenças ociosas Microsoft 365",
    description: "Identificadas licenças não utilizadas há mais de 60 dias. Cancelar no próximo ciclo.",
    category: "Licenças",
    priority: "Alta",
    effort: "Baixo",
    estimatedSavings: 12000,
    owner: "Felipe Miranda",
    dueDate: "2026-06-30",
    status: "Pendente",
    createdAt: "2026-04-15T10:00:00.000Z",
  },
  {
    id: "ACT-002",
    title: "Renegociar contrato AWS com Reserved Instances",
    description: "Migrar workloads estáveis para RI de 1 ano com economia média de 30%.",
    category: "Infraestrutura",
    priority: "Alta",
    effort: "Médio",
    estimatedSavings: 30600,
    owner: "Equipe DevOps",
    dueDate: "2026-07-31",
    status: "Em andamento",
    createdAt: "2026-04-10T10:00:00.000Z",
  },
  {
    id: "ACT-003",
    title: "Substituir notebooks com manutenção > 60% do valor",
    description: "Aplicar regra dos 60% para acionar CAPEX de renovação no Q3.",
    category: "Hardware",
    priority: "Média",
    effort: "Alto",
    estimatedSavings: 8000,
    owner: "TI",
    dueDate: "2026-09-30",
    status: "Pendente",
    createdAt: "2026-04-20T10:00:00.000Z",
  },
  {
    id: "ACT-004",
    title: "Ativar auto-renew em domínios críticos",
    description: "Evitar risco de indisponibilidade e multas de recuperação.",
    category: "Governança",
    priority: "Alta",
    effort: "Baixo",
    estimatedSavings: 0,
    owner: "Felipe Miranda",
    status: "Pendente",
    createdAt: "2026-04-22T10:00:00.000Z",
  },
];

export const ACTION_PRIORITY_WEIGHT: Record<ActionPriority, number> = {
  Alta: 3, Média: 2, Baixa: 1,
};
