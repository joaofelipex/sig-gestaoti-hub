import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { type InventoryItem, type InventoryCategory } from "@/lib/inventory-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: InventoryItem) => void;
  item?: InventoryItem | null;
}

const CATEGORIES: InventoryCategory[] = [
  "Cabos", "Periféricos", "Armazenamento", "Áudio/Vídeo", "Rede", "Energia", "Consumíveis", "Outros",
];

export default function InventoryItemForm({ open, onOpenChange, onSave, item }: Props) {
  const isEdit = !!item;
  const [form, setForm] = useState<InventoryItem>({
    id: "",
    name: "",
    category: "Periféricos",
    unit: "un",
    quantity: 0,
    minQuantity: 0,
    unitCost: 0,
    location: "Almoxarifado TI",
  });

  useEffect(() => {
    if (item) setForm(item);
    else setForm({
      id: crypto.randomUUID(),
      name: "", category: "Periféricos", unit: "un",
      quantity: 0, minQuantity: 0, unitCost: 0,
      location: "Almoxarifado TI",
    });
  }, [item, open]);

  const submit = () => {
    if (!form.name) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar item" : "Novo item de estoque"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v: InventoryCategory) => setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>SKU / código</Label>
            <Input value={form.sku || ""} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} />
          </div>
          <div>
            <Label>Quantidade atual</Label>
            <Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Quantidade mínima (reposição)</Label>
            <Input type="number" value={form.minQuantity} onChange={e => setForm(p => ({ ...p, minQuantity: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Custo unitário (R$)</Label>
            <Input type="number" value={form.unitCost} onChange={e => setForm(p => ({ ...p, unitCost: Number(e.target.value) }))} />
          </div>
          <div className="col-span-2">
            <Label>Localização</Label>
            <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>Fornecedor</Label>
            <Input value={form.supplier || ""} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{isEdit ? "Salvar" : "Cadastrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
