import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Asset } from "@/data/mock-data";

interface AssetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (asset: Asset) => void;
  asset?: Asset | null;
}

const emptyAsset: Omit<Asset, 'id'> = {
  type: 'Notebook', brand: '', model: '', serialNumber: '',
  status: 'Estoque', assignedTo: null, department: '',
  purchaseDate: '', warrantyEnd: '',
  specs: { cpu: '', ram: '', storage: '' },
  purchaseValue: 0, maintenanceLog: [],
};

export default function AssetForm({ open, onOpenChange, onSave, asset }: AssetFormProps) {
  const isEdit = !!asset;
  const [form, setForm] = useState<Omit<Asset, 'id'>>({ ...emptyAsset });

  useEffect(() => {
    if (open) {
      setForm(asset ? { ...asset, specs: { ...asset.specs }, maintenanceLog: [...asset.maintenanceLog] } : { ...emptyAsset, specs: { cpu: '', ram: '', storage: '' }, maintenanceLog: [] });
    }
  }, [open, asset]);

  const set = (key: string, value: string | number | null) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const setSpec = (key: string, value: string) =>
    setForm(prev => ({ ...prev, specs: { ...prev.specs, [key]: value } }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = asset?.id || `AST-${String(Date.now()).slice(-4)}`;
    onSave({ ...form, id } as Asset);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Ativo' : 'Novo Ativo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Desktop', 'Notebook', 'Monitor', 'Servidor', 'Impressora', 'Switch', 'Roteador'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Em uso', 'Estoque', 'Manutenção', 'Aposentado'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Ex: Dell, Lenovo" required />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={form.model} onChange={e => set('model', e.target.value)} placeholder="Ex: Latitude 5540" required />
            </div>
            <div className="space-y-2">
              <Label>Nº de Série</Label>
              <Input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} placeholder="Serial Number" required />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Input value={form.department} onChange={e => set('department', e.target.value)} placeholder="Ex: TI, Financeiro" required />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={form.assignedTo || ''} onChange={e => set('assignedTo', e.target.value || null)} placeholder="Nome do colaborador" />
            </div>
            <div className="space-y-2">
              <Label>Valor de Compra (R$)</Label>
              <Input type="number" value={form.purchaseValue} onChange={e => set('purchaseValue', Number(e.target.value))} min={0} required />
            </div>
            <div className="space-y-2">
              <Label>Data de Compra</Label>
              <Input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Fim da Garantia</Label>
              <Input type="date" value={form.warrantyEnd} onChange={e => set('warrantyEnd', e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Especificações Técnicas</Label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CPU</Label>
                <Input value={form.specs.cpu || ''} onChange={e => setSpec('cpu', e.target.value)} placeholder="Ex: Intel i7-1365U" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">RAM</Label>
                <Input value={form.specs.ram || ''} onChange={e => setSpec('ram', e.target.value)} placeholder="Ex: 16GB DDR5" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Storage</Label>
                <Input value={form.specs.storage || ''} onChange={e => setSpec('storage', e.target.value)} placeholder="Ex: 512GB NVMe" />
              </div>
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
