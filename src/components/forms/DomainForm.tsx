import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Domain } from "@/data/mock-data";

interface DomainFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (domain: Domain) => void;
  domain?: Domain | null;
}

const emptyDomain: Omit<Domain, 'id'> = {
  url: '', registrar: '', expirationDate: '', renewalCost: 0,
  autoRenew: true, dnsProvider: '', hostingProvider: '',
  sslExpiration: '', status: 'Ativo',
};

export default function DomainForm({ open, onOpenChange, onSave, domain }: DomainFormProps) {
  const isEdit = !!domain;
  const [form, setForm] = useState<Omit<Domain, 'id'>>({ ...emptyDomain });

  useEffect(() => {
    if (open) {
      setForm(domain ? { ...domain } : { ...emptyDomain });
    }
  }, [open, domain]);

  const set = (key: string, value: string | number | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = domain?.id || `DOM-${String(Date.now()).slice(-4)}`;
    onSave({ ...form, id } as Domain);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Domínio' : 'Novo Domínio'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>URL do Domínio</Label>
              <Input value={form.url} onChange={e => set('url', e.target.value)} placeholder="Ex: imts.com.br" required />
            </div>
            <div className="space-y-2">
              <Label>Registrar</Label>
              <Input value={form.registrar} onChange={e => set('registrar', e.target.value)} placeholder="Ex: Registro.br, GoDaddy" required />
            </div>
            <div className="space-y-2">
              <Label>Provedor DNS</Label>
              <Input value={form.dnsProvider} onChange={e => set('dnsProvider', e.target.value)} placeholder="Ex: Cloudflare, Route53" required />
            </div>
            <div className="space-y-2">
              <Label>Provedor de Hospedagem</Label>
              <Input value={form.hostingProvider} onChange={e => set('hostingProvider', e.target.value)} placeholder="Ex: AWS, Vercel" required />
            </div>
            <div className="space-y-2">
              <Label>Data de Expiração</Label>
              <Input type="date" value={form.expirationDate} onChange={e => set('expirationDate', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Expiração SSL</Label>
              <Input type="date" value={form.sslExpiration} onChange={e => set('sslExpiration', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Custo de Renovação (R$)</Label>
              <Input type="number" value={form.renewalCost} onChange={e => set('renewalCost', Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Ativo', 'Expirando', 'Expirado'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.autoRenew} onCheckedChange={v => set('autoRenew', v)} />
            <Label>Renovação Automática</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{isEdit ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
