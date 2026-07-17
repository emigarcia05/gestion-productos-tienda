/** Tipos de catálogo Ideas (Marketing · Publicaciones). */

export type MktIdeaDetalleItem = {
  id: string;
  seccionId: string;
  tituloIdea: string;
  detalle: string;
  /** Legado N:M (altas nuevas no escriben redes). */
  redIds: string[];
  redesNombres: string[];
  /** Derivado: hay publicación 1:1 vinculada (`mkt_publi.idea_detalle_id`). */
  usada: boolean;
};

export type MktIdeaSeccionItem = {
  id: string;
  nombre: string;
  resumen: string;
  detalles: MktIdeaDetalleItem[];
};
