import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import {
  initialBudgets, initialActions, BudgetEntry, ActionItem, ACTION_PRIORITY_WEIGHT,
} from "@/lib/economist-data";
import { usePersistentCollection } from "@/hooks/use-persistent-collection";
import { exportToCSV } from "@/lib/export-csv";
import { BudgetForm } from "@/components/forms/BudgetForm";
import { ActionForm } from "@/components/forms/ActionForm";
import {
  DollarSign, Building2, AlertTriangle, ArrowRightLeft, TrendingDown, TrendingUp,
  CheckCircle, BarChart3, PieChart as PieChartIcon, Wallet, ShieldAlert,
  Zap, Users, Calculator, Filter, Lightbulb, ArrowDownRight, Plus, Pencil, Trash2,
  Download, Target, ListChecks, Table as TableIcon, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, AreaChart, Area, Legend, LineChart, Line,
} from "recharts";

// --- Constants ---
const departments = ["Desenvolvimento", "Financeiro", "TI", "Design", "Administrativo", "RH"];

const licenseAllocation: Record<string, Record<string, number>> = {
  "Microsoft 365 Business": { Desenvolvimento: 12, Financeiro: 8, TI: 5, Design: 4, Administrativo: 8, RH: 5 },
  "Adobe Creative Cloud": { Design: 5, Desenvolvimento: 1 },
  "JetBrains All Products": { Desenvolvimento: 10, TI: 2 },
  "AWS (Reserved Instances)": { TI: 1 },
  "Google Workspace": { Desenvolvimento: 8, Financeiro: 6, TI: 3, Design: 3, Administrativo: 5, RH: 3 },
  "CrowdStrike Falcon": { Desenvolvimento: 15, Financeiro: 8, TI: 10, Design: 5, Administrativo: 10, RH: 7 },
};

const deptColors: Record<string, string> = {
  Desenvolvimento: "hsl(217, 91%, 60%)",
  Financeiro: "hsl(142, 76%, 36%)",
  TI: "hsl(262, 83%, 58%)",
  Design: "hsl(330, 80%, 55%)",
  Administrativo: "hsl(38, 92%, 50%)",
  RH: "hsl(199, 89%, 48%)",
};

const categoryColors: Record<string, string> = {
  Produtividade: "hsl(217, 91%, 60%)",
  Desenvolvimento: "hsl(142, 76%, 36%)",
  Design: "hsl(330, 80%, 55%)",
  Infraestrutura: "hsl(262, 83%, 58%)",
  Segurança: "hsl(0, 84%, 60%)",
  Hardware: "hsl(38, 92%, 50%)",
  Domínios: "hsl(199, 89%, 48%)",
  Servidores: "hsl(280, 60%, 55%)",
};

