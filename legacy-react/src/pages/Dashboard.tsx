import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Monitor, Globe, Key, ShieldAlert, AlertTriangle,
  TrendingUp, DollarSign, HardDrive, Activity,
  HeartPulse, FileWarning, Database, type LucideIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
  AreaChart, Area,
} from "recharts";
import { useDashboardData } from "@/hooks/use-dashboard-data";

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
  const { assets, domains, licenses, servers, contracts, loading } = useDashboardData();

  const metrics = useMemo(() => {
    const days = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    const domainsExpiring30 = domains.filter(d => d.expirationDate && days(d.expirationDate) > 0 && days(d.expirationDate) <= 30).length;
    const expiredDomains = domains.filter(d => d.status === "Expirado").length;
    const sslExpiring = domains.filter(d => d.sslExpiration && days(d.sslExpiration) > 0 && days(d.sslExpiration) <= 30).length;
    const assetsInUse = assets.filter(a => a.status === "Em uso").length;
    const assetsWithoutTerm = assets.filter(a => a.status === "Em uso" && !a.assignedTo).length;
    const unusedLicenses = licenses.reduce((s, l) => s + Math.max(0, l.totalLicenses - l.usedLicenses), 0);
    const serverMonthly = servers.reduce((s, sv) => s + sv.monthlyCost, 0);
    const opex =
      licenses.reduce((s, l) => s + (l.type === "Mensal" ? l.costPerUnit * l.usedLicenses * 12 : l.costPerUnit * l.usedLicenses), 0) +
      domains.reduce((s, d) => s + d.renewalCost, 0) +
      serverMonthly * 12;
    const capex = assets.reduce((s, a) => s + a.purchaseValue, 0);
    const contractMonthly = contracts.reduce((s, c) => s + c.monthlyCost, 0);

    let score = 100;
    score -= domainsExpiring30 * 10;
    score -= assetsWithoutTerm * 15;
    score -= expiredDomains * 20;
    score = Math.max(0, Math.min(100, score));

    return {
      domainsExpiring30, expiredDomains, sslExpiring, assetsInUse,
      assetsWithoutTerm, unusedLicenses, serverMonthly, opex, capex,
      contractMonthly, healthScore: score,
    };
  }, [assets, domains, licenses, servers, contracts]);

  const healthColor = metrics.healthScore >= 80 ? "text-success" : metrics.healthScore >= 50 ? "text-warning" : "text-destructive";
  const healthBg = metrics.healthScore >= 80 ? "bg-success/10" : metrics.healthScore >= 50 ? "bg-warning/10" : "bg-destructive/10";

  const opexVsCapex = [
    { name: "OPEX", value: metrics.opex, color: "hsl(217, 91%, 60%)" },
    { name: "CAPEX", value: metrics.capex, color: "hsl(262, 83%, 58%)" },
  ];

  const assetsByStatus = [
    { name: "Em uso", value: assets.filter(a => a.status === "Em uso").length, color: "hsl(142, 76%, 36%)" },
    { name: "Estoque", value: assets.filter(a => a.status === "Estoque").length, color: "hsl(217, 91%, 60%)" },
    { name: "Manutenção", value: assets.filter(a => a.status === "Manutenção").length, color: "hsl(38, 92%, 50%)" },
    { name: "Aposentado", value: assets.filter(a => a.status === "Aposentado").length, color: "hsl(220, 10%, 46%)" },
  ];

  const cashFlowData = useMemo(() => {
    const months: { month: string; licencas: number; dominios: number; total: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const t = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = t.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      let lic = 0;
      licenses.forEach(l => {
        if (l.type === "Mensal") lic += l.costPerUnit * l.usedLicenses;
        else if (l.renewalDate) {
          const r = new Date(l.renewalDate);
          if (r.getMonth() === t.getMonth() && r.getFullYear() === t.getFullYear()) lic += l.costPerUnit * l.usedLicenses;
        }
      });
      let dom = 0;
      domains.forEach(d => {
        if (d.expirationDate) {
          const e = new Date(d.expirationDate);
          if (e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear()) dom += d.renewalCost;
        }
      });
      months.push({ month: label, licencas: Math.round(lic), dominios: Math.round(dom), total: Math.round(lic + dom) });
    }
    return months;
  }, [licenses, domains]);

  const licenseCostData = licenses.map(l => ({ name: (l.software || "").split(" ")[0] || "—", custo: l.costPerUnit * l.usedLicenses }));

  const operationalAlerts = useMemo(() => {
    const days = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    const out: Array<{ id: string; type: "critical" | "warning"; source: string; title: string; message: string; dueDate: string }> = [];
    domains.forEach(d => {
      if (d.expirationDate) {
        const dd = days(d.expirationDate);
        if (dd <= 30) out.push({ id: `dom-${d.id}`, type: dd <= 0 ? "critical" : "warning", source: "Domínio", title: d.url, message: dd <= 0 ? "Domínio expirado" : `Vence em ${dd}d`, dueDate: d.expirationDate });
      }
      if (d.sslExpiration) {
        const sd = days(d.sslExpiration);
        if (sd <= 30) out.push({ id: `ssl-${d.id}`, type: sd <= 0 ? "critical" : "warning", source: "SSL", title: d.url, message: sd <= 0 ? "SSL expirado" : `SSL vence em ${sd}d`, dueDate: d.sslExpiration });
      }
    });
    servers.forEach(s => {
      if (s.status === "Offline" || s.status === "Degradado") out.push({ id: `srv-${s.id}`, type: "critical", source: "Servidor", title: s.name, message: `Status ${s.status}`, dueDate: s.contractEnd || "" });
    });
    return out.slice(0, 8);
  }, [domains, servers]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card px-4 py-4 shadow-sm sm:px-5">
        <h1 className="text-[22px] font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-[13px] mt-1">Governança, saúde financeira e alertas operacionais</p>
      </div>

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
                  <p className={`text-3xl font-bold ${healthColor}`}>{metrics.healthScore}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {metrics.healthScore >= 80 ? "Ambiente saudável." : metrics.healthScore >= 50 ? "Atenção a alguns pontos." : "Ação imediata recomendada."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <OverviewGroup title="Operação">
                <OverviewMetric title="Ativos" value={assets.length} subtitle={`${metrics.assetsInUse} em uso`} icon={Monitor} color="bg-primary/10 text-primary" />
                <OverviewMetric title="Infra/mês" value={`R$ ${metrics.serverMonthly.toLocaleString("pt-BR")}`} subtitle={`${servers.filter(s => s.status === "Online").length}/${servers.length} online`} icon={HardDrive} color="bg-info/10 text-info" />
              </OverviewGroup>
              <OverviewGroup title="Riscos">
                <OverviewMetric title="Domínios" value={metrics.domainsExpiring30} subtitle={`${metrics.expiredDomains} expirado(s)`} icon={Globe} color="bg-warning/10 text-warning" />
                <OverviewMetric title="SSL" value={metrics.sslExpiring} subtitle="expirando" icon={ShieldAlert} color="bg-destructive/10 text-destructive" />
              </OverviewGroup>
              <OverviewGroup title="Financeiro">
                <OverviewMetric title="Licenças" value={metrics.unusedLicenses} subtitle="ociosas" icon={Key} color="bg-accent/10 text-accent" />
                <OverviewMetric title="OPEX anual" value={`R$ ${Math.round(metrics.opex).toLocaleString("pt-BR")}`} subtitle="recorrente" icon={DollarSign} color="bg-success/10 text-success" />
                <OverviewMetric title="Contratos" value={`R$ ${metrics.contractMonthly.toLocaleString("pt-BR")}`} subtitle="mês" icon={FileWarning} color="bg-warning/10 text-warning" />
              </OverviewGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Fatores do Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-2 mb-2"><Globe className="w-4 h-4 text-warning" /><span className="text-sm font-medium">Domínios a vencer (30d)</span></div>
              <p className={`text-2xl font-bold ${metrics.domainsExpiring30 > 0 ? "text-warning" : "text-success"}`}>{metrics.domainsExpiring30}</p>
              <p className="text-xs text-muted-foreground mt-1">Impacto: -10 pts cada</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-2 mb-2"><FileWarning className="w-4 h-4 text-destructive" /><span className="text-sm font-medium">Ativos sem responsável</span></div>
              <p className={`text-2xl font-bold ${metrics.assetsWithoutTerm > 0 ? "text-destructive" : "text-success"}`}>{metrics.assetsWithoutTerm}</p>
              <p className="text-xs text-muted-foreground mt-1">Impacto: -15 pts cada</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-2 mb-2"><Database className="w-4 h-4 text-info" /><span className="text-sm font-medium">Domínios expirados</span></div>
              <p className={`text-2xl font-bold ${metrics.expiredDomains > 0 ? "text-destructive" : "text-success"}`}>{metrics.expiredDomains}</p>
              <p className="text-xs text-muted-foreground mt-1">Impacto: -20 pts cada</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> OPEX vs CAPEX (Anual)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="45%" height={200}>
                <PieChart>
                  <Pie data={opexVsCapex} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4}>
                    {opexVsCapex.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-4 flex-1">
                {opexVsCapex.map(item => (
                  <div key={item.name}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <p className="text-xl font-bold pl-5">R$ {Math.round(item.value).toLocaleString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Ativos por Status</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={assetsByStatus} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {assetsByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {assetsByStatus.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                    <span className="text-sm font-semibold ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Previsão de Fluxo de Caixa — 12 meses</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              <Legend />
              <Area type="monotone" dataKey="licencas" stackId="1" fill="hsl(217, 91%, 60%)" fillOpacity={0.3} stroke="hsl(217, 91%, 60%)" strokeWidth={2} />
              <Area type="monotone" dataKey="dominios" stackId="1" fill="hsl(262, 83%, 58%)" fillOpacity={0.3} stroke="hsl(262, 83%, 58%)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Custo de Licenças (R$/mês)</CardTitle></CardHeader>
        <CardContent>
          {licenseCostData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma licença cadastrada.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={licenseCostData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                <Bar dataKey="custo" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Alertas Operacionais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {operationalAlerts.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum alerta operacional.</p>}
          {operationalAlerts.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-md bg-secondary/50">
              <AlertTriangle className={`w-5 h-5 shrink-0 ${a.type === "critical" ? "text-destructive" : "text-warning"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.source} · {a.message}{a.dueDate ? ` · ${new Date(a.dueDate).toLocaleDateString("pt-BR")}` : ""}</p>
              </div>
              <Badge variant="outline" className={a.type === "critical" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20"}>{a.source}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
