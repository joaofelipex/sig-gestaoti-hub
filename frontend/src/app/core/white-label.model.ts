/** Paleta Lara Light Blue — só design / white-label */
export interface WhiteLabelConfig {
  backgroundColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  primaryColor?: string;
  primaryHover?: string;
  primaryDark?: string;
  primaryLight?: string;
  primarySubtle?: string;
  textColor?: string;
  textMuted?: string;
  brandName?: string;
  brandSubtitle?: string;
  logoUrl?: string | null;
  logoMiniUrl?: string | null;
}

/** Valores padrão (stack: PrimeNG lara-light-blue) */
export const LARA_LIGHT_BLUE: Required<
  Pick<
    WhiteLabelConfig,
    | 'backgroundColor'
    | 'surfaceColor'
    | 'borderColor'
    | 'primaryColor'
    | 'primaryHover'
    | 'primaryDark'
    | 'primaryLight'
    | 'primarySubtle'
    | 'textColor'
    | 'textMuted'
    | 'brandName'
    | 'brandSubtitle'
  >
> & { logoUrl: null; logoMiniUrl: null } = {
  backgroundColor: '#eff6ff',
  surfaceColor: '#ffffff',
  borderColor: '#dbeafe',
  primaryColor: '#3b82f6',
  primaryHover: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#dbeafe',
  primarySubtle: '#eff6ff',
  textColor: '#0f172a',
  textMuted: '#64748b',
  brandName: 'IMTS',
  brandSubtitle: 'Gestão TI',
  logoUrl: null,
  logoMiniUrl: null,
};
