import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wrench, Plus, Pencil, Trash2, Calendar, ShieldCheck, AlertTriangle, FileDown,
  TrendingUp, DollarSign, Search,
} from "lucide-react";
import MaintenanceForm from "@/components/forms/MaintenanceForm";
import { type MaintenanceRecord } from "@/lib/maintenance-data";
import { type Asset } from "@/data/mock-data";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";
import { exportToCSV } from "@/lib/export-csv";
import { findCol, parseDate, parseNumber } from "@/lib/import-csv";
import ImportCSVButton from "@/components/ImportCSVButton";
import { toast } from "sonner";

// ----- Asset mappers (must mirror AssetsPage) -----
interface AtivoRow {
  id: string; tipo: string; marca: string | null; modelo: string | null;
  numero_serie: string | null;
  status: 'ativo' | 'manutencao' | 'estoque' | 'descartado';
  assigned_to: string | null; department_nome: string | null;
  data_aquisicao: string | null; warranty_end: string | null;
  valor_aquisicao: number | null;
  specs: { cpu?: string; ram?: string; storage?: string } | null;
  maintenance_log: { date: string; description: string; cost: number }[] | null;
}
const statusDbToUi: Record<AtivoRow['status'], Asset['status']> = {
  ativo: 'Em uso', estoque: 'Estoque', manutencao: 'Manutenção', descartado: 'Aposentado',
};
const assetFromDb = (r: AtivoRow): Asset => ({
  id: r.id, type: (r.tipo as Asset['type']) ?? 'Notebook',
  brand: r.marca ?? '', model: r.modelo ?? '', serialNumber: r.numero_serie ?? '',
  status: statusDbToUi[r.status] ?? 'Estoque', assignedTo: r.assigned_to,
  department: r.department_nome ?? '', purchaseDate: r.data_aquisicao ?? '',
  warrantyEnd: r.warranty_end ?? '', specs: r.specs ?? {},
  purchaseValue: Number(r.valor_aquisicao ?? 0), maintenanceLog: r.maintenance_log ?? [],
});
const assetToDb = () => ({}); // unused (read-only here)

// ----- Maintenance mappers -----
interface ManutRow {
  id: string;
  ativo_id: string;
  tipo: string;
  descricao: string | null;
  custo: number | null;
  fornecedor: string | null;
  data_abertura: string;
  data_conclusao: string | null;
  status: string;
}

const statusUiToDb: Record<MaintenanceRecord['status'], string> = {
  Agendada: 'aberta',
  'Em andamento': 'em_andamento',
  Concluída: 'concluida',
  Cancelada: 'cancelada',
};
const statusDbToUiM: Record<string, MaintenanceRecord['status']> = {
  aberta: 'Agendada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const maintFromDb = (r: ManutRow, assetsById: Map<string, Asset>): MaintenanceRecord => {
  const a = assetsById.get(r.ativo_id);
  return {
    id: r.id,
    assetId: r.ativo_id,
    assetLabel: a ? `${a.type} ${a.brand} ${a.model}` : r.ativo_id,
    type: (r.tipo as MaintenanceRecord['type']) === 'Corretiva' ? 'Corretiva' : 'Preventiva',
    status: statusDbToUiM[r.status] ?? 'Agendada',
    scheduledDate: r.data_abertura,
    completedDate: r.data_conclusao ?? undefined,
    description: r.descricao ?? '',
    technician: '',
    supplier: r.fornecedor ?? '',
    ticketNumber: '',
    cost: Number(r.custo ?? 0),
    warrantyCovered: false,
  };
};

const maintToDb = (m: MaintenanceRecord, orgId: string) => ({
  id: m.id,
  org_id: orgId,
  ativo_id: m.assetId,
  tipo: m.type,
  descricao: m.description,
  custo: m.cost,
  fornecedor: m.supplier ?? null,
  data_abertura: m.scheduledDate,
  data_conclusao: m.completedDate ?? null,
  status: statusUiToDb[m.status],
});

const statusColor: Record<MaintenanceRecord["status"], string> = {
  Agendada: "bg-info/10 text-info border-info/20",
  "Em andamento": "bg-warning/10 text-warning border-warning/20",
  Concluída: "bg-success/10 text-success border-success/20",
  Cancelada: "bg-muted text-muted-foreground border-border",
};

const typeColor: Record<MaintenanceRecord["type"], string> = {
  Preventiva: "bg-primary/10 text-primary border-primary/20",
  Corretiva: "bg-destructive/10 text-destructive border-destructive/20",
};

