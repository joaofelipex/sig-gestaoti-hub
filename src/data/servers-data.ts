export interface Server {
  id: string;
  name: string;
  provider: 'AWS' | 'Azure' | 'Google Cloud' | 'DigitalOcean' | 'Linode' | 'OVH' | 'Contabo' | 'Outro';
  type: 'VPS' | 'Dedicado' | 'Cloud Instance' | 'Kubernetes' | 'Serverless';
  region: string;
  ip: string;
  os: string;
  cpu: string;
  ram: string;
  storage: string;
  status: 'Online' | 'Offline' | 'Manutenção' | 'Degradado';
  uptime: number; // percentage
  monthlyCost: number;
  purpose: string;
  responsibleTeam: string;
  contractEnd: string;
  lastBackup: string;
  monitoringUrl?: string;
  sslExpiration?: string;
  notes?: string;
}

export const servers: Server[] = [
  {
    id: 'SRV-001', name: 'prod-api-01', provider: 'AWS', type: 'Cloud Instance',
    region: 'sa-east-1 (São Paulo)', ip: '54.207.xxx.xxx', os: 'Ubuntu 22.04 LTS',
    cpu: '4 vCPUs (c5.xlarge)', ram: '8GB', storage: '100GB EBS gp3',
    status: 'Online', uptime: 99.95, monthlyCost: 680,
    purpose: 'API Principal / Backend ERP', responsibleTeam: 'Desenvolvimento',
    contractEnd: '2026-01-15', lastBackup: '2026-03-26',
    monitoringUrl: 'https://monitoring.imts.com.br/srv-001',
    sslExpiration: '2026-08-15',
  },
  {
    id: 'SRV-002', name: 'prod-db-01', provider: 'AWS', type: 'Cloud Instance',
    region: 'sa-east-1 (São Paulo)', ip: '54.207.xxx.xxx', os: 'Amazon Linux 2023',
    cpu: '8 vCPUs (r6g.2xlarge)', ram: '64GB', storage: '500GB io2 RAID',
    status: 'Online', uptime: 99.99, monthlyCost: 1450,
    purpose: 'Banco de Dados PostgreSQL (Produção)', responsibleTeam: 'Infra TI',
    contractEnd: '2026-01-15', lastBackup: '2026-03-26',
    notes: 'RDS Multi-AZ habilitado',
  },
  {
    id: 'SRV-003', name: 'staging-01', provider: 'DigitalOcean', type: 'VPS',
    region: 'NYC1 (New York)', ip: '164.90.xxx.xxx', os: 'Ubuntu 22.04 LTS',
    cpu: '2 vCPUs', ram: '4GB', storage: '80GB SSD',
    status: 'Online', uptime: 99.5, monthlyCost: 120,
    purpose: 'Ambiente de Homologação', responsibleTeam: 'Desenvolvimento',
    contractEnd: '2026-06-01', lastBackup: '2026-03-25',
  },
  {
    id: 'SRV-004', name: 'mail-srv', provider: 'Contabo', type: 'VPS',
    region: 'EU (Alemanha)', ip: '62.171.xxx.xxx', os: 'Debian 12',
    cpu: '4 vCPUs', ram: '8GB', storage: '200GB NVMe',
    status: 'Degradado', uptime: 97.2, monthlyCost: 95,
    purpose: 'Servidor de E-mail Corporativo', responsibleTeam: 'Infra TI',
    contractEnd: '2025-12-01', lastBackup: '2026-03-20',
    sslExpiration: '2026-04-10',
    notes: 'Alta utilização de disco (85%)',
  },
  {
    id: 'SRV-005', name: 'ci-cd-runner', provider: 'Google Cloud', type: 'Cloud Instance',
    region: 'southamerica-east1', ip: '35.199.xxx.xxx', os: 'Container-Optimized OS',
    cpu: '2 vCPUs (e2-medium)', ram: '4GB', storage: '50GB SSD',
    status: 'Online', uptime: 99.8, monthlyCost: 180,
    purpose: 'CI/CD Pipeline (GitHub Actions Runner)', responsibleTeam: 'DevOps',
    contractEnd: '2026-09-01', lastBackup: '2026-03-24',
  },
  {
    id: 'SRV-006', name: 'legacy-erp', provider: 'OVH', type: 'Dedicado',
    region: 'BHS (Canadá)', ip: '51.79.xxx.xxx', os: 'Windows Server 2019',
    cpu: 'Xeon E-2236 (6 cores)', ram: '32GB ECC', storage: '2x 1TB SSD RAID 1',
    status: 'Manutenção', uptime: 0, monthlyCost: 350,
    purpose: 'ERP Legado (migração planejada)', responsibleTeam: 'Infra TI',
    contractEnd: '2025-06-30', lastBackup: '2026-03-15',
    notes: 'Em processo de migração para AWS. Previsão: Q2 2026',
  },
];
