// Tipos da Visão Economista. Persistência via Supabase (tabelas orcamentos / acoes_economista).

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
  annualBudget: number;
  notes?: string;
}

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
  estimatedSavings: number;
  owner: string;
  dueDate?: string;
  status: ActionStatus;
  createdAt: string;
}

export const ACTION_PRIORITY_WEIGHT: Record<ActionPriority, number> = {
  Alta: 3, Média: 2, Baixa: 1,
};
