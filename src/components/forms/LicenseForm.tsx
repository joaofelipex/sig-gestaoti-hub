import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { License } from "@/data/mock-data";

interface LicenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (license: License) => void;
  license?: License | null;
}

const emptyLicense: Omit<License, 'id'> = {
  software: '', type: 'Mensal', totalLicenses: 1, usedLicenses: 0,
  activationKey: '', costPerUnit: 0, renewalDate: '', vendor: '',
  category: 'Produtividade',
};

export default function LicenseForm({ open, onOpenChange, onSave, license }: LicenseFormProps) {
  const isEdit = !!license;
  const [form, setForm] = useState<Omit<License, 'id'>>({ ...emptyLicense });

  useEffect(() => {
    if (open) {
      setForm(license ? { ...license } : { ...emptyLicense });
    }
  }, [open, license]);

  const set = (key: string, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = license?.id || `LIC-${String(Date.now()).slice(-4)}`;
    onSave({ ...form, id } as License);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Licença' : 'Nova Licença'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Software</Label>
              <Input value={form.software} onChange={e => set('software', e.target.value)} placeholder="Ex: Microsoft 365" required />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Ex: Microsoft" required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Mensal', 'Anual', 'Perpétua'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Produtividade', 'Desenvolvimento', 'Design', 'Infraestrutura', 'Segurança'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total de Licenças</Label>
              <Input type="number" value={form.totalLicenses} onChange={e => set('totalLicenses', Number(e.target.value))} min={1} required />
            </div>
            <div className="space-y-2">
              <Label>Licenças em Uso</Label>
              <Input type="number" value={form.usedLicenses} onChange={e => set('usedLicenses', Number(e.target.value))} min={0} required />
            </div>
            <div className="space-y-2">
              <Label>Custo por Unidade (R$)</Label>
              <Input type="number" value={form.costPerUnit} onChange={e => set('costPerUnit', Number(e.target.value))} min={0} required />
            </div>
            <div className="space-y-2">
              <Label>Data de Renovação</Label>
              <Input type="date" value={form.renewalDate} onChange={e => set('renewalDate', e.target.value)} required />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Chave de Ativação</Label>
              <Input value={form.activationKey} onChange={e => set('activationKey', e.target.value)} placeholder="Chave de licença" />
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
