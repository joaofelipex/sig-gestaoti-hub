import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { assets, domains, licenses, dashboardStats } from "@/data/mock-data";
import {
  Monitor, Globe, Key, ShieldAlert, AlertTriangle, CheckCircle,
  TrendingUp, DollarSign, HardDrive, Wrench, Archive, Activity,
  HeartPulse, FileWarning, Database,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, LineChart, Line, Legend,
  AreaChart, Area,
} from "recharts";

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
const opexTotal = licenses.reduce((sum, l) => {
  return sum + (l.type === 'Mensal' ? l.costPerUnit * l.usedLicenses * 12 : l.costPerUnit * l.usedLicenses);
}, 0) + domains.reduce((sum, d) => sum + d.renewalCost, 0);

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

const KpiCard = ({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle: string; icon: any; color: string;
}) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Governança e Saúde Financeira da TI</p>
      </div>

      {/* Health Score + KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Health Score - larger */}
        <Card className={`md:col-span-2 lg:col-span-1 ${healthBg} border-0`}>
          <CardContent className="p-5 flex flex-col items-center justify-center text-center">
            <HeartPulse className={`w-8 h-8 ${healthColor} mb-2`} />
            <p className="text-sm font-medium text-muted-foreground">Health Score TI</p>
            <p className={`text-5xl font-bold mt-1 ${healthColor}`}>{healthScore}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {healthScore >= 80 ? 'Excelente' : healthScore >= 50 ? 'Atenção necessária' : 'Crítico'}
            </p>
          </CardContent>
        </Card>

        <KpiCard
          title="Total de Ativos"
          value={dashboardStats.totalAssets}
          subtitle={`${dashboardStats.assetsInUse} em uso`}
          icon={Monitor}
          color="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Domínios Expirando"
          value={domainsExpiring30}
          subtitle={`${dashboardStats.expiredDomains} expirado(s)`}
          icon={Globe}
          color="bg-warning/10 text-warning"
        />
        <KpiCard
          title="Licenças Ociosas"
          value={dashboardStats.unusedLicenses}
          subtitle="podem ser reutilizadas"
          icon={Key}
          color="bg-accent/10 text-accent"
        />
        <KpiCard
          title="SSL Expirando"
          value={dashboardStats.sslExpiringCount}
          subtitle="próximos 30 dias"
          icon={ShieldAlert}
          color="bg-destructive/10 text-destructive"
        />
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
          {domains.filter(d => d.status !== 'Ativo').map(d => (
            <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              {d.status === 'Expirado' ? (
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{d.url}</p>
                <p className="text-xs text-muted-foreground">
                  {d.status === 'Expirado' ? 'Domínio expirado em' : 'Expira em'} {new Date(d.expirationDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Badge variant={d.status === 'Expirado' ? 'destructive' : 'secondary'} className={d.status === 'Expirando' ? 'bg-warning/10 text-warning border-warning/20' : ''}>
                {d.status}
              </Badge>
            </div>
          ))}
          {assets.filter(a => a.status === 'Manutenção').map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Wrench className="w-5 h-5 text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{a.brand} {a.model}</p>
                <p className="text-xs text-muted-foreground">Ativo em manutenção — {a.id}</p>
              </div>
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Manutenção</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
