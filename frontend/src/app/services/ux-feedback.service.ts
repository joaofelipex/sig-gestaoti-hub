import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class UxFeedbackService {
  constructor(private toast: ToastService) {}

  require(value: unknown, label: string): boolean {
    if (value !== null && value !== undefined && String(value).trim() !== '') return true;
    this.toast.show({
      title: 'Campo obrigatório',
      description: `Preencha ${label} para continuar.`,
      variant: 'destructive',
    });
    return false;
  }

  requireAll(fields: Array<[unknown, string]>): boolean {
    const missing = fields.find(([value]) => value === null || value === undefined || String(value).trim() === '');
    if (!missing) return true;
    return this.require(missing[0], missing[1]);
  }

  noImportRows(entity: string): void {
    this.toast.show({
      title: 'Importação sem registros',
      description: `Nenhuma linha válida de ${entity} foi encontrada no CSV.`,
      variant: 'destructive',
    });
  }

  noCalendarEvents(context: string): void {
    this.toast.show({
      title: 'Nenhuma data para exportar',
      description: `Não há ${context} com data cadastrada na lista atual.`,
      variant: 'destructive',
    });
  }

  calendarExported(count: number): void {
    this.toast.show({
      title: 'Calendário gerado',
      description: `${count} evento${count === 1 ? '' : 's'} no arquivo .ics. Importe no Google Agenda, Outlook ou Apple.`,
    });
  }
}
