import { useState } from "react";
import { assets, type Asset } from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Monitor, Search, Plus, Cpu, HardDrive, Wrench, DollarSign,
} from "lucide-react";

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

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const filtered = assets.filter(a => {
    const matchSearch = `${a.brand} ${a.model} ${a.serialNumber} ${a.assignedTo || ''}`
      .toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Ativos</h1>
          <p className="text-muted-foreground text-sm mt-1">Ciclo de vida completo do hardware</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Novo Ativo
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: assets.length, icon: Monitor, color: 'text-primary' },
          { label: 'Em uso', value: assets.filter(a => a.status === 'Em uso').length, icon: Cpu, color: 'text-success' },
          { label: 'Manutenção', value: assets.filter(a => a.status === 'Manutenção').length, icon: Wrench, color: 'text-warning' },
          { label: 'Valor Depreciado', value: `R$ ${assets.reduce((s, a) => s + depreciacao(a.purchaseValue, a.purchaseDate), 0).toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-accent' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`w-8 h-8 ${c.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-bold text-foreground">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por marca, modelo, serial..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Em uso">Em uso</SelectItem>
            <SelectItem value="Estoque">Estoque</SelectItem>
            <SelectItem value="Manutenção">Manutenção</SelectItem>
            <SelectItem value="Aposentado">Aposentado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Nº Série</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Garantia</TableHead>
                <TableHead className="text-right">Valor Atual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(asset => (
                <TableRow
                  key={asset.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <TableCell className="font-mono text-xs">{asset.id}</TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell className="font-medium">{asset.brand} {asset.model}</TableCell>
                  <TableCell className="font-mono text-xs">{asset.serialNumber}</TableCell>
                  <TableCell>{asset.assignedTo || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor[asset.status]}>{asset.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(asset.warrantyEnd) < new Date() ? (
                      <span className="text-destructive">Expirada</span>
                    ) : (
                      new Date(asset.warrantyEnd).toLocaleDateString('pt-BR')
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    R$ {depreciacao(asset.purchaseValue, asset.purchaseDate).toLocaleString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
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
                  <p className="font-semibold text-foreground mb-2">Financeiro</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-secondary rounded-lg"><span className="text-muted-foreground">Valor Compra</span><br/>R$ {selectedAsset.purchaseValue.toLocaleString('pt-BR')}</div>
                    <div className="p-2 bg-secondary rounded-lg"><span className="text-muted-foreground">Valor Atual</span><br/>R$ {depreciacao(selectedAsset.purchaseValue, selectedAsset.purchaseDate).toLocaleString('pt-BR')}</div>
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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
