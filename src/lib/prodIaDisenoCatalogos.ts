/**
 * Catálogos de GESTION DISEÑO (Asistente IA).
 * Orden del hub = orden de preguntas en Diseñar Colores.
 * `nombre` = UI (español); `nombreEn` = texto inyectado en el prompt (inglés).
 */

export type ProdIaDisenoCatalogoKind =
  | "sup_pintar"
  | "objetivo"
  | "estilos"
  | "luz_natural"
  | "luz_artificial"
  | "combinar";

export interface ProdIaDisenoCatalogoNombreItem {
  id: string;
  /** Etiqueta en pantalla (español). */
  nombre: string;
  /** Valor para el prompt (inglés). */
  nombreEn: string;
}

/** Texto a inyectar en el prompt; fallback a español si faltara inglés. */
export function nombreCatalogoParaPrompt(
  item: Pick<ProdIaDisenoCatalogoNombreItem, "nombre" | "nombreEn">,
): string {
  const en = item.nombreEn.trim();
  return en || item.nombre.trim();
}

/** Orden canónico del hub GESTION DISEÑO (preguntas 1–6). */
export const PROD_IA_DISENO_CATALOGO_KINDS: ProdIaDisenoCatalogoKind[] = [
  "sup_pintar",
  "objetivo",
  "estilos",
  "luz_natural",
  "luz_artificial",
  "combinar",
];
