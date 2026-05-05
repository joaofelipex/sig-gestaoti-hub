import { useState } from "react";
import { type AccessRecord } from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Key, Server, FileText, Users, Plus, Pencil, Trash2 } from "lucide-react";
import AccessForm from "@/components/forms/AccessForm";
import { toast } from "sonner";
import { risks, sigUsers, type FinancialContract } from "@/lib/it-governance-data";
import { useAuditLog } from "@/hooks/use-persistent-collection";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";
import ContractForm from "@/components/forms/ContractForm";

interface AccessRow {
  id: string; usuario_id: string | null; user_label: string | null;
  recurso: string | null; recurso_tipo: string | null; nivel_acesso: string | null;
  data_concessao: string; ultimo_acesso: string | null; ativo: boolean;
}
const accessFromDb = (r: AccessRow): AccessRecord => ({
  id: r.id,
  user: r.user_label ?? '',
  resource: r.recurso ?? '',
  resourceType: (r.recurso_tipo as AccessRecord['resourceType']) ?? 'Aplicação',
  accessLevel: (r.nivel_acesso as AccessRecord['accessLevel']) ?? 'Leitura',
  grantedDate: r.data_concessao,
  lastAccess: r.ultimo_acesso ?? r.data_concessao,
});
const accessToDb = (a: AccessRecord, orgId: string) => ({
  id: a.id, org_id: orgId, usuario_id: null,
  user_label: a.user, recurso: a.resource, recurso_tipo: a.resourceType,
  sistema: a.resource, nivel_acesso: a.accessLevel,
  data_concessao: a.grantedDate, ultimo_acesso: a.lastAccess, ativo: true,
});

interface ContractRow {
  id: string; supplier: string; object: string; type: string;
  cost_center: string | null; monthly_cost: number; end_date: string | null; status: string;
}
const contractFromDb = (r: ContractRow): FinancialContract => ({
  id: r.id, supplier: r.supplier, object: r.object,
  type: (r.type as FinancialContract['type']) ?? 'OPEX',
  costCenter: r.cost_center ?? '', monthlyCost: Number(r.monthly_cost),
  endDate: r.end_date ?? '', status: (r.status as FinancialContract['status']) ?? 'Ativo',
});
const contractToDb = (c: FinancialContract, orgId: string) => ({
  id: c.id, org_id: orgId, supplier: c.supplier, object: c.object,
  type: c.type, cost_center: c.costCenter, monthly_cost: c.monthlyCost,
  end_date: c.endDate || null, status: c.status,
});

const accessBadge: Record<string, string> = {
  Admin: 'bg-destructive/10 text-destructive border-destructive/20',
  Escrita: 'bg-warning/10 text-warning border-warning/20',
  Leitura: 'bg-success/10 text-success border-success/20',
};

const typeBadge: Record<string, string> = {
  VPN: 'bg-primary/10 text-primary border-primary/20',
  Servidor: 'bg-accent/10 text-accent border-accent/20',
  'Banco de Dados': 'bg-warning/10 text-warning border-warning/20',
  Aplicação: 'bg-info/10 text-info border-info/20',
  Storage: 'bg-success/10 text-success border-success/20',
};

