import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="open" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" (click)="onBackdrop($event)">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
          <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div class="px-6 py-4 overflow-y-auto flex-1">
          <ng-content></ng-content>
        </div>
        <div class="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 rounded-b-lg">
          <button (click)="close.emit()" class="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm">Cancelar</button>
          <button (click)="save.emit()" [disabled]="saving" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-sm font-medium">
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() saving = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  onBackdrop(_e: MouseEvent) { this.close.emit(); }
}

@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="open" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ title }}</h3>
        <p class="text-sm text-gray-600 mb-4">{{ message }}</p>
        <div class="flex justify-end gap-2">
          <button (click)="cancel.emit()" class="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm">Cancelar</button>
          <button (click)="confirm.emit()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium">Confirmar</button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmComponent {
  @Input() open = false;
  @Input() title = 'Confirmar';
  @Input() message = 'Tem certeza?';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
