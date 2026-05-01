import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { type StockMovement, type StockMovementType, type InventoryItem } from "@/lib/inventory-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (mov: StockMovement) => void;
  items: InventoryItem[];
  defaultType?: StockMovementType;
  presetItemId?: string;
}

export default function StockMovementForm({ open, onOpenChange, onSave, items, defaultType = "Entrada", presetItemId }: Props) {
  const [form, setForm] = useState<StockMovement>({
    id: "",
    itemId: "",
    itemName: "",
    type: defaultType,
    quantity: 1,
    date: new Date().toISOString().slice(0, 10),
    responsible: "Felipe Miranda",
    reason: "",
  });

  useEffect(() => {
    if (open) {
      const it = presetItemId ? items.find(i => i.id === presetItemId) : null;
      setForm({
        id: `SMV-${Date.now().toString().slice(-6)}`,
        itemId: it?.id || "",
        itemName: it?.name || "",
        type: defaultType,
        quantity: 1,
        date: new Date().toISOString().slice(0, 10),
        responsible: "Felipe Miranda",
        reason: "",
        unitCost: it?.unitCost,
      });
    }
  }, [open, defaultType, presetItemId, items]);

  const handleItem = (id: string) => {
    const it = items.find(i => i.id === id);
    setForm(p => ({ ...p, itemId: id, itemName: it?.name || "", unitCost: it?.unitCost ?? p.unitCost }));
  };

  const submit = () => {
    if (!form.itemId || form.quantity <= 0 || !form.reason) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova movimentação de estoque</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Item *</Label>
            <Select value={form.itemId} onValueChange={handleItem}>
              <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
              <SelectContent>
                {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} (atual: {i.quantity} {i.unit})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={form.type} onValueChange={(v: StockMovementType) => setForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Entrada">Entrada (compra)</SelectItem>
                <SelectItem value="Saída">Saída (consumo)</SelectItem>
                <SelectItem value="Ajuste">Ajuste de inventário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantidade *</Label>
            <Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={form.responsible} onChange={e => setForm(p => ({ ...p, responsible: e.target.value }))} />
          </div>
          {form.type === "Entrada" && (
            <>
              <div>
                <Label>Nº Nota Fiscal</Label>
                <Input value={form.invoice || ""} onChange={e => setForm(p => ({ ...p, invoice: e.target.value }))} />
              </div>
              <div>
                <Label>Custo unitário (R$)</Label>
                <Input type="number" value={form.unitCost ?? ""} onChange={e => setForm(p => ({ ...p, unitCost: Number(e.target.value) }))} />
              </div>
            </>
          )}
          {form.type === "Saída" && (
            <div className="col-span-2">
              <Label>Destino (usuário/setor)</Label>
              <Input value={form.destination || ""} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} />
            </div>
          )}
          <div className="col-span-2">
            <Label>Motivo *</Label>
            <Input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
