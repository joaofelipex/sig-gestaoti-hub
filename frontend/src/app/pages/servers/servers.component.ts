import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, Server } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';

@Component({
  selector: 'app-servers',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Servidores</h1>
          <p class="app-page-sub">Infraestrutura, ambientes e capacidade.</p>
        </div>
      </header>
      <app-data-toolbar searchPlaceholder="Buscar nome, provedor..." [search]="search"
        [filters]="[{key:'status',label:'Status',options:[{value:'Online',label:'Online'},{value:'Offline',label:'Offline'},{value:'Manutenção',label:'Manutenção'}]}]"
        [filterValues]="filterValues" (searchChange)="search=$event" (filterChange)="filterValues[$event.key]=$event.value"
        (newClick)="openNew()" (exportClick)="exportCSV()" (importFile)="importCSV($event)"></app-data-toolbar>
      <div *ngIf="loading" class="text-center py-8 text-gray-500">Carregando...</div>
      <div *ngIf="!loading" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provedor</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uptime</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custo Mensal</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr></thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let s of filtered" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ s.name }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ s.provider }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ s.type }}</td>
              <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded-full font-semibold" [class]="statusClass(s.status)">{{ s.status }}</span></td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ s.uptime }}%</td>
              <td class="px-4 py-3 text-sm text-gray-500">R$ {{ s.monthlyCost.toLocaleString('pt-BR') }}</td>
              <td class="px-4 py-3 text-right text-sm">
                <button (click)="openEdit(s)" class="text-blue-600 hover:underline mr-3">Editar</button>
                <button (click)="askDelete(s)" class="text-red-600 hover:underline">Excluir</button>
              </td>
            </tr>
            <tr *ngIf="!filtered.length"><td colspan="7" class="text-center py-8 text-sm text-gray-400">Nenhum servidor</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <app-modal [open]="modalOpen" [title]="form.id ? 'Editar Servidor' : 'Novo Servidor'" [saving]="saving" (close)="modalOpen=false" (save)="save()">
      <div class="grid grid-cols-2 gap-4">
        <label class="col-span-2 text-sm">Nome *<input [(ngModel)]="form.nome" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Provedor<input [(ngModel)]="form.provedor" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Tipo<input [(ngModel)]="form.tipo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm" placeholder="VPS, Dedicado, Cloud..."/></label>
        <label class="text-sm">Status<select [(ngModel)]="form.status" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option>Online</option><option>Offline</option><option>Manutenção</option></select></label>
        <label class="text-sm">Ambiente<select [(ngModel)]="form.ambiente" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option value="producao">Produção</option><option value="staging">Staging</option><option value="desenvolvimento">Desenvolvimento</option></select></label>
        <label class="text-sm">IP Público<input [(ngModel)]="form.ip_publico" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Região<input [(ngModel)]="form.regiao" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">SO<input [(ngModel)]="form.sistema_operacional" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">CPU<input [(ngModel)]="form.cpu" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">RAM<input [(ngModel)]="form.ram" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Armazenamento<input [(ngModel)]="form.armazenamento" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Uptime %<input type="number" step="0.1" [(ngModel)]="form.uptime_pct" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Custo Mensal (R$)<input type="number" step="0.01" [(ngModel)]="form.custo_mensal" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">SSL Vencimento<input type="date" [(ngModel)]="form.ssl_vencimento" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Contrato fim<input type="date" [(ngModel)]="form.contrato_fim" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="col-span-2 text-sm">Finalidade<input [(ngModel)]="form.finalidade" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
      </div>
    </app-modal>
    <app-confirm [open]="confirmOpen" title="Excluir servidor" [message]="'Excluir ' + (toDelete?.name || '?')" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class ServersComponent implements OnInit, OnDestroy {
  servers: Server[] = []; loading = true; search = ''; filterValues: any = {};
  modalOpen = false; confirmOpen = false; saving = false; form: any = {}; toDelete: Server | null = null;
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.servers = d.servers; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
  get filtered() {
    const q = this.search.toLowerCase();
    return this.servers.filter(s =>
      (!q || s.name?.toLowerCase().includes(q) || s.provider?.toLowerCase().includes(q) || s.ip?.toLowerCase().includes(q)) &&
      (!this.filterValues['status'] || s.status === this.filterValues['status'])
    );
  }
  statusClass(s: string) { return s === 'Online' ? 'bg-green-100 text-green-800' : s === 'Offline' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'; }
  openNew() { this.form = { status: 'Online', ambiente: 'producao', uptime_pct: 99.9, custo_mensal: 0 }; this.modalOpen = true; }
  openEdit(s: Server) { this.form = { id: s.id, nome: s.name, provedor: s.provider, tipo: s.type, status: s.status, ip_publico: s.ip, regiao: s.region, sistema_operacional: s.os, cpu: s.cpu, ram: s.ram, armazenamento: s.storage, uptime_pct: s.uptime, custo_mensal: s.monthlyCost, ssl_vencimento: s.sslExpiration, contrato_fim: s.contractEnd, finalidade: s.purpose }; this.modalOpen = true; }
  async save() { if (!this.form.nome) return; this.saving = true; const o = { ...this.form }; ['ssl_vencimento','contrato_fim'].forEach(k=>{ if(!o[k]) o[k]=null; }); const ok = await this.crud.upsert('servidores', o); this.saving = false; if (ok) this.modalOpen = false; }
  askDelete(s: Server) { this.toDelete = s; this.confirmOpen = true; }
  async doDelete() { if (this.toDelete) await this.crud.remove('servidores', this.toDelete.id); this.confirmOpen = false; this.toDelete = null; }
  exportCSV() { exportToCSV(this.filtered.map(s => ({ Nome: s.name, Provedor: s.provider, Tipo: s.type, Status: s.status, IP: s.ip, Uptime: s.uptime, CustoMensal: s.monthlyCost })), 'servidores'); }
  async importCSV(f: File) {
    const rows = parseCSV(await readFileAsText(f));
    const payload = rows.map(r => ({ nome: r['Nome'], provedor: r['Provedor']||null, tipo: r['Tipo']||null, status: r['Status']||'Online', ip_publico: r['IP']||null, uptime_pct: Number(r['Uptime']||100), custo_mensal: Number(r['CustoMensal']||0) })).filter(r => r.nome);
    if (payload.length) await this.crud.bulkInsert('servidores', payload);
  }
}
