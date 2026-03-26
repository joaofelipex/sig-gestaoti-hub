import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Server } from "@/data/servers-data";

interface ServerFormProps {
  onSubmit: (server: Server) => void;
  initialData?: Server;
}

export default function ServerForm({ onSubmit, initialData }: ServerFormProps) {
  const [form, setForm] = useState<Partial<Server>>(
    initialData ?? {
      id: `SRV-${String(Date.now()).slice(-4)}`,
      name: '', provider: 'AWS', type: 'Cloud Instance', region: '', ip: '',
      os: '', cpu: '', ram: '', storage: '', status: 'Online', uptime: 99.9,
      monthlyCost: 0, purpose: '', responsibleTeam: '', contractEnd: '',
      lastBackup: '', monitoringUrl: '', sslExpiration: '', notes: '',
    }
  );

  const set = (k: keyof Server, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form as Server);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
      <div className="space-y-1.5">
        <Label>Nome do Servidor</Label>
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="prod-api-01" required />
      </div>
      <div className="space-y-1.5">
        <Label>Provedor</Label>
        <Select value={form.provider} onValueChange={v => set('provider', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['AWS', 'Azure', 'Google Cloud', 'DigitalOcean', 'Linode', 'OVH', 'Contabo', 'Outro'].map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={form.type} onValueChange={v => set('type', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['VPS', 'Dedicado', 'Cloud Instance', 'Kubernetes', 'Serverless'].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Região / Data Center</Label>
        <Input value={form.region} onChange={e => set('region', e.target.value)} placeholder="sa-east-1 (São Paulo)" required />
      </div>
      <div className="space-y-1.5">
        <Label>IP (público)</Label>
        <Input value={form.ip} onChange={e => set('ip', e.target.value)} placeholder="54.207.xxx.xxx" required />
      </div>
      <div className="space-y-1.5">
        <Label>Sistema Operacional</Label>
        <Input value={form.os} onChange={e => set('os', e.target.value)} placeholder="Ubuntu 22.04 LTS" required />
      </div>
      <div className="space-y-1.5">
        <Label>CPU</Label>
        <Input value={form.cpu} onChange={e => set('cpu', e.target.value)} placeholder="4 vCPUs" required />
      </div>
      <div className="space-y-1.5">
        <Label>RAM</Label>
        <Input value={form.ram} onChange={e => set('ram', e.target.value)} placeholder="8GB" required />
      </div>
      <div className="space-y-1.5">
        <Label>Armazenamento</Label>
        <Input value={form.storage} onChange={e => set('storage', e.target.value)} placeholder="100GB SSD" required />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={v => set('status', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Online', 'Offline', 'Manutenção', 'Degradado'].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Custo Mensal (R$)</Label>
        <Input type="number" value={form.monthlyCost} onChange={e => set('monthlyCost', +e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Uptime (%)</Label>
        <Input type="number" step="0.01" value={form.uptime} onChange={e => set('uptime', +e.target.value)} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label>Finalidade / Propósito</Label>
        <Input value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="API Principal / Backend" required />
      </div>
      <div className="space-y-1.5">
        <Label>Equipe Responsável</Label>
        <Input value={form.responsibleTeam} onChange={e => set('responsibleTeam', e.target.value)} placeholder="Infra TI" required />
      </div>
      <div className="space-y-1.5">
        <Label>Fim do Contrato</Label>
        <Input type="date" value={form.contractEnd} onChange={e => set('contractEnd', e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Último Backup</Label>
        <Input type="date" value={form.lastBackup} onChange={e => set('lastBackup', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Expiração SSL</Label>
        <Input type="date" value={form.sslExpiration} onChange={e => set('sslExpiration', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>URL de Monitoramento</Label>
        <Input value={form.monitoringUrl} onChange={e => set('monitoringUrl', e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas adicionais..." />
      </div>

      <div className="md:col-span-2 pt-2">
        <Button type="submit" className="w-full">{initialData ? 'Salvar Alterações' : 'Cadastrar Servidor'}</Button>
      </div>
    </form>
  );
}
