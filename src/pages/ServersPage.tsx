import { useState, useMemo, Fragment } from "react";
import { servers as initialServers, type Server } from "@/data/servers-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  Server as ServerIcon, Search, Plus, Cloud, DollarSign, Activity,
  AlertTriangle, Shield, HardDrive, Cpu, MemoryStick, Globe, Clock,
  ExternalLink, ChevronDown, ChevronUp, Pencil, Trash2,
} from "lucide-react";
import ServerForm from "@/components/forms/ServerForm";
import { toast } from "sonner";

const statusConfig: Record<Server['status'], { class: string; dot: string }> = {
  'Online': { class: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  'Offline': { class: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
  'Manutenção': { class: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  'Degradado': { class: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
};

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function backupAge(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [search, setSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null);

  const filtered = useMemo(() => {
    return servers.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.purpose.toLowerCase().includes(search.toLowerCase()) ||
        s.provider.toLowerCase().includes(search.toLowerCase());
      const matchProvider = filterProvider === "all" || s.provider === filterProvider;
      const matchStatus = filterStatus === "all" || s.status === filterStatus;
      return matchSearch && matchProvider && matchStatus;
    });
  }, [servers, search, filterProvider, filterStatus]);

  const stats = useMemo(() => {
    const online = servers.filter(s => s.status === 'Online').length;
    const totalCost = servers.reduce((s, sv) => s + sv.monthlyCost, 0);
    const activeServers = servers.filter(s => s.status !== 'Manutenção');
    const avgUptime = activeServers.length > 0
      ? activeServers.reduce((s, sv) => s + sv.uptime, 0) / activeServers.length
      : 0;
    const alerts = servers.filter(s => {
      const contractDays = daysUntil(s.contractEnd);
      const bAge = backupAge(s.lastBackup);
      return s.status === 'Degradado' || s.status === 'Offline' || contractDays < 30 || bAge > 3;
    }).length;
    return { online, total: servers.length, totalCost, avgUptime, alerts };
  }, [servers]);

  const providers = [...new Set(servers.map(s => s.provider))];

  const handleSave = (server: Server) => {
    setServers(prev => {
      const idx = prev.findIndex(s => s.id === server.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = server;
        toast.success(`Servidor "${server.name}" atualizado!`);
        return copy;
      }
      toast.success(`Servidor "${server.name}" cadastrado!`);
      return [...prev, server];
    });
    setDialogOpen(false);
    setEditingServer(null);
  };

  const handleDelete = (server: Server) => {
    setServers(prev => prev.filter(s => s.id !== server.id));
    setDeleteTarget(null);
    toast.success(`Servidor "${server.name}" removido.`);
  };

  const openEdit = (server: Server, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingServer(server);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingServer(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ServerIcon className="w-7 h-7 text-primary" />
            Servidores & Infraestrutura
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle centralizado dos servidores externos da IMTS
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Servidor
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-success/10">
              <Activity className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Online</p>
              <p className="text-xl font-bold text-foreground">{stats.online}/{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Cloud className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Provedores</p>
              <p className="text-xl font-bold text-foreground">{providers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-accent/10">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custo Mensal</p>
              <p className="text-xl font-bold text-foreground">R$ {stats.totalCost.toLocaleString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-info/10">
              <Shield className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Uptime Médio</p>
              <p className="text-xl font-bold text-foreground">{stats.avgUptime.toFixed(2)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alertas</p>
              <p className="text-xl font-bold text-foreground">{stats.alerts}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, finalidade ou provedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterProvider} onValueChange={setFilterProvider}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Provedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Provedores</SelectItem>
              {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {['Online', 'Offline', 'Manutenção', 'Degradado'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Server Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Servidor</TableHead>
                <TableHead>Provedor / Tipo</TableHead>
                <TableHead>Recursos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead className="text-right">Custo/mês</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(srv => {
                const isExpanded = expandedId === srv.id;
                const contractDays = daysUntil(srv.contractEnd);
                const bAge = backupAge(srv.lastBackup);
                const cfg = statusConfig[srv.status];

                return (
                  <Fragment key={srv.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(isExpanded ? null : srv.id)}
                    >
                      <TableCell>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground font-mono text-xs">{srv.name}</p>
                          <p className="text-xs text-muted-foreground">{srv.purpose}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{srv.provider}</p>
                          <p className="text-xs text-muted-foreground">{srv.type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Cpu className="w-3 h-3" /> {srv.cpu.split(' ')[0]}
                          <MemoryStick className="w-3 h-3 ml-1" /> {srv.ram}
                          <HardDrive className="w-3 h-3 ml-1" /> {srv.storage.split(' ')[0]}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.class}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`} />
                          {srv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <Progress value={srv.uptime} className="h-1.5 flex-1" />
                          <span className="text-xs font-mono text-muted-foreground">{srv.uptime}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        R$ {srv.monthlyCost.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {contractDays < 0 ? (
                          <Badge variant="destructive" className="text-xs">Expirado</Badge>
                        ) : contractDays < 30 ? (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                            {contractDays}d
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{new Date(srv.contractEnd).toLocaleDateString('pt-BR')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => openEdit(srv, e)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(srv); }} title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded details */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/30 p-0">
                          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Infraestrutura</h4>
                              <div className="space-y-1.5 text-sm">
                                <p><span className="text-muted-foreground">IP:</span> <span className="font-mono text-foreground">{srv.ip}</span></p>
                                <p><span className="text-muted-foreground">SO:</span> <span className="text-foreground">{srv.os}</span></p>
                                <p><span className="text-muted-foreground">Região:</span> <span className="text-foreground">{srv.region}</span></p>
                                <p><span className="text-muted-foreground">CPU:</span> <span className="text-foreground">{srv.cpu}</span></p>
                                <p><span className="text-muted-foreground">RAM:</span> <span className="text-foreground">{srv.ram}</span></p>
                                <p><span className="text-muted-foreground">Armazenamento:</span> <span className="text-foreground">{srv.storage}</span></p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segurança & Backup</h4>
                              <div className="space-y-1.5 text-sm">
                                <p className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">Último Backup:</span>
                                  <span className={bAge > 3 ? 'text-destructive font-medium' : 'text-foreground'}>
                                    {new Date(srv.lastBackup).toLocaleDateString('pt-BR')}
                                    {bAge > 3 && ` (${bAge} dias atrás ⚠)`}
                                  </span>
                                </p>
                                {srv.sslExpiration && (
                                  <p className="flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">SSL Expira:</span>
                                    <span className={daysUntil(srv.sslExpiration) < 30 ? 'text-warning font-medium' : 'text-foreground'}>
                                      {new Date(srv.sslExpiration).toLocaleDateString('pt-BR')}
                                    </span>
                                  </p>
                                )}
                                <p>
                                  <span className="text-muted-foreground">Equipe:</span>{' '}
                                  <Badge variant="secondary" className="text-xs">{srv.responsibleTeam}</Badge>
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contrato & Custos</h4>
                              <div className="space-y-1.5 text-sm">
                                <p><span className="text-muted-foreground">Custo Mensal:</span> <span className="font-semibold text-foreground">R$ {srv.monthlyCost.toLocaleString('pt-BR')}</span></p>
                                <p><span className="text-muted-foreground">Custo Anual:</span> <span className="text-foreground">R$ {(srv.monthlyCost * 12).toLocaleString('pt-BR')}</span></p>
                                <p><span className="text-muted-foreground">Fim Contrato:</span> <span className={contractDays < 30 ? 'text-warning font-medium' : 'text-foreground'}>{new Date(srv.contractEnd).toLocaleDateString('pt-BR')}</span></p>
                                {srv.monitoringUrl && (
                                  <a href={srv.monitoringUrl} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-1">
                                    <ExternalLink className="w-3 h-3" /> Abrir Monitoramento
                                  </a>
                                )}
                              </div>
                              {srv.notes && (
                                <div className="mt-2 p-2.5 rounded-md bg-warning/5 border border-warning/20">
                                  <p className="text-xs text-warning font-medium">📝 {srv.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingServer(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingServer ? 'Editar Servidor' : 'Cadastrar Novo Servidor'}</DialogTitle>
          </DialogHeader>
          <ServerForm onSubmit={handleSave} initialData={editingServer} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o servidor <strong>{deleteTarget?.name}</strong> ({deleteTarget?.provider})? Esta ação não pode ser desfeita.
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
