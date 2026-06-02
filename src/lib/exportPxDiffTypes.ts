/** Tipos compartidos exportación Px (cliente + servidor). */

export interface FilaExportPx {
  codigo: string;
  /** Marcación de la grilla (columna Excel «Importe»). */
  marcacion: number;
}

export interface RubroAumentoPromedioPx {
  rubro: string;
  aumentoPromedioPct: number;
}

export interface MarcaAumentosPromedioPx {
  marca: string;
  rubros: RubroAumentoPromedioPx[];
}

export interface ResumenAumentosPromedioPxExport {
  marcas: MarcaAumentosPromedioPx[];
}

export interface ExportPxDiffPayload {
  filas: FilaExportPx[];
  resumenAumentos: ResumenAumentosPromedioPxExport;
}
