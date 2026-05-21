import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { EmpresaService, Empresa } from '../services/empresa.service';

@Component({
  selector: 'app-empresa-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sig-empresa" [class.is-open]="open">
      <button
        type="button"
        class="sig-empresa__button"
        (click)="toggle($event)"
        aria-label="Empresa"
        [attr.aria-expanded]="open"
        aria-haspopup="listbox"
      >
        <span class="sig-empresa__label">Empresa</span>
        <span class="sig-empresa__value">{{ selectedLabel }}</span>
      </button>

      <div *ngIf="open" class="sig-empresa__menu" role="listbox" aria-label="Empresa">
        <button
          type="button"
          class="sig-empresa__option"
          [class.is-active]="!selectedId"
          role="option"
          [attr.aria-selected]="!selectedId"
          (click)="select(null, $event)"
        >
          Todas as empresas
        </button>
        <button
          *ngFor="let e of empresas"
          type="button"
          class="sig-empresa__option"
          [class.is-active]="selectedId === e.id"
          role="option"
          [attr.aria-selected]="selectedId === e.id"
          (click)="select(e.id, $event)"
        >
          {{ e.nome }}
        </button>
      </div>
    </div>
  `,
})
export class EmpresaSelectorComponent implements OnInit, OnDestroy {
  empresas: Empresa[] = [];
  selectedId: string | null = null;
  open = false;
  private subs: Subscription[] = [];

  constructor(private svc: EmpresaService) {}

  ngOnInit(): void {
    void this.svc.load();
    this.subs.push(this.svc.list$.subscribe((l) => (this.empresas = l)));
    this.subs.push(this.svc.selected$.subscribe((id) => (this.selectedId = id)));
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  get selectedLabel(): string {
    return this.empresas.find((e) => e.id === this.selectedId)?.nome || 'Todas';
  }

  toggle(ev: MouseEvent): void {
    ev.stopPropagation();
    this.open = !this.open;
  }

  select(id: string | null, ev: MouseEvent): void {
    ev.stopPropagation();
    this.open = false;
    this.svc.setSelected(id);
  }

  @HostListener('document:click')
  close(): void {
    this.open = false;
  }
}
