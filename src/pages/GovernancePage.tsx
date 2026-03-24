import { useState } from "react";
import { accessRecords as initialRecords, type AccessRecord } from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Key, Server, FileText, Users, Plus } from "lucide-react";
import AccessForm from "@/components/forms/AccessForm";

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
  const [recordList, setRecordList] = useState<AccessRecord[]>(initialRecords);
  const [formOpen, setFormOpen] = useState(false);

  const handleSave = (record: AccessRecord) => {
    setRecordList(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = record; return copy; }
      return [...prev, record];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Governança & Segurança</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de acessos, DR e credenciais</p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" /> Novo Acesso
        </Button>
      </div>

      <Tabs defaultValue="acessos">
        <TabsList>
          <TabsTrigger value="acessos" className="gap-2"><Users className="w-4 h-4" />Matriz de Acessos</TabsTrigger>
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

      <AccessForm open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} />
    </div>
  );
}
