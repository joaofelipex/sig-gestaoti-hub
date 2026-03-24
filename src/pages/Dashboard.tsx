import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assets, domains, licenses, dashboardStats } from "@/data/mock-data";
import {
  Monitor, Globe, Key, ShieldAlert, AlertTriangle, CheckCircle,
  TrendingUp, DollarSign, HardDrive, Wrench, Archive
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

const assetsByStatus = [
  { name: 'Em uso', value: assets.filter(a => a.status === 'Em uso').length, color: 'hsl(142, 76%, 36%)' },
  { name: 'Estoque', value: assets.filter(a => a.status === 'Estoque').length, color: 'hsl(217, 91%, 60%)' },
  { name: 'Manutenção', value: assets.filter(a => a.status === 'Manutenção').length, color: 'hsl(38, 92%, 50%)' },
  { name: 'Aposentado', value: assets.filter(a => a.status === 'Aposentado').length, color: 'hsl(220, 10%, 46%)' },
];

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
        <p className="text-muted-foreground text-sm mt-1">Visão geral da infraestrutura de TI</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Ativos"
          value={dashboardStats.totalAssets}
          subtitle={`${dashboardStats.assetsInUse} em uso`}
          icon={Monitor}
          color="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Domínios Expirando"
          value={dashboardStats.expiringDomains}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets by Status pie chart */}
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
      </div>

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
