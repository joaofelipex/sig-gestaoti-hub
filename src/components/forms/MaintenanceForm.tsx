import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MaintenanceRecord } from "@/lib/maintenance-data";
import type { Asset } from "@/data/mock-data";

interface MaintenanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: MaintenanceRecord) => void;
  record?: MaintenanceRecord | null;
  assets: Asset[];
}

const empty: Omit<MaintenanceRecord, "id"> = {
  assetId: "",
  assetLabel: "",
  type: "Preventiva",
  status: "Agendada",
  scheduledDate: new Date().toISOString().slice(0, 10),
  description: "",
  technician: "",
  supplier: "",
  ticketNumber: "",
  cost: 0,
  warrantyCovered: false,
};

export default function MaintenanceForm({ open, onOpenChange, onSave, record, assets }: MaintenanceFormProps) {
  const isEdit = !!record;
  const [form, setForm] = useState<Omit<MaintenanceRecord, "id">>({ ...empty });

  useEffect(() => {
    if (open) setForm(record ? { ...record } : { ...empty });
  }, [open, record]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleAssetChange = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    setForm(prev => ({
      ...prev,
      assetId,
      assetLabel: asset ? `${asset.type} ${asset.brand} ${asset.model}` : "",
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = record?.id || `MNT-${String(Date.now()).slice(-5)}`;
    const completedDate = form.status === "Concluída"
      ? form.completedDate || new Date().toISOString().slice(0, 10)
      : undefined;
    onSave({ ...form, id, completedDate } as MaintenanceRecord);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Manutenção" : "Nova Manutenção"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Ativo</Label>
              <Select value={form.assetId} onValueChange={handleAssetChange} required>
                <SelectTrigger><SelectValue placeholder="Selecione um ativo" /></SelectTrigger>
                <SelectContent>
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.id} · {a.type} {a.brand} {a.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => set("type", v as MaintenanceRecord["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventiva">Preventiva</SelectItem>
                  <SelectItem value="Corretiva">Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v as MaintenanceRecord["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agendada">Agendada</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data agendada</Label>
              <Input type="date" value={form.scheduledDate} onChange={e => set("scheduledDate", e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Data conclusão</Label>
              <Input type="date" value={form.completedDate ?? ""} onChange={e => set("completedDate", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Técnico responsável</Label>
              <Input value={form.technician} onChange={e => set("technician", e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={form.supplier ?? ""} onChange={e => set("supplier", e.target.value)} placeholder="Ex: Dell Brasil" />
            </div>

            <div className="space-y-2">
              <Label>Nº do chamado</Label>
              <Input value={form.ticketNumber ?? ""} onChange={e => set("ticketNumber", e.target.value)} placeholder="Ex: DELL-2024-8821" />
            </div>

            <div className="space-y-2">
              <Label>Custo (R$)</Label>
              <Input type="number" min={0} step="0.01" value={form.cost}
                onChange={e => set("cost", Number(e.target.value))} required />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Descrição do serviço</Label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} required />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox id="warranty" checked={form.warrantyCovered}
                onCheckedChange={v => set("warrantyCovered", !!v)} />
              <Label htmlFor="warranty" className="cursor-pointer">Coberto por garantia</Label>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{isEdit ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
