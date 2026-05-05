import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeftRight, Search, Plus, FileDown, FileText, Pencil, Trash2,
  ArrowRight, Recycle, DollarSign, Heart, Wrench, History, Clock,
} from "lucide-react";
import MovementForm from "@/components/forms/MovementForm";
import { type AssetMovement, type MovementType } from "@/lib/movement-data";
import { type Asset } from "@/data/mock-data";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";
import { exportToCSV } from "@/lib/export-csv";
import { toast } from "sonner";

// Asset mappers (read-only here)
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

// Movement mappers
interface MovRow {
  id: string; ativo_id: string; ativo_label: string | null; tipo: string;
  data: string; from_user: string | null; from_department: string | null;
  to_user: string | null; to_department: string | null; reason: string | null;
  responsible: string | null; value: number | null; recipient: string | null;
  term_generated: boolean | null; notes: string | null;
}
const movFromDb = (r: MovRow): AssetMovement => ({
  id: r.id, assetId: r.ativo_id, assetLabel: r.ativo_label ?? '',
  type: r.tipo as MovementType, date: r.data,
  fromUser: r.from_user ?? undefined, fromDepartment: r.from_department ?? undefined,
  toUser: r.to_user ?? undefined, toDepartment: r.to_department ?? undefined,
  reason: r.reason ?? '', responsible: r.responsible ?? '',
  value: r.value ?? undefined, recipient: r.recipient ?? undefined,
  termGenerated: r.term_generated ?? undefined, notes: r.notes ?? undefined,
});
const movToDb = (m: AssetMovement, orgId: string) => ({
  id: m.id, org_id: orgId, ativo_id: m.assetId, ativo_label: m.assetLabel,
  tipo: m.type, data: m.date,
  from_user: m.fromUser ?? null, from_department: m.fromDepartment ?? null,
  to_user: m.toUser ?? null, to_department: m.toDepartment ?? null,
  reason: m.reason, responsible: m.responsible,
  value: m.value ?? 0, recipient: m.recipient ?? null,
  term_generated: m.termGenerated ?? false, notes: m.notes ?? null,
});

const typeColor: Record<MovementType, string> = {
  "Transferência": "bg-info/10 text-info border-info/20",
  "Devolução": "bg-warning/10 text-warning border-warning/20",
  "Atribuição inicial": "bg-success/10 text-success border-success/20",
  "Envio para manutenção": "bg-warning/10 text-warning border-warning/20",
  "Retorno de manutenção": "bg-success/10 text-success border-success/20",
  "Descarte": "bg-destructive/10 text-destructive border-destructive/20",
  "Venda": "bg-accent/10 text-accent border-accent/20",
  "Doação": "bg-primary/10 text-primary border-primary/20",
};

const typeIcon: Record<MovementType, typeof ArrowRight> = {
  "Transferência": ArrowRight,
  "Devolução": ArrowLeftRight,
  "Atribuição inicial": ArrowRight,
  "Envio para manutenção": Wrench,
  "Retorno de manutenção": Wrench,
  "Descarte": Recycle,
  "Venda": DollarSign,
  "Doação": Heart,
};

