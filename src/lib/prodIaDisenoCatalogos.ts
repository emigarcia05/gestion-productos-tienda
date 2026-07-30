/**
 * Catálogos de GESTION DISEÑO (Asistente IA).
 * Orden del hub = orden de preguntas en Diseñar Colores.
 */

export type ProdIaDisenoCatalogoKind =
  | "sup_pintar"
  | "objetivo"
  | "estilos"
  | "combinar"
  | "luz_natural"
  | "luz_artificial";

export interface ProdIaDisenoCatalogoNombreItem {
  id: string;
  nombre: string;
}

/** Orden canónico del hub GESTION DISEÑO (preguntas 1–6). */
export const PROD_IA_DISENO_CATALOGO_KINDS: ProdIaDisenoCatalogoKind[] = [
  "sup_pintar",
  "objetivo",
  "estilos",
  "combinar",
  "luz_natural",
  "luz_artificial",
];
