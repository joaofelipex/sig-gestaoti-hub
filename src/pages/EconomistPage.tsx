import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { assets, licenses } from "@/data/mock-data";
import {
  DollarSign, Building2, AlertTriangle, ArrowRightLeft, TrendingDown,
  CheckCircle, XCircle, BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

// --- Cost Center Allocation ---
const departments = ['Desenvolvimento', 'Financeiro', 'TI', 'Design', 'Administrativo', 'RH'];

// Simulate license allocation per department
const licenseAllocation: Record<string, Record<string, number>> = {
  'Microsoft 365 Business': { Desenvolvimento: 12, Financeiro: 8, TI: 5, Design: 4, Administrativo: 8, RH: 5 },
  'Adobe Creative Cloud': { Design: 5, Desenvolvimento: 1 },
  'JetBrains All Products': { Desenvolvimento: 10, TI: 2 },
  'AWS (Reserved Instances)': { TI: 1 },
  'Google Workspace': { Desenvolvimento: 8, Financeiro: 6, TI: 3, Design: 3, Administrativo: 5, RH: 3 },
  'CrowdStrike Falcon': { Desenvolvimento: 15, Financeiro: 8, TI: 10, Design: 5, Administrativo: 10, RH: 7 },
};

const costByDepartment = departments.map(dept => {
  let total = 0;
  licenses.forEach(lic => {
    const alloc = licenseAllocation[lic.software];
    if (alloc && alloc[dept]) {
      const monthly = lic.type === 'Anual' ? lic.costPerUnit / 12 : lic.costPerUnit;
      total += monthly * alloc[dept];
    }
  });
  return { name: dept, custo: Math.round(total) };
});

const deptColors = [
  'hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(262, 83%, 58%)',
  'hsl(330, 80%, 55%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)',
];

// --- Replacement Analysis ---
function depreciacao(purchaseValue: number, purchaseDate: string, vidaUtil = 5): number {
  const anos = (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const depAnual = purchaseValue / vidaUtil;
  return Math.max(0, Math.round((purchaseValue - depAnual * anos) * 100) / 100);
}

const replacementAnalysis = assets
  .filter(a => a.status !== 'Aposentado')
  .map(a => {
    const maintenanceCost = a.maintenanceLog.reduce((s, m) => s + m.cost, 0);
    const ratio = a.purchaseValue > 0 ? (maintenanceCost / a.purchaseValue) * 100 : 0;
    const shouldReplace = ratio >= 60;
    const currentValue = depreciacao(a.purchaseValue, a.purchaseDate);
    return {
      ...a,
      maintenanceCost,
      ratio: Math.round(ratio),
      shouldReplace,
      currentValue,
    };
  })
  .sort((a, b) => b.ratio - a.ratio);

const totalMonthlyLicCost = licenses.reduce((sum, l) => {
  return sum + (l.type === 'Anual' ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses);
}, 0);

const costPerEmployee = Math.round(totalMonthlyLicCost / 45); // 45 employees from mock

export default function EconomistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Visão de Economista</h1>
        <p className="text-muted-foreground text-sm mt-1">Rateio por centro de custo e análise de eficiência</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Custo Mensal Software</p>
              <p className="text-2xl font-bold text-foreground">R$ {Math.round(totalMonthlyLicCost).toLocaleString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Custo/Colaborador</p>
              <p className="text-2xl font-bold text-foreground">R$ {costPerEmployee.toLocaleString('pt-BR')}/mês</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowRightLeft className="w-8 h-8 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Ativos p/ Substituição</p>
              <p className="text-2xl font-bold text-warning">{replacementAnalysis.filter(a => a.shouldReplace).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Departamentos</p>
              <p className="text-2xl font-bold text-foreground">{departments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost by Department */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Rateio de Software por Centro de Custo (R$/mês)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costByDepartment} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" tickFormatter={v => `R$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" width={120} />
              <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`} />
              <Bar dataKey="custo" radius={[0, 6, 6, 0]}>
                {costByDepartment.map((_, i) => (
                  <Cell key={i} fill={deptColors[i % deptColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* License allocation detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Detalhamento: Licenças por Departamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {licenses.map(lic => {
              const alloc = licenseAllocation[lic.software] || {};
              const monthly = lic.type === 'Anual' ? lic.costPerUnit / 12 : lic.costPerUnit;

              return (
                <div key={lic.id} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{lic.software}</p>
                      <p className="text-xs text-muted-foreground">{lic.vendor} · R$ {monthly.toFixed(0)}/licença/mês</p>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {lic.usedLicenses}/{lic.totalLicenses} licenças
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {departments.map(dept => {
                      const count = alloc[dept] || 0;
                      const cost = Math.round(monthly * count);
                      return (
                        <div key={dept} className={`p-2 rounded-lg text-xs ${count > 0 ? 'bg-secondary' : 'bg-muted/30'}`}>
                          <span className="text-muted-foreground">{dept}</span>
                          <p className={`font-semibold mt-0.5 ${count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
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
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-warning" />
            Análise de Substituição de Hardware
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Indicador de substituição: custo de manutenção acumulado ≥ 60% do valor de compra
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {replacementAnalysis.map(asset => (
              <div key={asset.id} className={`p-4 rounded-xl border ${asset.shouldReplace ? 'border-warning bg-warning/5' : 'border-border bg-card'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      {asset.brand} {asset.model}
                      {asset.shouldReplace ? (
                        <Badge className="bg-warning text-warning-foreground gap-1">
                          <AlertTriangle className="w-3 h-3" /> Substituir
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                          <CheckCircle className="w-3 h-3" /> OK
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {asset.id} · {asset.type} · {asset.department}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs mb-2">
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
                    <p className={`font-semibold ${asset.shouldReplace ? 'text-warning' : 'text-foreground'}`}>R$ {asset.maintenanceCost.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Ratio Mnt/Compra</span>
                    <p className={`font-semibold ${asset.shouldReplace ? 'text-warning' : 'text-foreground'}`}>{asset.ratio}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={Math.min(100, asset.ratio)}
                    className={`h-2 flex-1 ${asset.shouldReplace ? '[&>div]:bg-warning' : ''}`}
                  />
                  <span className="text-xs font-mono text-muted-foreground w-16 text-right">{asset.ratio}% / 60%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
