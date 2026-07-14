/** Tipos de catálogo Ideas (Marketing · Publicaciones). */

export type MktIdeaDetalleItem = {
  id: string;
  seccionId: string;
  detalle: string;
  redId: string;
  redNombre: string;
  tipoPublicacionId: string;
  tipoPublicacionNombre: string;
  tipoContenidoId: string;
  tipoContenidoNombre: string;
  usada: boolean;
};

export type MktIdeaSeccionItem = {
  id: string;
  nombre: string;
  detalles: MktIdeaDetalleItem[];
};
