/**
 * Catálogos de GESTION DISEÑO (Asistente IA).
 * Orden del hub = orden de preguntas en Diseñar Colores.
 * `nombre` = etiqueta en pantalla; `texto` = valor inyectado al generar el prompt.
 */

export type ProdIaDisenoCatalogoKind =
  | "modo_diseno"
  | "objetivo"
  | "estilos"
  | "luz_natural"
  | "luz_artificial"
  | "combinar"
  | "sup_pintar";

export interface ProdIaDisenoCatalogoNombreItem {
  id: string;
  /** Etiqueta en pantalla. */
  nombre: string;
  /** Texto a pegar al generar el prompt. */
  texto: string;
}

/** Texto a inyectar en el prompt; fallback a `nombre` si `texto` estuviera vacío. */
export function textoCatalogoParaPrompt(
  item: Pick<ProdIaDisenoCatalogoNombreItem, "nombre" | "texto">,
): string {
  const t = item.texto.trim();
  return t || item.nombre.trim();
}

/** Orden canónico del hub GESTION DISEÑO (preguntas 1–7). */
export const PROD_IA_DISENO_CATALOGO_KINDS: ProdIaDisenoCatalogoKind[] = [
  "modo_diseno",
  "objetivo",
  "estilos",
  "luz_natural",
  "luz_artificial",
  "combinar",
  "sup_pintar",
];