function daysDiff(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function warrantyState(warrantyEnd: string) {
  const days = daysDiff(warrantyEnd);
  if (days < 0) return { label: "Expirada", color: "bg-destructive/10 text-destructive border-destructive/20" };
  if (days <= 30) return { label: `Expira em ${days}d`, color: "bg-destructive/10 text-destructive border-destructive/20" };
  if (days <= 90) return { label: `${days}d restantes`, color: "bg-warning/10 text-warning border-warning/20" };
  return { label: "Vigente", color: "bg-success/10 text-success border-success/20" };
}

export default function MaintenancePage() {
  const { items: assets } = useSupabaseCollection<Asset, AtivoRow>(
    "ativos", assetFromDb, assetToDb as never, "Ativos",
  );
  const assetsById = useMemo(() => new Map(assets.map(a => [a.id, a])), [assets]);
  const { items: records, save, remove } = useSupabaseCollection<MaintenanceRecord, ManutRow>(
    "manutencoes",
    (r) => maintFromDb(r, assetsById),
    maintToDb,
    "Manutenções",
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r =>
      r.assetLabel.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.technician.toLowerCase().includes(q) ||
      (r.supplier ?? "").toLowerCase().includes(q) ||
      (r.ticketNumber ?? "").toLowerCase().includes(q),
    );
  }, [records, search]);

  // KPIs
  const scheduled = records.filter(r => r.status === "Agendada").length;
  const inProgress = records.filter(r => r.status === "Em andamento").length;
  const totalCost = records.filter(r => r.status === "Concluída").reduce((s, r) => s + r.cost, 0);
  const overdue = records.filter(r =>
    r.status === "Agendada" && daysDiff(r.scheduledDate) < 0,
  ).length;

  // Custo acumulado por ativo + regra dos 60%
  const costByAsset = useMemo(() => {
    return assets.map(asset => {
      const accumulated = records
        .filter(r => r.assetId === asset.id && r.status === "Concluída")
        .reduce((s, r) => s + r.cost, 0);
      const ratio = asset.purchaseValue > 0 ? (accumulated / asset.purchaseValue) * 100 : 0;
      const triggered = ratio >= 60;
      return { asset, accumulated, ratio, triggered };
    }).sort((a, b) => b.ratio - a.ratio);
  }, [assets, records]);

  const triggeredCount = costByAsset.filter(c => c.triggered).length;

  // Garantias
  const warrantySummary = useMemo(() => {
    const warrantyExpiring = assets.filter(a => {
      const d = daysDiff(a.warrantyEnd);
      return d > 0 && d <= 90;
    }).length;
    const warrantyExpired = assets.filter(a => daysDiff(a.warrantyEnd) < 0).length;
    return { warrantyExpiring, warrantyExpired };
  }, [assets]);

  const handleSave = (record: MaintenanceRecord) => {
    const exists = records.some(r => r.id === record.id);
    save(record);
    toast.success(`Manutenção ${exists ? "atualizada" : "cadastrada"}`);
    setEditing(null);
  };

  const handleDelete = (record: MaintenanceRecord) => {
    remove(record);
    toast.success("Manutenção removida");
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Manutenção & Garantia</h1>
          <p className="text-muted-foreground text-[13px] mt-1">
            Agenda preventiva, corretivas, garantia e regra dos 60% por ativo
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="gap-2" onClick={() => {
            exportToCSV(
              "manutencoes_IMTS",
              ["ID", "Ativo", "Tipo", "Status", "Agendada", "Concluída", "Técnico", "Fornecedor", "Chamado", "Custo", "Garantia"],
              records.map(r => [
                r.id, r.assetLabel, r.type, r.status, r.scheduledDate,
                r.completedDate ?? "", r.technician, r.supplier ?? "",
                r.ticketNumber ?? "", r.cost, r.warrantyCovered ? "Sim" : "Não",
              ]),
            );
            toast.success("CSV exportado!");
          }}>
            <FileDown className="w-4 h-4" /> Exportar
          </Button>
          <Button className="gap-2" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4" /> Nova Manutenção
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-info" />
            <div>
              <p className="text-xs text-muted-foreground">Agendadas</p>
              <p className="text-2xl font-bold text-foreground">{scheduled}</p>
              {overdue > 0 && (
                <p className="text-[11px] text-destructive font-medium mt-0.5">{overdue} atrasada(s)</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Em andamento</p>
              <p className="text-2xl font-bold text-foreground">{inProgress}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Custo acumulado</p>
              <p className="text-2xl font-bold text-foreground">
                R$ {totalCost.toLocaleString("pt-BR")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Regra dos 60%</p>
              <p className="text-2xl font-bold text-foreground">{triggeredCount}</p>
              <p className="text-[11px] text-muted-foreground">ativo(s) acionado(s)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="historico" className="space-y-4">
        <TabsList>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="garantias">Garantias</TabsTrigger>
          <TabsTrigger value="regra60">Regra dos 60%</TabsTrigger>
        </TabsList>

        {/* HISTÓRICO */}
        <TabsContent value="historico" className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por ativo, técnico, chamado..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Chamado</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell className="font-medium">{r.assetLabel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeColor[r.type]}>{r.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor[r.status]}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.completedDate
                          ? new Date(r.completedDate).toLocaleDateString("pt-BR")
                          : new Date(r.scheduledDate).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs">{r.technician}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.ticketNumber ?? "—"}
                        {r.warrantyCovered && (
                          <Badge variant="outline" className="ml-2 bg-success/10 text-success border-success/20 text-[10px]">
                            Garantia
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {r.cost.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => { setEditing(r); setFormOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhuma manutenção encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGENDA */}
        <TabsContent value="agenda" className="space-y-3">
          {records
            .filter(r => r.status === "Agendada" || r.status === "Em andamento")
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
            .map(r => {
              const days = daysDiff(r.scheduledDate);
              const overdueItem = days < 0;
              return (
                <Card key={r.id} className={overdueItem ? "border-destructive/40" : ""}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Calendar className={`w-8 h-8 ${overdueItem ? "text-destructive" : "text-info"}`} />
                      <div>
                        <p className="font-semibold text-foreground">{r.assetLabel}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className={typeColor[r.type]}>{r.type}</Badge>
                          <Badge variant="outline" className={statusColor[r.status]}>{r.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.scheduledDate).toLocaleDateString("pt-BR")} ·
                            {overdueItem ? ` ${Math.abs(days)} dias atrasada` : ` em ${days} dias`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Custo previsto</p>
                      <p className="font-bold text-foreground">R$ {r.cost.toLocaleString("pt-BR")}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          {records.filter(r => r.status === "Agendada" || r.status === "Em andamento").length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              Nenhuma manutenção agendada
            </CardContent></Card>
          )}
        </TabsContent>

        {/* GARANTIAS */}
        <TabsContent value="garantias" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-warning" />
                <div>
                  <p className="text-xs text-muted-foreground">Expirando em até 90 dias</p>
                  <p className="text-2xl font-bold text-foreground">{warrantySummary.warrantyExpiring}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">Garantia expirada</p>
                  <p className="text-2xl font-bold text-foreground">{warrantySummary.warrantyExpired}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Nº Série</TableHead>
                    <TableHead>Compra</TableHead>
                    <TableHead>Fim da garantia</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...assets]
                    .sort((a, b) => new Date(a.warrantyEnd).getTime() - new Date(b.warrantyEnd).getTime())
                    .map(a => {
                      const w = warrantyState(a.warrantyEnd);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.type} {a.brand} {a.model}</TableCell>
                          <TableCell className="font-mono text-xs">{a.serialNumber}</TableCell>
                          <TableCell className="text-xs">{new Date(a.purchaseDate).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-xs">{new Date(a.warrantyEnd).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell><Badge variant="outline" className={w.color}>{w.label}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REGRA DOS 60% */}
        <TabsContent value="regra60" className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                Quando o custo acumulado de manutenção ultrapassa <strong className="text-foreground">60% do valor de compra</strong>,
                o sistema sinaliza que a substituição do ativo passa a ser financeiramente mais vantajosa.
              </p>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {costByAsset.map(({ asset, accumulated, ratio, triggered }) => (
              <Card key={asset.id} className={triggered ? "border-destructive/40" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{asset.type} {asset.brand} {asset.model}</p>
                      <p className="text-xs text-muted-foreground">
                        Compra: R$ {asset.purchaseValue.toLocaleString("pt-BR")} ·
                        Acumulado: R$ {accumulated.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    {triggered ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                        <TrendingUp className="w-3 h-3" /> Substituir
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        OK ({Math.round(ratio)}%)
                      </Badge>
                    )}
                  </div>
                  <Progress value={Math.min(100, ratio)}
                    className={`h-2 ${triggered ? "[&>div]:bg-destructive" : ""}`} />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {Math.round(ratio)}% do valor de compra · gatilho em 60%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <MaintenanceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSave}
        record={editing}
        assets={assets}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir manutenção <strong>{deleteTarget?.id}</strong> de <strong>{deleteTarget?.assetLabel}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
