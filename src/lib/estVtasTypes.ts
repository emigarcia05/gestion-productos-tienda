import type { EstCategorizacionItem } from "@/lib/estCategorizacionTypes";

/** Modo de agregación para gráficos de Estadísticas Vtas. */
export type EstVtasModoUnidad = "unidad" | "suma";

/** Producto tipado para Estadísticas Vtas (categorización + factor de suma). */
export type EstVtasProductoItem = EstCategorizacionItem & {
  /**
   * Multiplicador para modo **SUMA DE UNIDADES**:
   * conversión a unidad con suma, o presentación numérica si la unidad medida suma; si no, 1.
   */
  factorSuma: number;
};

/** Venta en unidades importada (`est_por_prod`) para el dashboard de Vtas. */
export type EstVtasVentaItem = {
  sucursalId: string;
  mes: number;
  anio: number;
  codTienda: string;
  vtasEnUn: number;
};

/** Punto del gráfico Variante × Un. vendidas. */
export type EstVtasBarraVariante = {
  variante: string;
  unidades: number;
};