function depreciacao(purchaseValue: number, purchaseDate: string, vidaUtil = 5): number {
  const anos = (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const depAnual = purchaseValue / vidaUtil;
  return Math.max(0, Math.round((purchaseValue - depAnual * anos) * 100) / 100);
}

function brl(v: number) { return `R$ ${Math.round(v).toLocaleString("pt-BR")}`; }

export default function EconomistPage() {
  const { assets, licenses, domains, servers, contracts, loading: dashLoading } = useDashboardData();
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [year, setYear] = useState<number>(new Date().getFullYear());

  // Budget & Actions persistidos
  const budgetCol = usePersistentCollection<BudgetEntry>(
    "imts.budgets", initialBudgets, "Orçamento", (b) => `${b.category} · ${b.costCenter} (${b.year})`,
  );
  const actionCol = usePersistentCollection<ActionItem>(
    "imts.actions", initialActions, "Ação", (a) => a.title,
  );

  const [budgetDialog, setBudgetDialog] = useState<{ open: boolean; editing?: BudgetEntry }>({ open: false });
  const [actionDialog, setActionDialog] = useState<{ open: boolean; editing?: ActionItem }>({ open: false });

  // Período (filtro denso)
  const [periodMonths, setPeriodMonths] = useState<number>(12);

  // --- Computed data ---
  const filteredLicenses = useMemo(() => {
    if (categoryFilter === "all") return licenses;
    return licenses.filter((l) => l.category === categoryFilter);
  }, [categoryFilter]);

  const totalMonthlyLicCost = licenses.reduce((sum, l) =>
    sum + (l.type === "Anual" ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses), 0);

  const totalMonthlyTotal = licenses.reduce((sum, l) =>
    sum + (l.type === "Anual" ? (l.costPerUnit * l.totalLicenses) / 12 : l.costPerUnit * l.totalLicenses), 0);

  const wastedCost = totalMonthlyTotal - totalMonthlyLicCost;
  const unusedLicenses = licenses.reduce((s, l) => s + (l.totalLicenses - l.usedLicenses), 0);
  const totalLicenses = licenses.reduce((s, l) => s + l.totalLicenses, 0);
  const utilizationRate = Math.round((1 - unusedLicenses / totalLicenses) * 100);

  const costPerEmployee = Math.round(totalMonthlyLicCost / 45);

  const totalAssetValue = assets.reduce((s, a) => s + a.purchaseValue, 0);
  const totalCurrentValue = assets.reduce((s, a) => s + depreciacao(a.purchaseValue, a.purchaseDate), 0);
  const totalDepreciation = totalAssetValue - totalCurrentValue;
  const totalMaintenanceCost = assets.reduce((s, a) => s + a.maintenanceLog.reduce((ms, m) => ms + m.cost, 0), 0);
  const serverMonthlyCost = servers.reduce((s, sv) => s + sv.monthlyCost, 0);

  const tco = totalAssetValue + totalMaintenanceCost + (totalMonthlyLicCost * 12) + (serverMonthlyCost * 12);

  const costByDepartment = useMemo(() => {
    return departments.map((dept) => {
      let total = 0;
      filteredLicenses.forEach((lic) => {
        const alloc = licenseAllocation[lic.software];
        if (alloc && alloc[dept]) {
          const monthly = lic.type === "Anual" ? lic.costPerUnit / 12 : lic.costPerUnit;
          total += monthly * alloc[dept];
        }
      });
      return { name: dept, custo: Math.round(total) };
    }).sort((a, b) => b.custo - a.custo);
  }, [filteredLicenses]);

  const filteredCostByDept = deptFilter === "all"
    ? costByDepartment
    : costByDepartment.filter((d) => d.name === deptFilter);

  const costByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    licenses.forEach((l) => {
      const monthly = l.type === "Anual" ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses;
      cats[l.category] = (cats[l.category] || 0) + monthly;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, []);

  const opex = Math.round(totalMonthlyLicCost * 12 + domains.reduce((s, d) => s + d.renewalCost, 0) + (serverMonthlyCost * 12));
  const capex = totalAssetValue;

  // Projeção e tendência (com base + variância determinística para MoM/YoY)
  const projection = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    return Array.from({ length: periodMonths }, (_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (periodMonths - 1 - i), 1);
      const monthName = months[month.getMonth()];
      let software = Math.round(totalMonthlyLicCost);
      let dominios = 0;
      domains.forEach((d) => {
        const exp = new Date(d.expirationDate);
        if (exp.getMonth() === month.getMonth() && exp.getFullYear() === month.getFullYear()) {
          dominios += d.renewalCost;
        }
      });
      const variance = 1 + Math.sin(i * 0.8) * 0.05;
      software = Math.round(software * variance);
      const servidores = Math.round(serverMonthlyCost);
      return {
        name: `${monthName}/${String(month.getFullYear()).slice(2)}`,
        software, dominios, servidores,
        total: software + dominios + servidores,
      };
    });
  }, [periodMonths, totalMonthlyLicCost, serverMonthlyCost]);

  const lastTotal = projection[projection.length - 1]?.total ?? 0;
  const prevTotal = projection[projection.length - 2]?.total ?? lastTotal;
  const yoyTotal = projection[0]?.total ?? lastTotal;
  const momPct = prevTotal ? ((lastTotal - prevTotal) / prevTotal) * 100 : 0;
  const yoyPct = yoyTotal ? ((lastTotal - yoyTotal) / yoyTotal) * 100 : 0;

  // Replacement analysis (regra dos 60%)
  const replacementAnalysis = useMemo(() => {
    return assets
      .filter((a) => a.status !== "Aposentado")
      .map((a) => {
        const maintenanceCost = a.maintenanceLog.reduce((s, m) => s + m.cost, 0);
        const ratio = a.purchaseValue > 0 ? (maintenanceCost / a.purchaseValue) * 100 : 0;
        return {
          ...a,
          maintenanceCost,
          ratio: Math.round(ratio),
          shouldReplace: ratio >= 60,
          currentValue: depreciacao(a.purchaseValue, a.purchaseDate),
        };
      })
      .sort((a, b) => b.ratio - a.ratio);
  }, []);

  const savingsOpportunity = Math.round(wastedCost * 12);

  // ---------- Orçamento vs Realizado ----------
  // Mapa de "realizado anual" por categoria (estimativa baseada nos dados atuais)
  const realizedByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    // Licenças por categoria (anual = mensal x 12)
    licenses.forEach((l) => {
      const annual = l.type === "Anual" ? l.costPerUnit * l.usedLicenses : l.costPerUnit * l.usedLicenses * 12;
      map[l.category] = (map[l.category] ?? 0) + annual;
    });
    map["Hardware"] = totalAssetValue + totalMaintenanceCost;
    map["Domínios"] = domains.reduce((s, d) => s + d.renewalCost, 0);
    map["Servidores"] = serverMonthlyCost * 12;
    return map;
  }, [totalAssetValue, totalMaintenanceCost, serverMonthlyCost]);

  const budgetsForYear = budgetCol.items.filter((b) => b.year === year);

  const budgetRows = useMemo(() => {
    return budgetsForYear.map((b) => {
      const realized = realizedByCategory[b.category] ?? 0;
      const pct = b.annualBudget > 0 ? (realized / b.annualBudget) * 100 : 0;
      // forecast simples: linear até o fim do ano
      const monthsElapsed = new Date().getMonth() + 1;
      const forecast = monthsElapsed > 0 ? (realized / monthsElapsed) * 12 : realized;
      const variance = realized - b.annualBudget;
      return { ...b, realized, pct, forecast, variance };
    }).sort((a, b) => b.pct - a.pct);
  }, [budgetsForYear, realizedByCategory]);

  const totalBudget = budgetRows.reduce((s, r) => s + r.annualBudget, 0);
  const totalRealized = budgetRows.reduce((s, r) => s + r.realized, 0);
  const totalForecast = budgetRows.reduce((s, r) => s + r.forecast, 0);
  const overallPct = totalBudget ? (totalRealized / totalBudget) * 100 : 0;

  // ---------- Plano de Ação ----------
  const sortedActions = useMemo(() => {
    return [...actionCol.items].sort((a, b) => {
      // ativas primeiro
      const aActive = a.status === "Concluída" || a.status === "Descartada" ? 0 : 1;
      const bActive = b.status === "Concluída" || b.status === "Descartada" ? 0 : 1;
      if (aActive !== bActive) return bActive - aActive;
      const w = ACTION_PRIORITY_WEIGHT[b.priority] - ACTION_PRIORITY_WEIGHT[a.priority];
      if (w !== 0) return w;
      return b.estimatedSavings - a.estimatedSavings;
    });
  }, [actionCol.items]);

  const totalPotentialSavings = actionCol.items
    .filter((a) => a.status !== "Concluída" && a.status !== "Descartada")
    .reduce((s, a) => s + a.estimatedSavings, 0);

  const actionsByStatus = useMemo(() => {
    const counts: Record<string, number> = { Pendente: 0, "Em andamento": 0, Concluída: 0, Descartada: 0 };
    actionCol.items.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
    return counts;
  }, [actionCol.items]);

  // ---------- Exportações ----------
  const exportProjection = () => exportToCSV(
    "projecao_fluxo_caixa",
    ["Período", "Software", "Domínios", "Servidores", "Total"],
    projection.map((p) => [p.name, p.software, p.dominios, p.servidores, p.total]),
  );
  const exportLicenses = () => exportToCSV(
    "licencas_detalhamento",
    ["Software", "Vendor", "Categoria", "Tipo", "Total", "Usadas", "Ociosas", "Custo Mensal", "Utilização %"],
    licenses.map((l) => {
      const monthly = l.type === "Anual" ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses;
      const util = Math.round((l.usedLicenses / l.totalLicenses) * 100);
      return [l.software, l.vendor, l.category, l.type, l.totalLicenses, l.usedLicenses, l.totalLicenses - l.usedLicenses, Math.round(monthly), util];
    }),
  );
  const exportContracts = () => exportToCSV(
    "contratos",
    ["ID", "Fornecedor", "Objeto", "Tipo", "Centro de Custo", "Custo Mensal", "Vencimento", "Status"],
    contracts.map((c) => [c.id, c.supplier, c.object, c.type, c.costCenter, c.monthlyCost, c.endDate, c.status]),
  );
  const exportAssets = () => exportToCSV(
    "ativos_economista",
    ["ID", "Tipo", "Marca", "Modelo", "Departamento", "Valor Compra", "Valor Atual", "Manutenção", "Ratio %"],
    replacementAnalysis.map((a) => [a.id, a.type, a.brand, a.model, a.department, a.purchaseValue, a.currentValue, a.maintenanceCost, a.ratio]),
  );
  const exportBudget = () => exportToCSV(
    "orcamento_vs_realizado",
    ["Ano", "Categoria", "Centro de Custo", "Orçamento", "Realizado", "Forecast", "% Atingido", "Variação"],
    budgetRows.map((r) => [r.year, r.category, r.costCenter, r.annualBudget, Math.round(r.realized), Math.round(r.forecast), Math.round(r.pct), Math.round(r.variance)]),
  );
  const exportActions = () => exportToCSV(
    "plano_de_acao",
    ["ID", "Título", "Categoria", "Prioridade", "Esforço", "Economia (R$/ano)", "Responsável", "Prazo", "Status"],
    sortedActions.map((a) => [a.id, a.title, a.category, a.priority, a.effort, a.estimatedSavings, a.owner, a.dueDate ?? "", a.status]),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão de Economista</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inteligência financeira, orçamento, plano de ação e detalhamento operacional
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={String(periodMonths)} onValueChange={(v) => setPeriodMonths(Number(v))}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="Produtividade">Produtividade</SelectItem>
              <SelectItem value="Desenvolvimento">Desenvolvimento</SelectItem>
              <SelectItem value="Design">Design</SelectItem>
              <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
              <SelectItem value="Segurança">Segurança</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Row — sempre visível */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-primary/10"><DollarSign className="w-4 h-4 text-primary" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Custo Mensal</span>
            </div>
            <p className="text-xl font-bold text-foreground">{brl(totalMonthlyLicCost)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Software + SaaS</p>
          </CardContent>
        </Card>

        <Card className="border-info/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-info/10"><TrendingUp className="w-4 h-4 text-info" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">MoM</span>
            </div>
            <p className={`text-xl font-bold ${momPct >= 0 ? "text-warning" : "text-success"}`}>
              {momPct >= 0 ? "+" : ""}{momPct.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">vs mês anterior</p>
          </CardContent>
        </Card>

        <Card className="border-info/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-info/10"><BarChart3 className="w-4 h-4 text-info" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">YoY</span>
            </div>
            <p className={`text-xl font-bold ${yoyPct >= 0 ? "text-warning" : "text-success"}`}>
              {yoyPct >= 0 ? "+" : ""}{yoyPct.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">vs início do período</p>
          </CardContent>
        </Card>

        <Card className="border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-success/10"><Users className="w-4 h-4 text-success" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Custo/Colab.</span>
            </div>
            <p className="text-xl font-bold text-foreground">{brl(costPerEmployee)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">/mês · 45 colab.</p>
          </CardContent>
        </Card>

        <Card className="border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-warning/10"><Zap className="w-4 h-4 text-warning" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Utilização</span>
            </div>
            <p className="text-xl font-bold text-foreground">{utilizationRate}%</p>
            <Progress value={utilizationRate} className="h-1.5 mt-1" />
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-destructive/10"><Wallet className="w-4 h-4 text-destructive" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Desperdício</span>
            </div>
            <p className="text-xl font-bold text-destructive">{brl(wastedCost)}/mês</p>
            <p className="text-[10px] text-muted-foreground mt-1">{unusedLicenses} ociosas</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-accent/10"><Calculator className="w-4 h-4 text-accent" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">TCO Anual</span>
            </div>
            <p className="text-xl font-bold text-foreground">R$ {Math.round(tco / 1000).toLocaleString("pt-BR")}k</p>
            <p className="text-[10px] text-muted-foreground mt-1">HW + SW + Mnt</p>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Insight Banner */}
      <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-success/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 mt-0.5"><Lightbulb className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Insight Estratégico</p>
            <p className="text-xs text-muted-foreground mt-1">
              Economia potencial de <span className="font-bold text-success">{brl(savingsOpportunity)}/ano</span> eliminando {unusedLicenses} licenças ociosas.
              {" "}Plano de ação ativo soma <span className="font-bold text-success">{brl(totalPotentialSavings)}/ano</span> em oportunidades.
              {" "}Orçamento {year} está em <span className={`font-bold ${overallPct > 100 ? "text-destructive" : overallPct > 85 ? "text-warning" : "text-success"}`}>{overallPct.toFixed(0)}%</span> do limite anual.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Economia Potencial</p>
            <p className="text-lg font-bold text-success flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4" />
              {brl(savingsOpportunity + totalPotentialSavings)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="budget" className="gap-1.5"><Target className="w-3.5 h-3.5" /> Orçamento</TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Plano de Ação</TabsTrigger>
          <TabsTrigger value="details" className="gap-1.5"><TableIcon className="w-3.5 h-3.5" /> Detalhamento</TabsTrigger>
        </TabsList>

        {/* ============= VISÃO GERAL ============= */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> OPEX vs CAPEX
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">OPEX (Anual)</p>
                    <p className="text-lg font-bold text-primary">{brl(opex)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CAPEX (Acumulado)</p>
                    <p className="text-lg font-bold text-accent">{brl(capex)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-secondary text-center">
                    <p className="text-muted-foreground">Depreciação</p>
                    <p className="font-semibold text-foreground">{brl(totalDepreciation)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary text-center">
                    <p className="text-muted-foreground">Valor Residual</p>
                    <p className="font-semibold text-foreground">{brl(totalCurrentValue)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary text-center">
                    <p className="text-muted-foreground">Manutenção</p>
                    <p className="font-semibold text-foreground">{brl(totalMaintenanceCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-accent" /> Custo por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={costByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {costByCategory.map((entry) => (
                        <Cell key={entry.name} fill={categoryColors[entry.name] || "hsl(220, 10%, 70%)"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => `${brl(val)}/mês`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cash flow + tendência */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  Fluxo de Caixa — {periodMonths} meses
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportProjection}>
                  <Download className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={projection}>
                  <defs>
                    <linearGradient id="gradSoftware" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradServidores" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(280, 60%, 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(280, 60%, 55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDominios" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: number) => brl(val)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="software" stackId="1" name="Software" stroke="hsl(217, 91%, 60%)" fill="url(#gradSoftware)" strokeWidth={2} />
                  <Area type="monotone" dataKey="servidores" stackId="1" name="Servidores" stroke="hsl(280, 60%, 55%)" fill="url(#gradServidores)" strokeWidth={2} />
                  <Area type="monotone" dataKey="dominios" stackId="1" name="Domínios" stroke="hsl(199, 89%, 48%)" fill="url(#gradDominios)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rateio CC */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Rateio por Centro de Custo (R$/mês)
                </CardTitle>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={filteredCostByDept} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip formatter={(val: number) => brl(val)} />
                  <Bar dataKey="custo" radius={[0, 6, 6, 0]} barSize={26}>
                    {filteredCostByDept.map((entry) => (
                      <Cell key={entry.name} fill={deptColors[entry.name] || "hsl(220, 10%, 70%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= ORÇAMENTO ============= */}
        <TabsContent value="budget" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Ano:</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-8 w-24 text-xs" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportBudget}>
                <Download className="w-3.5 h-3.5 mr-1" /> CSV
              </Button>
              <Dialog open={budgetDialog.open} onOpenChange={(o) => setBudgetDialog({ open: o })}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Nova entrada</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{budgetDialog.editing ? "Editar" : "Nova"} entrada de orçamento</DialogTitle></DialogHeader>
                  <BudgetForm
                    initial={budgetDialog.editing}
                    onSave={(b) => { budgetCol.save(b); setBudgetDialog({ open: false }); }}
                    onCancel={() => setBudgetDialog({ open: false })}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* KPIs do orçamento */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Orçamento Total</p>
              <p className="text-xl font-bold mt-1">{brl(totalBudget)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Realizado</p>
              <p className="text-xl font-bold mt-1">{brl(totalRealized)}</p>
              <Progress value={Math.min(100, overallPct)} className={`h-1.5 mt-2 ${overallPct > 100 ? "[&>div]:bg-destructive" : overallPct > 85 ? "[&>div]:bg-warning" : ""}`} />
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Forecast Anual</p>
              <p className="text-xl font-bold mt-1">{brl(totalForecast)}</p>
              <p className={`text-[10px] mt-1 ${totalForecast > totalBudget ? "text-destructive" : "text-success"}`}>
                {totalForecast > totalBudget ? "Estouro previsto" : "Dentro do orçamento"}
              </p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">% Atingido</p>
              <p className={`text-xl font-bold mt-1 ${overallPct > 100 ? "text-destructive" : overallPct > 85 ? "text-warning" : "text-success"}`}>
                {overallPct.toFixed(1)}%
              </p>
            </CardContent></Card>
          </div>

          {/* Comparativo Orçado vs Realizado vs Forecast */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Comparativo por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={budgetRows.map((r) => ({
                  name: r.category,
                  Orçado: r.annualBudget,
                  Realizado: Math.round(r.realized),
                  Forecast: Math.round(r.forecast),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: number) => brl(val)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Orçado" fill="hsl(220, 10%, 70%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Realizado" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Forecast" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabela detalhada do orçamento */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Detalhamento por Categoria · Centro de Custo</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead className="text-right">Orçado</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="text-right">Forecast</TableHead>
                    <TableHead className="text-right">% Atingido</TableHead>
                    <TableHead className="text-right">Variação</TableHead>
                    <TableHead className="text-right w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetRows.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma entrada para {year}.</TableCell></TableRow>
                  )}
                  {budgetRows.map((r) => {
                    const danger = r.pct > 100;
                    const warn = r.pct > 85 && !danger;
                    return (
                      <TableRow key={r.id} className={danger ? "bg-destructive/5" : warn ? "bg-warning/5" : ""}>
                        <TableCell className="font-medium">{r.category}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.costCenter}</TableCell>
                        <TableCell className="text-right tabular-nums">{brl(r.annualBudget)}</TableCell>
                        <TableCell className="text-right tabular-nums">{brl(r.realized)}</TableCell>
                        <TableCell className="text-right tabular-nums">{brl(r.forecast)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={Math.min(100, r.pct)} className={`h-1.5 w-16 ${danger ? "[&>div]:bg-destructive" : warn ? "[&>div]:bg-warning" : ""}`} />
                            <span className={`text-xs tabular-nums ${danger ? "text-destructive font-semibold" : warn ? "text-warning font-semibold" : ""}`}>
                              {r.pct.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right tabular-nums ${r.variance > 0 ? "text-destructive" : "text-success"}`}>
                          {r.variance > 0 ? "+" : ""}{brl(r.variance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => setBudgetDialog({ open: true, editing: r })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir entrada?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => budgetCol.remove(r)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= PLANO DE AÇÃO ============= */}
        <TabsContent value="actions" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ações ativas</p>
              <p className="text-xl font-bold mt-1">{(actionsByStatus["Pendente"] ?? 0) + (actionsByStatus["Em andamento"] ?? 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Em andamento</p>
              <p className="text-xl font-bold mt-1 text-info">{actionsByStatus["Em andamento"] ?? 0}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Concluídas</p>
              <p className="text-xl font-bold mt-1 text-success">{actionsByStatus["Concluída"] ?? 0}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Economia potencial</p>
              <p className="text-xl font-bold mt-1 text-success">{brl(totalPotentialSavings)}</p>
              <p className="text-[10px] text-muted-foreground">/ano</p>
            </CardContent></Card>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={exportActions}>
              <Download className="w-3.5 h-3.5 mr-1" /> CSV
            </Button>
            <Dialog open={actionDialog.open} onOpenChange={(o) => setActionDialog({ open: o })}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Nova ação</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{actionDialog.editing ? "Editar" : "Nova"} ação</DialogTitle></DialogHeader>
                <ActionForm
                  initial={actionDialog.editing}
                  onSave={(a) => { actionCol.save(a); setActionDialog({ open: false }); }}
                  onCancel={() => setActionDialog({ open: false })}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Esforço</TableHead>
                    <TableHead className="text-right">Economia/ano</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedActions.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma ação cadastrada.</TableCell></TableRow>
                  )}
                  {sortedActions.map((a) => {
                    const closed = a.status === "Concluída" || a.status === "Descartada";
                    return (
                      <TableRow key={a.id} className={closed ? "opacity-60" : ""}>
                        <TableCell>
                          <p className="font-medium text-sm">{a.title}</p>
                          {a.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{a.description}</p>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{a.category}</Badge></TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${
                            a.priority === "Alta" ? "bg-destructive/15 text-destructive border-destructive/30" :
                            a.priority === "Média" ? "bg-warning/15 text-warning border-warning/30" :
                            "bg-muted text-muted-foreground border-border"
                          }`} variant="outline">{a.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{a.effort}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-success">
                          {a.estimatedSavings > 0 ? brl(a.estimatedSavings) : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{a.owner}</TableCell>
                        <TableCell className="text-xs">{a.dueDate ? new Date(a.dueDate).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${
                            a.status === "Concluída" ? "bg-success/10 text-success border-success/30" :
                            a.status === "Em andamento" ? "bg-info/10 text-info border-info/30" :
                            a.status === "Descartada" ? "bg-muted text-muted-foreground" :
                            "bg-warning/10 text-warning border-warning/30"
                          }`}>{a.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => setActionDialog({ open: true, editing: a })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir ação?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => actionCol.remove(a)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= DETALHAMENTO ============= */}
        <TabsContent value="details" className="space-y-4 mt-4">
          {/* Licenças */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" /> Licenças — Tabela operacional
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportLicenses}>
                  <Download className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Software</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Usadas</TableHead>
                    <TableHead className="text-right">Ociosas</TableHead>
                    <TableHead className="text-right">Custo/mês</TableHead>
                    <TableHead className="text-right">Utilização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLicenses.map((l) => {
                    const monthly = l.type === "Anual" ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses;
                    const util = Math.round((l.usedLicenses / l.totalLicenses) * 100);
                    const low = util < 70;
                    return (
                      <TableRow key={l.id} className={low ? "bg-warning/5" : ""}>
                        <TableCell className="font-medium">{l.software}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.vendor}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{l.category}</Badge></TableCell>
                        <TableCell className="text-xs">{l.type}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.totalLicenses}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.usedLicenses}</TableCell>
                        <TableCell className={`text-right tabular-nums ${low ? "text-warning font-semibold" : ""}`}>
                          {l.totalLicenses - l.usedLicenses}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{brl(monthly)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={util} className={`h-1.5 w-14 ${low ? "[&>div]:bg-warning" : ""}`} />
                            <span className="text-xs tabular-nums">{util}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Contratos */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-accent" /> Contratos
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportContracts}>
                  <Download className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead className="text-right">Mensal</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-mono">{c.id}</TableCell>
                      <TableCell className="font-medium text-sm">{c.supplier}</TableCell>
                      <TableCell className="text-xs">{c.object}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.type}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.costCenter}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(c.monthlyCost)}</TableCell>
                      <TableCell className="text-xs">{new Date(c.endDate).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${
                          c.status === "Ativo" ? "bg-success/10 text-success border-success/30" :
                          c.status === "Encerrado" ? "bg-muted text-muted-foreground" :
                          "bg-info/10 text-info border-info/30"
                        }`}>{c.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Hardware - regra dos 60% */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-warning" /> Análise de Substituição (regra dos 60%)
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportAssets}>
                  <Download className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Valor Compra</TableHead>
                    <TableHead className="text-right">Valor Atual</TableHead>
                    <TableHead className="text-right">Manutenção</TableHead>
                    <TableHead className="text-right">Ratio</TableHead>
                    <TableHead>Recomendação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replacementAnalysis.map((a) => (
                    <TableRow key={a.id} className={a.shouldReplace ? "bg-warning/5" : ""}>
                      <TableCell>
                        <p className="font-medium text-sm">{a.brand} {a.model}</p>
                        <p className="text-[10px] text-muted-foreground">{a.id} · {a.type}</p>
                      </TableCell>
                      <TableCell className="text-xs">{a.department}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(a.purchaseValue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(a.currentValue)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${a.shouldReplace ? "text-warning font-semibold" : ""}`}>
                        {brl(a.maintenanceCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={Math.min(100, a.ratio)} className={`h-1.5 w-14 ${a.shouldReplace ? "[&>div]:bg-warning" : ""}`} />
                          <span className={`text-xs tabular-nums ${a.shouldReplace ? "text-warning font-semibold" : ""}`}>{a.ratio}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.shouldReplace ? (
                          <Badge className="bg-warning text-warning-foreground gap-1 text-[10px]">
                            <AlertTriangle className="w-3 h-3" /> Substituir
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 text-[10px]">
                            <CheckCircle className="w-3 h-3" /> Manter
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
