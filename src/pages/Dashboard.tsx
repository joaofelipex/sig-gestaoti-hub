import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assets, domains, licenses, dashboardStats } from "@/data/mock-data";
import { servers } from "@/data/servers-data";
import {
  Monitor, Globe, Key, ShieldAlert, AlertTriangle,
  TrendingUp, DollarSign, HardDrive, Wrench, Activity,
  HeartPulse, FileWarning, Database, type LucideIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
  AreaChart, Area,
} from "recharts";
import { contracts, getOperationalAlerts, moduleReadiness, suppliers } from "@/lib/it-governance-data";

// --- Health Score Calculation ---
const domainsExpiring30 = domains.filter(d => {
  const days = Math.ceil((new Date(d.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days > 0 && days <= 30;
}).length;

const assetsWithoutTerm = assets.filter(a => a.status === 'Em uso' && !a.assignedTo).length;
const backupsPending = 1; // simulated

const healthScoreCalc = () => {
  let score = 100;
  score -= domainsExpiring30 * 10;
  score -= assetsWithoutTerm * 15;
  score -= backupsPending * 10;
  return Math.max(0, Math.min(100, score));
};

const healthScore = healthScoreCalc();
const healthColor = healthScore >= 80 ? 'text-success' : healthScore >= 50 ? 'text-warning' : 'text-destructive';
const healthBg = healthScore >= 80 ? 'bg-success/10' : healthScore >= 50 ? 'bg-warning/10' : 'bg-destructive/10';

// --- OPEX vs CAPEX ---
const serverMonthly = servers.reduce((sum, s) => sum + s.monthlyCost, 0);

const opexTotal = licenses.reduce((sum, l) => {
  return sum + (l.type === 'Mensal' ? l.costPerUnit * l.usedLicenses * 12 : l.costPerUnit * l.usedLicenses);
}, 0) + domains.reduce((sum, d) => sum + d.renewalCost, 0) + (serverMonthly * 12);

const capexTotal = assets.reduce((sum, a) => sum + a.purchaseValue, 0);

const opexVsCapex = [
  { name: 'OPEX', value: opexTotal, color: 'hsl(217, 91%, 60%)' },
  { name: 'CAPEX', value: capexTotal, color: 'hsl(262, 83%, 58%)' },
];

// --- 12-month Cash Flow Projection ---
const generateCashFlow = () => {
  const months: { month: string; licencas: number; dominios: number; total: number }[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthLabel = targetDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

    let licCost = 0;
    licenses.forEach(l => {
      if (l.type === 'Mensal') {
        licCost += l.costPerUnit * l.usedLicenses;
      } else {
        const renewMonth = new Date(l.renewalDate).getMonth();
        const renewYear = new Date(l.renewalDate).getFullYear();
        if (targetDate.getMonth() === renewMonth && targetDate.getFullYear() === renewYear) {
          licCost += l.costPerUnit * l.usedLicenses;
        }
      }
    });

    let domCost = 0;
    domains.forEach(d => {
      const expMonth = new Date(d.expirationDate).getMonth();
      const expYear = new Date(d.expirationDate).getFullYear();
      if (targetDate.getMonth() === expMonth && targetDate.getFullYear() === expYear) {
        domCost += d.renewalCost;
      }
    });

    months.push({ month: monthLabel, licencas: Math.round(licCost), dominios: Math.round(domCost), total: Math.round(licCost + domCost) });
  }
  return months;
};

const cashFlowData = generateCashFlow();
const operationalAlerts = getOperationalAlerts();
const contractMonthlyCost = contracts.reduce((sum, contract) => sum + contract.monthlyCost, 0);

// --- Assets by Status ---
const assetsByStatus = [
  { name: 'Em uso', value: assets.filter(a => a.status === 'Em uso').length, color: 'hsl(142, 76%, 36%)' },
  { name: 'Estoque', value: assets.filter(a => a.status === 'Estoque').length, color: 'hsl(217, 91%, 60%)' },
  { name: 'Manutenção', value: assets.filter(a => a.status === 'Manutenção').length, color: 'hsl(38, 92%, 50%)' },
  { name: 'Aposentado', value: assets.filter(a => a.status === 'Aposentado').length, color: 'hsl(220, 10%, 46%)' },
];

// --- License cost bar ---
const licenseCostData = licenses.map(l => ({
  name: l.software.split(' ')[0],
  custo: l.costPerUnit * l.usedLicenses,
}));

const OverviewMetric = ({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle: string; icon: LucideIcon; color: string;
}) => (
  <div className="flex min-h-20 items-center gap-3 rounded-lg border bg-background/60 p-3">
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  </div>
);

const OverviewGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-lg border bg-secondary/30 p-3">
    <h2 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{title}</h2>
    <div className="grid gap-3">{children}</div>
  </section>
);

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card px-4 py-4 shadow-sm sm:px-5">
        <h1 className="text-[22px] font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-[13px] mt-1">Governança, saúde financeira, alertas e prontidão do módulo SIG</p>
      </div>

      {/* Executive overview */}
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[230px_1fr]">
            <div className={`rounded-lg ${healthBg} p-4`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/70">
                  <HeartPulse className={`h-5 w-5 ${healthColor}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Health Score TI</p>
                  <p className={`text-3xl font-bold ${healthColor}`}>{healthScore}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {healthScore >= 80 ? 'Ambiente saudável e sob controle.' : healthScore >= 50 ? 'Existem pontos que exigem atenção.' : 'Ação imediata recomendada.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <OverviewGroup title="Operação">
                <OverviewMetric title="Ativos" value={dashboardStats.totalAssets} subtitle={`${dashboardStats.assetsInUse} em uso`} icon={Monitor} color="bg-primary/10 text-primary" />
                <OverviewMetric title="Infra/mês" value={`R$ ${serverMonthly.toLocaleString('pt-BR')}`} subtitle={`${servers.filter(s => s.status === 'Online').length}/${servers.length} online`} icon={HardDrive} color="bg-info/10 text-info" />
              </OverviewGroup>
              <OverviewGroup title="Riscos">
                <OverviewMetric title="Domínios" value={domainsExpiring30} subtitle={`${dashboardStats.expiredDomains} expirado(s)`} icon={Globe} color="bg-warning/10 text-warning" />
                <OverviewMetric title="SSL" value={dashboardStats.sslExpiringCount} subtitle="expirando" icon={ShieldAlert} color="bg-destructive/10 text-destructive" />
              </OverviewGroup>
              <OverviewGroup title="Financeiro">
                <OverviewMetric title="Licenças" value={dashboardStats.unusedLicenses} subtitle="ociosas" icon={Key} color="bg-accent/10 text-accent" />
                <OverviewMetric title="OPEX anual" value={`R$ ${opexTotal.toLocaleString('pt-BR')}`} subtitle="recorrente" icon={DollarSign} color="bg-success/10 text-success" />
                <OverviewMetric title="Contratos" value={`R$ ${contractMonthlyCost.toLocaleString('pt-BR')}`} subtitle="mês" icon={FileWarning} color="bg-warning/10 text-warning" />
              </OverviewGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Status de implantação no SIG</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {moduleReadiness.map(item => (
              <div key={item.label} className="rounded-md border border-border bg-secondary/40 p-3">
                <Badge variant="outline" className={item.done ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                  {item.done ? "Pronto" : "Pendente"}
                </Badge>
                <p className="mt-3 text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Fornecedores críticos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suppliers.map(supplier => (
              <div key={supplier.name} className="flex items-center justify-between rounded-md bg-secondary/40 p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{supplier.name}</p>
                  <p className="text-xs text-muted-foreground">{supplier.category} · {supplier.contracts} contrato(s)</p>
                </div>
                <p className="font-mono text-xs text-foreground">R$ {supplier.annualCost.toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Health Score Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Fatores do Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium text-foreground">Domínios a vencer (30d)</span>
              </div>
              <p className={`text-2xl font-bold ${domainsExpiring30 > 0 ? 'text-warning' : 'text-success'}`}>{domainsExpiring30}</p>
              <p className="text-xs text-muted-foreground mt-1">Impacto: -10 pts cada</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <FileWarning className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-foreground">Ativos sem termo</span>
              </div>
              <p className={`text-2xl font-bold ${assetsWithoutTerm > 0 ? 'text-destructive' : 'text-success'}`}>{assetsWithoutTerm}</p>
              <p className="text-xs text-muted-foreground mt-1">Impacto: -15 pts cada</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-info" />
                <span className="text-sm font-medium text-foreground">Backups pendentes</span>
              </div>
              <p className={`text-2xl font-bold ${backupsPending > 0 ? 'text-warning' : 'text-success'}`}>{backupsPending}</p>
              <p className="text-xs text-muted-foreground mt-1">Impacto: -10 pts cada</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OPEX vs CAPEX + Assets by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              OPEX vs CAPEX (Anual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="45%" height={200}>
                <PieChart>
                  <Pie data={opexVsCapex} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4}>
                    {opexVsCapex.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-4 flex-1">
                {opexVsCapex.map(item => (
                  <div key={item.name}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                    </div>
                    <p className="text-xl font-bold text-foreground pl-5">R$ {item.value.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground pl-5">
                      {item.name === 'OPEX' ? 'Assinaturas, licenças e serviços' : 'Investimento em hardware'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ativos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={assetsByStatus} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {assetsByStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {assetsByStatus.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                    <span className="text-sm font-semibold text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 12-Month Cash Flow Projection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Previsão de Fluxo de Caixa — Próximos 12 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(val: number, name: string) => [`R$ ${val.toLocaleString('pt-BR')}`, name === 'licencas' ? 'Licenças' : name === 'dominios' ? 'Domínios' : 'Total']}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Legend formatter={(value) => value === 'licencas' ? 'Licenças' : value === 'dominios' ? 'Domínios' : 'Total'} />
              <Area type="monotone" dataKey="licencas" stackId="1" fill="hsl(217, 91%, 60%)" fillOpacity={0.3} stroke="hsl(217, 91%, 60%)" strokeWidth={2} />
              <Area type="monotone" dataKey="dominios" stackId="1" fill="hsl(262, 83%, 58%)" fillOpacity={0.3} stroke="hsl(262, 83%, 58%)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* License costs bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Custo de Licenças (R$/mês)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={licenseCostData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
              <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`} />
              <Bar dataKey="custo" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent alerts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Alertas Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {operationalAlerts.map(alert => (
            <div key={alert.id} className="flex items-center gap-3 p-3 rounded-md bg-secondary/50">
              <AlertTriangle className={`w-5 h-5 shrink-0 ${alert.type === 'critical' ? 'text-destructive' : 'text-warning'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground">
                  {alert.source} · {alert.message} · {new Date(alert.dueDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Badge variant="outline" className={alert.type === 'critical' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-warning/10 text-warning border-warning/20'}>
                {alert.source}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
