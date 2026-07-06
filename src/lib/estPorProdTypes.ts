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
