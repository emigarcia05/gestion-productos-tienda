/**
 * Catálogos de GESTION DISEÑO (Asistente IA): superficies, estilos, combinar.
 */

export type ProdIaDisenoCatalogoKind = "sup_pintar" | "estilos" | "combinar";

export interface ProdIaDisenoCatalogoNombreItem {
  id: string;
  nombre: string;
}

export const PROD_IA_DISENO_CATALOGO_KINDS: ProdIaDisenoCatalogoKind[] = [
  "sup_pintar",
  "estilos",
  "combinar",
];
