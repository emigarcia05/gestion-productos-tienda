/**
 * Scraper Alba — configuración centralizada (sin hardcodes dispersos).
 */
export const ALBA_CONFIG = {
  baseUrl: "https://www.alba.com.ar",
  pagePath: "/es/paletas-de-colores/",
  /** Path AEM usado por la API interna colorPopUp */
  aemPagePath: "/content/akzonobel-flourish/alba/ar/es/paletas-de-colores",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  /** Marcador del JSON SSR de la pared de colores (8 tonos × 48) */
  wallJsonMarker:
    '[{"image":{"src":"/content/dam/akzonobel-common/colorWall',
  /**
   * Ambientes oficiales que Alba muestra en fichas (CDN inspirational-images).
   * Solo se atribuyen si el color tiene `colorId` interno.
   */
  ambientRooms: [
    { key: "Livingroom", label: "Living" },
    { key: "Bedroom", label: "Dormitorio" },
    { key: "DiningRoom", label: "Comedor" },
    { key: "Kitchen", label: "Cocina" },
    { key: "Bathroom", label: "Baño" },
    { key: "Hallway", label: "Pasillo" },
    { key: "Homeoffice", label: "Home office" },
    { key: "Childrensroom", label: "Cuarto de niños" },
  ] as const,
  /** Tamaño de la muestra JPG (px). 128 es suficiente y mucho más rápido. */
  swatchSize: 128,
  /** Calidad JPEG 1–100 */
  jpegQuality: 92,
  /** Concurrencia al enriquecer fichas con Playwright (si se habilita) */
  detailConcurrency: 4,
  /** Timeout navegación (ms) */
  navigationTimeoutMs: 60_000,
  requestTimeoutMs: 90_000,
} as const;

export const COLOR_POPUP_URL = `${ALBA_CONFIG.baseUrl}/bin/api/colorPopUp?page=${ALBA_CONFIG.aemPagePath}`;
export const PALETTE_PAGE_URL = `${ALBA_CONFIG.baseUrl}${ALBA_CONFIG.pagePath}`;

export const ALBA_COLORES_COLUMNS = [
  "codigo",
  "nombre",
  "url",
  "imagen",
  "hex",
  "rgb",
  "familia",
  "subfamilia",
  "ambientes",
  "superficies",
  "descripcion_alba",
] as const;

export const ALBA_CONOCIMIENTO_COLUMNS = [
  "codigo",
  "nombre",
  "temperatura",
  "luminosidad",
  "saturacion",
  "familia_visual",
  "estilos_recomendados",
  "ambientes_recomendados",
  "combina_con",
  "contrasta_con",
  "descripcion_tecnica",
  "nivel_luminosidad",
  "nivel_saturacion",
  "sensacion_visual",
] as const;
