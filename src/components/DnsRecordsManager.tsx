import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Network, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";

interface DnsRecord {
  id: string;
  dominio_id: string;
  org_id: string;
  tipo: string;
  nome: string;
  valor: string;
  ttl: number;
  prioridade: number | null;
  observacoes: string | null;
}

const TIPOS = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA", "PTR"];

const empty = (dominio_id: string, org_id: string): Omit<DnsRecord, "id"> => ({
  dominio_id, org_id, tipo: "A", nome: "@", valor: "", ttl: 3600, prioridade: null, observacoes: "",
});

export default function DnsRecordsManager({ dominioId }: { dominioId: string }) {
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<DnsRecord, "id">>(empty(dominioId, ""));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DnsRecord | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: prof } = await supabase.from("profiles").select("org_id").maybeSingle();
    const oid = prof?.org_id ?? "";
    setOrgId(oid);
    setDraft(empty(dominioId, oid));
    const { data, error } = await supabase
      .from("dns_records" as never)
      .select("*")
      .eq("dominio_id", dominioId)
      .order("tipo");
    if (error) toast.error("Erro ao carregar DNS");
    else setRecords((data ?? []) as DnsRecord[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dominioId]);

  const handleAdd = async () => {
    if (!draft.valor.trim()) { toast.error("Preencha o valor"); return; }
    const { error } = await supabase.from("dns_records" as never).insert(draft as never);
    if (error) { toast.error("Erro ao adicionar"); return; }
    toast.success("Registro DNS adicionado");
    setAdding(false);
    setDraft(empty(dominioId, orgId));
    load();
  };

  const handleUpdate = async () => {
    if (!editDraft) return;
    const { id, ...rest } = editDraft;
    const { error } = await supabase.from("dns_records" as never).update(rest as never).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Registro atualizado");
    setEditingId(null);
    setEditDraft(null);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("dns_records" as never).delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Registro removido");
    load();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Registros DNS ({records.length})</span>
        </div>
        {!adding && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAdding(true)}>
            <Plus className="w-3 h-3" /> Adicionar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-1">
          {records.length === 0 && !adding && (
            <p className="text-xs text-muted-foreground italic py-2">Nenhum registro DNS cadastrado.</p>
          )}

          {records.map(r => editingId === r.id && editDraft ? (
            <div key={r.id} className="grid grid-cols-12 gap-1 items-center p-1.5 bg-muted rounded">
              <Select value={editDraft.tipo} onValueChange={v => setEditDraft({ ...editDraft, tipo: v })}>
                <SelectTrigger className="h-7 text-xs col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-7 text-xs col-span-2" value={editDraft.nome} onChange={e => setEditDraft({ ...editDraft, nome: e.target.value })} placeholder="@" />
              <Input className="h-7 text-xs col-span-4" value={editDraft.valor} onChange={e => setEditDraft({ ...editDraft, valor: e.target.value })} placeholder="Valor" />
              <Input type="number" className="h-7 text-xs col-span-1" value={editDraft.ttl} onChange={e => setEditDraft({ ...editDraft, ttl: Number(e.target.value) })} />
              <Input type="number" className="h-7 text-xs col-span-1" value={editDraft.prioridade ?? ""} onChange={e => setEditDraft({ ...editDraft, prioridade: e.target.value ? Number(e.target.value) : null })} placeholder="Pri" />
              <div className="col-span-2 flex gap-1 justify-end">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleUpdate}><Check className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(null); setEditDraft(null); }}><X className="w-3 h-3" /></Button>
              </div>
            </div>
          ) : (
            <div key={r.id} className="grid grid-cols-12 gap-1 items-center p-1.5 text-xs bg-secondary rounded">
              <span className="col-span-2 font-mono font-semibold">{r.tipo}</span>
              <span className="col-span-2 font-mono text-muted-foreground truncate">{r.nome}</span>
              <span className="col-span-4 font-mono truncate" title={r.valor}>{r.valor}</span>
              <span className="col-span-1 text-muted-foreground">{r.ttl}</span>
              <span className="col-span-1 text-muted-foreground">{r.prioridade ?? "—"}</span>
              <div className="col-span-2 flex gap-1 justify-end">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(r.id); setEditDraft(r); }}><Pencil className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}

          {adding && (
            <div className="grid grid-cols-12 gap-1 items-center p-1.5 bg-primary/5 border border-primary/20 rounded">
              <Select value={draft.tipo} onValueChange={v => setDraft({ ...draft, tipo: v })}>
                <SelectTrigger className="h-7 text-xs col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-7 text-xs col-span-2" value={draft.nome} onChange={e => setDraft({ ...draft, nome: e.target.value })} placeholder="@" />
              <Input className="h-7 text-xs col-span-4" value={draft.valor} onChange={e => setDraft({ ...draft, valor: e.target.value })} placeholder="Valor (ex: 192.0.2.1)" />
              <Input type="number" className="h-7 text-xs col-span-1" value={draft.ttl} onChange={e => setDraft({ ...draft, ttl: Number(e.target.value) })} />
              <Input type="number" className="h-7 text-xs col-span-1" value={draft.prioridade ?? ""} onChange={e => setDraft({ ...draft, prioridade: e.target.value ? Number(e.target.value) : null })} placeholder="Pri" />
              <div className="col-span-2 flex gap-1 justify-end">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAdd}><Check className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAdding(false); setDraft(empty(dominioId, orgId)); }}><X className="w-3 h-3" /></Button>
              </div>
            </div>
          )}

          {(records.length > 0 || adding) && (
            <div className="grid grid-cols-12 gap-1 px-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
              <span className="col-span-2">Tipo</span>
              <span className="col-span-2">Nome</span>
              <span className="col-span-4">Valor</span>
              <span className="col-span-1">TTL</span>
              <span className="col-span-1">Pri</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
