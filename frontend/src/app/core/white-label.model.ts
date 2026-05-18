/**
 * White-label da instância (SIG).
 * --wl-background-color = RGB da marca, sem rgb(): "2, 62, 216"
 * --wl-text-color = texto sobre fundo da marca: "255, 255, 255"
 */
export interface WhiteLabelConfig {
  /** RGB primário (marca), ex: "2, 62, 216" */
  backgroundColor?: string;
  /** RGB texto sobre marca, ex: "255, 255, 255" */
  textColor?: string;
  /** Ficheiro ou URL do fundo do login */
  backgroundImage?: string;
  logoUrl?: string | null;
  logoIconUrl?: string | null;
  logoLoginUrl?: string | null;
  brandName?: string;
  brandSubtitle?: string;
}

export const SIG_DEFAULT_WHITELABEL: Required<
  Pick<WhiteLabelConfig, 'backgroundColor' | 'textColor' | 'backgroundImage' | 'brandName' | 'brandSubtitle'>
> & {
  logoUrl: null;
  logoIconUrl: null;
  logoLoginUrl: null;
} = {
  backgroundColor: '2, 62, 216',
  textColor: '255, 255, 255',
  backgroundImage: 'login-background.png',
  brandName: 'IMTS',
  brandSubtitle: 'Gestão TI',
  logoUrl: null,
  logoIconUrl: null,
  logoLoginUrl: null,
};

/** @deprecated use SIG_DEFAULT_WHITELABEL */
export const LARA_LIGHT_BLUE = SIG_DEFAULT_WHITELABEL;
