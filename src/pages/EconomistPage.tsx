import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { assets, licenses, domains } from "@/data/mock-data";
import { servers } from "@/data/servers-data";
import {
  DollarSign, Building2, AlertTriangle, ArrowRightLeft, TrendingDown, TrendingUp,
  CheckCircle, BarChart3, PieChart as PieChartIcon, Target, Wallet, ShieldAlert,
  Zap, Users, Calculator, Filter, Lightbulb, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, AreaChart, Area, Legend,
} from "recharts";

// --- Constants ---
const departments = ['Desenvolvimento', 'Financeiro', 'TI', 'Design', 'Administrativo', 'RH'];

const licenseAllocation: Record<string, Record<string, number>> = {
  'Microsoft 365 Business': { Desenvolvimento: 12, Financeiro: 8, TI: 5, Design: 4, Administrativo: 8, RH: 5 },
  'Adobe Creative Cloud': { Design: 5, Desenvolvimento: 1 },
  'JetBrains All Products': { Desenvolvimento: 10, TI: 2 },
  'AWS (Reserved Instances)': { TI: 1 },
  'Google Workspace': { Desenvolvimento: 8, Financeiro: 6, TI: 3, Design: 3, Administrativo: 5, RH: 3 },
  'CrowdStrike Falcon': { Desenvolvimento: 15, Financeiro: 8, TI: 10, Design: 5, Administrativo: 10, RH: 7 },
};

const deptColors: Record<string, string> = {
  Desenvolvimento: 'hsl(217, 91%, 60%)',
  Financeiro: 'hsl(142, 76%, 36%)',
  TI: 'hsl(262, 83%, 58%)',
  Design: 'hsl(330, 80%, 55%)',
  Administrativo: 'hsl(38, 92%, 50%)',
  RH: 'hsl(199, 89%, 48%)',
};

const categoryColors: Record<string, string> = {
  Produtividade: 'hsl(217, 91%, 60%)',
  Desenvolvimento: 'hsl(142, 76%, 36%)',
  Design: 'hsl(330, 80%, 55%)',
  Infraestrutura: 'hsl(262, 83%, 58%)',
  Segurança: 'hsl(0, 84%, 60%)',
};

