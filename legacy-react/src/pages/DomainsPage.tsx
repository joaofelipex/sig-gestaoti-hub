import { useState, useRef } from "react";
import type { Domain } from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Globe, ShieldCheck, AlertTriangle, ExternalLink, Plus, Server, Database, UserCheck, Pencil, Trash2, Loader2, Upload, FileDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import DomainForm from "@/components/forms/DomainForm";
import DnsRecordsManager from "@/components/DnsRecordsManager";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/export-csv";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";

interface DomainRow {
  id: string;
  nome: string;
  registrar: string | null;
  dns_provider: string | null;
  hosting_provider: string | null;
  data_vencimento: string | null;
  ssl_vencimento: string | null;
  custo_renovacao: number | null;
  auto_renovacao: boolean;
  status: string;
}

const fromDb = (r: DomainRow): Domain => ({
  id: r.id,
  url: r.nome,
  registrar: r.registrar ?? "",
  dnsProvider: r.dns_provider ?? "",
  hostingProvider: r.hosting_provider ?? "",
  expirationDate: r.data_vencimento ?? "",
  sslExpiration: r.ssl_vencimento ?? "",
  renewalCost: Number(r.custo_renovacao ?? 0),
  autoRenew: r.auto_renovacao,
  status: (r.status as Domain['status']) ?? "Ativo",
});

const toDb = (d: Domain, orgId: string) => ({
  id: d.id,
  org_id: orgId,
  nome: d.url,
  registrar: d.registrar,
  dns_provider: d.dnsProvider,
  hosting_provider: d.hostingProvider,
  data_vencimento: d.expirationDate || null,
  ssl_vencimento: d.sslExpiration || null,
  custo_renovacao: d.renewalCost,
  auto_renovacao: d.autoRenew,
  status: d.status,
});

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const getAlertBadge = (days: number) => {
  if (days < 0) return { label: 'Expirado', className: 'bg-destructive text-destructive-foreground' };
  if (days <= 15) return { label: `${days}d — URGENTE`, className: 'bg-destructive text-destructive-foreground animate-pulse' };
  if (days <= 30) return { label: `${days}d — Atenção`, className: 'bg-warning text-warning-foreground' };
  return { label: `${days}d`, className: 'bg-success/10 text-success border-success/20' };
};

const sslBadge = (days: number) => {
  if (days < 0) return 'bg-destructive text-destructive-foreground';
  if (days <= 15) return 'bg-destructive/10 text-destructive border-destructive/20';
  if (days <= 30) return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-success/10 text-success border-success/20';
};

interface DisasterDoc {
  domainId: string;
  backupLocation: string;
  responsibleTech: string;
  notes: string;
}

