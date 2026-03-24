import { licenses } from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Key, DollarSign, Users, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";

const categoryColors: Record<string, string> = {
  Produtividade: 'hsl(217, 91%, 60%)',
  Desenvolvimento: 'hsl(262, 83%, 58%)',
  Design: 'hsl(330, 80%, 55%)',
  Infraestrutura: 'hsl(38, 92%, 50%)',
  Segurança: 'hsl(142, 76%, 36%)',
};

const catBadge: Record<string, string> = {
  Produtividade: 'bg-primary/10 text-primary border-primary/20',
  Desenvolvimento: 'bg-accent/10 text-accent border-accent/20',
  Design: 'bg-destructive/10 text-destructive border-destructive/20',
  Infraestrutura: 'bg-warning/10 text-warning border-warning/20',
  Segurança: 'bg-success/10 text-success border-success/20',
};

export default function LicensesPage() {
  const totalMonthlyCost = licenses.reduce((sum, l) => {
    const monthly = l.type === 'Anual' ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses;
    return sum + monthly;
  }, 0);

  const costByCategory = Object.entries(
    licenses.reduce((acc, l) => {
      const monthly = l.type === 'Anual' ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses;
      acc[l.category] = (acc[l.category] || 0) + monthly;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: Math.round(value), color: categoryColors[name] }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Licenças & Software</h1>
        <p className="text-muted-foreground text-sm mt-1">Controle de assinaturas SaaS e custo por usuário</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Custo Mensal Total</p>
              <p className="text-2xl font-bold text-foreground">R$ {Math.round(totalMonthlyCost).toLocaleString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Key className="w-8 h-8 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Total de Licenças</p>
              <p className="text-2xl font-bold text-foreground">{licenses.reduce((s, l) => s + l.totalLicenses, 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Licenças Ociosas</p>
              <p className="text-2xl font-bold text-foreground">{licenses.reduce((s, l) => s + (l.totalLicenses - l.usedLicenses), 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Custo por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={costByCategory} dataKey="value" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                  {costByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}/mês`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {costByCategory.map(c => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-muted-foreground flex-1">{c.name}</span>
                  <span className="font-semibold text-foreground">R$ {c.value.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* License list */}
        <div className="lg:col-span-2 space-y-3">
          {licenses.map(lic => {
            const usage = (lic.usedLicenses / lic.totalLicenses) * 100;
            const monthlyCost = lic.type === 'Anual' ? (lic.costPerUnit * lic.usedLicenses) / 12 : lic.costPerUnit * lic.usedLicenses;

            return (
              <Card key={lic.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{lic.software}</p>
                      <p className="text-xs text-muted-foreground">{lic.vendor} · {lic.type}</p>
                    </div>
                    <Badge variant="outline" className={catBadge[lic.category]}>{lic.category}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs mb-2">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{lic.usedLicenses}/{lic.totalLicenses} licenças</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>R$ {Math.round(monthlyCost).toLocaleString('pt-BR')}/mês</span>
                    </div>
                    <span className="text-muted-foreground">Renova: {new Date(lic.renewalDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={usage} className="h-2 flex-1" />
                    <span className="text-xs font-semibold text-foreground w-10 text-right">{Math.round(usage)}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
