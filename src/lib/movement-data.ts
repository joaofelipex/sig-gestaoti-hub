export type MovementType =
  | "Transferência"
  | "Devolução"
  | "Descarte"
  | "Venda"
  | "Doação"
  | "Atribuição inicial"
  | "Envio para manutenção"
  | "Retorno de manutenção";

export interface AssetMovement {
  id: string;
  assetId: string;
  assetLabel: string;
  type: MovementType;
  date: string;
  fromUser?: string;
  fromDepartment?: string;
  toUser?: string;
  toDepartment?: string;
  reason: string;
  responsible: string;
  value?: number; // venda
  recipient?: string; // doação / venda
  termGenerated?: boolean;
  notes?: string;
}

export const initialMovements: AssetMovement[] = [
  {
    id: "MOV-001",
    assetId: "AST-001",
    assetLabel: "Notebook Dell Latitude 5540",
    type: "Atribuição inicial",
    date: "2024-01-16",
    toUser: "Carlos Silva",
    toDepartment: "Desenvolvimento",
    reason: "Entrega após admissão",
    responsible: "Felipe Miranda",
    termGenerated: true,
  },
  {
    id: "MOV-002",
    assetId: "AST-002",
    assetLabel: "Desktop Lenovo ThinkCentre M90q",
    type: "Transferência",
    date: "2025-08-10",
    fromUser: "Mariana Costa",
    fromDepartment: "Marketing",
    toUser: "Rafael Souza",
    toDepartment: "Comercial",
    reason: "Mudança de função interna",
    responsible: "Felipe Miranda",
    termGenerated: true,
  },
  {
    id: "MOV-003",
    assetId: "AST-007",
    assetLabel: "Notebook HP EliteBook 840",
    type: "Descarte",
    date: "2025-12-02",
    fromUser: "Estoque TI",
    reason: "Equipamento sem reparo viável (placa-mãe queimada)",
    responsible: "Felipe Miranda",
    notes: "Descarte ecológico via parceiro Green Eletron — certificado #GE-22841",
  },
];
