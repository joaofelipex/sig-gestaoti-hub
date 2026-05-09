import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BudgetEntry, BudgetCategory } from "@/lib/economist-data";

interface Props {
  initial?: BudgetEntry;
  onSave: (entry: BudgetEntry) => void;
  onCancel: () => void;
}

const CATEGORIES: BudgetCategory[] = [
  "Produtividade", "Desenvolvimento", "Design", "Infraestrutura", "Segurança", "Hardware", "Domínios", "Servidores",
];

const COST_CENTERS = [
  "CC-120 TI Corporativo",
  "CC-210 Engenharia",
  "CC-230 Produto",
  "CC-310 Financeiro",
  "CC-410 Administrativo",
  "CC-510 RH",
];

export function BudgetForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<BudgetEntry>(
    initial ?? {
      id: `BDG-${Date.now()}`,
      year: new Date().getFullYear(),
      category: "Produtividade",
      costCenter: "CC-120 TI Corporativo",
      annualBudget: 0,
      notes: "",
    },
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, annualBudget: Number(form.annualBudget) || 0 });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="year">Ano</Label>
          <Input id="year" type="number" min={2020} max={2099} value={form.year}
            onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as BudgetCategory })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Centro de Custo</Label>
        <Select value={form.costCenter} onValueChange={(v) => setForm({ ...form, costCenter: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {COST_CENTERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="annualBudget">Orçamento Anual (R$)</Label>
        <Input id="annualBudget" type="number" min={0} step={100} value={form.annualBudget}
          onChange={(e) => setForm({ ...form, annualBudget: Number(e.target.value) })} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" rows={2} value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}
