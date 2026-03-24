import { useState } from "react";
import { domains as initialDomains, type Domain } from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, ShieldCheck, AlertTriangle, ExternalLink, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import DomainForm from "@/components/forms/DomainForm";

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    Ativo: 'bg-success/10 text-success border-success/20',
    Expirando: 'bg-warning/10 text-warning border-warning/20',
    Expirado: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return styles[status] || '';
};

export default function DomainsPage() {
  const [domainList, setDomainList] = useState<Domain[]>(initialDomains);
  const [formOpen, setFormOpen] = useState(false);

  const sorted = [...domainList].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

  const handleSave = (domain: Domain) => {
    setDomainList(prev => {
      const idx = prev.findIndex(d => d.id === domain.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = domain; return copy; }
      return [...prev, domain];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Domínios & Infraestrutura</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitoramento de domínios, DNS e certificados SSL</p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" /> Novo Domínio
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Globe className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Domínios</p>
              <p className="text-2xl font-bold text-foreground">{domainList.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Atenção Necessária</p>
              <p className="text-2xl font-bold text-foreground">{domainList.filter(d => d.status !== 'Ativo').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">SSL Válidos</p>
              <p className="text-2xl font-bold text-foreground">{domainList.filter(d => daysUntil(d.sslExpiration) > 0).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Linha do Tempo de Vencimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sorted.map(domain => {
            const days = daysUntil(domain.expirationDate);
            const sslDays = daysUntil(domain.sslExpiration);
            const progressVal = Math.max(0, Math.min(100, ((365 - Math.max(0, days)) / 365) * 100));

            return (
              <div key={domain.id} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        {domain.url}
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Registrar: {domain.registrar} · DNS: {domain.dnsProvider} · Host: {domain.hostingProvider}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusBadge(domain.status)}>{domain.status}</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Expiração</span>
                    <p className={`font-semibold mt-0.5 ${days < 0 ? 'text-destructive' : days < 30 ? 'text-warning' : 'text-foreground'}`}>
                      {days < 0 ? `Expirado há ${Math.abs(days)}d` : `${days} dias restantes`}
                    </p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">SSL</span>
                    <p className={`font-semibold mt-0.5 flex items-center gap-1 ${sslDays < 0 ? 'text-destructive' : sslDays < 30 ? 'text-warning' : 'text-success'}`}>
                      <ShieldCheck className="w-3 h-3" />
                      {sslDays < 0 ? 'Expirado' : `${sslDays}d`}
                    </p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Renovação</span>
                    <p className="font-semibold mt-0.5 text-foreground">R$ {domain.renewalCost > 0 ? domain.renewalCost : '—'}</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground">Auto-renew</span>
                    <p className={`font-semibold mt-0.5 ${domain.autoRenew ? 'text-success' : 'text-destructive'}`}>
                      {domain.autoRenew ? 'Sim' : 'Não'}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress value={progressVal} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <DomainForm open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} />
    </div>
  );
}
