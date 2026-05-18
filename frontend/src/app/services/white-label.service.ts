import { Injectable } from '@angular/core';
import { SIG_DEFAULT_WHITELABEL, WhiteLabelConfig } from '../core/white-label.model';

@Injectable({ providedIn: 'root' })
export class WhiteLabelService {
  private config: WhiteLabelConfig = { ...SIG_DEFAULT_WHITELABEL };

  apply(config: WhiteLabelConfig): void {
    this.config = { ...this.config, ...config };
    const root = document.documentElement;

    if (config.backgroundColor) {
      root.style.setProperty('--wl-background-color', config.backgroundColor);
      const hex = this.rgbToHex(config.backgroundColor);
      if (hex) {
        root.style.setProperty('--wl-brand-hex', hex);
        root.style.setProperty('--bs-primary', hex);
      }
    }

    if (config.textColor) {
      root.style.setProperty('--wl-text-color', config.textColor);
    }

    if (config.backgroundImage) {
      const url = config.backgroundImage.startsWith('url(')
        ? config.backgroundImage
        : config.backgroundImage.startsWith('http') || config.backgroundImage.startsWith('/')
          ? `url('${config.backgroundImage}')`
          : `url('/${config.backgroundImage}')`;
      root.style.setProperty('--wl-login-bg-image', url);
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
    return this.config.brandName ?? SIG_DEFAULT_WHITELABEL.brandName;
  }

  get brandSubtitle(): string {
    return this.config.brandSubtitle ?? SIG_DEFAULT_WHITELABEL.brandSubtitle;
  }

  get logoUrl(): string | null {
    return this.config.logoUrl ?? null;
  }

  get logoHorizontal(): string | null {
    return this.config.logoUrl ?? null;
  }

  get logoIcon(): string | null {
    return this.config.logoIconUrl ?? this.config.logoUrl ?? null;
  }

  get logoLogin(): string | null {
    return this.config.logoLoginUrl ?? this.config.logoUrl ?? null;
  }

  brandRgba(alpha: number): string {
    return `rgba(var(--wl-background-color), ${alpha})`;
  }

  private rgbToHex(rgb: string): string | null {
    const parts = rgb.split(',').map((s) => parseInt(s.trim(), 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    return `#${parts.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  }
}
