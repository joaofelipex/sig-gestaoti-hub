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
import { type AssetMovement, type MovementType } from "@/lib/movement-data";
import { type Asset } from "@/data/mock-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (movement: AssetMovement) => void;
  movement?: AssetMovement | null;
  presetAssetId?: string;
  assets: Asset[];
}

const TYPES: MovementType[] = [
  "Transferência",
  "Devolução",
  "Atribuição inicial",
  "Envio para manutenção",
  "Retorno de manutenção",
  "Descarte",
  "Venda",
  "Doação",
];

export default function MovementForm({ open, onOpenChange, onSave, movement, presetAssetId, assets }: Props) {
  const isEdit = !!movement;
  const assetList = assets;
  const [form, setForm] = useState<AssetMovement>({
    id: "",
    assetId: "",
    assetLabel: "",
    type: "Transferência",
    date: new Date().toISOString().slice(0, 10),
    reason: "",
    responsible: "",
  });

  useEffect(() => {
    if (!open) return;
    if (movement) {
      setForm(movement);
    } else {
      const asset = presetAssetId ? assets.find(a => a.id === presetAssetId) : null;
      setForm({
        id: crypto.randomUUID(),
        assetId: asset?.id || "",
        assetLabel: asset ? `${asset.brand} ${asset.model}` : "",
        type: "Transferência",
        date: new Date().toISOString().slice(0, 10),
        fromUser: asset?.assignedTo || "",
        fromDepartment: asset?.department || "",
        reason: "",
        responsible: "",
      });
    }
  }, [movement, open, presetAssetId, assets]);

  const handleAssetChange = (id: string) => {
    const asset = assetList.find(a => a.id === id);
    setForm(p => ({
      ...p,
      assetId: id,
      assetLabel: asset ? `${asset.brand} ${asset.model}` : "",
      fromUser: asset?.assignedTo || p.fromUser,
      fromDepartment: asset?.department || p.fromDepartment,
    }));
  };

  const submit = () => {
    if (!form.assetId || !form.reason) return;
    onSave(form);
    onOpenChange(false);
  };

  const showDestination = ["Transferência", "Atribuição inicial", "Doação"].includes(form.type);
  const showRecipient = ["Venda", "Doação"].includes(form.type);
  const showValue = form.type === "Venda";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar movimentação" : "Nova movimentação"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Ativo *</Label>
            <Select value={form.assetId} onValueChange={handleAssetChange}>
              <SelectTrigger><SelectValue placeholder="Selecione o ativo" /></SelectTrigger>
              <SelectContent>
                {assetList.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.id} — {a.brand} {a.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={form.type} onValueChange={(v: MovementType) => setForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data *</Label>
            <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <Label>De (usuário)</Label>
            <Input value={form.fromUser || ""} onChange={e => setForm(p => ({ ...p, fromUser: e.target.value }))} />
          </div>
          <div>
            <Label>De (setor)</Label>
            <Input value={form.fromDepartment || ""} onChange={e => setForm(p => ({ ...p, fromDepartment: e.target.value }))} />
          </div>
          {showDestination && (
            <>
              <div>
                <Label>Para (usuário)</Label>
                <Input value={form.toUser || ""} onChange={e => setForm(p => ({ ...p, toUser: e.target.value }))} />
              </div>
              <div>
                <Label>Para (setor)</Label>
                <Input value={form.toDepartment || ""} onChange={e => setForm(p => ({ ...p, toDepartment: e.target.value }))} />
              </div>
            </>
          )}
          {showRecipient && (
            <div className="col-span-2">
              <Label>Destinatário (empresa/pessoa/instituição)</Label>
              <Input value={form.recipient || ""} onChange={e => setForm(p => ({ ...p, recipient: e.target.value }))} />
            </div>
          )}
          {showValue && (
            <div>
              <Label>Valor da venda (R$)</Label>
              <Input type="number" value={form.value ?? ""} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))} />
            </div>
          )}
          <div>
            <Label>Responsável</Label>
            <Input value={form.responsible} onChange={e => setForm(p => ({ ...p, responsible: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>Motivo *</Label>
            <Input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{isEdit ? "Salvar" : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