function depreciacao(purchaseValue: number, purchaseDate: string, vidaUtil = 5): number {
  const anos = (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const depAnual = purchaseValue / vidaUtil;
  return Math.max(0, Math.round((purchaseValue - depAnual * anos) * 100) / 100);
}

export default function EconomistPage() {
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // --- Computed data ---
  const filteredLicenses = useMemo(() => {
    if (categoryFilter === "all") return licenses;
    return licenses.filter(l => l.category === categoryFilter);
  }, [categoryFilter]);

  const costByDepartment = useMemo(() => {
    return departments.map(dept => {
      let total = 0;
      filteredLicenses.forEach(lic => {
        const alloc = licenseAllocation[lic.software];
        if (alloc && alloc[dept]) {
          const monthly = lic.type === 'Anual' ? lic.costPerUnit / 12 : lic.costPerUnit;
          total += monthly * alloc[dept];
        }
      });
      return { name: dept, custo: Math.round(total) };
    }).sort((a, b) => b.custo - a.custo);
  }, [filteredLicenses]);

  const totalMonthlyLicCost = licenses.reduce((sum, l) =>
    sum + (l.type === 'Anual' ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses), 0);

  const totalMonthlyTotal = licenses.reduce((sum, l) =>
    sum + (l.type === 'Anual' ? (l.costPerUnit * l.totalLicenses) / 12 : l.costPerUnit * l.totalLicenses), 0);

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

  // ROI: value delivered vs total investment
  const tco = totalAssetValue + totalMaintenanceCost + (totalMonthlyLicCost * 12) + (serverMonthlyCost * 12);

  // Cost by category (pie)
  const costByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    licenses.forEach(l => {
      const monthly = l.type === 'Anual' ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses;
      cats[l.category] = (cats[l.category] || 0) + monthly;
    });
    return Object.entries(cats).map(([name, value]) => ({
      name, value: Math.round(value),
    }));
  }, []);

  // OPEX vs CAPEX
  const opex = Math.round(totalMonthlyLicCost * 12 + domains.reduce((s, d) => s + d.renewalCost, 0) + (serverMonthlyCost * 12));
  const capex = totalAssetValue;

  // 12-month projection
  const projection = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = months[month.getMonth()];
      let software = Math.round(totalMonthlyLicCost);
      let dominios = 0;
      domains.forEach(d => {
        const exp = new Date(d.expirationDate);
        if (exp.getMonth() === month.getMonth() && exp.getFullYear() === month.getFullYear()) {
          dominios += d.renewalCost;
        }
      });
      // simulate seasonal variance
      const variance = 1 + (Math.sin(i * 0.8) * 0.05);
      software = Math.round(software * variance);
      return { name: `${monthName}/${String(month.getFullYear()).slice(2)}`, software, dominios, total: software + dominios };
    });
  }, []);

  // Replacement analysis
  const replacementAnalysis = useMemo(() => {
    return assets
      .filter(a => a.status !== 'Aposentado')
      .map(a => {
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

  const filteredCostByDept = deptFilter === "all"
    ? costByDepartment
    : costByDepartment.filter(d => d.name === deptFilter);

  const savingsOpportunity = Math.round(wastedCost * 12);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão de Economista</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inteligência financeira, rateio por centro de custo e eficiência operacional
          </p>
        </div>
        <div className="flex gap-2">
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

      {/* Strategic KPIs Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-primary/10"><DollarSign className="w-4 h-4 text-primary" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Custo Mensal</span>
            </div>
            <p className="text-xl font-bold text-foreground">R$ {Math.round(totalMonthlyLicCost).toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Software + SaaS</p>
          </CardContent>
        </Card>

        <Card className="border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-success/10"><Users className="w-4 h-4 text-success" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Custo/Colab.</span>
            </div>
            <p className="text-xl font-bold text-foreground">R$ {costPerEmployee.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">por mês / 45 colaboradores</p>
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
            <p className="text-xl font-bold text-destructive">R$ {Math.round(wastedCost).toLocaleString('pt-BR')}/mês</p>
            <p className="text-[10px] text-muted-foreground mt-1">{unusedLicenses} licenças ociosas</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-accent/10"><Calculator className="w-4 h-4 text-accent" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">TCO Anual</span>
            </div>
            <p className="text-xl font-bold text-foreground">R$ {Math.round(tco / 1000).toLocaleString('pt-BR')}k</p>
            <p className="text-[10px] text-muted-foreground mt-1">Hardware + Software + Mnt</p>
          </CardContent>
        </Card>

        <Card className="border-info/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-info/10"><ArrowRightLeft className="w-4 h-4 text-info" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">P/ Substituir</span>
            </div>
            <p className="text-xl font-bold text-warning">{replacementAnalysis.filter(a => a.shouldReplace).length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">ativos acima do threshold</p>
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
              A IMTS pode economizar até <span className="font-bold text-success">R$ {savingsOpportunity.toLocaleString('pt-BR')}/ano</span> eliminando {unusedLicenses} licenças ociosas.
              {replacementAnalysis.filter(a => a.shouldReplace).length > 0 && (
                <> Além disso, {replacementAnalysis.filter(a => a.shouldReplace).length} ativo(s) com custo de manutenção elevado devem ser substituídos para evitar prejuízo operacional.</>
              )}
              {" "}A taxa de utilização de {utilizationRate}% indica {utilizationRate >= 85 ? 'boa eficiência' : 'oportunidade de otimização'} no uso de software.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Economia Potencial</p>
            <p className="text-lg font-bold text-success flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4" />
              R$ {savingsOpportunity.toLocaleString('pt-BR')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* OPEX vs CAPEX + Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              OPEX vs CAPEX
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">Comparativo de gastos recorrentes vs investimento em ativos</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">OPEX (Anual)</p>
                <p className="text-lg font-bold text-primary">R$ {opex.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-muted-foreground">Licenças + Domínios + SaaS</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CAPEX (Acumulado)</p>
                <p className="text-lg font-bold text-accent">R$ {capex.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-muted-foreground">Investimento em Hardware</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-secondary text-center">
                <p className="text-muted-foreground">Depreciação</p>
                <p className="font-semibold text-foreground">R$ {Math.round(totalDepreciation).toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary text-center">
                <p className="text-muted-foreground">Valor Residual</p>
                <p className="font-semibold text-foreground">R$ {Math.round(totalCurrentValue).toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary text-center">
                <p className="text-muted-foreground">Manutenção Total</p>
                <p className="font-semibold text-foreground">R$ {totalMaintenanceCost.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-accent" />
              Custo por Categoria de Software
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">Distribuição mensal por tipo de software</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={costByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {costByCategory.map((entry) => (
                    <Cell key={entry.name} fill={categoryColors[entry.name] || 'hsl(220, 10%, 70%)'} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}/mês`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Projection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            Projeção de Fluxo de Caixa — 12 Meses
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Previsão de gastos com software e renovações de domínio</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={projection}>
              <defs>
                <linearGradient id="gradSoftware" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDominios" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(220, 10%, 46%)" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="software" name="Software" stroke="hsl(217, 91%, 60%)" fill="url(#gradSoftware)" strokeWidth={2} />
              <Area type="monotone" dataKey="dominios" name="Domínios" stroke="hsl(262, 83%, 58%)" fill="url(#gradDominios)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost by Department */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Rateio por Centro de Custo (R$/mês)
            </CardTitle>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={filteredCostByDept} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(220, 10%, 46%)" tickFormatter={v => `R$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" width={110} />
              <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`} />
              <Bar dataKey="custo" radius={[0, 6, 6, 0]} barSize={28}>
                {filteredCostByDept.map((entry) => (
                  <Cell key={entry.name} fill={deptColors[entry.name] || 'hsl(220, 10%, 70%)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* License detail per department */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Detalhamento: Licenças por Departamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLicenses.map(lic => {
              const alloc = licenseAllocation[lic.software] || {};
              const monthly = lic.type === 'Anual' ? lic.costPerUnit / 12 : lic.costPerUnit;
              const utilization = Math.round((lic.usedLicenses / lic.totalLicenses) * 100);
              const isLow = utilization < 70;

              return (
                <div key={lic.id} className={`p-4 rounded-xl border ${isLow ? 'border-warning/30 bg-warning/5' : 'border-border bg-card'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                        {lic.software}
                        {isLow && (
                          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                            <ShieldAlert className="w-3 h-3 mr-1" /> Subutilizada
                          </Badge>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{lic.vendor} · R$ {monthly.toFixed(0)}/lic/mês · {lic.category}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                        {lic.usedLicenses}/{lic.totalLicenses} licenças
                      </Badge>
                      <div className="flex items-center gap-1 mt-1">
                        <Progress value={utilization} className={`h-1 w-16 ${isLow ? '[&>div]:bg-warning' : ''}`} />
                        <span className="text-[10px] text-muted-foreground">{utilization}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {departments.map(dept => {
                      const count = alloc[dept] || 0;
                      const cost = Math.round(monthly * count);
                      return (
                        <div key={dept} className={`p-2 rounded-lg text-[10px] ${count > 0 ? 'bg-secondary' : 'bg-muted/20'}`}>
                          <span className="text-muted-foreground">{dept}</span>
                          <p className={`font-semibold mt-0.5 ${count > 0 ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                            {count > 0 ? `${count} lic · R$ ${cost}` : '—'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Replacement Analysis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-warning" />
            Análise de Substituição de Hardware
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Indicador: custo de manutenção acumulado ≥ 60% do valor de compra → recomenda-se substituição
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {replacementAnalysis.map(asset => (
              <div key={asset.id} className={`p-4 rounded-xl border ${asset.shouldReplace ? 'border-warning bg-warning/5' : 'border-border bg-card'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                      {asset.brand} {asset.model}
                      {asset.shouldReplace ? (
                        <Badge className="bg-warning text-warning-foreground gap-1 text-[10px]">
                          <AlertTriangle className="w-3 h-3" /> Substituir
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1 text-[10px]">
                          <CheckCircle className="w-3 h-3" /> OK
                        </Badge>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {asset.id} · {asset.type} · {asset.department}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px] mb-2">
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Valor Compra</span>
                    <p className="font-semibold text-foreground">R$ {asset.purchaseValue.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Valor Atual</span>
                    <p className="font-semibold text-foreground">R$ {asset.currentValue.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Custo Manutenção</span>
                    <p className={`font-semibold ${asset.shouldReplace ? 'text-warning' : 'text-foreground'}`}>
                      R$ {asset.maintenanceCost.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Ratio Mnt/Compra</span>
                    <p className={`font-semibold ${asset.shouldReplace ? 'text-warning' : 'text-foreground'}`}>{asset.ratio}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={Math.min(100, asset.ratio)}
                    className={`h-1.5 flex-1 ${asset.shouldReplace ? '[&>div]:bg-warning' : ''}`}
                  />
                  <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">{asset.ratio}% / 60%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
