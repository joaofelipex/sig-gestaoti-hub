export type MaintenanceType = "Preventiva" | "Corretiva";
export type MaintenanceStatus = "Agendada" | "Em andamento" | "Concluída" | "Cancelada";

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  assetLabel: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduledDate: string;
  completedDate?: string;
  description: string;
  technician: string;
  supplier?: string;
  ticketNumber?: string;
  cost: number;
  warrantyCovered: boolean;
  notes?: string;
}

export const initialMaintenance: MaintenanceRecord[] = [
  {
    id: "MNT-001",
    assetId: "AST-001",
    assetLabel: "Notebook Dell Latitude 5540",
    type: "Corretiva",
    status: "Concluída",
    scheduledDate: "2024-06-08",
    completedDate: "2024-06-10",
    description: "Upgrade de RAM de 16GB para 32GB",
    technician: "Felipe Miranda",
    supplier: "Dell Brasil",
    ticketNumber: "DELL-2024-8821",
    cost: 450,
    warrantyCovered: false,
  },
  {
    id: "MNT-002",
    assetId: "AST-004",
    assetLabel: "Servidor HP ProLiant DL380",
    type: "Preventiva",
    status: "Agendada",
    scheduledDate: "2026-05-15",
    description: "Limpeza interna, troca de pasta térmica e atualização de firmware",
    technician: "Equipe Infra TI",
    supplier: "HPE Service",
    cost: 1200,
    warrantyCovered: false,
  },
  {
    id: "MNT-003",
    assetId: "AST-002",
    assetLabel: "Desktop Lenovo ThinkCentre M90q",
    type: "Preventiva",
    status: "Concluída",
    scheduledDate: "2026-01-20",
    completedDate: "2026-01-20",
    description: "Limpeza e verificação geral semestral",
    technician: "Felipe Miranda",
    cost: 80,
    warrantyCovered: true,
  },
];
