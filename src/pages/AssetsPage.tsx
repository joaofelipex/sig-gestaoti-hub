import { useState } from "react";
import { type Asset } from "@/data/mock-data";
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
import {
  Monitor, Search, Plus, Cpu, Wrench, DollarSign, FileText, Download, Pencil, Trash2, FileDown,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import AssetForm from "@/components/forms/AssetForm";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/export-csv";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";

interface AtivoRow {
  id: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  status: 'ativo' | 'manutencao' | 'estoque' | 'descartado';
  assigned_to: string | null;
  department_nome: string | null;
  data_aquisicao: string | null;
  warranty_end: string | null;
  valor_aquisicao: number | null;
  vida_util_meses: number | null;
  specs: { cpu?: string; ram?: string; storage?: string } | null;
  maintenance_log: { date: string; description: string; cost: number }[] | null;
}

const statusUiToDb: Record<Asset['status'], AtivoRow['status']> = {
  'Em uso': 'ativo',
  'Estoque': 'estoque',
  'Manutenção': 'manutencao',
  'Aposentado': 'descartado',
};
const statusDbToUi: Record<AtivoRow['status'], Asset['status']> = {
  ativo: 'Em uso',
  estoque: 'Estoque',
  manutencao: 'Manutenção',
  descartado: 'Aposentado',
};

const fromDb = (r: AtivoRow): Asset => ({
  id: r.id,
  type: (r.tipo as Asset['type']) ?? 'Notebook',
  brand: r.marca ?? '',
  model: r.modelo ?? '',
  serialNumber: r.numero_serie ?? '',
  status: statusDbToUi[r.status] ?? 'Estoque',
  assignedTo: r.assigned_to,
  department: r.department_nome ?? '',
  purchaseDate: r.data_aquisicao ?? '',
  warrantyEnd: r.warranty_end ?? '',
  specs: r.specs ?? {},
  purchaseValue: Number(r.valor_aquisicao ?? 0),
  maintenanceLog: r.maintenance_log ?? [],
});

const toDb = (a: Asset, orgId: string) => ({
  id: a.id,
  org_id: orgId,
  tipo: a.type,
  marca: a.brand,
  modelo: a.model,
  numero_serie: a.serialNumber,
  status: statusUiToDb[a.status],
  assigned_to: a.assignedTo,
  department_nome: a.department,
  data_aquisicao: a.purchaseDate || null,
  warranty_end: a.warrantyEnd || null,
  valor_aquisicao: a.purchaseValue,
  specs: a.specs,
  maintenance_log: a.maintenanceLog,
});

const statusColor: Record<Asset['status'], string> = {
  'Em uso': 'bg-success/10 text-success border-success/20',
  'Estoque': 'bg-info/10 text-info border-info/20',
  'Manutenção': 'bg-warning/10 text-warning border-warning/20',
  'Aposentado': 'bg-muted text-muted-foreground border-border',
};

function depreciacao(purchaseValue: number, purchaseDate: string, vidaUtil = 5): number {
  const anos = (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const depAnual = purchaseValue / vidaUtil;
  const valorAtual = Math.max(0, purchaseValue - depAnual * anos);
  return Math.round(valorAtual * 100) / 100;
}

function depreciacaoPercent(purchaseValue: number, purchaseDate: string, vidaUtil = 5): number {
  const atual = depreciacao(purchaseValue, purchaseDate, vidaUtil);
  return Math.round((atual / purchaseValue) * 100);
}

function gerarTermoPDF(asset: Asset) {
  const content = `
TERMO DE RESPONSABILIDADE - EQUIPAMENTO DE TI

Data: ${new Date().toLocaleDateString('pt-BR')}

IDENTIFICAÇÃO DO EQUIPAMENTO
ID: ${asset.id}
Tipo: ${asset.type}
Marca/Modelo: ${asset.brand} ${asset.model}
Número de Série: ${asset.serialNumber}
${asset.specs.cpu ? `CPU: ${asset.specs.cpu}` : ''}
${asset.specs.ram ? `RAM: ${asset.specs.ram}` : ''}
${asset.specs.storage ? `Storage: ${asset.specs.storage}` : ''}

RESPONSÁVEL
Nome: ${asset.assignedTo || 'N/A'}
Departamento: ${asset.department}

VALOR DO EQUIPAMENTO
Valor de Compra: R$ ${asset.purchaseValue.toLocaleString('pt-BR')}
Data de Compra: ${new Date(asset.purchaseDate).toLocaleDateString('pt-BR')}
Valor Atual (Depreciado): R$ ${depreciacao(asset.purchaseValue, asset.purchaseDate).toLocaleString('pt-BR')}

DECLARAÇÃO
Declaro que recebi o equipamento acima descrito em perfeitas condições de uso, 
comprometendo-me a utilizá-lo exclusivamente para fins profissionais, zelando pela 
sua conservação e integridade.

_________________________________
Assinatura do Responsável

_________________________________
Assinatura TI - IMTS
  `.trim();

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Termo_Responsabilidade_${asset.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Termo gerado para ${asset.assignedTo || asset.id}`);
}

export default function AssetsPage() {
  const { items: assetList, save: saveAsset, remove: removeAsset } = useSupabaseCollection<Asset, AtivoRow>(
    "ativos",
    fromDb,
    toDb,
    "Ativos",
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const filtered = assetList.filter(a => {
    const matchSearch = `${a.brand} ${a.model} ${a.serialNumber} ${a.assignedTo || ''}`
      .toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalDepreciated = assetList.reduce((s, a) => s + depreciacao(a.purchaseValue, a.purchaseDate), 0);
  const totalPurchase = assetList.reduce((s, a) => s + a.purchaseValue, 0);

  const handleSave = (asset: Asset) => {
    const exists = assetList.some(a => a.id === asset.id);
    saveAsset(asset);
    toast.success(`Ativo "${asset.brand} ${asset.model}" ${exists ? 'atualizado' : 'cadastrado'}!`);
    setEditingAsset(null);
  };

  const handleDelete = (asset: Asset) => {
    removeAsset(asset);
    setDeleteTarget(null);
    setSelectedAsset(null);
    toast.success(`Ativo "${asset.brand} ${asset.model}" removido.`);
  };

  const openEdit = (asset: Asset, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingAsset(asset);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditingAsset(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Gestão de Ativos</h1>
          <p className="text-muted-foreground text-[13px] mt-1">Ciclo de vida completo do hardware</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="gap-2" onClick={() => {
            exportToCSV('ativos_IMTS', ['ID','Tipo','Marca','Modelo','Serial','Status','Responsável','Valor Compra','Valor Atual'], 
              assetList.map(a => [a.id, a.type, a.brand, a.model, a.serialNumber, a.status, a.assignedTo || '', a.purchaseValue, depreciacao(a.purchaseValue, a.purchaseDate)]));
            toast.success('CSV exportado!');
          }}>
            <FileDown className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button className="gap-2" onClick={openNew}>
            <Plus className="w-4 h-4" /> Novo Ativo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: assetList.length, icon: Monitor, color: 'text-primary' },
          { label: 'Em uso', value: assetList.filter(a => a.status === 'Em uso').length, icon: Cpu, color: 'text-success' },
          { label: 'Manutenção', value: assetList.filter(a => a.status === 'Manutenção').length, icon: Wrench, color: 'text-warning' },
          { label: 'Valor Depreciado', value: `R$ ${totalDepreciated.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-accent' },
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

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-foreground">Depreciação Geral do Patrimônio</span>
            <span className="text-[13px] font-mono text-muted-foreground">
              R$ {totalDepreciated.toLocaleString('pt-BR')} / R$ {totalPurchase.toLocaleString('pt-BR')}
            </span>
          </div>
          <Progress value={totalPurchase > 0 ? Math.round((totalDepreciated / totalPurchase) * 100) : 0} className="h-3" />
          <p className="text-xs text-muted-foreground mt-1">
            {totalPurchase > 0 ? Math.round((totalDepreciated / totalPurchase) * 100) : 0}% do valor original mantido (depreciação linear, vida útil 5 anos)
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por marca, modelo, serial..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Em uso">Em uso</SelectItem>
            <SelectItem value="Estoque">Estoque</SelectItem>
            <SelectItem value="Manutenção">Manutenção</SelectItem>
            <SelectItem value="Aposentado">Aposentado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Nº Série</TableHead>
                <TableHead>Data Compra</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Depreciação</TableHead>
                <TableHead className="text-right">Valor Atual</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(asset => {
                const depPct = depreciacaoPercent(asset.purchaseValue, asset.purchaseDate);
                return (
                  <TableRow key={asset.id} className="cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                    <TableCell className="font-mono text-xs">{asset.id}</TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell className="font-medium">{asset.brand} {asset.model}</TableCell>
                    <TableCell className="font-mono text-xs">{asset.serialNumber}</TableCell>
                    <TableCell className="text-xs">{new Date(asset.purchaseDate).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{asset.assignedTo || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor[asset.status]}>{asset.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={depPct} className="h-1.5 flex-1" />
                        <span className="text-xs font-mono text-muted-foreground w-8">{depPct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      R$ {depreciacao(asset.purchaseValue, asset.purchaseDate).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => openEdit(asset, e)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); gerarTermoPDF(asset); }} title="Termo">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(asset); }} title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-lg">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAsset.brand} {selectedAsset.model}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{selectedAsset.id}</span></div>
                  <div><span className="text-muted-foreground">Serial:</span> <span className="font-mono">{selectedAsset.serialNumber}</span></div>
                  <div><span className="text-muted-foreground">Tipo:</span> {selectedAsset.type}</div>
                  <div><span className="text-muted-foreground">Departamento:</span> {selectedAsset.department}</div>
                  <div><span className="text-muted-foreground">Responsável:</span> {selectedAsset.assignedTo || '—'}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={statusColor[selectedAsset.status]}>{selectedAsset.status}</Badge></div>
                </div>
                {selectedAsset.specs.cpu && (
                  <div>
                    <p className="font-semibold text-foreground mb-2">Especificações</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {selectedAsset.specs.cpu && <div className="p-2 bg-secondary rounded-lg"><span className="text-muted-foreground">CPU</span><br/>{selectedAsset.specs.cpu}</div>}
                      {selectedAsset.specs.ram && <div className="p-2 bg-secondary rounded-lg"><span className="text-muted-foreground">RAM</span><br/>{selectedAsset.specs.ram}</div>}
                      {selectedAsset.specs.storage && <div className="p-2 bg-secondary rounded-lg"><span className="text-muted-foreground">Storage</span><br/>{selectedAsset.specs.storage}</div>}
                    </div>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground mb-2">Financeiro & Depreciação</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-secondary rounded-lg"><span className="text-muted-foreground">Valor Compra</span><br/>R$ {selectedAsset.purchaseValue.toLocaleString('pt-BR')}</div>
                    <div className="p-2 bg-secondary rounded-lg"><span className="text-muted-foreground">Valor Atual</span><br/>R$ {depreciacao(selectedAsset.purchaseValue, selectedAsset.purchaseDate).toLocaleString('pt-BR')}</div>
                    <div className="p-2 bg-secondary rounded-lg"><span className="text-muted-foreground">Depreciação</span><br/>{depreciacaoPercent(selectedAsset.purchaseValue, selectedAsset.purchaseDate)}% mantido</div>
                  </div>
                  <div className="mt-2">
                    <Progress value={depreciacaoPercent(selectedAsset.purchaseValue, selectedAsset.purchaseDate)} className="h-2" />
                  </div>
                </div>
                {selectedAsset.maintenanceLog.length > 0 && (
                  <div>
                    <p className="font-semibold text-foreground mb-2">Histórico de Manutenção</p>
                    <div className="space-y-2">
                      {selectedAsset.maintenanceLog.map((log, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs p-2 bg-secondary rounded-lg">
                          <Wrench className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1">{log.description}</span>
                          <span className="text-muted-foreground">{new Date(log.date).toLocaleDateString('pt-BR')}</span>
                          {log.cost > 0 && <span className="font-mono">R$ {log.cost}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" variant="outline" onClick={() => gerarTermoPDF(selectedAsset)}>
                    <FileText className="w-4 h-4" /> Gerar Termo
                  </Button>
                  <Button className="flex-1 gap-2" onClick={() => { setSelectedAsset(null); openEdit(selectedAsset); }}>
                    <Pencil className="w-4 h-4" /> Editar
                  </Button>
                  <Button className="gap-2" variant="destructive" onClick={() => { setSelectedAsset(null); setDeleteTarget(selectedAsset); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o ativo <strong>{deleteTarget?.brand} {deleteTarget?.model}</strong> ({deleteTarget?.id})? Esta ação não pode ser desfeita.
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

      <AssetForm open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} asset={editingAsset} />
    </div>
  );
}
