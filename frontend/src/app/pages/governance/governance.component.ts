import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService, AccessRecord, RiskItem } from '../../services/dashboard.service';
import { CrudService } from '../../services/crud.service';
import { UxFeedbackService } from '../../services/ux-feedback.service';
import { DataToolbarComponent } from '../../components/data-toolbar.component';
import { ModalComponent, ConfirmComponent } from '../../components/modal.component';
import { KpiCardComponent, DonutChartComponent } from '../../components/charts.component';
import { exportToCSV, parseCSV, readFileAsText } from '../../utils/csv.util';
import { SigIcons } from '../../core/sig-icons';

@Component({
  selector: 'app-governance',
  standalone: true,
  imports: [CommonModule, FormsModule, DataToolbarComponent, ModalComponent, ConfirmComponent, KpiCardComponent, DonutChartComponent],
  template: `
    <section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">Governança</h1>
          <p class="app-page-sub">Matriz de acessos, riscos e indicadores de conformidade.</p>
        </div>
      </header>

      <div class="sig-kpi-grid">
        <app-kpi-card label="Índice de saúde de TI" [value]="healthScore + '%'" [icon]="icons.health" [color]="healthColor"></app-kpi-card>
        <app-kpi-card label="Acessos ativos" [value]="activeAccess" [icon]="icons.access" color="#10b981"></app-kpi-card>
        <app-kpi-card label="Riscos críticos" [value]="criticalRisks" [icon]="icons.alertCritical" color="#ef4444"></app-kpi-card>
        <app-kpi-card label="Riscos totais" [value]="risks.length" [icon]="icons.warning" color="#f59e0b"></app-kpi-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="sig-chart-panel">
          <h3 class="sig-chart-title">Riscos por severidade</h3>
          <app-donut-chart [data]="riskDistribution"></app-donut-chart>
        </div>
        <div class="sig-chart-panel">
          <h3 class="sig-chart-title">Acessos por nível</h3>
          <app-donut-chart [data]="accessDistribution"></app-donut-chart>
        </div>
      </div>

      <nav class="sig-tabs-nav" aria-label="Seções de governança">
          <button type="button" (click)="tab='access'" [class.is-active]="tab==='access'">Matriz de Acessos ({{ accessRecords.length }})</button>
          <button type="button" (click)="tab='risks'" [class.is-active]="tab==='risks'">Riscos ({{ risks.length }})</button>
      </nav>

      <ng-container *ngIf="tab==='access'">
        <app-data-toolbar searchPlaceholder="Buscar usuário, recurso..." [search]="searchA"
          [filters]="[{key:'nivel',label:'Nível',options:[{value:'Administrador',label:'Admin'},{value:'Escrita',label:'Escrita'},{value:'Leitura',label:'Leitura'}]}]"
          [filterValues]="filterA" (searchChange)="searchA=$event" (filterChange)="filterA[$event.key]=$event.value"
          (newClick)="openNewAccess()" (exportClick)="exportAccess()" (importFile)="importAccess($event)"></app-data-toolbar>
        <div class="sig-list-card">
          <div class="sig-table-wrap">
          <table class="sig-table">
            <thead><tr>
              <th>Usuário</th>
              <th>Recurso</th>
              <th>Tipo</th>
              <th>Nível</th>
              <th>Status</th>
              <th>Último Acesso</th>
              <th class="text-end">Ações</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let r of filteredAccess">
                <td class="fw-medium">{{ r.user }}</td>
                <td>{{ r.resource }}</td>
                <td>{{ r.resourceType }}</td>
                <td><span [class]="accessClass(r.accessLevel)">{{ r.accessLevel }}</span></td>
                <td><span [class]="r.ativo ? 'sig-badge sig-badge--success' : 'sig-badge sig-badge--danger'">{{ r.ativo ? 'Ativo' : 'Inativo' }}</span></td>
                <td>{{ r.lastAccess | date:'dd/MM/yyyy' }}</td>
                <td class="text-end">
                  <button type="button" (click)="openEditAccess(r)" class="sig-link-action me-3">Editar</button>
                  <button type="button" (click)="askDelete('access', r.id)" class="sig-link-action sig-link-action--danger">Excluir</button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="tab==='risks'">
        <app-data-toolbar searchPlaceholder="Buscar risco..." [search]="searchR"
          [filters]="[{key:'sev',label:'Severidade',options:[{value:'Crítico',label:'Crítico'},{value:'Alto',label:'Alto'},{value:'Médio',label:'Médio'},{value:'Baixo',label:'Baixo'}]}]"
          [filterValues]="filterR" (searchChange)="searchR=$event" (filterChange)="filterR[$event.key]=$event.value"
          (newClick)="openNewRisk()" (exportClick)="exportRisks()" (importFile)="importRisks($event)"></app-data-toolbar>
        <div class="sig-list-card">
          <div class="sig-table-wrap">
          <table class="sig-table">
            <thead><tr>
              <th>Título</th>
              <th>Severidade</th>
              <th>Responsável</th>
              <th>Mitigação</th>
              <th class="text-end">Ações</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let r of filteredRisks">
                <td class="fw-medium">{{ r.title }}</td>
                <td><span [class]="sevClass(r.severity)">{{ r.severity }}</span></td>
                <td>{{ r.owner || '—' }}</td>
                <td>{{ r.mitigation || '—' }}</td>
                <td class="text-end">
                  <button type="button" (click)="openEditRisk(r)" class="sig-link-action me-3">Editar</button>
                  <button type="button" (click)="askDelete('risk', r.id)" class="sig-link-action sig-link-action--danger">Excluir</button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </ng-container>
    </section>

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

    <app-confirm [open]="confirmOpen" title="Excluir" [message]="deleteMessage" [confirming]="deleting" (cancel)="confirmOpen=false" (confirm)="doDelete()"></app-confirm>
  `
})
export class GovernanceComponent implements OnInit, OnDestroy {
  readonly icons = SigIcons;
  accessRecords: AccessRecord[] = []; risks: RiskItem[] = []; loading = true; tab: 'access'|'risks' = 'access';
  searchA = ''; filterA: any = {}; searchR = ''; filterR: any = {};
  modalA = false; modalR = false; confirmOpen = false; saving = false; deleting = false;
  formA: any = {}; formR: any = {};
  delType: 'access'|'risk' = 'access'; delId = '';
  private sub!: Subscription;
  constructor(private dashboard: DashboardService, private crud: CrudService, private ux: UxFeedbackService) {}
  ngOnInit() { this.sub = this.dashboard.data$.subscribe(d => { this.accessRecords = d.accessRecords; this.risks = d.risks; this.loading = d.loading; }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  get filteredAccess() { const q = this.searchA.toLowerCase(); return this.accessRecords.filter(r => (!q || r.user?.toLowerCase().includes(q) || r.resource?.toLowerCase().includes(q)) && (!this.filterA['nivel'] || r.accessLevel === this.filterA['nivel'])); }
  get filteredRisks() { const q = this.searchR.toLowerCase(); return this.risks.filter(r => (!q || r.title?.toLowerCase().includes(q)) && (!this.filterR['sev'] || r.severity === this.filterR['sev'])); }

  get activeAccess() { return this.accessRecords.filter(r => r.ativo).length; }
  get criticalRisks() { return this.risks.filter(r => r.severity === 'Crítico').length; }
  get healthScore() { let s = 100; s -= this.criticalRisks * 15; s -= this.risks.filter(r => r.severity === 'Alto').length * 8; return Math.max(0, Math.min(100, s)); }
  get healthColor() { return this.healthScore >= 80 ? '#10b981' : this.healthScore >= 50 ? '#f59e0b' : '#ef4444'; }
  get deleteMessage() {
    if (this.delType === 'access') {
      const item = this.accessRecords.find((r) => r.id === this.delId);
      return `Excluir acesso de ${item?.user || '?'}?`;
    }
    const item = this.risks.find((r) => r.id === this.delId);
    return `Excluir risco ${item?.title || '?'}?`;
  }
  get riskDistribution() { const map: any = { Crítico:'#ef4444', Alto:'#f97316', Médio:'#f59e0b', Baixo:'#10b981' }; const counts: any = {}; this.risks.forEach(r => counts[r.severity] = (counts[r.severity]||0)+1); return Object.entries(counts).map(([k,v]:any) => ({ label: k, value: v as number, color: map[k] })); }
  get accessDistribution() { const counts: any = {}; this.accessRecords.forEach(r => counts[r.accessLevel] = (counts[r.accessLevel]||0)+1); return Object.entries(counts).map(([k,v]:any) => ({ label: k, value: v as number })); }

  accessClass(l: string) { return l === 'Administrador' ? 'bg-red-100 text-red-800' : l === 'Escrita' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'; }
  sevClass(s: string) { return s === 'Crítico' ? 'bg-red-100 text-red-800' : s === 'Alto' ? 'bg-orange-100 text-orange-800' : s === 'Médio' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'; }

  openNewAccess() { this.formA = { ativo: true, nivel_acesso: 'Leitura', recurso_tipo: 'Aplicação', sistema: 'IMTS', data_concessao: new Date().toISOString().slice(0,10) }; this.modalA = true; }
  openEditAccess(r: AccessRecord) { this.formA = { id: r.id, user_label: r.user, recurso: r.resource, recurso_tipo: r.resourceType, nivel_acesso: r.accessLevel, ativo: r.ativo, data_concessao: r.grantedDate, ultimo_acesso: r.lastAccess, sistema: 'IMTS' }; this.modalA = true; }
  async saveAccess() { if (!this.ux.require(this.formA.user_label, 'o usuário')) return; this.saving = true; try { const o = { ...this.formA }; if (!o.sistema) o.sistema = 'Sistema'; if (!o.ultimo_acesso) o.ultimo_acesso = null; const ok = await this.crud.upsert('registros_acesso', o); if (ok) this.modalA = false; } finally { this.saving = false; } }

  openNewRisk() { this.formR = { severity: 'Médio' }; this.modalR = true; }
  openEditRisk(r: RiskItem) { this.formR = { ...r }; this.modalR = true; }
  async saveRisk() { if (!this.ux.require(this.formR.title, 'o título do risco')) return; this.saving = true; try { const ok = await this.crud.upsert('riscos', this.formR); if (ok) this.modalR = false; } finally { this.saving = false; } }

  askDelete(t: 'access'|'risk', id: string) { this.delType = t; this.delId = id; this.confirmOpen = true; }
  async doDelete() { if (this.deleting) return; this.deleting = true; const ok = await this.crud.remove(this.delType === 'access' ? 'registros_acesso' : 'riscos', this.delId); this.deleting = false; if (ok) this.confirmOpen = false; }

  exportAccess() { exportToCSV(this.filteredAccess.map(r => ({ Usuario: r.user, Recurso: r.resource, Tipo: r.resourceType, Nivel: r.accessLevel, Ativo: r.ativo ? 'Sim':'Não', UltimoAcesso: r.lastAccess })), 'acessos'); }
  async importAccess(f: File) { const rows = parseCSV(await readFileAsText(f)); const p = rows.map(r => ({ user_label: r['Usuario'], recurso: r['Recurso']||null, recurso_tipo: r['Tipo']||'Aplicação', nivel_acesso: r['Nivel']||'Leitura', sistema: 'IMTS', ativo: (r['Ativo']||'Sim').toLowerCase().startsWith('s'), data_concessao: new Date().toISOString().slice(0,10) })).filter(r => r.user_label); if (p.length) await this.crud.bulkInsert('registros_acesso', p); else this.ux.noImportRows('acessos'); }
  exportRisks() { exportToCSV(this.filteredRisks.map(r => ({ Titulo: r.title, Severidade: r.severity, Responsavel: r.owner, Mitigacao: r.mitigation })), 'riscos'); }
  async importRisks(f: File) { const rows = parseCSV(await readFileAsText(f)); const p = rows.map(r => ({ title: r['Titulo'], severity: r['Severidade']||'Médio', owner: r['Responsavel']||null, mitigation: r['Mitigacao']||null })).filter(r => r.title); if (p.length) await this.crud.bulkInsert('riscos', p); else this.ux.noImportRows('riscos'); }
}
