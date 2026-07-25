/** Tipos del scraper Alba. */

export type Temperatura = "Frío" | "Cálido" | "Neutro";

export type NivelEscala =
  | "Muy Bajo"
  | "Bajo"
  | "Medio"
  | "Alto"
  | "Muy Alto"
  | "Muy Baja"
  | "Baja"
  | "Media"
  | "Alta"
  | "Muy Alta";

export interface WallEnrichment {
  url: string;
  colorId: string;
  hex?: string;
}

export interface CatalogColor {
  ccid: string;
  codigo: string;
  nombre: string;
  label: string;
  hex: string;
  familia: string;
  /** Subfamilia oficial si Alba la expone (hoy suele estar vacía). */
  subfamilia: string;
  url: string;
  colorId: string;
  /** Ambientes oficiales derivados de metadatos/CDN Alba (no inventados). */
  ambientes: string[];
  /** Superficies oficiales; vacío si Alba no las publica. */
  superficies: string[];
  /** Texto oficial de Alba; vacío si no existe en fuente. */
  descripcion_alba: string;
}

export interface AlbaColorCsvRow {
  codigo: string;
  nombre: string;
  url: string;
  imagen: string;
  hex: string;
  rgb: string;
  familia: string;
  subfamilia: string;
  ambientes: string;
  superficies: string;
  descripcion_alba: string;
}

export interface AlbaConocimientoCsvRow {
  codigo: string;
  nombre: string;
  temperatura: Temperatura | "";
  luminosidad: string;
  saturacion: string;
  familia_visual: string;
  estilos_recomendados: string;
  ambientes_recomendados: string;
  combina_con: string;
  contrasta_con: string;
  descripcion_tecnica: string;
  nivel_luminosidad: string;
  nivel_saturacion: string;
  sensacion_visual: string;
}

export interface ScraperStats {
  coloresEncontrados: number;
  coloresDescargados: number;
  imagenesDescargadas: number;
  errores: number;
  tiempoMs: number;
  errorMessages: string[];
}

export interface ColorPopupResponse {
  data?: {
    colorsHues?: Record<
      string,
      {
        name?: string;
        hex?: string;
        id?: string;
        colorCardDetailsList?: Array<{
          label?: string;
          hex?: string;
          ccid?: string | number;
          cta?: { href?: string };
          display?: unknown[];
        }>;
      }
    >;
  };
}

export interface WallHueBlock {
  hueName?: string;
  main?: string;
  colors?: Array<{
    color?: {
      id?: string;
      hex?: string;
      ccid?: string;
      title?: string;
      name?: string;
      href?: string;
      colorDescription?: string;
    };
  }>;
}
