/**
 * Rutas y columnas del módulo IA_DISEÑO (capa 3).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Carpeta canónica docs/IA_DISEÑO (padre de scripts/). */
export const IA_DISENO_ROOT = path.resolve(__dirname, "..");

export const FILES = {
  colores: "colores_alba.csv",
  tipDiseno: "colores_alba_tip_diseno.csv",
  ia: "colores_alba_ia.csv",
} as const;

/** Columnas del CSV unificado para IA (capa 3). */
export const IA_DISENO_COLS = [
  "codigo",
  "nombre",
  "hex",
  "rgb",
  "familia",
  "subfamilia",
  "url",
  "imagen",
  "temperatura",
  "luminosidad",
  "saturacion",
  "nivel_luminosidad",
  "nivel_saturacion",
  "familia_visual",
  "estilos_recomendados",
  "ambientes_oficiales",
  "ambientes_recomendados",
  "combina_con",
  "contrasta_con",
  "sensacion_visual",
  "descripcion_tecnica",
  "descripcion_alba",
  "superficies",
  "texto_conocimiento",
] as const;

export type IaDisenoRow = Record<(typeof IA_DISENO_COLS)[number], string>;
