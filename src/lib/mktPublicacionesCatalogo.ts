/** Ítem de catálogo Marketing (red social o tipo de contenido). */
export type MktCatalogoNombreItem = {
  id: string;
  nombre: string;
};

export type MktCatalogoNombreKind = "red" | "contenido";

/** Tipo de publicación con contenidos permitidos (ids del catálogo global). */
export type MktPublicacionTipoItem = {
  id: string;
  nombre: string;
  contenidoIdsPermitidos: string[];
};
