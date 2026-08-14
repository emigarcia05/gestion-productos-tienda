import type { EstCategorizacionItem } from "@/lib/estCategorizacionTypes";

/** Modo de agregación para gráficos de Estadísticas Vtas. */
export type EstVtasModoUnidad = "unidad" | "suma";

/** Dimensiones de producto del eje Y. */
export type EstVtasEjeY =
  | "variante"
  | "marca"
  | "rubro"
  | "subRubro"
  | "color"
  | "terminacion";

/** Dimensión usable en gráfico 1 (producto o sucursal). */
export type EstVtasDimensionGrafico = EstVtasEjeY | "sucursal";

/**
 * Opciones del eje Y (Dimensión) — orden de producto + sucursal.
 * `variante` se muestra como PRESENTACION.
 */
const EST_VTAS_EJE_Y_OPTIONS: readonly {
  value: EstVtasEjeY;
  label: string;
}[] = [
  { value: "marca", label: "MARCA" },
  { value: "rubro", label: "RUBRO" },
  { value: "subRubro", label: "SUB RUBRO" },
  { value: "color", label: "COLOR" },
  { value: "terminacion", label: "TERMINACION" },
  { value: "variante", label: "PRESENTACION" },
] as const;

/** Opciones del select Dimensión (eje Y). */
const EST_VTAS_DIMENSION_OPTIONS: readonly {
  value: EstVtasDimensionGrafico;
  label: string;
}[] = [
  ...EST_VTAS_EJE_Y_OPTIONS,
  { value: "sucursal", label: "SUCURSAL" },
] as const;

/**
 * Opciones del Desglose (además de SIN DESGLOSE), en el orden de negocio.
 * Misma semántica que Dimensión; se excluye la ya elegida en eje Y.
 */
const EST_VTAS_DESGLOSE_DIMENSION_OPTIONS: readonly {
  value: EstVtasDimensionGrafico;
  label: string;
}[] = [
  { value: "sucursal", label: "SUCURSAL" },
  { value: "marca", label: "MARCA" },
  { value: "rubro", label: "RUBRO" },
  { value: "subRubro", label: "SUB RUBRO" },
  { value: "color", label: "COLOR" },
  { value: "terminacion", label: "TERMINACION" },
  { value: "variante", label: "PRESENTACION" },
] as const;

export function etiquetaEstVtasDimension(d: EstVtasDimensionGrafico): string {
  return (
    EST_VTAS_DESGLOSE_DIMENSION_OPTIONS.find((o) => o.value === d)?.label ??
    EST_VTAS_DIMENSION_OPTIONS.find((o) => o.value === d)?.label ??
    "PRESENTACION"
  );
}

export function esEstVtasEjeY(d: EstVtasDimensionGrafico): d is EstVtasEjeY {
  return d !== "sucursal";
}

/**
 * Desglose del gráfico 1: sin desglose, o cualquier dimensión distinta
 * de la elegida en el select Dimensión (eje Y).
 */
export type EstVtasDesglose = "ninguno" | EstVtasDimensionGrafico;

const EST_VTAS_DESGLOSE_NINGUNO = {
  value: "ninguno" as const,
  label: "SIN DESGLOSE",
};

/** Opciones de desglose excluyendo la dimensión ya elegida (sin repetir). */
export function opcionesDesgloseEstVtas(
  dimension: EstVtasDimensionGrafico
): readonly { value: EstVtasDesglose; label: string }[] {
  return [
    EST_VTAS_DESGLOSE_NINGUNO,
    ...EST_VTAS_DESGLOSE_DIMENSION_OPTIONS.filter((o) => o.value !== dimension),
  ];
}

/** Opciones de dimensión (eje Y) excluyendo el desglose activo (si no es ninguno). */
export function opcionesDimensionEstVtas(
  desglose: EstVtasDesglose
): readonly { value: EstVtasDimensionGrafico; label: string }[] {
  if (desglose === "ninguno") return EST_VTAS_DIMENSION_OPTIONS;
  return EST_VTAS_DIMENSION_OPTIONS.filter((o) => o.value !== desglose);
}

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

/** Punto del gráfico dimensión (eje Y) × Un. vendidas (eje X). */
export type EstVtasBarraDimension = {
  etiqueta: string;
  unidades: number;
  /** Id estable (p. ej. sucursalId); si falta, se usa la etiqueta. */
  id?: string;
};

/** Barra hija dentro de un grupo (desglose del gráfico 1). */
type EstVtasBarraHija = {
  id: string;
  etiqueta: string;
  unidades: number;
};

/**
 * Grupo del gráfico 1 con desglose:
 * categoría de la dimensión + barras hijas del desglose.
 */
export type EstVtasGrupoDimension = {
  etiqueta: string;
  id: string;
  unidades: number;
  hijos: EstVtasBarraHija[];
};

/** Selección en desglose jerárquico (dimensión + valor de desglose). */
export type EstVtasSeleccionDesglose = {
  categoria: string;
  categoriaId: string;
  hijoEtiqueta: string;
  hijoId: string;
};

/** Filtro dimensional de producto (categoría elegida en un gráfico). */
export type EstVtasFiltroDimension = {
  ejeY: EstVtasEjeY;
  etiqueta: string;
};

/** Punto del gráfico temporal: mes (1–12) × Un. vendidas. */
export type EstVtasPuntoMensual = {
  mes: number;
  unidades: number;
};

/** Fila del Top 10 productos (gráfico 2 · tabla). */
export type EstVtasBarraProducto = {
  codTienda: string;
  /** Descripción del producto (columna DESCRIPCION). */
  etiqueta: string;
  /**
   * TO. — total de unidades (o suma) con los filtros activos
   * (página + selección G1 si hay).
   */
  totalPeriodo: number;
  /**
   * PM. — `totalPeriodo / cantidadPeriodos`.
   * `cantidadPeriodos` = años seleccionados × meses seleccionados
   * (ej. JUN+JUL = 2; 2025+2026 con 12 meses = 24).
   */
  promedioMensual: number;
};
