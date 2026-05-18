/**
 * Ícones Font Awesome 6 (classes completas) — padrão visual SIG.
 * Uso: [icon]="SigIcons.health" ou icon="fas fa-laptop"
 */
export const SigIcons = {
  health: 'fas fa-heart-pulse',
  assets: 'fas fa-laptop',
  cost: 'fas fa-coins',
  domain: 'fas fa-globe',
  license: 'fas fa-key',
  alert: 'fas fa-bell',
  alertCritical: 'fas fa-circle-exclamation',
  warning: 'fas fa-triangle-exclamation',
  info: 'fas fa-circle-info',
  success: 'fas fa-circle-check',
  pending: 'fas fa-clock',
  overdue: 'fas fa-calendar-xmark',
  access: 'fas fa-unlock-keyhole',
  chart: 'fas fa-chart-line',
  chartPie: 'fas fa-chart-pie',
  refresh: 'fas fa-arrows-rotate',
  check: 'fas fa-check',
  close: 'fas fa-xmark',
  trash: 'fas fa-trash-can',
  budget: 'fas fa-wallet',
  savings: 'fas fa-piggy-bank',
  tasks: 'fas fa-list-check',
  tasksDone: 'fas fa-clipboard-check',
  search: 'fas fa-magnifying-glass',
  import: 'fas fa-file-import',
  export: 'fas fa-file-export',
  plus: 'fas fa-plus',
  building: 'fas fa-building',
  server: 'fas fa-server',
  shield: 'fas fa-shield-halved',
  wrench: 'fas fa-wrench',
  box: 'fas fa-boxes-stacked',
  external: 'fas fa-arrow-up-right-from-square',
  eye: 'fas fa-eye',
  pencil: 'fas fa-pen',
} as const;

export type SigIconClass = (typeof SigIcons)[keyof typeof SigIcons];
