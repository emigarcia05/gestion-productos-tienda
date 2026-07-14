/** Tipos de catálogo Ideas (Marketing · Publicaciones). */

export type MktIdeaDetalleItem = {
  id: string;
  seccionId: string;
  detalle: string;
  usada: boolean;
};

export type MktIdeaSeccionItem = {
  id: string;
  nombre: string;
  detalles: MktIdeaDetalleItem[];
};
