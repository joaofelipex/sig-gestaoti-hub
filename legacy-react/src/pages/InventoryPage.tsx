import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Package, Search, Plus, FileDown, Pencil, Trash2,
  ArrowDownToLine, ArrowUpFromLine, AlertTriangle, DollarSign, Boxes,
} from "lucide-react";
import InventoryItemForm from "@/components/forms/InventoryItemForm";
import StockMovementForm from "@/components/forms/StockMovementForm";
import {
  type InventoryItem, type StockMovement, type StockMovementType,
} from "@/lib/inventory-data";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";
import { exportToCSV } from "@/lib/export-csv";
import { findCol, parseNumber } from "@/lib/import-csv";
import ImportCSVButton from "@/components/ImportCSVButton";
import { toast } from "sonner";

interface InvRow {
  id: string; nome: string; categoria: string; sku: string | null;
  unit: string; quantity: number; min_quantity: number; unit_cost: number;
  location: string | null; supplier: string | null; notes: string | null;
}
const invFromDb = (r: InvRow): InventoryItem => ({
  id: r.id, name: r.nome, category: r.categoria as InventoryItem['category'],
  sku: r.sku ?? undefined, unit: r.unit, quantity: r.quantity,
  minQuantity: r.min_quantity, unitCost: Number(r.unit_cost),
  location: r.location ?? '', supplier: r.supplier ?? undefined, notes: r.notes ?? undefined,
});
const invToDb = (i: InventoryItem, orgId: string) => ({
  id: i.id, org_id: orgId, nome: i.name, categoria: i.category, sku: i.sku ?? null,
  unit: i.unit, quantity: i.quantity, min_quantity: i.minQuantity, unit_cost: i.unitCost,
  location: i.location, supplier: i.supplier ?? null, notes: i.notes ?? null,
});

interface InvMovRow {
  id: string; item_id: string; item_name: string | null; tipo: string;
  quantity: number; data: string; responsible: string | null;
  destination: string | null; reason: string | null; invoice: string | null;
  unit_cost: number | null;
}
const movFromDb = (r: InvMovRow): StockMovement => ({
  id: r.id, itemId: r.item_id, itemName: r.item_name ?? '',
  type: r.tipo as StockMovementType, quantity: r.quantity, date: r.data,
  responsible: r.responsible ?? '', destination: r.destination ?? undefined,
  reason: r.reason ?? '', invoice: r.invoice ?? undefined,
  unitCost: r.unit_cost ?? undefined,
});
const movToDb = (m: StockMovement, orgId: string) => ({
  id: m.id, org_id: orgId, item_id: m.itemId, item_name: m.itemName,
  tipo: m.type, quantity: m.quantity, data: m.date,
  responsible: m.responsible, destination: m.destination ?? null,
  reason: m.reason, invoice: m.invoice ?? null, unit_cost: m.unitCost ?? null,
});

