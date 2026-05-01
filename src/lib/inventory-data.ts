export type InventoryCategory =
  | "Cabos"
  | "Periféricos"
  | "Armazenamento"
  | "Áudio/Vídeo"
  | "Rede"
  | "Energia"
  | "Consumíveis"
  | "Outros";

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  sku?: string;
  unit: string; // un, m, cx
  quantity: number;
  minQuantity: number;
  unitCost: number;
  location: string;
  supplier?: string;
  notes?: string;
}

export type StockMovementType = "Entrada" | "Saída" | "Ajuste";

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  date: string;
  responsible: string;
  destination?: string; // saída: pra quem
  reason: string;
  invoice?: string; // entrada: NF
  unitCost?: number;
}

export const initialInventory: InventoryItem[] = [
  {
    id: "INV-001",
    name: "Mouse USB Logitech B100",
    category: "Periféricos",
    sku: "LOG-B100",
    unit: "un",
    quantity: 12,
    minQuantity: 5,
    unitCost: 35,
    location: "Almoxarifado TI - Prateleira A1",
    supplier: "Kabum",
  },
  {
    id: "INV-002",
    name: "Teclado USB ABNT2",
    category: "Periféricos",
    sku: "TEC-ABNT2",
    unit: "un",
    quantity: 8,
    minQuantity: 4,
    unitCost: 65,
    location: "Almoxarifado TI - Prateleira A1",
  },
  {
    id: "INV-003",
    name: "Cabo HDMI 2m",
    category: "Cabos",
    sku: "HDMI-2M",
    unit: "un",
    quantity: 3,
    minQuantity: 6,
    unitCost: 22,
    location: "Almoxarifado TI - Gaveta B",
  },
  {
    id: "INV-004",
    name: "Cabo de Rede Cat6 (caixa 305m)",
    category: "Rede",
    sku: "CAT6-305",
    unit: "cx",
    quantity: 2,
    minQuantity: 1,
    unitCost: 480,
    location: "Almoxarifado TI - Estoque B",
    supplier: "Furukawa",
  },
  {
    id: "INV-005",
    name: "Headset USB com microfone",
    category: "Áudio/Vídeo",
    sku: "HS-USB",
    unit: "un",
    quantity: 4,
    minQuantity: 3,
    unitCost: 140,
    location: "Almoxarifado TI - Prateleira C2",
  },
  {
    id: "INV-006",
    name: "HD SSD 480GB Kingston",
    category: "Armazenamento",
    sku: "SSD-480",
    unit: "un",
    quantity: 6,
    minQuantity: 2,
    unitCost: 290,
    location: "Almoxarifado TI - Cofre",
    supplier: "Kingston",
  },
  {
    id: "INV-007",
    name: "Filtro de linha 6 tomadas",
    category: "Energia",
    sku: "FL-6T",
    unit: "un",
    quantity: 2,
    minQuantity: 5,
    unitCost: 45,
    location: "Almoxarifado TI - Gaveta C",
  },
  {
    id: "INV-008",
    name: "Toner HP CF283A",
    category: "Consumíveis",
    sku: "HP-83A",
    unit: "un",
    quantity: 1,
    minQuantity: 2,
    unitCost: 320,
    location: "Almoxarifado TI - Cofre",
    supplier: "HP Brasil",
  },
];

export const initialStockMovements: StockMovement[] = [
  {
    id: "SMV-001",
    itemId: "INV-001",
    itemName: "Mouse USB Logitech B100",
    type: "Entrada",
    quantity: 10,
    date: "2026-03-12",
    responsible: "Felipe Miranda",
    reason: "Compra reposição estoque",
    invoice: "NF-44982",
    unitCost: 35,
  },
  {
    id: "SMV-002",
    itemId: "INV-001",
    itemName: "Mouse USB Logitech B100",
    type: "Saída",
    quantity: 1,
    date: "2026-04-02",
    responsible: "Felipe Miranda",
    destination: "Carlos Silva (Desenvolvimento)",
    reason: "Substituição de mouse com defeito",
  },
  {
    id: "SMV-003",
    itemId: "INV-003",
    itemName: "Cabo HDMI 2m",
    type: "Saída",
    quantity: 2,
    date: "2026-04-18",
    responsible: "Felipe Miranda",
    destination: "Sala de Reunião 2",
    reason: "Instalação de novo projetor",
  },
];