function gerarTermoTransferencia(m: AssetMovement) {
  const content = `
TERMO DE TRANSFERÊNCIA / MOVIMENTAÇÃO DE EQUIPAMENTO

ID Movimentação: ${m.id}
Data: ${new Date(m.date).toLocaleDateString("pt-BR")}
Tipo: ${m.type}

EQUIPAMENTO
ID: ${m.assetId}
Descrição: ${m.assetLabel}

ORIGEM
Usuário: ${m.fromUser || "—"}
Setor: ${m.fromDepartment || "—"}

DESTINO
Usuário: ${m.toUser || m.recipient || "—"}
Setor: ${m.toDepartment || "—"}
${m.value ? `Valor da venda: R$ ${m.value.toLocaleString("pt-BR")}` : ""}

MOTIVO
${m.reason}

${m.notes ? `OBSERVAÇÕES\n${m.notes}` : ""}

Responsável TI: ${m.responsible}

____________________________
Assinatura origem

____________________________
Assinatura destino

____________________________
Assinatura TI - IMTS
  `.trim();
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Termo_${m.type}_${m.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Termo gerado");
}

export default function MovementsPage() {
  const { items: assetsList } = useSupabaseCollection<Asset, AtivoRow>(
    "ativos", assetFromDb, () => ({}) as never, "Ativos",
  );
  const { items: movements, save, remove } = useSupabaseCollection<AssetMovement, MovRow>(
    "movimentacoes", movFromDb, movToDb, "Movimentações",
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssetMovement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssetMovement | null>(null);
  const [timelineAsset, setTimelineAsset] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [movements],
  );

  const filtered = sorted.filter(m => {
    const s = `${m.assetId} ${m.assetLabel} ${m.fromUser || ""} ${m.toUser || ""} ${m.reason}`.toLowerCase();
    const matchSearch = s.includes(search.toLowerCase());
    const matchType = typeFilter === "all" || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalSales = movements.filter(m => m.type === "Venda").reduce((s, m) => s + (m.value || 0), 0);
  const monthMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const lastMonth = movements.filter(m => new Date(m.date).getTime() >= monthMs).length;

  const timeline = timelineAsset
    ? sorted.filter(m => m.assetId === timelineAsset)
    : [];
  const timelineAssetData = assetsList.find(a => a.id === timelineAsset);

  const handleSave = (m: AssetMovement) => {
    save(m);
    toast.success(`${m.type} registrada`);
    setEditing(null);
  };

  const handleDelete = (m: AssetMovement) => {
    remove(m);
    setDeleteTarget(null);
    toast.success("Movimentação removida");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Movimentação de Ativos</h1>
          <p className="text-muted-foreground text-[13px] mt-1">Transferências, devoluções, descartes e timeline de vida</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => {
            exportToCSV("movimentacoes_IMTS",
              ["ID", "Data", "Tipo", "Ativo", "De", "Para", "Motivo", "Responsável", "Valor"],
              movements.map(m => [m.id, m.date, m.type, m.assetLabel,
                `${m.fromUser || ""} ${m.fromDepartment ? `(${m.fromDepartment})` : ""}`.trim(),
                `${m.toUser || m.recipient || ""} ${m.toDepartment ? `(${m.toDepartment})` : ""}`.trim(),
                m.reason, m.responsible, m.value || ""]));
            toast.success("CSV exportado");
          }}>
            <FileDown className="w-4 h-4" /> Exportar
          </Button>
          <Button className="gap-2" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4" /> Nova Movimentação
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total registros", value: movements.length, icon: ArrowLeftRight, color: "text-primary" },
          { label: "Últimos 30 dias", value: lastMonth, icon: Clock, color: "text-info" },
          { label: "Descartes/Vendas/Doações", value: movements.filter(m => ["Descarte","Venda","Doação"].includes(m.type)).length, icon: Recycle, color: "text-warning" },
          { label: "Receita por vendas", value: `R$ ${totalSales.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-accent" },
        ].map(c => (
          <Card key={c.label} className="shadow-sm">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-[12px] font-medium text-muted-foreground">{c.label}</p>
                <p className="text-[18px] font-semibold text-foreground">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas Movimentações</TabsTrigger>
          <TabsTrigger value="timeline">Timeline por Ativo</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-3">
          <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm sm:flex-row">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar ativo, usuário, motivo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.keys(typeColor).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(m => {
                    const Icon = typeIcon[m.type];
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{new Date(m.date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeColor[m.type]}>
                            <Icon className="w-3 h-3 mr-1" />{m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <button className="text-left hover:text-primary" onClick={() => setTimelineAsset(m.assetId)}>
                            {m.assetLabel} <span className="text-xs text-muted-foreground">({m.assetId})</span>
                          </button>
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.fromUser || "—"}
                          {m.fromDepartment && <div className="text-muted-foreground">{m.fromDepartment}</div>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.toUser || m.recipient || "—"}
                          {m.toDepartment && <div className="text-muted-foreground">{m.toDepartment}</div>}
                        </TableCell>
                        <TableCell className="text-xs max-w-xs truncate">{m.reason}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {m.value ? `R$ ${m.value.toLocaleString("pt-BR")}` : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Termo" onClick={() => gerarTermoTransferencia(m)}>
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => { setEditing(m); setFormOpen(true); }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir" onClick={() => setDeleteTarget(m)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma movimentação encontrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-3 mt-3">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Label>Selecione um ativo para ver a linha do tempo:</Label>
              <Select value={timelineAsset || ""} onValueChange={setTimelineAsset}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Escolher ativo" /></SelectTrigger>
                <SelectContent>
                  {assetsList.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.id} — {a.brand} {a.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {timelineAsset && (
            <Card className="shadow-sm">
              <CardContent className="p-5">
                {timelineAssetData && (
                  <div className="mb-5 pb-4 border-b border-border">
                    <h3 className="text-lg font-semibold">{timelineAssetData.brand} {timelineAssetData.model}</h3>
                    <p className="text-sm text-muted-foreground">
                      {timelineAssetData.id} · Serial {timelineAssetData.serialNumber} · Compra {new Date(timelineAssetData.purchaseDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação registrada para este ativo.</p>
                ) : (
                  <div className="relative pl-6 space-y-5 border-l-2 border-border">
                    {timeline.map(m => {
                      const Icon = typeIcon[m.type];
                      return (
                        <div key={m.id} className="relative">
                          <div className="absolute -left-[31px] h-6 w-6 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                            <Icon className="w-3 h-3 text-primary" />
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={typeColor[m.type]}>{m.type}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString("pt-BR")}</span>
                          </div>
                          <p className="text-sm font-medium">{m.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {m.fromUser && <>De <strong>{m.fromUser}</strong>{m.fromDepartment && ` (${m.fromDepartment})`} </>}
                            {(m.toUser || m.recipient) && <>→ <strong>{m.toUser || m.recipient}</strong>{m.toDepartment && ` (${m.toDepartment})`}</>}
                            {m.value && <> · R$ {m.value.toLocaleString("pt-BR")}</>}
                          </p>
                          {m.notes && <p className="text-xs text-muted-foreground mt-1 italic">{m.notes}</p>}
                          <p className="text-[11px] text-muted-foreground mt-1">Responsável: {m.responsible}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <MovementForm open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} movement={editing} assets={assetsList} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro <strong>{deleteTarget?.id}</strong> será removido.
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
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium text-foreground">{children}</p>;
}
