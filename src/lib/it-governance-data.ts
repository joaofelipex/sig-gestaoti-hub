import { assets, domains, licenses, accessRecords } from "@/data/mock-data";
import { servers } from "@/data/servers-data";

export const sigUsers = [
  { id: "USR-001", name: "Felipe Miranda", department: "TI", role: "Administrador do Sistema", costCenter: "CC-120 TI Corporativo" },
  { id: "USR-002", name: "Carlos Silva", department: "Desenvolvimento", role: "Desenvolvedor Sênior", costCenter: "CC-210 Engenharia" },
  { id: "USR-003", name: "Ana Oliveira", department: "Financeiro", role: "Analista Financeiro", costCenter: "CC-310 Financeiro" },
  { id: "USR-004", name: "Marcos Pereira", department: "Design", role: "Designer Produto", costCenter: "CC-230 Produto" },
];

export const suppliers = [
  { name: "Microsoft", category: "SaaS", annualCost: 37800, contracts: 2 },
  { name: "AWS", category: "Cloud", annualCost: 102000, contracts: 3 },
  { name: "Dell", category: "Hardware", annualCost: 48500, contracts: 1 },
  { name: "Cloudflare", category: "Infraestrutura", annualCost: 6400, contracts: 1 },
];

export const contracts = [
  { id: "CTR-001", supplier: "Microsoft", object: "Microsoft 365 Business", type: "OPEX", costCenter: "CC-120 TI Corporativo", monthlyCost: 3150, endDate: "2026-04-01", status: "Ativo" },
  { id: "CTR-002", supplier: "AWS", object: "Servidores produção", type: "OPEX", costCenter: "CC-210 Engenharia", monthlyCost: 2130, endDate: "2026-01-15", status: "Ativo" },
  { id: "CTR-003", supplier: "Dell", object: "Renovação parque notebooks", type: "CAPEX", costCenter: "CC-120 TI Corporativo", monthlyCost: 0, endDate: "2026-12-31", status: "Planejado" },
  { id: "CTR-004", supplier: "CrowdStrike", object: "Proteção endpoints", type: "OPEX", costCenter: "CC-120 TI Corporativo", monthlyCost: 2475, endDate: "2025-12-01", status: "Ativo" },
];

export const risks = [
  { id: "RSK-001", title: "Domínios sem auto-renew", severity: "Alta", owner: "Infra TI", mitigation: "Ativar renovação automática e alerta financeiro" },
  { id: "RSK-002", title: "Backups com RPO acima do definido", severity: "Média", owner: "DevOps", mitigation: "Revisar agenda e monitoramento dos jobs" },
  { id: "RSK-003", title: "Licenças ociosas", severity: "Média", owner: "TI", mitigation: "Auditoria mensal de uso por centro de custo" },
];

export function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function getOperationalAlerts() {
  const domainAlerts = domains.flatMap(domain => {
    const domainDays = daysUntil(domain.expirationDate);
    const sslDays = daysUntil(domain.sslExpiration);
    return [
      domainDays <= 30 ? { id: `domain-${domain.id}`, type: domainDays <= 0 ? "critical" : "warning", source: "Domínio", title: domain.url, message: domainDays <= 0 ? "Domínio expirado" : `Domínio vence em ${domainDays} dias`, dueDate: domain.expirationDate } : null,
      sslDays <= 30 ? { id: `ssl-${domain.id}`, type: sslDays <= 0 ? "critical" : "warning", source: "SSL", title: domain.url, message: sslDays <= 0 ? "Certificado SSL expirado" : `SSL vence em ${sslDays} dias`, dueDate: domain.sslExpiration } : null,
    ].filter(Boolean);
  });

  const serverAlerts = servers.flatMap(server => {
    const contractDays = daysUntil(server.contractEnd);
    const backupAge = Math.floor((Date.now() - new Date(server.lastBackup).getTime()) / (1000 * 60 * 60 * 24));
    return [
      contractDays <= 30 ? { id: `contract-${server.id}`, type: contractDays <= 0 ? "critical" : "warning", source: "Contrato", title: server.name, message: contractDays <= 0 ? "Contrato vencido" : `Contrato vence em ${contractDays} dias`, dueDate: server.contractEnd } : null,
      backupAge > 3 ? { id: `backup-${server.id}`, type: "warning", source: "Backup", title: server.name, message: `Último backup há ${backupAge} dias`, dueDate: server.lastBackup } : null,
      server.status === "Offline" || server.status === "Degradado" ? { id: `status-${server.id}`, type: "critical", source: "Servidor", title: server.name, message: `Servidor ${server.status}`, dueDate: server.contractEnd } : null,
    ].filter(Boolean);
  });

  const assetAlerts = assets
    .filter(asset => asset.status === "Manutenção")
    .map(asset => ({ id: `asset-${asset.id}`, type: "warning", source: "Manutenção", title: `${asset.brand} ${asset.model}`, message: "Ativo em manutenção", dueDate: asset.warrantyEnd }));

  return [...domainAlerts, ...serverAlerts, ...assetAlerts] as Array<{
    id: string; type: string; source: string; title: string; message: string; dueDate: string;
  }>;
}

export const moduleReadiness = [
  { label: "CRUD em tela", done: [assets.length, domains.length, licenses.length, servers.length, accessRecords.length].every(Boolean), status: "Operacional no navegador" },
  { label: "Integração SIG", done: true, status: "Tabelas espelho definidas" },
  { label: "Auditoria", done: true, status: "Histórico local por ação" },
  { label: "Persistência real", done: false, status: "Aguardando Lovable Cloud" },
];