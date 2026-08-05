import type {
  EstVtasBarraVariante,
  EstVtasModoUnidad,
  EstVtasProductoItem,
  EstVtasVentaItem,
} from "@/lib/estVtasTypes";
import { parseClavePeriodoEstPorProd } from "@/lib/estPorProdPeriodo";

const FILTRO_TODOS = "none";
const VARIANTE_SIN = "SIN PRESENTACION";

/**
 * Agrega Un. vendidas por **variante** (= etiqueta de presentación del producto).
 * Respeta filtros de producto ya aplicados, sucursal, periodo y modo unidad/suma.
 */
export function agregarUnidadesPorVariante(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
}): EstVtasBarraVariante[] {
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

    const variante =
      prod.presentacionEtiqueta.trim() !== ""
        ? prod.presentacionEtiqueta.trim()
        : VARIANTE_SIN;
    const factor = params.modoUnidad === "suma" ? prod.factorSuma : 1;
    const aporte = v.vtasEnUn * factor;
    totales.set(variante, (totales.get(variante) ?? 0) + aporte);
  }

  return [...totales.entries()]
    .map(([variante, unidades]) => ({ variante, unidades }))
    .filter((r) => r.unidades > 0)
    .sort((a, b) => b.unidades - a.unidades || a.variante.localeCompare(b.variante, "es"));
}