function statusOf(item: InventoryItem) {
  if (item.quantity === 0) return { label: "Sem estoque", cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if (item.quantity <= item.minQuantity) return { label: "Repor", cls: "bg-warning/10 text-warning border-warning/20" };
  return { label: "OK", cls: "bg-success/10 text-success border-success/20" };
}

export default function InventoryPage() {
  const { items, save, remove } = useSupabaseCollection<InventoryItem, InvRow>(
    "inventario", invFromDb, invToDb, "Estoque TI",
  );
  const { items: stockMoves, save: saveMov } = useSupabaseCollection<StockMovement, InvMovRow>(
    "inventario_movimentacoes", movFromDb, movToDb, "Estoque – Movimentações",
  );

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [movFormOpen, setMovFormOpen] = useState(false);
  const [movDefault, setMovDefault] = useState<StockMovementType>("Entrada");
  const [presetItemId, setPresetItemId] = useState<string | undefined>();

  const filtered = items.filter(i => {
    const s = `${i.name} ${i.sku || ""} ${i.location}`.toLowerCase();
    const matchSearch = s.includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || i.category === categoryFilter;
    const st = statusOf(i).label;
    const matchStatus = statusFilter === "all" ||
      (statusFilter === "low" && st !== "OK") ||
      (statusFilter === "ok" && st === "OK");
    return matchSearch && matchCat && matchStatus;
  });

  const totalValue = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const lowCount = items.filter(i => i.quantity <= i.minQuantity).length;
  const outCount = items.filter(i => i.quantity === 0).length;

  const recentMoves = useMemo(
    () => [...stockMoves].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [stockMoves],
  );

  const handleSaveItem = (it: InventoryItem) => {
    save(it);
    toast.success(`Item "${it.name}" salvo`);
    setEditingItem(null);
  };

  const handleDelete = (it: InventoryItem) => {
    remove(it);
    setDeleteTarget(null);
    toast.success("Item removido");
  };

  const handleSaveMov = async (m: StockMovement) => {
    const target = items.find(i => i.id === m.itemId);
    if (target) {
      let q = target.quantity;
      if (m.type === "Entrada") q += m.quantity;
      else if (m.type === "Saída") q = Math.max(0, q - m.quantity);
      else if (m.type === "Ajuste") q = m.quantity;
      await save({ ...target, quantity: q });
    }
    await saveMov(m);
    toast.success(`${m.type} registrada — ${m.itemName}`);
  };

  const openMov = (type: StockMovementType, itemId?: string) => {
    setMovDefault(type);
    setPresetItemId(itemId);
    setMovFormOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Estoque / Almoxarifado de TI</h1>
          <p className="text-muted-foreground text-[13px] mt-1">Itens de consumo, entradas, saídas e ponto de reposição</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => openMov("Saída")}>
            <ArrowUpFromLine className="w-4 h-4" /> Saída
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => openMov("Entrada")}>
            <ArrowDownToLine className="w-4 h-4" /> Entrada
          </Button>
          <Button className="gap-2" onClick={() => { setEditingItem(null); setItemFormOpen(true); }}>
            <Plus className="w-4 h-4" /> Novo Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Itens cadastrados", value: items.length, icon: Boxes, color: "text-primary" },
          { label: "Para repor", value: lowCount, icon: AlertTriangle, color: "text-warning" },
          { label: "Sem estoque", value: outCount, icon: Package, color: "text-destructive" },
          { label: "Valor em estoque", value: `R$ ${totalValue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-accent" },
        ].map(c => (
          <Card key={c.label} className="shadow-sm">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-[12px] font-medium text-muted-foreground">{c.label}</p>
                <p className="text-[18px] font-semibold text-foreground">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {lowCount > 0 && (
        <Card className="shadow-sm border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">{lowCount} item(s) abaixo do ponto de reposição</p>
              <p className="text-xs text-muted-foreground">Revise a lista e abra um pedido de compra.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setStatusFilter("low")}>Ver itens</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Itens em Estoque</TabsTrigger>
          <TabsTrigger value="movements">Histórico de Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-3 mt-3">
          <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm sm:flex-row">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar item, SKU, localização..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {["Cabos","Periféricos","Armazenamento","Áudio/Vídeo","Rede","Energia","Consumíveis","Outros"].map(c =>
                  <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="low">Abaixo do mínimo</SelectItem>
                <SelectItem value="ok">Normal</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => {
              exportToCSV("estoque_IMTS",
                ["ID", "Nome", "Categoria", "SKU", "Qtd", "Mínimo", "Unidade", "Custo Unit.", "Valor Total", "Local"],
                items.map(i => [i.id, i.name, i.category, i.sku || "", i.quantity, i.minQuantity, i.unit, i.unitCost, i.quantity * i.unitCost, i.location]));
              toast.success("CSV exportado");
            }}>
              <FileDown className="w-4 h-4" /> Exportar
            </Button>
            <ImportCSVButton onImport={async (rows, headers) => {
              const iName = findCol(headers, "nome", "name");
              const iCat = findCol(headers, "categoria", "category");
              const iSku = findCol(headers, "sku");
              const iQtd = findCol(headers, "qtd", "quantidade", "quantity");
              const iMin = findCol(headers, "mínimo", "minimo", "min");
              const iUnit = findCol(headers, "unidade", "unit");
              const iCost = findCol(headers, "custo");
              const iLoc = findCol(headers, "local", "location");
              if (iName < 0) { toast.error("Coluna 'Nome' não encontrada"); return { ok: 0, fail: 0 }; }
              const existing = new Set(items.map(i => `${i.name}|${i.sku||""}`.toLowerCase()));
              let ok = 0, fail = 0, skipped = 0;
              for (const row of rows) {
                const name = (row[iName] || "").trim();
                if (!name) continue;
                const sku = iSku >= 0 ? (row[iSku] || "").trim() : "";
                const key = `${name}|${sku}`.toLowerCase();
                if (existing.has(key)) { skipped++; continue; }
                const item: InventoryItem = {
                  id: crypto.randomUUID(), name,
                  category: ((iCat >= 0 ? row[iCat] : "Outros") || "Outros").trim() as InventoryItem['category'],
                  sku: sku || undefined,
                  unit: iUnit >= 0 ? (row[iUnit] || "un").trim() : "un",
                  quantity: iQtd >= 0 ? parseNumber(row[iQtd]) : 0,
                  minQuantity: iMin >= 0 ? parseNumber(row[iMin]) : 0,
                  unitCost: iCost >= 0 ? parseNumber(row[iCost]) : 0,
                  location: iLoc >= 0 ? (row[iLoc] || "").trim() : "",
                };
                try { await save(item); ok++; existing.add(key); } catch { fail++; }
              }
              return { ok, fail, skipped };
            }} />
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(i => {
                    const st = statusOf(i);
                    const target = Math.max(i.minQuantity * 2, 1);
                    const pct = Math.min(100, Math.round((i.quantity / target) * 100));
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell className="text-xs">{i.category}</TableCell>
                        <TableCell className="font-mono text-xs">{i.sku || "—"}</TableCell>
                        <TableCell className="font-mono">{i.quantity} {i.unit}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-xs font-mono text-muted-foreground">min {i.minQuantity}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{i.location}</TableCell>
                        <TableCell className="text-right font-mono text-sm">R$ {(i.quantity * i.unitCost).toLocaleString("pt-BR")}</TableCell>
                        <TableCell><Badge variant="outline" className={st.cls}>{st.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Entrada" onClick={() => openMov("Entrada", i.id)}>
                              <ArrowDownToLine className="w-4 h-4 text-success" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Saída" onClick={() => openMov("Saída", i.id)}>
                              <ArrowUpFromLine className="w-4 h-4 text-warning" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => { setEditingItem(i); setItemFormOpen(true); }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir" onClick={() => setDeleteTarget(i)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum item encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="mt-3">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Destino / NF</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMoves.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{new Date(m.date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          m.type === "Entrada" ? "bg-success/10 text-success border-success/20"
                          : m.type === "Saída" ? "bg-warning/10 text-warning border-warning/20"
                          : "bg-info/10 text-info border-info/20"
                        }>{m.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{m.itemName}</TableCell>
                      <TableCell className="font-mono">{m.quantity}</TableCell>
                      <TableCell className="text-xs">{m.destination || m.invoice || "—"}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{m.reason}</TableCell>
                      <TableCell className="text-xs">{m.responsible}</TableCell>
                    </TableRow>
                  ))}
                  {recentMoves.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma movimentação ainda</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InventoryItemForm open={itemFormOpen} onOpenChange={setItemFormOpen} onSave={handleSaveItem} item={editingItem} />
      <StockMovementForm open={movFormOpen} onOpenChange={setMovFormOpen} onSave={handleSaveMov} items={items} defaultType={movDefault} presetItemId={presetItemId} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              O item <strong>{deleteTarget?.name}</strong> será removido. Histórico de movimentações é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
