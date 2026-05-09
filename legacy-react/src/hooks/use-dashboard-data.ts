import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Asset, Domain, License } from "@/data/mock-data";
import type { Server } from "@/data/servers-data";
import type { FinancialContract } from "@/lib/it-governance-data";

export interface DashboardData {
  assets: Asset[];
  domains: Domain[];
  licenses: License[];
  servers: Server[];
  contracts: FinancialContract[];
  loading: boolean;
  reload: () => Promise<void>;
}

function mapAsset(r: any): Asset {
  return {
    id: r.id,
    type: (r.tipo || "Notebook") as Asset["type"],
    brand: r.marca ?? "",
    model: r.modelo ?? "",
    serialNumber: r.numero_serie ?? "",
    status: (r.status === "ativo" ? "Em uso" : r.status === "estoque" ? "Estoque" : r.status === "manutencao" ? "Manutenção" : "Aposentado") as Asset["status"],
    assignedTo: r.assigned_to ?? null,
    department: r.department_nome ?? "",
    purchaseDate: r.data_aquisicao ?? new Date().toISOString().slice(0, 10),
    warrantyEnd: r.warranty_end ?? "",
    specs: (r.specs ?? {}) as Asset["specs"],
    purchaseValue: Number(r.valor_aquisicao ?? 0),
    maintenanceLog: (r.maintenance_log ?? []) as Asset["maintenanceLog"],
  };
}

function mapDomain(r: any): Domain {
  const exp = r.data_vencimento ?? "";
  const days = exp ? Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000) : 999;
  const status = days <= 0 ? "Expirado" : days <= 30 ? "Expirando" : "Ativo";
  return {
    id: r.id,
    url: r.nome,
    registrar: r.registrar ?? "",
    expirationDate: exp,
    renewalCost: Number(r.custo_renovacao ?? r.custo_anual ?? 0),
    autoRenew: !!r.auto_renovacao,
    dnsProvider: r.dns_provider ?? "",
    hostingProvider: r.hosting_provider ?? "",
    sslExpiration: r.ssl_vencimento ?? exp,
    status,
  };
}

function mapLicense(r: any): License {
  return {
    id: r.id,
    software: r.nome,
    type: (r.tipo || "Mensal") as License["type"],
    totalLicenses: r.total_licencas ?? 0,
    usedLicenses: r.qtd_usuarios ?? 0,
    activationKey: r.chave_ativacao ?? "",
    costPerUnit: Number(r.custo_unitario ?? 0),
    renewalDate: r.data_renovacao ?? "",
    vendor: r.fornecedor ?? "",
    category: (r.categoria || "Produtividade") as License["category"],
  };
}

function mapServer(r: any): Server {
  return {
    id: r.id,
    name: r.nome,
    provider: (r.provedor || "Outro") as Server["provider"],
    type: (r.tipo || "VPS") as Server["type"],
    region: r.regiao ?? "",
    ip: r.ip_publico ?? "",
    os: r.sistema_operacional ?? "",
    cpu: r.cpu ?? "",
    ram: r.ram ?? "",
    storage: r.armazenamento ?? "",
    status: (r.status || "Online") as Server["status"],
    uptime: Number(r.uptime_pct ?? 100),
    monthlyCost: Number(r.custo_mensal ?? 0),
    purpose: r.finalidade ?? "",
    responsibleTeam: r.equipe_responsavel ?? "",
    contractEnd: r.contrato_fim ?? "",
    lastBackup: r.ultimo_backup ?? "",
    monitoringUrl: r.url_monitoramento ?? undefined,
    sslExpiration: r.ssl_vencimento ?? undefined,
    notes: r.observacoes ?? undefined,
  };
}

function mapContract(r: any): FinancialContract {
  return {
    id: r.id,
    supplier: r.supplier,
    object: r.object,
    type: (r.type || "OPEX") as FinancialContract["type"],
    costCenter: r.cost_center ?? "",
    monthlyCost: Number(r.monthly_cost ?? 0),
    endDate: r.end_date ?? "",
    status: (r.status || "Ativo") as FinancialContract["status"],
  };
}

export function useDashboardData(): DashboardData {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [contracts, setContracts] = useState<FinancialContract[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, d, l, s, c] = await Promise.all([
      supabase.from("ativos").select("*"),
      supabase.from("dominios").select("*"),
      supabase.from("licencas").select("*"),
      supabase.from("servidores").select("*"),
      supabase.from("contratos").select("*"),
    ]);
    setAssets((a.data ?? []).map(mapAsset));
    setDomains((d.data ?? []).map(mapDomain));
    setLicenses((l.data ?? []).map(mapLicense));
    setServers((s.data ?? []).map(mapServer));
    setContracts((c.data ?? []).map(mapContract));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Realtime: recarrega automaticamente quando ativos/licenças/servidores/etc mudam
    const tables = ["ativos", "dominios", "licencas", "servidores", "contratos"];
    const channel = tables.reduce(
      (ch, t) =>
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: t },
          () => { load(); },
        ),
      supabase.channel(`dashboard-data-sync-${Math.random().toString(36).slice(2)}`),
    );
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { assets, domains, licenses, servers, contracts, loading, reload: load };
}
