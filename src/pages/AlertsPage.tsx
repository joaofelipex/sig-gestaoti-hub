import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Plus, Check, Trash2, AlertTriangle, Info, AlertCircle, RefreshCw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { exportToCSV } from "@/lib/export-csv";

type Severidade = "info" | "warning" | "critical";
interface Alerta {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  severidade: Severidade;
  lida: boolean;
  link: string | null;
  created_at: string;
}

const sevColors: Record<Severidade, string> = {
  info: "bg-info/10 text-info border-info/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

const sevIcons: Record<Severidade, typeof Info> = {
  info: Info,
  warning: AlertCircle,
  critical: AlertTriangle,
};

export default function AlertsPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | Severidade>("all");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState<Partial<Alerta>>({ severidade: "info", tipo: "manual" });
  const dash = useDashboardData();

  const load = async () => {
    setLoading(true);
    const { data: profile } = await supabase.from("profiles").select("org_id").maybeSingle();
    if (!profile?.org_id) { setLoading(false); return; }
    setOrgId(profile.org_id);
    const { data, error } = await supabase.from("alertas").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setAlertas((data as Alerta[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generateOperational = async () => {
    if (!orgId || dash.loading) return;
    const today = Date.now();
    const days = (d: string) => Math.ceil((new Date(d).getTime() - today) / 86400000);
    const candidates: Array<Omit<Alerta, "id" | "created_at" | "lida"> & { org_id: string }> = [];

    dash.domains.forEach(d => {
      if (d.expirationDate) {
        const dd = days(d.expirationDate);
        if (dd <= 30) candidates.push({
          org_id: orgId, tipo: "dominio", titulo: d.url,
          mensagem: dd <= 0 ? "Domínio expirado" : `Domínio vence em ${dd} dias`,
          severidade: dd <= 0 ? "critical" : dd <= 15 ? "warning" : "info",
          link: "/dominios",
        });
      }
      if (d.sslExpiration) {
        const sd = days(d.sslExpiration);
        if (sd <= 30) candidates.push({
          org_id: orgId, tipo: "ssl", titulo: d.url,
          mensagem: sd <= 0 ? "Certificado SSL expirado" : `SSL vence em ${sd} dias`,
          severidade: sd <= 0 ? "critical" : "warning",
          link: "/dominios",
        });
      }
    });

    dash.servers.forEach(s => {
      if (s.contractEnd) {
        const cd = days(s.contractEnd);
        if (cd <= 30) candidates.push({
          org_id: orgId, tipo: "contrato_servidor", titulo: s.name,
          mensagem: cd <= 0 ? "Contrato vencido" : `Contrato vence em ${cd} dias`,
          severidade: cd <= 0 ? "critical" : "warning",
          link: "/servidores",
        });
      }
      if (s.status === "Offline" || s.status === "Degradado") candidates.push({
        org_id: orgId, tipo: "servidor", titulo: s.name,
        mensagem: `Servidor ${s.status}`, severidade: "critical", link: "/servidores",
      });
    });

    dash.licenses.forEach(l => {
      if (l.renewalDate) {
        const rd = days(l.renewalDate);
        if (rd <= 30 && rd >= 0) candidates.push({
          org_id: orgId, tipo: "licenca", titulo: l.software,
          mensagem: `Licença renova em ${rd} dias`,
          severidade: rd <= 7 ? "warning" : "info", link: "/licencas",
        });
      }
    });

    dash.assets.forEach(a => {
      if (a.status === "Manutenção") candidates.push({
        org_id: orgId, tipo: "manutencao", titulo: `${a.brand} ${a.model}`,
        mensagem: "Ativo em manutenção", severidade: "warning", link: "/manutencao",
      });
    });

    // dedupe contra existentes (tipo + titulo + mensagem)
    const existing = new Set(alertas.map(a => `${a.tipo}|${a.titulo}|${a.mensagem ?? ""}`));
    const toInsert = candidates.filter(c => !existing.has(`${c.tipo}|${c.titulo}|${c.mensagem ?? ""}`));

    if (toInsert.length === 0) {
      toast.info("Nenhum novo alerta a registrar.");
      return;
    }

    const { error } = await supabase.from("alertas").insert(toInsert);
    if (error) toast.error(error.message);
    else { toast.success(`${toInsert.length} alerta(s) gerado(s).`); load(); }
  };

  const markRead = async (a: Alerta, lida: boolean) => {
    const { error } = await supabase.from("alertas").update({ lida }).eq("id", a.id);
    if (error) toast.error(error.message);
    else setAlertas(prev => prev.map(x => x.id === a.id ? { ...x, lida } : x));
  };

  const remove = async (a: Alerta) => {
    const { error } = await supabase.from("alertas").delete().eq("id", a.id);
    if (error) toast.error(error.message);
    else setAlertas(prev => prev.filter(x => x.id !== a.id));
  };

  const markAllRead = async () => {
    if (!orgId) return;
    const { error } = await supabase.from("alertas").update({ lida: true }).eq("org_id", orgId).eq("lida", false);
    if (error) toast.error(error.message);
    else { toast.success("Todos marcados como lidos."); load(); }
  };

  const save = async () => {
    if (!orgId || !form.titulo) return toast.error("Título obrigatório");
    const { error } = await supabase.from("alertas").insert({
      org_id: orgId,
      tipo: form.tipo || "manual",
      titulo: form.titulo,
      mensagem: form.mensagem ?? null,
      severidade: (form.severidade ?? "info") as Severidade,
      link: form.link ?? null,
    });
    if (error) toast.error(error.message);
    else { setDialog(false); setForm({ severidade: "info", tipo: "manual" }); load(); }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return alertas;
    if (filter === "unread") return alertas.filter(a => !a.lida);
    return alertas.filter(a => a.severidade === filter);
  }, [alertas, filter]);

  const counts = useMemo(() => ({
    total: alertas.length,
    unread: alertas.filter(a => !a.lida).length,
    critical: alertas.filter(a => a.severidade === "critical").length,
    warning: alertas.filter(a => a.severidade === "warning").length,
  }), [alertas]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Alertas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Notificações operacionais e governança</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={generateOperational} disabled={dash.loading}>
            <RefreshCw className="w-4 h-4 mr-1" /> Gerar alertas operacionais
          </Button>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={counts.unread === 0}>
            <Check className="w-4 h-4 mr-1" /> Marcar todos como lidos
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCSV("alertas",
            ["Tipo", "Título", "Mensagem", "Severidade", "Lida", "Criado em"],
            alertas.map(a => [a.tipo, a.titulo, a.mensagem ?? "", a.severidade, a.lida ? "Sim" : "Não", new Date(a.created_at).toLocaleString("pt-BR")]))}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Dialog open={dialog} onOpenChange={setDialog}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo alerta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo alerta</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Título</Label><Input value={form.titulo ?? ""} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
                <div><Label>Mensagem</Label><Textarea value={form.mensagem ?? ""} onChange={e => setForm({ ...form, mensagem: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Severidade</Label>
                    <Select value={form.severidade} onValueChange={v => setForm({ ...form, severidade: v as Severidade })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Atenção</SelectItem>
                        <SelectItem value="critical">Crítico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Tipo</Label><Input value={form.tipo ?? ""} onChange={e => setForm({ ...form, tipo: e.target.value })} /></div>
                </div>
                <div><Label>Link (opcional)</Label><Input value={form.link ?? ""} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="/dominios" /></div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
                  <Button onClick={save}>Salvar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground">Total</p><p className="text-2xl font-bold">{counts.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground">Não lidos</p><p className="text-2xl font-bold text-primary">{counts.unread}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground">Críticos</p><p className="text-2xl font-bold text-destructive">{counts.critical}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground">Atenção</p><p className="text-2xl font-bold text-warning">{counts.warning}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lista</CardTitle>
          <Select value={filter} onValueChange={v => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unread">Não lidos</SelectItem>
              <SelectItem value="critical">Críticos</SelectItem>
              <SelectItem value="warning">Atenção</SelectItem>
              <SelectItem value="info">Informativos</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>}
          {!loading && filtered.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhum alerta.</p>}
          {filtered.map(a => {
            const Icon = sevIcons[a.severidade];
            return (
              <div key={a.id} className={`flex items-center gap-3 p-3 rounded-md border ${a.lida ? "bg-secondary/30 opacity-70" : "bg-card"}`}>
                <Icon className={`w-5 h-5 shrink-0 ${a.severidade === "critical" ? "text-destructive" : a.severidade === "warning" ? "text-warning" : "text-info"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{a.titulo}</p>
                    <Badge variant="outline" className={`text-[10px] ${sevColors[a.severidade]}`}>{a.severidade}</Badge>
                    <Badge variant="outline" className="text-[10px]">{a.tipo}</Badge>
                  </div>
                  {a.mensagem && <p className="text-xs text-muted-foreground mt-0.5">{a.mensagem}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => markRead(a, !a.lida)} title={a.lida ? "Marcar como não lido" : "Marcar como lido"}>
                  <Check className={`w-4 h-4 ${a.lida ? "text-success" : ""}`} />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(a)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
