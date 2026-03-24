export interface Asset {
  id: string;
  type: 'Desktop' | 'Notebook' | 'Monitor' | 'Servidor' | 'Impressora' | 'Switch' | 'Roteador';
  brand: string;
  model: string;
  serialNumber: string;
  status: 'Em uso' | 'Estoque' | 'Manutenção' | 'Aposentado';
  assignedTo: string | null;
  department: string;
  purchaseDate: string;
  warrantyEnd: string;
  specs: { cpu?: string; ram?: string; storage?: string };
  purchaseValue: number;
  maintenanceLog: { date: string; description: string; cost: number }[];
}

export interface Domain {
  id: string;
  url: string;
  registrar: string;
  expirationDate: string;
  renewalCost: number;
  autoRenew: boolean;
  dnsProvider: string;
  hostingProvider: string;
  sslExpiration: string;
  status: 'Ativo' | 'Expirando' | 'Expirado';
}

export interface License {
  id: string;
  software: string;
  type: 'Mensal' | 'Anual' | 'Perpétua';
  totalLicenses: number;
  usedLicenses: number;
  activationKey: string;
  costPerUnit: number;
  renewalDate: string;
  vendor: string;
  category: 'Produtividade' | 'Desenvolvimento' | 'Design' | 'Infraestrutura' | 'Segurança';
}

export interface AccessRecord {
  id: string;
  user: string;
  resource: string;
  resourceType: 'VPN' | 'Servidor' | 'Banco de Dados' | 'Aplicação' | 'Storage';
  accessLevel: 'Leitura' | 'Escrita' | 'Admin';
  grantedDate: string;
  lastAccess: string;
}

export const assets: Asset[] = [
  {
    id: 'AST-001', type: 'Notebook', brand: 'Dell', model: 'Latitude 5540',
    serialNumber: 'DL5540-2024-001', status: 'Em uso', assignedTo: 'Carlos Silva',
    department: 'Desenvolvimento', purchaseDate: '2024-01-15', warrantyEnd: '2027-01-15',
    specs: { cpu: 'Intel i7-1365U', ram: '16GB DDR5', storage: '512GB NVMe' },
    purchaseValue: 7500,
    maintenanceLog: [{ date: '2024-06-10', description: 'Upgrade RAM 16GB → 32GB', cost: 450 }],
  },
  {
    id: 'AST-002', type: 'Desktop', brand: 'Lenovo', model: 'ThinkCentre M90q',
    serialNumber: 'LN90Q-2023-045', status: 'Em uso', assignedTo: 'Ana Oliveira',
    department: 'Financeiro', purchaseDate: '2023-06-20', warrantyEnd: '2026-06-20',
    specs: { cpu: 'Intel i5-13500', ram: '16GB DDR4', storage: '256GB SSD' },
    purchaseValue: 5200,
    maintenanceLog: [],
  },
  {
    id: 'AST-003', type: 'Monitor', brand: 'LG', model: '27UK850-W',
    serialNumber: 'LG27UK-2023-012', status: 'Estoque', assignedTo: null,
    department: 'TI', purchaseDate: '2023-03-10', warrantyEnd: '2025-03-10',
    specs: {}, purchaseValue: 2800, maintenanceLog: [],
  },
  {
    id: 'AST-004', type: 'Servidor', brand: 'HP', model: 'ProLiant DL380 Gen10',
    serialNumber: 'HP380G10-2022-003', status: 'Em uso', assignedTo: 'Infra TI',
    department: 'TI', purchaseDate: '2022-01-05', warrantyEnd: '2025-01-05',
    specs: { cpu: 'Xeon Gold 6248R', ram: '128GB ECC', storage: '4TB RAID 10' },
    purchaseValue: 45000,
    maintenanceLog: [
      { date: '2023-08-15', description: 'Troca de disco RAID', cost: 1200 },
      { date: '2024-02-20', description: 'Upgrade firmware iLO', cost: 0 },
    ],
  },
  {
    id: 'AST-005', type: 'Notebook', brand: 'Apple', model: 'MacBook Pro 14"',
    serialNumber: 'APMBP14-2024-007', status: 'Em uso', assignedTo: 'Marcos Pereira',
    department: 'Design', purchaseDate: '2024-03-01', warrantyEnd: '2027-03-01',
    specs: { cpu: 'Apple M3 Pro', ram: '18GB', storage: '512GB SSD' },
    purchaseValue: 15000, maintenanceLog: [],
  },
  {
    id: 'AST-006', type: 'Impressora', brand: 'Brother', model: 'MFC-L8900CDW',
    serialNumber: 'BR8900-2023-002', status: 'Manutenção', assignedTo: null,
    department: 'Administrativo', purchaseDate: '2023-09-12', warrantyEnd: '2025-09-12',
    specs: {}, purchaseValue: 3500,
    maintenanceLog: [{ date: '2025-03-10', description: 'Reparo fusor', cost: 680 }],
  },
  {
    id: 'AST-007', type: 'Switch', brand: 'Cisco', model: 'Catalyst 9200L',
    serialNumber: 'CSC9200-2022-001', status: 'Em uso', assignedTo: 'Infra TI',
    department: 'TI', purchaseDate: '2022-05-18', warrantyEnd: '2025-05-18',
    specs: {}, purchaseValue: 12000, maintenanceLog: [],
  },
  {
    id: 'AST-008', type: 'Notebook', brand: 'Dell', model: 'Inspiron 15',
    serialNumber: 'DLINSP-2021-033', status: 'Aposentado', assignedTo: null,
    department: 'RH', purchaseDate: '2021-02-10', warrantyEnd: '2024-02-10',
    specs: { cpu: 'Intel i5-1135G7', ram: '8GB DDR4', storage: '256GB SSD' },
    purchaseValue: 4200, maintenanceLog: [],
  },
];

