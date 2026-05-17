/** Módulos PrimeNG reutilizáveis (tabelas, tabs, dialogs). */
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';

export const PRIMENG_UI = [TableModule, TabsModule, DialogModule, ButtonModule, InputTextModule] as const;