export default function DomainsPage() {
  const { items: domainList, save: saveDomain, remove: removeDomain, loading } = useSupabaseCollection<Domain, DomainRow>(
    "dominios", fromDb, toDb, "Domínios",
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null);
  const [disasterDocs, setDisasterDocs] = useState<DisasterDoc[]>([
    { domainId: 'DOM-001', backupLocation: 'S3 bucket: imts-backup-prod', responsibleTech: 'DevOps Lead', notes: 'Failover DNS configurado no Cloudflare' },
    { domainId: 'DOM-004', backupLocation: 'AWS RDS Multi-AZ (sa-east-1)', responsibleTech: 'DBA', notes: 'Réplica read-only ativa' },
  ]);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [docForm, setDocForm] = useState<DisasterDoc>({ domainId: '', backupLocation: '', responsibleTech: '', notes: '' });

  const sorted = [...domainList].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

  const handleSave = async (domain: Domain) => {
    const exists = domainList.some(d => d.id === domain.id);
    await saveDomain(domain);
    toast.success(`Domínio "${domain.url}" ${exists ? 'atualizado' : 'cadastrado'}!`);
    setEditingDomain(null);
  };

  const handleDelete = async (domain: Domain) => {
    await removeDomain(domain);
    setDeleteTarget(null);
    toast.success(`Domínio "${domain.url}" removido.`);
  };

  const handleDocSave = (domainId: string) => {
    setDisasterDocs(prev => {
      const idx = prev.findIndex(d => d.domainId === domainId);
      const doc = { ...docForm, domainId };
      if (idx >= 0) { const copy = [...prev]; copy[idx] = doc; return copy; }
      return [...prev, doc];
    });
    setEditingDoc(null);
    toast.success("Documentação de desastre salva!");
  };

  const openEdit = (domain: Domain) => {
    setEditingDomain(domain);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditingDomain(null);
    setFormOpen(true);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const parseDate = (s: string): string => {
    const t = s.trim();
    if (!t) return "";
    const br = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (br) {
      const [, d, m, y] = br;
      const yyyy = y.length === 2 ? `20${y}` : y;
      return `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const d = new Date(t);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  };

  const mapStatus = (s: string): Domain["status"] => {
    const v = s.trim().toLowerCase();
    if (v.includes("expirado")) return "Expirado";
    if (v.includes("expirando") || v.includes("remoção") || v.includes("remocao") || v.includes("próxima") || v.includes("proxima")) return "Expirando";
    return "Ativo";
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let cur: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === "," || c === ";" || c === "\t") { cur.push(field); field = ""; }
        else if (c === "\n" || c === "\r") {
          if (field !== "" || cur.length) { cur.push(field); rows.push(cur); cur = []; field = ""; }
          if (c === "\r" && text[i + 1] === "\n") i++;
        } else field += c;
      }
    }
    if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
    return rows.filter(r => r.some(c => c.trim() !== ""));
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 1) { toast.error("CSV vazio"); return; }
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const findCol = (...keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
      const iUrl = findCol("domínio", "dominio", "domain", "url", "nome");
      const iStatus = findCol("status");
      const iExp = findCol("expiração", "expiracao", "vencimento", "expira");
      const iReg = findCol("registrar");
      const iDns = findCol("dns");
      const iHost = findCol("host", "hospedagem");
      const iSsl = findCol("ssl");
      const iCost = findCol("custo", "renova");
      if (iUrl < 0) { toast.error("Coluna de domínio não encontrada"); return; }

      let ok = 0, fail = 0;
      const existing = new Set(domainList.map(d => d.url.toLowerCase()));
      for (const row of rows.slice(1)) {
        const url = (row[iUrl] || "").trim();
        if (!url || existing.has(url.toLowerCase())) continue;
        const domain: Domain = {
          id: crypto.randomUUID(),
          url,
          registrar: iReg >= 0 ? (row[iReg] || "").trim() : "",
          dnsProvider: iDns >= 0 ? (row[iDns] || "").trim() : "",
          hostingProvider: iHost >= 0 ? (row[iHost] || "").trim() : "",
          expirationDate: iExp >= 0 ? parseDate(row[iExp] || "") : "",
          sslExpiration: iSsl >= 0 ? parseDate(row[iSsl] || "") : "",
          renewalCost: iCost >= 0 ? Number((row[iCost] || "0").replace(/[^\d.,-]/g, "").replace(",", ".")) || 0 : 0,
          autoRenew: true,
          status: iStatus >= 0 ? mapStatus(row[iStatus] || "") : "Ativo",
        };
        try { await saveDomain(domain); ok++; existing.add(url.toLowerCase()); }
        catch { fail++; }
      }
      toast.success(`Importação concluída: ${ok} adicionados${fail ? `, ${fail} falharam` : ""}`);
    } catch (err) {
      toast.error("Erro ao processar CSV");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Domínios & Infraestrutura</h1>
          <p className="text-muted-foreground text-[13px] mt-1">Monitoramento de domínios, DNS e certificados SSL</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCSV} />
          <Button variant="outline" className="gap-2" onClick={() => {
            exportToCSV('dominios_IMTS',
              ['Domínio','Registrar','DNS','Hosting','Status','Expiração','SSL','Custo Renovação','Auto-renew'],
              domainList.map(d => [d.url, d.registrar, d.dnsProvider, d.hostingProvider, d.status, d.expirationDate, d.sslExpiration, d.renewalCost, d.autoRenew ? 'Sim' : 'Não']));
            toast.success('CSV exportado!');
          }}>
            <FileDown className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar CSV
          </Button>
          <Button className="gap-2" onClick={openNew}>
            <Plus className="w-4 h-4" /> Novo Domínio
          </Button>
        </div>
      </div>

      {(() => {
        const withDate = domainList.filter(d => d.expirationDate);
        const expired = withDate.filter(d => daysUntil(d.expirationDate) <= 0).length;
        const urgent = withDate.filter(d => { const dd = daysUntil(d.expirationDate); return dd > 0 && dd <= 15; }).length;
        const attention = withDate.filter(d => { const dd = daysUntil(d.expirationDate); return dd > 15 && dd <= 30; }).length;
        const noDate = domainList.length - withDate.length;
        return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Globe className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Domínios</p>
                <p className="text-2xl font-bold text-foreground">{domainList.length}</p>
                {noDate > 0 && <p className="text-[10px] text-muted-foreground">{noDate} sem data</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Expirados</p>
                <p className="text-2xl font-bold text-destructive">{expired}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Urgente (1–15d)</p>
                <p className="text-2xl font-bold text-destructive">{urgent}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Atenção (16–30d)</p>
                <p className="text-2xl font-bold text-warning">{attention}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">SSL Válidos</p>
                <p className="text-2xl font-bold text-foreground">{domainList.filter(d => d.sslExpiration && daysUntil(d.sslExpiration) > 0).length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        );
      })()}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Linha do Tempo de Vencimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sorted.map(domain => {
            const days = daysUntil(domain.expirationDate);
            const sslDays = daysUntil(domain.sslExpiration);
            const progressVal = Math.max(0, Math.min(100, ((365 - Math.max(0, days)) / 365) * 100));
            const alert = getAlertBadge(days);
            const doc = disasterDocs.find(d => d.domainId === domain.id);

            return (
              <div key={domain.id} className="p-4 rounded-md border border-border bg-card hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        {domain.url}
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Registrar: {domain.registrar} · DNS: {domain.dnsProvider} · Host: {domain.hostingProvider}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={alert.className}>{alert.label}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(domain)} title="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(domain)} title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Expiração</span>
                    <p className={`font-semibold mt-0.5 ${days < 0 ? 'text-destructive' : days <= 15 ? 'text-destructive' : days <= 30 ? 'text-warning' : 'text-foreground'}`}>
                      {new Date(domain.expirationDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">SSL</span>
                    <p className="mt-0.5">
                      <Badge variant="outline" className={`text-xs ${sslBadge(sslDays)}`}>
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {sslDays < 0 ? 'Expirado' : `${sslDays}d`}
                      </Badge>
                    </p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Renovação</span>
                    <p className="font-semibold mt-0.5 text-foreground">R$ {domain.renewalCost > 0 ? domain.renewalCost : '—'}</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Auto-renew</span>
                    <p className={`font-semibold mt-0.5 ${domain.autoRenew ? 'text-success' : 'text-destructive'}`}>
                      {domain.autoRenew ? 'Sim' : 'Não'}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress value={progressVal} className="h-1.5" />
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <DnsRecordsManager dominioId={domain.id} />
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">Documentação de Desastre</span>
                  </div>
                  {editingDoc === domain.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Local do backup" value={docForm.backupLocation} onChange={e => setDocForm(p => ({ ...p, backupLocation: e.target.value }))} className="text-xs h-8" />
                        <Input placeholder="Responsável técnico" value={docForm.responsibleTech} onChange={e => setDocForm(p => ({ ...p, responsibleTech: e.target.value }))} className="text-xs h-8" />
                      </div>
                      <Textarea placeholder="Observações (failover, redundância...)" value={docForm.notes} onChange={e => setDocForm(p => ({ ...p, notes: e.target.value }))} className="text-xs min-h-[60px]" />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleDocSave(domain.id)}>Salvar</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDoc(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : doc ? (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-muted rounded-lg">
                        <Database className="w-3 h-3 text-muted-foreground mb-1" />
                        <span className="text-muted-foreground">Backup</span>
                        <p className="font-medium text-foreground">{doc.backupLocation}</p>
                      </div>
                      <div className="p-2 bg-muted rounded-lg">
                        <UserCheck className="w-3 h-3 text-muted-foreground mb-1" />
                        <span className="text-muted-foreground">Responsável</span>
                        <p className="font-medium text-foreground">{doc.responsibleTech}</p>
                      </div>
                      <div className="p-2 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Notas</span>
                        <p className="font-medium text-foreground">{doc.notes}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs col-span-3 w-fit" onClick={() => { setDocForm(doc); setEditingDoc(domain.id); }}>Editar</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setDocForm({ domainId: domain.id, backupLocation: '', responsibleTech: '', notes: '' }); setEditingDoc(domain.id); }}>
                      <Plus className="w-3 h-3" /> Adicionar documentação
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o domínio <strong>{deleteTarget?.url}</strong>? Esta ação não pode ser desfeita.
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

      <DomainForm open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} domain={editingDomain} />
    </div>
  );
}