export const domains: Domain[] = [
  {
    id: 'DOM-001', url: 'imts.com.br', registrar: 'Registro.br',
    expirationDate: '2025-04-15', renewalCost: 40, autoRenew: true,
    dnsProvider: 'Cloudflare', hostingProvider: 'AWS', sslExpiration: '2025-06-20',
    status: 'Expirando',
  },
  {
    id: 'DOM-002', url: 'imts.dev', registrar: 'Google Domains',
    expirationDate: '2026-08-10', renewalCost: 12, autoRenew: true,
    dnsProvider: 'Cloudflare', hostingProvider: 'Vercel', sslExpiration: '2026-08-10',
    status: 'Ativo',
  },
  {
    id: 'DOM-003', url: 'sig.imts.com.br', registrar: 'Registro.br',
    expirationDate: '2025-04-15', renewalCost: 0, autoRenew: true,
    dnsProvider: 'Cloudflare', hostingProvider: 'AWS', sslExpiration: '2025-05-01',
    status: 'Expirando',
  },
  {
    id: 'DOM-004', url: 'portal-cliente.imts.com.br', registrar: 'Registro.br',
    expirationDate: '2025-04-15', renewalCost: 0, autoRenew: true,
    dnsProvider: 'Route53', hostingProvider: 'AWS', sslExpiration: '2025-12-15',
    status: 'Ativo',
  },
  {
    id: 'DOM-005', url: 'legacyapp.com', registrar: 'GoDaddy',
    expirationDate: '2025-03-01', renewalCost: 60, autoRenew: false,
    dnsProvider: 'GoDaddy', hostingProvider: 'DigitalOcean', sslExpiration: '2025-02-28',
    status: 'Expirado',
  },
];

