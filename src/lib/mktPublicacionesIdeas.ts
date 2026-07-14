/** Tipos de catálogo Ideas (Marketing · Publicaciones). */

export type MktIdeaDetalleItem = {
  id: string;
  seccionId: string;
  tituloIdea: string;
  detalle: string;
  redIds: string[];
  redesNombres: string[];
  tipoPublicacionIds: string[];
  tiposPublicacionNombres: string[];
  tipoContenidoId: string;
  tipoContenidoNombre: string;
  usada: boolean;
};

export type MktIdeaSeccionItem = {
  id: string;
  nombre: string;
  resumen: string;
  detalles: MktIdeaDetalleItem[];
};
