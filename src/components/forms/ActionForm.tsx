import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionItem, ActionPriority, ActionEffort, ActionStatus } from "@/lib/economist-data";

interface Props {
  initial?: ActionItem;
  onSave: (entry: ActionItem) => void;
  onCancel: () => void;
}

const CATEGORIES: ActionItem["category"][] = ["Licenças", "Hardware", "Contratos", "Infraestrutura", "Governança"];
const PRIORITIES: ActionPriority[] = ["Alta", "Média", "Baixa"];
const EFFORTS: ActionEffort[] = ["Baixo", "Médio", "Alto"];
const STATUSES: ActionStatus[] = ["Pendente", "Em andamento", "Concluída", "Descartada"];

export function ActionForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<ActionItem>(
    initial ?? {
      id: `ACT-${Date.now()}`,
      title: "",
      description: "",
      category: "Licenças",
      priority: "Média",
      effort: "Médio",
      estimatedSavings: 0,
      owner: "",
      dueDate: undefined,
      status: "Pendente",
      createdAt: new Date().toISOString(),
    },
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, estimatedSavings: Number(form.estimatedSavings) || 0 });
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ActionItem["category"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ActionStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as ActionPriority })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Esforço</Label>
          <Select value={form.effort} onValueChange={(v) => setForm({ ...form, effort: v as ActionEffort })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EFFORTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="savings">Economia estimada (R$/ano)</Label>
          <Input id="savings" type="number" min={0} value={form.estimatedSavings}
            onChange={(e) => setForm({ ...form, estimatedSavings: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">Prazo</Label>
          <Input id="dueDate" type="date" value={form.dueDate ?? ""}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value || undefined })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="owner">Responsável</Label>
        <Input id="owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} required />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}
