import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Overlay de carregamento: logo IMTS + spinner + fundo blur. */
@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="sig-page-loading"
      [class.sig-page-loading--inline]="inline"
      role="status"
      aria-live="polite"
      [attr.aria-label]="label"
    >
      <img class="sig-page-loading__logo" src="icon-imts.png" alt="" />
      <div class="sig-page-loading__spinner" aria-hidden="true"></div>
      <span class="sig-sr-only">{{ label }}</span>
    </div>
  `,
})
export class LoadingComponent {
  @Input() label = 'A carregar…';
  /** Se true, ocupa só o contentor (não ecrã inteiro). */
  @Input() inline = false;
}