export default function GovernancePage() {
  const { items: recordList, save: saveRecord, remove: removeRecord } = useSupabaseCollection<AccessRecord, AccessRow>(
    "registros_acesso", accessFromDb, accessToDb, "Acessos",
  );
  const { items: contractList, save: saveContract, remove: removeContract } = useSupabaseCollection<FinancialContract, ContractRow>(
    "contratos", contractFromDb, contractToDb, "Contratos",
  );
  const auditLog = useAuditLog();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccessRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccessRecord | null>(null);
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<FinancialContract | null>(null);
  const [contractDeleteTarget, setContractDeleteTarget] = useState<FinancialContract | null>(null);

  const handleSave = (record: AccessRecord) => {
    const exists = recordList.some(r => r.id === record.id);
    saveRecord(record);
    toast.success(`Acesso de "${record.user}" ${exists ? 'atualizado' : 'cadastrado'}!`);
    setEditingRecord(null);
  };

  const handleDelete = (record: AccessRecord) => {
    removeRecord(record);
    setDeleteTarget(null);
    toast.success(`Acesso de "${record.user}" ao "${record.resource}" removido.`);
  };

  const handleContractSave = (contract: FinancialContract) => {
    const exists = contractList.some(c => c.id === contract.id);
    saveContract(contract);
    toast.success(`Contrato "${contract.object}" ${exists ? 'atualizado' : 'cadastrado'}!`);
    setEditingContract(null);
  };

  const handleContractDelete = (contract: FinancialContract) => {
    removeContract(contract);
    setContractDeleteTarget(null);
    toast.success(`Contrato "${contract.object}" excluído.`);
  };

  const openEdit = (record: AccessRecord) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Governança & Segurança</h1>
          <p className="text-muted-foreground text-[13px] mt-1">Controle de acessos, contratos, riscos, auditoria e permissões SIG</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="gap-2" onClick={() => { setEditingContract(null); setContractFormOpen(true); }}>
            <Plus className="w-4 h-4" /> Novo Contrato
          </Button>
          <Button className="gap-2" onClick={openNew}>
            <Plus className="w-4 h-4" /> Novo Acesso
          </Button>
        </div>
      </div>

      <Tabs defaultValue="acessos">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="acessos" className="gap-2"><Users className="w-4 h-4" />Matriz de Acessos</TabsTrigger>
          <TabsTrigger value="sig" className="gap-2"><ShieldCheck className="w-4 h-4" />SIG</TabsTrigger>
          <TabsTrigger value="contratos" className="gap-2"><FileText className="w-4 h-4" />Contratos</TabsTrigger>
          <TabsTrigger value="riscos" className="gap-2"><ShieldCheck className="w-4 h-4" />Riscos</TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-2"><FileText className="w-4 h-4" />Auditoria</TabsTrigger>
          <TabsTrigger value="dr" className="gap-2"><Server className="w-4 h-4" />Disaster Recovery</TabsTrigger>
          <TabsTrigger value="credenciais" className="gap-2"><Key className="w-4 h-4" />Credenciais</TabsTrigger>
        </TabsList>

        <TabsContent value="acessos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Concedido em</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordList.map(rec => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">{rec.user}</TableCell>
                      <TableCell>{rec.resource}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeBadge[rec.resourceType]}>{rec.resourceType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={accessBadge[rec.accessLevel]}>{rec.accessLevel}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(rec.grantedDate).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(rec.lastAccess).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rec)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(rec)} title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sig" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Usuários, setores e centros de custo herdados do SIG</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Centro de custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sigUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell><Badge variant="outline">{user.costCenter}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contratos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Centro de custo</TableHead>
                    <TableHead>Custo/mês</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractList.map(contract => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.supplier}</TableCell>
                      <TableCell>{contract.object}</TableCell>
                      <TableCell><Badge variant="outline">{contract.type}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{contract.costCenter}</TableCell>
                      <TableCell className="font-mono text-xs">R$ {contract.monthlyCost.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-xs">{new Date(contract.endDate).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingContract(contract); setContractFormOpen(true); }} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setContractDeleteTarget(contract)} title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="riscos" className="mt-4 grid gap-3 md:grid-cols-3">
          {risks.map(risk => (
            <Card key={risk.id}>
              <CardContent className="p-4">
                <Badge variant="outline" className={risk.severity === "Alta" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20"}>{risk.severity}</Badge>
                <p className="mt-3 font-semibold text-foreground">{risk.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">Responsável: {risk.owner}</p>
                <p className="mt-3 text-sm text-foreground">{risk.mitigation}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="auditoria" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Data/hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma ação registrada nesta sessão.</TableCell></TableRow>
                  ) : auditLog.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell><Badge variant="outline">{entry.action}</Badge></TableCell>
                      <TableCell>{entry.entity}</TableCell>
                      <TableCell className="font-medium">{entry.recordLabel}</TableCell>
                      <TableCell>{entry.actor}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(entry.at).toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dr" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Plano de Disaster Recovery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { title: 'Backup Diário - PostgreSQL', desc: 'pg_dump automático via cron às 02:00 UTC, retenção de 30 dias no S3.', status: 'Ativo', rto: '4h', rpo: '24h' },
                { title: 'Backup Semanal - Arquivos', desc: 'Sincronização rsync do storage para bucket S3 com versionamento.', status: 'Ativo', rto: '8h', rpo: '7d' },
                { title: 'Redundância DNS', desc: 'DNS primário Cloudflare, secundário Route53, failover automático.', status: 'Ativo', rto: '5min', rpo: 'N/A' },
                { title: 'Replica Read-Only', desc: 'RDS Multi-AZ com réplica de leitura em sa-east-1b.', status: 'Planejado', rto: '1h', rpo: '1min' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                    <Badge variant="outline" className={item.status === 'Ativo' ? 'bg-success/10 text-success border-success/20' : 'bg-info/10 text-info border-info/20'}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs mt-2">
                    <span className="text-muted-foreground">RTO: <span className="font-semibold text-foreground">{item.rto}</span></span>
                    <span className="text-muted-foreground">RPO: <span className="font-semibold text-foreground">{item.rpo}</span></span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credenciais" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Key className="w-5 h-5 text-accent" />
                Gestão de Credenciais Críticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Cofre</TableHead>
                    <TableHead>Última Rotação</TableHead>
                    <TableHead>Política</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { service: 'AWS Root Account', responsible: 'CTO', vault: '1Password', lastRotation: '2025-01-15', policy: '90 dias' },
                    { service: 'Cloudflare API', responsible: 'DevOps Lead', vault: '1Password', lastRotation: '2025-02-20', policy: '60 dias' },
                    { service: 'BD Produção (master)', responsible: 'DBA', vault: 'AWS Secrets Manager', lastRotation: '2025-03-01', policy: '30 dias' },
                    { service: 'Google Workspace Admin', responsible: 'IT Manager', vault: '1Password', lastRotation: '2024-12-10', policy: '90 dias' },
                    { service: 'Registro.br', responsible: 'IT Manager', vault: '1Password', lastRotation: '2025-01-05', policy: 'Anual' },
                  ].map((cred, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{cred.service}</TableCell>
                      <TableCell>{cred.responsible}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">{cred.vault}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(cred.lastRotation).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-xs">{cred.policy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar o acesso de <strong>{deleteTarget?.user}</strong> ao recurso <strong>{deleteTarget?.resource}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!contractDeleteTarget} onOpenChange={() => setContractDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contrato <strong>{contractDeleteTarget?.object}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => contractDeleteTarget && handleContractDelete(contractDeleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AccessForm open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} record={editingRecord} />
      <ContractForm open={contractFormOpen} onOpenChange={setContractFormOpen} onSave={handleContractSave} contract={editingContract} />
    </div>
  );
}
