import type {
  EstVtasBarraDimension,
  EstVtasEjeY,
  EstVtasModoUnidad,
  EstVtasProductoItem,
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

function etiquetaEjeY(
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

/**
 * Agrega Un. vendidas por la dimensión elegida del eje Y.
 * Respeta filtros de producto ya aplicados, sucursal, periodo y modo unidad/suma.
 */
export function agregarUnidadesPorEjeY(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
  ejeY: EstVtasEjeY;
}): EstVtasBarraDimension[] {
  const periodo = parseClavePeriodoEstPorProd(params.fechaClave);
  if (!periodo) return [];

  const porCod = new Map(
    params.productosFiltrados.map((p) => [p.codTienda, p] as const)
  );
  if (porCod.size === 0) return [];

  const totales = new Map<string, number>();

  for (const v of params.ventas) {
    if (v.mes !== periodo.mes || v.anio !== periodo.anio) continue;
    if (params.sucursalId !== FILTRO_TODOS && v.sucursalId !== params.sucursalId) {
      continue;
    }
    const prod = porCod.get(v.codTienda);
    if (!prod) continue;

    const etiqueta = etiquetaEjeY(prod, params.ejeY);
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
