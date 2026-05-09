import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface RiskItem {
  id: string;
  title: string;
  severity: "Alta" | "Média" | "Baixa";
  owner: string;
  mitigation: string;
}

interface Props {
  initial?: RiskItem;
  onSave: (r: RiskItem) => void;
  onCancel: () => void;
}

export function RiskForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<RiskItem>(
    initial ?? { id: `RSK-${Date.now()}`, title: "", severity: "Média", owner: "", mitigation: "" },
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="rtitle">Título</Label>
        <Input id="rtitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Severidade</Label>
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as RiskItem["severity"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Alta">Alta</SelectItem>
              <SelectItem value="Média">Média</SelectItem>
              <SelectItem value="Baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rowner">Responsável</Label>
          <Input id="rowner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rmit">Mitigação</Label>
        <Textarea id="rmit" rows={3} value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}
