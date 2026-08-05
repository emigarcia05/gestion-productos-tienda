/** Tipos compartidos UI ↔ servidor para estadísticas por producto (`est_por_prod`). */

export interface SucursalConDepositoOption {
  id: string;
  nombre: string;
}

export interface EstPorProdItem {
  id: string;
  sucursalId: string;
  mes: number;
  anio: number;
  codTienda: string;
  vtasEnUn: number;
  createdAt: string;
  updatedAt: string;
  sucursal: { id: string; nombre: string };
  producto: { codTienda: string; descripcionTienda: string | null };
}

/** Celda de la grilla Carga de Datos (ocupación por periodo × sucursal). */
export interface EstPorProdCeldaCarga {
  sucursalId: string;
  mes: number;
  anio: number;
  cantidad: number;
}

/** Resultado de `POST /api/import-est-por-prod` / `importarEstPorProd`. */
export interface ImportarEstPorProdResultado {
  importados: number;
  omitidosCodTiendaInexistente: number;
  codigosOmitidos: string[];
  reemplazados: number;
}
