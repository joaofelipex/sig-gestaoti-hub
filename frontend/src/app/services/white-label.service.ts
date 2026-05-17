import { Injectable } from '@angular/core';
import { LARA_LIGHT_BLUE, WhiteLabelConfig } from '../core/white-label.model';

@Injectable({ providedIn: 'root' })
export class WhiteLabelService {
  private config: WhiteLabelConfig = { ...LARA_LIGHT_BLUE };

  apply(config: WhiteLabelConfig): void {
    this.config = { ...this.config, ...config };
    const root = document.documentElement;
    const map: Record<string, string | undefined> = {
      backgroundColor: '--wl-background-color',
      surfaceColor: '--wl-surface-color',
      borderColor: '--wl-border-color',
      primaryColor: '--wl-primary-color',
      primaryHover: '--wl-primary-hover',
      primaryDark: '--wl-primary-dark',
      primaryLight: '--wl-primary-light',
      primarySubtle: '--wl-primary-subtle',
      textColor: '--wl-text-color',
      textMuted: '--wl-text-muted',
    };

    for (const [key, cssVar] of Object.entries(map) as [keyof WhiteLabelConfig, string][]) {
      const val = config[key];
      if (cssVar && typeof val === 'string') {
        root.style.setProperty(cssVar, val);
      }
    }

    if (config.primaryColor) {
      root.style.setProperty('--bs-primary', config.primaryColor);
    }

    if (config.brandName) {
      root.style.setProperty('--wl-brand-name', `"${config.brandName}"`);
    }
    if (config.brandSubtitle) {
      root.style.setProperty('--wl-brand-subtitle', `"${config.brandSubtitle}"`);
    }
  }

  get(): Readonly<WhiteLabelConfig> {
    return this.config;
  }

  get brandName(): string {
    return this.config.brandName ?? LARA_LIGHT_BLUE.brandName;
  }

  get brandSubtitle(): string {
    return this.config.brandSubtitle ?? LARA_LIGHT_BLUE.brandSubtitle;
  }

  get logoUrl(): string | null {
    return this.config.logoUrl ?? null;
  }

  get logoMiniUrl(): string | null {
    return this.config.logoMiniUrl ?? this.config.logoUrl ?? null;
  }
}
