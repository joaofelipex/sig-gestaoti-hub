import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinancialContract } from "@/lib/it-governance-data";

interface ContractFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (contract: FinancialContract) => void;
  contract?: FinancialContract | null;
}

const emptyContract: Omit<FinancialContract, "id"> = {
  supplier: "",
  object: "",
  type: "OPEX",
  costCenter: "CC-120 TI Corporativo",
  monthlyCost: 0,
  endDate: "",
  status: "Ativo",
};

export default function ContractForm({ open, onOpenChange, onSave, contract }: ContractFormProps) {
  const [form, setForm] = useState<Omit<FinancialContract, "id">>({ ...emptyContract });
  const isEdit = !!contract;

  useEffect(() => {
    if (open) setForm(contract ? { ...contract } : { ...emptyContract });
  }, [contract, open]);

  const set = (key: keyof Omit<FinancialContract, "id">, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({ ...form, id: contract?.id || crypto.randomUUID() } as FinancialContract);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={form.supplier} onChange={e => set("supplier", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Objeto</Label>
              <Input value={form.object} onChange={e => set("object", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo financeiro</Label>
              <Select value={form.type} onValueChange={value => set("type", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEX">OPEX</SelectItem>
                  <SelectItem value="CAPEX">CAPEX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={value => set("status", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Planejado">Planejado</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Centro de custo</Label>
              <Input value={form.costCenter} onChange={e => set("costCenter", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Custo mensal (R$)</Label>
              <Input type="number" min={0} value={form.monthlyCost} onChange={e => set("monthlyCost", Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label>Fim do contrato</Label>
              <Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} required />
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