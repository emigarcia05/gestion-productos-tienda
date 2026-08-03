/**
 * Catálogos de GESTION DISEÑO (Asistente IA).
 * Orden del hub = orden de preguntas en Diseñar Colores.
 * `nombre` = etiqueta en pantalla (MAYÚSCULAS); `texto` = valor inyectado al prompt (**sentence case**).
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
  /** Texto a pegar al generar el prompt (sentence case). */
  texto: string;
}

/**
 * Sentence case para `texto` de catálogo.
 * `LEFT WALL` → `Left wall`.
 */
export function sentenceCaseTextoCatalogo(texto: string): string {
  const t = texto.trim().replace(/\s+/g, " ");
  if (!t) return t;
  const lower = t.toLocaleLowerCase("en-US");
  const chars = [...lower];
  const first = chars[0];
  if (!first) return lower;
  return first.toLocaleUpperCase("en-US") + chars.slice(1).join("");
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