export const licenses: License[] = [
  {
    id: 'LIC-001', software: 'Microsoft 365 Business', type: 'Mensal',
    totalLicenses: 50, usedLicenses: 42, activationKey: '****-****-****-M365',
    costPerUnit: 75, renewalDate: '2025-04-01', vendor: 'Microsoft',
    category: 'Produtividade',
  },
  {
    id: 'LIC-002', software: 'Adobe Creative Cloud', type: 'Anual',
    totalLicenses: 8, usedLicenses: 6, activationKey: '****-****-****-ADCC',
    costPerUnit: 290, renewalDate: '2025-09-15', vendor: 'Adobe',
    category: 'Design',
  },
  {
    id: 'LIC-003', software: 'JetBrains All Products', type: 'Anual',
    totalLicenses: 15, usedLicenses: 12, activationKey: '****-****-****-JBAP',
    costPerUnit: 150, renewalDate: '2025-11-01', vendor: 'JetBrains',
    category: 'Desenvolvimento',
  },
  {
    id: 'LIC-004', software: 'AWS (Reserved Instances)', type: 'Anual',
    totalLicenses: 1, usedLicenses: 1, activationKey: 'N/A',
    costPerUnit: 8500, renewalDate: '2025-07-01', vendor: 'Amazon',
    category: 'Infraestrutura',
  },
  {
    id: 'LIC-005', software: 'Google Workspace', type: 'Mensal',
    totalLicenses: 30, usedLicenses: 28, activationKey: 'N/A',
    costPerUnit: 55, renewalDate: '2025-04-01', vendor: 'Google',
    category: 'Produtividade',
  },
  {
    id: 'LIC-006', software: 'CrowdStrike Falcon', type: 'Anual',
    totalLicenses: 60, usedLicenses: 55, activationKey: '****-****-****-CRWD',
    costPerUnit: 45, renewalDate: '2025-12-01', vendor: 'CrowdStrike',
    category: 'Segurança',
  },
];

export const accessRecords: AccessRecord[] = [
  { id: 'ACC-001', user: 'Carlos Silva', resource: 'VPN Corporativa', resourceType: 'VPN', accessLevel: 'Escrita', grantedDate: '2024-01-15', lastAccess: '2025-03-23' },
  { id: 'ACC-002', user: 'Carlos Silva', resource: 'Servidor Produção', resourceType: 'Servidor', accessLevel: 'Admin', grantedDate: '2024-01-15', lastAccess: '2025-03-22' },
  { id: 'ACC-003', user: 'Ana Oliveira', resource: 'BD Financeiro', resourceType: 'Banco de Dados', accessLevel: 'Leitura', grantedDate: '2023-06-20', lastAccess: '2025-03-23' },
  { id: 'ACC-004', user: 'Marcos Pereira', resource: 'Figma Enterprise', resourceType: 'Aplicação', accessLevel: 'Escrita', grantedDate: '2024-03-01', lastAccess: '2025-03-21' },
  { id: 'ACC-005', user: 'Admin TI', resource: 'AWS Console', resourceType: 'Aplicação', accessLevel: 'Admin', grantedDate: '2022-01-01', lastAccess: '2025-03-23' },
  { id: 'ACC-006', user: 'Admin TI', resource: 'Backup Storage S3', resourceType: 'Storage', accessLevel: 'Admin', grantedDate: '2022-01-01', lastAccess: '2025-03-20' },
];

export const dashboardStats = {
  totalAssets: assets.length,
  assetsInUse: assets.filter(a => a.status === 'Em uso').length,
  assetsInMaintenance: assets.filter(a => a.status === 'Manutenção').length,
  expiringDomains: domains.filter(d => d.status === 'Expirando').length,
  expiredDomains: domains.filter(d => d.status === 'Expirado').length,
  totalLicenseCost: licenses.reduce((sum, l) => sum + l.costPerUnit * (l.type === 'Mensal' ? l.usedLicenses : l.usedLicenses), 0),
  unusedLicenses: licenses.reduce((sum, l) => sum + (l.totalLicenses - l.usedLicenses), 0),
  totalUsers: 45,
  sslExpiringCount: domains.filter(d => {
    const exp = new Date(d.sslExpiration);
    const now = new Date();
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff < 30 && diff > 0;
  }).length,
};
