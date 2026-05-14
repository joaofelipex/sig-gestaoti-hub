import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, AccessRecord, RiskItem } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { KpiCardComponent, DonutChartComponent } from '../../components/charts.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';

@Component({
  selector: 'app-governance',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent, KpiCardComponent, DonutChartComponent],
  template: `
    <div class="p-6 space-y-4">
      <h1 class="text-2xl font-bold">Governança</h1>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <app-kpi-card label="IT Health Score" [value]="healthScore + '%'" icon="❤️" [color]="healthColor"></app-kpi-card>
        <app-kpi-card label="Acessos Ativos" [value]="activeAccess" icon="🔓" color="#10b981"></app-kpi-card>
        <app-kpi-card label="Riscos Críticos" [value]="criticalRisks" icon="🚨" color="#ef4444"></app-kpi-card>
        <app-kpi-card label="Riscos Totais" [value]="risks.length" icon="⚠️" color="#f59e0b"></app-kpi-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 class="font-semibold text-gray-900 mb-3">Distribuição de Riscos por Severidade</h3>
          <app-donut-chart [data]="riskDistribution"></app-donut-chart>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 class="font-semibold text-gray-900 mb-3">Acessos por Nível</h3>
          <app-donut-chart [data]="accessDistribution"></app-donut-chart>
        </div>
      </div>

      <div class="border-b border-gray-200">
        <nav class="flex gap-6">
          <button (click)="tab='access'" class="py-2 px-1 border-b-2 text-sm font-medium" [class]="tab==='access' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'">Matriz de Acessos ({{ accessRecords.length }})</button>
          <button (click)="tab='risks'" class="py-2 px-1 border-b-2 text-sm font-medium" [class]="tab==='risks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'">Riscos ({{ risks.length }})</button>
        </nav>
      </div>

      <ng-container *ngIf="tab==='access'">
        <app-data-toolbar searchPlaceholder="Buscar usuário, recurso..." [search]="searchA"
          [filters]="[{key:'nivel',label:'Nível',options:[{value:'Administrador',label:'Admin'},{value:'Escrita',label:'Escrita'},{value:'Leitura',label:'Leitura'}]}]"
          [filterValues]="filterA" (searchChange)="searchA=$event" (filterChange)="filterA[$event.key]=$event.value"
          (newClick)="openNewAccess()" (exportClick)="exportAccess()" (importFile)="importAccess($event)"></app-data-toolbar>
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50"><tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recurso</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nível</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Acesso</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr></thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let r of filteredAccess">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ r.user }}</td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ r.resource }}</td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ r.resourceType }}</td>
                <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded-full font-semibold" [class]="accessClass(r.accessLevel)">{{ r.accessLevel }}</span></td>
                <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded-full" [class]="r.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">{{ r.ativo ? 'Ativo' : 'Inativo' }}</span></td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ r.lastAccess | date:'dd/MM/yyyy' }}</td>
                <td class="px-4 py-3 text-right text-sm">
                  <button (click)="openEditAccess(r)" class="text-blue-600 hover:underline mr-3">Editar</button>
                  <button (click)="askDelete('access', r.id)" class="text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <ng-container *ngIf="tab==='risks'">
        <app-data-toolbar searchPlaceholder="Buscar risco..." [search]="searchR"
          [filters]="[{key:'sev',label:'Severidade',options:[{value:'Crítico',label:'Crítico'},{value:'Alto',label:'Alto'},{value:'Médio',label:'Médio'},{value:'Baixo',label:'Baixo'}]}]"
          [filterValues]="filterR" (searchChange)="searchR=$event" (filterChange)="filterR[$event.key]=$event.value"
          (newClick)="openNewRisk()" (exportClick)="exportRisks()" (importFile)="importRisks($event)"></app-data-toolbar>
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50"><tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severidade</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsável</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mitigação</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr></thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let r of filteredRisks">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ r.title }}</td>
                <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded-full font-semibold" [class]="sevClass(r.severity)">{{ r.severity }}</span></td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ r.owner || '—' }}</td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ r.mitigation || '—' }}</td>
                <td class="px-4 py-3 text-right text-sm">
                  <button (click)="openEditRisk(r)" class="text-blue-600 hover:underline mr-3">Editar</button>
                  <button (click)="askDelete('risk', r.id)" class="text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>

    <app-modal [open]="modalA" [title]="formA.id ? 'Editar Acesso' : 'Novo Acesso'" [saving]="saving" (close)="modalA=false" (save)="saveAccess()">
      <div class="grid grid-cols-2 gap-4">
        <label class="col-span-2 text-sm">Usuário *<input [(ngModel)]="formA.user_label" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Recurso<input [(ngModel)]="formA.recurso" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Tipo<select [(ngModel)]="formA.recurso_tipo" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option>Aplicação</option><option>Servidor</option><option>Banco de Dados</option><option>Sistema</option></select></label>
        <label class="text-sm">Nível<select [(ngModel)]="formA.nivel_acesso" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option>Administrador</option><option>Escrita</option><option>Leitura</option></select></label>
        <label class="text-sm">Sistema<input [(ngModel)]="formA.sistema" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Concedido em<input type="date" [(ngModel)]="formA.data_concessao" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Último acesso<input type="date" [(ngModel)]="formA.ultimo_acesso" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="col-span-2 text-sm flex items-center gap-2"><input type="checkbox" [(ngModel)]="formA.ativo"/> Ativo</label>
      </div>
    </app-modal>

    <app-modal [open]="modalR" [title]="formR.id ? 'Editar Risco' : 'Novo Risco'" [saving]="saving" (close)="modalR=false" (save)="saveRisk()">
      <div class="grid grid-cols-2 gap-4">
        <label class="col-span-2 text-sm">Título *<input [(ngModel)]="formR.title" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="text-sm">Severidade<select [(ngModel)]="formR.severity" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"><option>Crítico</option><option>Alto</option><option>Médio</option><option>Baixo</option></select></label>
        <label class="text-sm">Responsável<input [(ngModel)]="formR.owner" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"/></label>
        <label class="col-span-2 text-sm">Mitigação<textarea [(ngModel)]="formR.mitigation" rows="3" class="mt-1 w-full px-3 py-2 border rounded-md text-sm"></textarea></label>
      </div>
    </app-modal>

    <app-confirm [open]="confirmOpen" title="Excluir" message="Confirmar exclusão?" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class GovernanceComponent implements OnInit, OnDestroy {
  accessRecords: AccessRecord[] = []; risks: RiskItem[] = []; loading = true; tab: 'access'|'risks' = 'access';
  searchA = ''; filterA: any = {}; searchR = ''; filterR: any = {};
  modalA = false; modalR = false; confirmOpen = false; saving = false;
  formA: any = {}; formR: any = {};
  delType: 'access'|'risk' = 'access'; delId = '';
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.accessRecords = d.accessRecords; this.risks = d.risks; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  get filteredAccess() { const q = this.searchA.toLowerCase(); return this.accessRecords.filter(r => (!q || r.user?.toLowerCase().includes(q) || r.resource?.toLowerCase().includes(q)) && (!this.filterA['nivel'] || r.accessLevel === this.filterA['nivel'])); }
  get filteredRisks() { const q = this.searchR.toLowerCase(); return this.risks.filter(r => (!q || r.title?.toLowerCase().includes(q)) && (!this.filterR['sev'] || r.severity === this.filterR['sev'])); }

  get activeAccess() { return this.accessRecords.filter(r => r.ativo).length; }
  get criticalRisks() { return this.risks.filter(r => r.severity === 'Crítico').length; }
  get healthScore() { let s = 100; s -= this.criticalRisks * 15; s -= this.risks.filter(r => r.severity === 'Alto').length * 8; return Math.max(0, Math.min(100, s)); }
  get healthColor() { return this.healthScore >= 80 ? '#10b981' : this.healthScore >= 50 ? '#f59e0b' : '#ef4444'; }
  get riskDistribution() { const map: any = { Crítico:'#ef4444', Alto:'#f97316', Médio:'#f59e0b', Baixo:'#10b981' }; const counts: any = {}; this.risks.forEach(r => counts[r.severity] = (counts[r.severity]||0)+1); return Object.entries(counts).map(([k,v]:any) => ({ label: k, value: v as number, color: map[k] })); }
  get accessDistribution() { const counts: any = {}; this.accessRecords.forEach(r => counts[r.accessLevel] = (counts[r.accessLevel]||0)+1); return Object.entries(counts).map(([k,v]:any) => ({ label: k, value: v as number })); }

  accessClass(l: string) { return l === 'Administrador' ? 'bg-red-100 text-red-800' : l === 'Escrita' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'; }
  sevClass(s: string) { return s === 'Crítico' ? 'bg-red-100 text-red-800' : s === 'Alto' ? 'bg-orange-100 text-orange-800' : s === 'Médio' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'; }

  openNewAccess() { this.formA = { ativo: true, nivel_acesso: 'Leitura', recurso_tipo: 'Aplicação', sistema: 'IMTS', data_concessao: new Date().toISOString().slice(0,10) }; this.modalA = true; }
  openEditAccess(r: AccessRecord) { this.formA = { id: r.id, user_label: r.user, recurso: r.resource, recurso_tipo: r.resourceType, nivel_acesso: r.accessLevel, ativo: r.ativo, data_concessao: r.grantedDate, ultimo_acesso: r.lastAccess, sistema: 'IMTS' }; this.modalA = true; }
  async saveAccess() { if (!this.formA.user_label) return; this.saving = true; const o = { ...this.formA }; if (!o.sistema) o.sistema = 'Sistema'; if (!o.ultimo_acesso) o.ultimo_acesso = null; const ok = await this.crud.upsert('registros_acesso', o); this.saving = false; if (ok) this.modalA = false; }

  openNewRisk() { this.formR = { severity: 'Médio' }; this.modalR = true; }
  openEditRisk(r: RiskItem) { this.formR = { ...r }; this.modalR = true; }
  async saveRisk() { if (!this.formR.title) return; this.saving = true; const ok = await this.crud.upsert('riscos', this.formR); this.saving = false; if (ok) this.modalR = false; }

  askDelete(t: 'access'|'risk', id: string) { this.delType = t; this.delId = id; this.confirmOpen = true; }
  async doDelete() { await this.crud.remove(this.delType === 'access' ? 'registros_acesso' : 'riscos', this.delId); this.confirmOpen = false; }

  exportAccess() { exportToCSV(this.filteredAccess.map(r => ({ Usuario: r.user, Recurso: r.resource, Tipo: r.resourceType, Nivel: r.accessLevel, Ativo: r.ativo ? 'Sim':'Não', UltimoAcesso: r.lastAccess })), 'acessos'); }
  async importAccess(f: File) { const rows = parseCSV(await readFileAsText(f)); const p = rows.map(r => ({ user_label: r['Usuario'], recurso: r['Recurso']||null, recurso_tipo: r['Tipo']||'Aplicação', nivel_acesso: r['Nivel']||'Leitura', sistema: 'IMTS', ativo: (r['Ativo']||'Sim').toLowerCase().startsWith('s'), data_concessao: new Date().toISOString().slice(0,10) })).filter(r => r.user_label); if (p.length) await this.crud.bulkInsert('registros_acesso', p); }
  exportRisks() { exportToCSV(this.filteredRisks.map(r => ({ Titulo: r.title, Severidade: r.severity, Responsavel: r.owner, Mitigacao: r.mitigation })), 'riscos'); }
  async importRisks(f: File) { const rows = parseCSV(await readFileAsText(f)); const p = rows.map(r => ({ title: r['Titulo'], severity: r['Severidade']||'Médio', owner: r['Responsavel']||null, mitigation: r['Mitigacao']||null })).filter(r => r.title); if (p.length) await this.crud.bulkInsert('riscos', p); }
}
