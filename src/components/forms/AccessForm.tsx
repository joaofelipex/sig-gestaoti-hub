import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AccessRecord } from "@/data/mock-data";

interface AccessFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: AccessRecord) => void;
  record?: AccessRecord | null;
}

const emptyRecord: Omit<AccessRecord, 'id'> = {
  user: '', resource: '', resourceType: 'Aplicação',
  accessLevel: 'Leitura', grantedDate: '', lastAccess: '',
};

export default function AccessForm({ open, onOpenChange, onSave, record }: AccessFormProps) {
  const isEdit = !!record;
  const [form, setForm] = useState<Omit<AccessRecord, 'id'>>({ ...emptyRecord });

  useEffect(() => {
    if (open) {
      setForm(record ? { ...record } : { ...emptyRecord });
    }
  }, [open, record]);

  const set = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = record?.id || `ACC-${String(Date.now()).slice(-4)}`;
    onSave({ ...form, id } as AccessRecord);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Acesso' : 'Novo Registro de Acesso'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input value={form.user} onChange={e => set('user', e.target.value)} placeholder="Nome do usuário" required />
            </div>
            <div className="space-y-2">
              <Label>Recurso</Label>
              <Input value={form.resource} onChange={e => set('resource', e.target.value)} placeholder="Ex: VPN Corporativa" required />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Recurso</Label>
              <Select value={form.resourceType} onValueChange={v => set('resourceType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['VPN', 'Servidor', 'Banco de Dados', 'Aplicação', 'Storage'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select value={form.accessLevel} onValueChange={v => set('accessLevel', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Leitura', 'Escrita', 'Admin'].map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Concessão</Label>
              <Input type="date" value={form.grantedDate} onChange={e => set('grantedDate', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Último Acesso</Label>
              <Input type="date" value={form.lastAccess} onChange={e => set('lastAccess', e.target.value)} />
            </div>
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
