import type {
  EstVtasBarraDimension,
  EstVtasEjeY,
  EstVtasFiltroDimension,
  EstVtasModoUnidad,
  EstVtasProductoItem,
  EstVtasPuntoMensual,
  EstVtasVentaItem,
} from "@/lib/estVtasTypes";
import { parseClavePeriodoEstPorProd } from "@/lib/estPorProdPeriodo";

const FILTRO_TODOS = "none";
const SIN_PRESENTACION = "SIN PRESENTACION";
const SIN_COLOR = "SIN COLOR";
const SIN_TERMINACION = "SIN TERMINACION";
const SIN_MARCA = "SIN MARCA";
const SIN_RUBRO = "SIN RUBRO";
const SIN_SUB_RUBRO = "SIN SUB RUBRO";

/** Etiqueta de producto para una dimensión del eje Y (incluye placeholders SIN …). */
export function etiquetaEjeYProducto(
  prod: EstVtasProductoItem,
  ejeY: EstVtasEjeY
): string {
  switch (ejeY) {
    case "marca": {
      const t = prod.marca.trim();
      return t !== "" ? t : SIN_MARCA;
    }
    case "rubro": {
      const t = prod.rubro.trim();
      return t !== "" ? t : SIN_RUBRO;
    }
    case "subRubro": {
      const t = prod.subRubro.trim();
      return t !== "" ? t : SIN_SUB_RUBRO;
    }
    case "color": {
      const t = prod.colorEtiqueta.trim();
      return t !== "" ? t : SIN_COLOR;
    }
    case "terminacion": {
      const t = prod.terminacionEtiqueta.trim();
      return t !== "" ? t : SIN_TERMINACION;
    }
    case "variante":
    default: {
      const t = prod.presentacionEtiqueta.trim();
      return t !== "" ? t : SIN_PRESENTACION;
    }
  }
}

function aplicarFiltrosDimension(
  productos: EstVtasProductoItem[],
  filtros: EstVtasFiltroDimension[] | null | undefined
): EstVtasProductoItem[] {
  if (!filtros || filtros.length === 0) return productos;
  return productos.filter((p) =>
    filtros.every((f) => etiquetaEjeYProducto(p, f.ejeY) === f.etiqueta)
  );
}

/**
 * Agrega Un. vendidas por la dimensión elegida del eje Y.
 * Respeta filtros de producto ya aplicados, sucursal, periodo y modo unidad/suma.
 * `filtroPadre` acota a productos cuya etiqueta en esa dimensión coincide (gráfico dependiente).
 */
export function agregarUnidadesPorEjeY(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
  ejeY: EstVtasEjeY;
  filtroPadre?: EstVtasFiltroDimension | null;
}): EstVtasBarraDimension[] {
  const periodo = parseClavePeriodoEstPorProd(params.fechaClave);
  if (!periodo) return [];

  const productos = aplicarFiltrosDimension(
    params.productosFiltrados,
    params.filtroPadre ? [params.filtroPadre] : null
  );

  const porCod = new Map(productos.map((p) => [p.codTienda, p] as const));
  if (porCod.size === 0) return [];

  const totales = new Map<string, number>();

  for (const v of params.ventas) {
    if (v.mes !== periodo.mes || v.anio !== periodo.anio) continue;
    if (params.sucursalId !== FILTRO_TODOS && v.sucursalId !== params.sucursalId) {
      continue;
    }
    const prod = porCod.get(v.codTienda);
    if (!prod) continue;

    const etiqueta = etiquetaEjeYProducto(prod, params.ejeY);
    const factor = params.modoUnidad === "suma" ? prod.factorSuma : 1;
    const aporte = v.vtasEnUn * factor;
    totales.set(etiqueta, (totales.get(etiqueta) ?? 0) + aporte);
  }

  return [...totales.entries()]
    .map(([etiqueta, unidades]) => ({ etiqueta, unidades }))
    .filter((r) => r.unidades > 0)
    .sort(
      (a, b) =>
        b.unidades - a.unidades || a.etiqueta.localeCompare(b.etiqueta, "es")
    );
}

/**
 * Serie temporal del año de `fechaClave`: siempre 12 puntos (ENE…DIC).
 * `filtros` acumula las categorías elegidas en los gráficos 1 y 2.
 */
export function agregarUnidadesMensualesAnio(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
  filtros?: EstVtasFiltroDimension[] | null;
}): EstVtasPuntoMensual[] {
  const periodo = parseClavePeriodoEstPorProd(params.fechaClave);
  if (!periodo) {
    return Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, unidades: 0 }));
  }

  const productos = aplicarFiltrosDimension(
    params.productosFiltrados,
    params.filtros
  );
  const porCod = new Map(productos.map((p) => [p.codTienda, p] as const));
  const totales = new Map<number, number>();
  for (let m = 1; m <= 12; m++) totales.set(m, 0);

  if (porCod.size > 0) {
    for (const v of params.ventas) {
      if (v.anio !== periodo.anio) continue;
      if (params.sucursalId !== FILTRO_TODOS && v.sucursalId !== params.sucursalId) {
        continue;
      }
      const prod = porCod.get(v.codTienda);
      if (!prod) continue;
      if (v.mes < 1 || v.mes > 12) continue;

      const factor = params.modoUnidad === "suma" ? prod.factorSuma : 1;
      const aporte = v.vtasEnUn * factor;
      totales.set(v.mes, (totales.get(v.mes) ?? 0) + aporte);
    }
  }

  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    return { mes, unidades: totales.get(mes) ?? 0 };
  });
}

/** @deprecated Usar `agregarUnidadesPorEjeY`. */
export function agregarUnidadesPorVariante(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
}): EstVtasBarraDimension[] {
  return agregarUnidadesPorEjeY({ ...params, ejeY: "variante" });
}
