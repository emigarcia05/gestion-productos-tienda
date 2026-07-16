/** Tipos de catálogo Base Multimedia (`mkt_contenido_drive_tipo`). */

export type MktContenidoDriveTipoItem = {
  id: string;
  tipo: string;
};

/** Tipos de Base Multimedia (`mkt_contenido_url_drive`). */

export type MktContenidoUrlDriveItem = {
  id: string;
  nombre: string;
  descripcion: string;
  url: string;
  tipoId: string;
  tipoNombre: string;
};
