import { useState } from "react";
import type { License } from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Key, DollarSign, Users, AlertCircle, Plus, Pencil, Trash2, FileDown } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import LicenseForm from "@/components/forms/LicenseForm";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/export-csv";
import { findCol, parseDate, parseNumber } from "@/lib/import-csv";
import ImportCSVButton from "@/components/ImportCSVButton";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";

interface LicenseRow {
  id: string;
  nome: string;
  fornecedor: string | null;
  tipo: string | null;
  categoria: string;
  total_licencas: number;
  qtd_usuarios: number;
  custo_unitario: number;
  custo_mensal: number;
  data_renovacao: string | null;
  chave_ativacao: string | null;
}

const fromDb = (r: LicenseRow): License => ({
  id: r.id,
  software: r.nome,
  vendor: r.fornecedor ?? "",
  type: (r.tipo as License['type']) ?? "Mensal",
  category: (r.categoria as License['category']) ?? "Produtividade",
  totalLicenses: r.total_licencas,
  usedLicenses: r.qtd_usuarios,
  costPerUnit: Number(r.custo_unitario ?? 0),
  renewalDate: r.data_renovacao ?? "",
  activationKey: r.chave_ativacao ?? "",
});

const toDb = (l: License, orgId: string) => ({
  id: l.id,
  org_id: orgId,
  nome: l.software,
  fornecedor: l.vendor,
  tipo: l.type,
  categoria: l.category,
  total_licencas: l.totalLicenses,
  qtd_usuarios: l.usedLicenses,
  custo_unitario: l.costPerUnit,
  custo_mensal: l.type === "Anual" ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses,
  data_renovacao: l.renewalDate || null,
  chave_ativacao: l.activationKey,
});

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
  const { items: licenseList, save: saveLicense, remove: removeLicense } = useSupabaseCollection<License, LicenseRow>(
    "licencas", fromDb, toDb, "Licenças",
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<License | null>(null);

  const totalMonthlyCost = licenseList.reduce((sum, l) => {
    const monthly = l.type === 'Anual' ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses;
    return sum + monthly;
  }, 0);

  const costByCategory = Object.entries(
    licenseList.reduce((acc, l) => {
      const monthly = l.type === 'Anual' ? (l.costPerUnit * l.usedLicenses) / 12 : l.costPerUnit * l.usedLicenses;
      acc[l.category] = (acc[l.category] || 0) + monthly;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: Math.round(value as number), color: categoryColors[name] }));

  const handleSave = async (license: License) => {
    const exists = licenseList.some(l => l.id === license.id);
    await saveLicense(license);
    toast.success(`Licença "${license.software}" ${exists ? 'atualizada' : 'cadastrada'}!`);
    setEditingLicense(null);
  };

  const handleDelete = async (license: License) => {
    await removeLicense(license);
    setDeleteTarget(null);
    toast.success(`Licença "${license.software}" removida.`);
  };

  const openEdit = (license: License) => {
    setEditingLicense(license);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditingLicense(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Licenças & Software</h1>
          <p className="text-muted-foreground text-[13px] mt-1">Controle de assinaturas SaaS e custo por usuário</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="gap-2" onClick={() => {
            exportToCSV('licencas_IMTS', ['Software','Vendor','Tipo','Categoria','Licenças Usadas','Licenças Total','Custo Unitário','Renovação'],
              licenseList.map(l => [l.software, l.vendor, l.type, l.category, l.usedLicenses, l.totalLicenses, l.costPerUnit, l.renewalDate]));
            toast.success('CSV exportado!');
          }}>
            <FileDown className="w-4 h-4" /> Exportar CSV
          </Button>
          <ImportCSVButton onImport={async (rows, headers) => {
            const iSw = findCol(headers, "software", "nome");
            const iVendor = findCol(headers, "vendor", "fornecedor");
            const iType = findCol(headers, "tipo");
            const iCat = findCol(headers, "categoria");
            const iUsed = findCol(headers, "usad");
            const iTotal = findCol(headers, "total");
            const iCost = findCol(headers, "custo");
            const iRen = findCol(headers, "renova");
            if (iSw < 0) { toast.error("Coluna 'Software' não encontrada"); return { ok: 0, fail: 0 }; }
            const existing = new Set(licenseList.map(l => l.software.toLowerCase()));
            let ok = 0, fail = 0, skipped = 0;
            for (const row of rows) {
              const software = (row[iSw] || "").trim();
              if (!software) continue;
              if (existing.has(software.toLowerCase())) { skipped++; continue; }
              const lic: License = {
                id: crypto.randomUUID(), software,
                vendor: iVendor >= 0 ? (row[iVendor] || "").trim() : "",
                type: ((iType >= 0 ? row[iType] : "Mensal") || "Mensal").trim() as License['type'],
                category: ((iCat >= 0 ? row[iCat] : "Produtividade") || "Produtividade").trim() as License['category'],
                totalLicenses: iTotal >= 0 ? parseNumber(row[iTotal]) : 1,
                usedLicenses: iUsed >= 0 ? parseNumber(row[iUsed]) : 1,
                costPerUnit: iCost >= 0 ? parseNumber(row[iCost]) : 0,
                renewalDate: iRen >= 0 ? parseDate(row[iRen]) : "",
                activationKey: "",
              };
              try { await saveLicense(lic); ok++; existing.add(software.toLowerCase()); } catch { fail++; }
            }
            return { ok, fail, skipped };
          }} />
          <Button className="gap-2" onClick={openNew}>
            <Plus className="w-4 h-4" /> Nova Licença
          </Button>
        </div>
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
              <p className="text-2xl font-bold text-foreground">{licenseList.reduce((s, l) => s + l.totalLicenses, 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Licenças Ociosas</p>
              <p className="text-2xl font-bold text-foreground">{licenseList.reduce((s, l) => s + (l.totalLicenses - l.usedLicenses), 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        <div className="lg:col-span-2 space-y-3">
          {licenseList.map(lic => {
            const usage = (lic.usedLicenses / lic.totalLicenses) * 100;
            const monthlyCost = lic.type === 'Anual' ? (lic.costPerUnit * lic.usedLicenses) / 12 : lic.costPerUnit * lic.usedLicenses;

            return (
              <Card key={lic.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{lic.software}</p>
                      <p className="text-xs text-muted-foreground">{lic.vendor} · {lic.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={catBadge[lic.category]}>{lic.category}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(lic)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(lic)} title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a licença <strong>{deleteTarget?.software}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LicenseForm open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} license={editingLicense} />
    </div>
  );
}
