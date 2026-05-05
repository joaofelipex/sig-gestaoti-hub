import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Circle, AlertTriangle, Plus, Trash2, Wand2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Categoria = "servidor" | "licenca" | "dominio" | "contrato" | "outro";
type Status = "pendente" | "pago" | "atrasado";

interface Pagamento {
  id: string;
  categoria: Categoria;
  referencia_id: string | null;
  nome: string;
  fornecedor: string | null;
  valor: number;
  competencia: string;
  vencimento: string | null;
  data_pagamento: string | null;
  status: Status;
  observacoes: string | null;
}

const categoriaLabel: Record<Categoria, string> = {
  servidor: "Servidor",
  licenca: "Licença",
  dominio: "Domínio",
  contrato: "Contrato",
  outro: "Outro",
};

const categoriaColor: Record<Categoria, string> = {
  servidor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  licenca: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  dominio: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30",
  contrato: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  outro: "bg-muted text-muted-foreground border-border",
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatMonth(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PaymentsPage() {
  const [referenceDate, setReferenceDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | Status>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    categoria: "servidor" as Categoria,
    nome: "",
    fornecedor: "",
    valor: 0,
    vencimento: "",
    observacoes: "",
  });

  const competencia = monthKey(referenceDate);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("pagamentos")
      .select("*")
      .eq("competencia", competencia)
      .order("status", { ascending: true })
      .order("vencimento", { ascending: true, nullsFirst: false });
    if (error) {
      toast.error("Erro ao carregar pagamentos");
    } else {
      setPagamentos((data || []) as Pagamento[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  async function togglePago(p: Pagamento, checked: boolean) {
    const novo = checked
      ? { status: "pago" as Status, data_pagamento: new Date().toISOString().slice(0, 10) }
      : { status: "pendente" as Status, data_pagamento: null };
    setPagamentos(prev => prev.map(x => (x.id === p.id ? { ...x, ...novo } : x)));
    const { error } = await supabase.from("pagamentos").update(novo).eq("id", p.id);
    if (error) {
      toast.error("Não foi possível atualizar");
      load();
    } else {
      toast.success(checked ? "Marcado como pago" : "Reaberto como pendente");
    }
  }

  async function removerPagamento(id: string) {
    const { error } = await supabase.from("pagamentos").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover");
    setPagamentos(prev => prev.filter(p => p.id !== id));
    toast.success("Pagamento removido");
  }

  async function criarPagamento() {
    if (!form.nome) return toast.error("Informe o nome do serviço");
    const { data: profile } = await supabase.from("profiles").select("org_id").maybeSingle();
    if (!profile?.org_id) return toast.error("Organização não encontrada");
    const { error } = await supabase.from("pagamentos").insert({
      org_id: profile.org_id,
      categoria: form.categoria,
      nome: form.nome,
      fornecedor: form.fornecedor || null,
      valor: form.valor,
      competencia,
      vencimento: form.vencimento || null,
      observacoes: form.observacoes || null,
      status: "pendente",
    });
    if (error) return toast.error("Erro ao criar pagamento");
    toast.success("Pagamento adicionado ao checklist");
    setDialogOpen(false);
    setForm({ categoria: "servidor", nome: "", fornecedor: "", valor: 0, vencimento: "", observacoes: "" });
    load();
  }

  async function gerarDoMes() {
    const { data: profile } = await supabase.from("profiles").select("org_id").maybeSingle();
    if (!profile?.org_id) return toast.error("Organização não encontrada");

    const [{ data: servidores }, { data: licencas }, { data: dominios }] = await Promise.all([
      supabase.from("servidores").select("id, nome, provedor, custo_mensal"),
      supabase.from("licencas").select("id, nome, fornecedor, custo_mensal"),
      supabase.from("dominios").select("id, nome, registrar, custo_anual, data_vencimento"),
    ]);

    const existentes = new Set(pagamentos.map(p => `${p.categoria}:${p.referencia_id}`));
    const novos: any[] = [];

    (servidores || []).forEach(s => {
      if (!existentes.has(`servidor:${s.id}`))
        novos.push({ org_id: profile.org_id, categoria: "servidor", referencia_id: s.id, nome: s.nome, fornecedor: s.provedor, valor: s.custo_mensal || 0, competencia, status: "pendente" });
    });
    (licencas || []).forEach(l => {
      if (!existentes.has(`licenca:${l.id}`))
        novos.push({ org_id: profile.org_id, categoria: "licenca", referencia_id: l.id, nome: l.nome, fornecedor: l.fornecedor, valor: l.custo_mensal || 0, competencia, status: "pendente" });
    });
    (dominios || []).forEach(d => {
      if (!existentes.has(`dominio:${d.id}`))
        novos.push({ org_id: profile.org_id, categoria: "dominio", referencia_id: d.id, nome: d.nome, fornecedor: d.registrar, valor: (d.custo_anual || 0) / 12, competencia, vencimento: d.data_vencimento, status: "pendente" });
    });

    if (!novos.length) return toast.info("Todos os serviços cadastrados já estão no checklist deste mês");
    const { error } = await supabase.from("pagamentos").insert(novos);
    if (error) return toast.error("Erro ao gerar pagamentos");
    toast.success(`${novos.length} serviço(s) adicionado(s) ao checklist`);
    load();
  }

  const filtrados = useMemo(() => {
    if (filter === "todos") return pagamentos;
    return pagamentos.filter(p => p.status === filter);
  }, [pagamentos, filter]);

  const totalMes = pagamentos.reduce((s, p) => s + Number(p.valor), 0);
  const pagos = pagamentos.filter(p => p.status === "pago");
  const totalPago = pagos.reduce((s, p) => s + Number(p.valor), 0);
  const pendentes = pagamentos.length - pagos.length;
  const progresso = pagamentos.length ? Math.round((pagos.length / pagamentos.length) * 100) : 0;

  function navMonth(delta: number) {
    const d = new Date(referenceDate);
    d.setMonth(d.getMonth() + delta);
    setReferenceDate(d);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklist de Pagamentos</h1>
          <p className="text-sm text-muted-foreground">Marque conforme paga os serviços recorrentes da TI.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-3 py-1.5 rounded-md border bg-card text-sm font-medium capitalize min-w-[160px] text-center">
            {formatMonth(referenceDate)}
          </div>
          <Button variant="outline" size="icon" onClick={() => navMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardDescription>Total do mês</CardDescription><CardTitle>{formatBRL(totalMes)}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader><CardDescription>Pago</CardDescription><CardTitle className="text-green-600">{formatBRL(totalPago)}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader><CardDescription>Pendentes</CardDescription><CardTitle className="text-amber-600">{pendentes}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Progresso</CardDescription>
            <CardTitle>{progresso}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Serviços a pagar</CardTitle>
            <CardDescription>Marque a caixa quando concluir o pagamento.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
                <SelectItem value="atrasado">Atrasados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={gerarDoMes}><Wand2 className="h-4 w-4 mr-2" />Gerar do mês</Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo pagamento</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={form.categoria} onValueChange={(v: Categoria) => setForm(f => ({ ...f, categoria: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoriaLabel).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Nome do serviço</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" min={0} value={form.valor} onChange={e => setForm(f => ({ ...f, valor: Number(e.target.value) }))} /></div>
                    <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>Observações</Label><Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={criarPagamento}>Adicionar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Circle className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nenhum pagamento neste mês.</p>
              <p className="text-xs text-muted-foreground">Use <strong>Gerar do mês</strong> para popular automaticamente a partir dos servidores, licenças e domínios cadastrados.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtrados.map(p => {
                const isPago = p.status === "pago";
                const venc = p.vencimento ? new Date(p.vencimento) : null;
                const atrasado = !isPago && venc && venc.getTime() < Date.now();
                return (
                  <li key={p.id} className={cn("flex items-center gap-4 py-3 px-2 rounded-md transition-colors", isPago && "opacity-60")}>
                    <Checkbox checked={isPago} onCheckedChange={c => togglePago(p, !!c)} className="h-5 w-5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-medium text-sm truncate", isPago && "line-through")}>{p.nome}</span>
                        <Badge variant="outline" className={cn("text-[10px]", categoriaColor[p.categoria])}>{categoriaLabel[p.categoria]}</Badge>
                        {atrasado && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30"><AlertTriangle className="h-3 w-3 mr-1" />Atrasado</Badge>}
                        {isPago && <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Pago{p.data_pagamento ? ` em ${new Date(p.data_pagamento).toLocaleDateString("pt-BR")}` : ""}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.fornecedor && <span>{p.fornecedor} · </span>}
                        {venc && <span>Vence {venc.toLocaleDateString("pt-BR")}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-sm tabular-nums">{formatBRL(Number(p.valor))}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removerPagamento(p.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
