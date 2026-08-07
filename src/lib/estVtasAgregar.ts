import type {
  EstVtasBarraDimension,
  EstVtasBarraProducto,
  EstVtasDimensionGrafico,
  EstVtasEjeY,
  EstVtasFiltroDimension,
  EstVtasGrupoDimension,
  EstVtasModoUnidad,
  EstVtasProductoItem,
  EstVtasPuntoMensual,
  EstVtasVentaItem,
} from "@/lib/estVtasTypes";
import { esEstVtasEjeY } from "@/lib/estVtasTypes";
import { parseClavePeriodoEstPorProd } from "@/lib/estPorProdPeriodo";

const FILTRO_TODOS = "none";
const SIN_PRESENTACION = "SIN PRESENTACION";
const SIN_COLOR = "SIN COLOR";
const SIN_TERMINACION = "SIN TERMINACION";
const SIN_MARCA = "SIN MARCA";
const SIN_RUBRO = "SIN RUBRO";
const SIN_SUB_RUBRO = "SIN SUB RUBRO";

/** Filtro de periodo: años y meses (multi). Array vacío = sin acotar esa dimensión. */
export type EstVtasFiltroPeriodo = {
  anios: readonly number[];
  meses: readonly number[];
};

export function cumpleFiltroPeriodo(
  v: { mes: number; anio: number },
  periodo: EstVtasFiltroPeriodo
): boolean {
  if (periodo.anios.length > 0 && !periodo.anios.includes(v.anio)) return false;
  if (periodo.meses.length > 0 && !periodo.meses.includes(v.mes)) return false;
  return true;
}

function periodoDesdeFechaClave(fechaClave: string): EstVtasFiltroPeriodo | null {
  const p = parseClavePeriodoEstPorProd(fechaClave);
  if (!p) return null;
  return { anios: [p.anio], meses: [p.mes] };
}

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

function nombreSucursal(
  sucursalId: string,
  nombrePorId: Map<string, string>
): string {
  return nombrePorId.get(sucursalId) ?? sucursalId;
}

function resolverPeriodo(params: {
  anios?: readonly number[];
  meses?: readonly number[];
  fechaClave?: string;
}): EstVtasFiltroPeriodo | null {
  if (params.anios != null || params.meses != null) {
    return {
      anios: params.anios ?? [],
      meses: params.meses ?? [],
    };
  }
  if (params.fechaClave) return periodoDesdeFechaClave(params.fechaClave);
  return null;
}

/**
 * Agrega Un. vendidas por la dimensión elegida (producto o sucursal).
 * Respeta filtros de producto, sucursal, periodo (años/meses) y modo unidad/suma.
 */
export function agregarUnidadesPorEjeY(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  modoUnidad: EstVtasModoUnidad;
  ejeY: EstVtasDimensionGrafico;
  /** Años seleccionados (multi). Preferir sobre `fechaClave`. */
  anios?: readonly number[];
  /** Meses 1–12 seleccionados (multi). Preferir sobre `fechaClave`. */
  meses?: readonly number[];
  /** @deprecated Usar `anios` + `meses`. */
  fechaClave?: string;
  filtroPadre?: EstVtasFiltroDimension | null;
  sucursales?: readonly { id: string; nombre: string }[];
}): EstVtasBarraDimension[] {
  const periodo = resolverPeriodo(params);
  if (!periodo) return [];

  const productos = aplicarFiltrosDimension(
    params.productosFiltrados,
    params.filtroPadre ? [params.filtroPadre] : null
  );

  const porCod = new Map(productos.map((p) => [p.codTienda, p] as const));
  if (porCod.size === 0) return [];

  const nombrePorId = new Map(
    (params.sucursales ?? []).map(
      (s) => [s.id, s.nombre.trim() || s.id] as const
    )
  );
  const totales = new Map<string, { etiqueta: string; unidades: number }>();

  for (const v of params.ventas) {
    if (!cumpleFiltroPeriodo(v, periodo)) continue;
    if (params.sucursalId !== FILTRO_TODOS && v.sucursalId !== params.sucursalId) {
      continue;
    }
    const prod = porCod.get(v.codTienda);
    if (!prod) continue;

    const factor = params.modoUnidad === "suma" ? prod.factorSuma : 1;
    const aporte = v.vtasEnUn * factor;
    if (aporte <= 0) continue;

    if (params.ejeY === "sucursal") {
      const id = v.sucursalId;
      const etiqueta = nombreSucursal(id, nombrePorId);
      const prev = totales.get(id);
      totales.set(id, {
        etiqueta,
        unidades: (prev?.unidades ?? 0) + aporte,
      });
    } else {
      const etiqueta = etiquetaEjeYProducto(prod, params.ejeY);
      const prev = totales.get(etiqueta);
      totales.set(etiqueta, {
        etiqueta,
        unidades: (prev?.unidades ?? 0) + aporte,
      });
    }
  }

  return [...totales.entries()]
    .map(([id, { etiqueta, unidades }]) =>
      params.ejeY === "sucursal"
        ? { id, etiqueta, unidades }
        : { etiqueta, unidades }
    )
    .filter((r) => r.unidades > 0)
    .sort(
      (a, b) =>
        b.unidades - a.unidades || a.etiqueta.localeCompare(b.etiqueta, "es")
    );
}

/**
 * @deprecated Preferir `agregarUnidadesPorDobleDimension`.
 */
export function agregarUnidadesPorSucursal(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  modoUnidad: EstVtasModoUnidad;
  filtroPadre: EstVtasFiltroDimension;
  sucursales: readonly { id: string; nombre: string }[];
  anios?: readonly number[];
  meses?: readonly number[];
  fechaClave?: string;
}): EstVtasBarraDimension[] {
  const periodo = resolverPeriodo(params);
  if (!periodo) return [];

  const productos = aplicarFiltrosDimension(params.productosFiltrados, [
    params.filtroPadre,
  ]);
  const porCod = new Map(productos.map((p) => [p.codTienda, p] as const));
  if (porCod.size === 0) return [];

  const nombrePorId = new Map(
    params.sucursales.map((s) => [s.id, s.nombre.trim() || s.id] as const)
  );
  const totales = new Map<string, number>();

  for (const v of params.ventas) {
    if (!cumpleFiltroPeriodo(v, periodo)) continue;
    const prod = porCod.get(v.codTienda);
    if (!prod) continue;

    const etiqueta = nombreSucursal(v.sucursalId, nombrePorId);
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
 * Desglose genérico del gráfico 1: agrupa por `dimension` y, dentro de cada
 * grupo, barras hijas por `desglose`. No aplica el filtro global de sucursal.
 */
export function agregarUnidadesPorDobleDimension(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  modoUnidad: EstVtasModoUnidad;
  dimension: EstVtasDimensionGrafico;
  desglose: EstVtasDimensionGrafico;
  sucursales: readonly { id: string; nombre: string }[];
  anios?: readonly number[];
  meses?: readonly number[];
  /** @deprecated Usar `anios` + `meses`. */
  fechaClave?: string;
}): EstVtasGrupoDimension[] {
  const periodo = resolverPeriodo(params);
  if (!periodo) return [];
  if (params.dimension === params.desglose) return [];

  const porCod = new Map(
    params.productosFiltrados.map((p) => [p.codTienda, p] as const)
  );
  if (porCod.size === 0) return [];

  const nombrePorId = new Map(
    params.sucursales.map((s) => [s.id, s.nombre.trim() || s.id] as const)
  );

  function claveYEtiqueta(
    dim: EstVtasDimensionGrafico,
    prod: EstVtasProductoItem,
    sucursalId: string
  ): { id: string; etiqueta: string } {
    if (dim === "sucursal") {
      return {
        id: sucursalId,
        etiqueta: nombreSucursal(sucursalId, nombrePorId),
      };
    }
    const etiqueta = etiquetaEjeYProducto(prod, dim);
    return { id: etiqueta, etiqueta };
  }

  const porCategoria = new Map<
    string,
    { etiqueta: string; hijos: Map<string, { etiqueta: string; unidades: number }> }
  >();

  for (const v of params.ventas) {
    if (!cumpleFiltroPeriodo(v, periodo)) continue;
    const prod = porCod.get(v.codTienda);
    if (!prod) continue;

    const factor = params.modoUnidad === "suma" ? prod.factorSuma : 1;
    const aporte = v.vtasEnUn * factor;
    if (aporte <= 0) continue;

    const cat = claveYEtiqueta(params.dimension, prod, v.sucursalId);
    const hijo = claveYEtiqueta(params.desglose, prod, v.sucursalId);

    let entry = porCategoria.get(cat.id);
    if (!entry) {
      entry = { etiqueta: cat.etiqueta, hijos: new Map() };
      porCategoria.set(cat.id, entry);
    }
    const prev = entry.hijos.get(hijo.id);
    entry.hijos.set(hijo.id, {
      etiqueta: hijo.etiqueta,
      unidades: (prev?.unidades ?? 0) + aporte,
    });
  }

  const grupos: EstVtasGrupoDimension[] = [];

  for (const [id, { etiqueta, hijos: hijosMap }] of porCategoria) {
    const hijos = [...hijosMap.entries()]
      .map(([hijoId, h]) => ({
        id: hijoId,
        etiqueta: h.etiqueta,
        unidades: h.unidades,
      }))
      .filter((h) => h.unidades > 0)
      .sort(
        (a, b) =>
          b.unidades - a.unidades ||
          a.etiqueta.localeCompare(b.etiqueta, "es")
      );

    if (hijos.length === 0) continue;

    const unidades = hijos.reduce((acc, h) => acc + h.unidades, 0);
    grupos.push({ id, etiqueta, unidades, hijos });
  }

  return grupos.sort(
    (a, b) =>
      b.unidades - a.unidades || a.etiqueta.localeCompare(b.etiqueta, "es")
  );
}

/**
 * @deprecated Preferir `agregarUnidadesPorDobleDimension`.
 */
export function agregarUnidadesPorEjeYDesgloseSucursal(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  modoUnidad: EstVtasModoUnidad;
  ejeY: EstVtasEjeY;
  sucursales: readonly { id: string; nombre: string }[];
  anios?: readonly number[];
  meses?: readonly number[];
  fechaClave?: string;
}): EstVtasGrupoDimension[] {
  return agregarUnidadesPorDobleDimension({
    productosFiltrados: params.productosFiltrados,
    ventas: params.ventas,
    modoUnidad: params.modoUnidad,
    dimension: params.ejeY,
    desglose: "sucursal",
    sucursales: params.sucursales,
    anios: params.anios,
    meses: params.meses,
    fechaClave: params.fechaClave,
  });
}

/**
 * Serie temporal mensual: siempre 12 puntos (ENE…DIC).
 * `anios`: si hay valores, acota a esos años; vacío/`null` = todos los años.
 * El filtro de **meses** de página no afecta el eje X (siempre ENE…DIC).
 */
export function agregarUnidadesMensualesAnio(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  modoUnidad: EstVtasModoUnidad;
  /** @deprecated Preferir `anios`. Un solo año; `null` = todos. */
  anio?: number | null;
  /** Años a incluir (multi). Tiene prioridad sobre `anio` / `fechaClave`. */
  anios?: readonly number[] | null;
  /** @deprecated Solo si no hay `anio`/`anios`. */
  fechaClave?: string;
  filtros?: EstVtasFiltroDimension[] | null;
  codTienda?: string | null;
}): EstVtasPuntoMensual[] {
  let aniosFiltro: readonly number[] | null = null;
  if (params.anios != null) {
    aniosFiltro = params.anios.length > 0 ? params.anios : null;
  } else if (params.anio !== undefined) {
    aniosFiltro = params.anio == null ? null : [params.anio];
  } else if (params.fechaClave) {
    const a = parseClavePeriodoEstPorProd(params.fechaClave)?.anio;
    aniosFiltro = a != null ? [a] : null;
  }

  let productos = aplicarFiltrosDimension(
    params.productosFiltrados,
    params.filtros
  );
  if (params.codTienda) {
    productos = productos.filter((p) => p.codTienda === params.codTienda);
  }
  const porCod = new Map(productos.map((p) => [p.codTienda, p] as const));
  const totales = new Map<number, number>();
  for (let m = 1; m <= 12; m++) totales.set(m, 0);

  if (porCod.size > 0) {
    for (const v of params.ventas) {
      if (aniosFiltro != null && !aniosFiltro.includes(v.anio)) continue;
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

/**
 * Top N productos (gráfico 2 · tabla): ranking por TOTAL PERIODO (años×meses)
 * + PROMEDIO MENSUAL (total sin periodo / periodos mes×año con venta).
 */
export function agregarTopProductos(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  modoUnidad: EstVtasModoUnidad;
  anios?: readonly number[];
  meses?: readonly number[];
  /** @deprecated Usar `anios` + `meses`. */
  fechaClave?: string;
  filtros?: EstVtasFiltroDimension[] | null;
  topN?: number;
}): EstVtasBarraProducto[] {
  const periodo = resolverPeriodo(params);
  if (!periodo) return [];

  const topN = params.topN ?? 10;
  const productos = aplicarFiltrosDimension(
    params.productosFiltrados,
    params.filtros
  );
  const porCod = new Map(productos.map((p) => [p.codTienda, p] as const));
  if (porCod.size === 0) return [];

  const totalPeriodo = new Map<string, number>();
  const totalAcumulado = new Map<string, number>();
  const periodosConVenta = new Map<string, Set<string>>();

  for (const v of params.ventas) {
    if (params.sucursalId !== FILTRO_TODOS && v.sucursalId !== params.sucursalId) {
      continue;
    }
    const prod = porCod.get(v.codTienda);
    if (!prod) continue;

    const factor = params.modoUnidad === "suma" ? prod.factorSuma : 1;
    const aporte = v.vtasEnUn * factor;
    if (aporte <= 0) continue;

    if (cumpleFiltroPeriodo(v, periodo)) {
      totalPeriodo.set(
        v.codTienda,
        (totalPeriodo.get(v.codTienda) ?? 0) + aporte
      );
    }

    totalAcumulado.set(
      v.codTienda,
      (totalAcumulado.get(v.codTienda) ?? 0) + aporte
    );
    let set = periodosConVenta.get(v.codTienda);
    if (!set) {
      set = new Set();
      periodosConVenta.set(v.codTienda, set);
    }
    set.add(`${v.anio}-${v.mes}`);
  }

  return [...totalPeriodo.entries()]
    .map(([codTienda, total]) => {
      const prod = porCod.get(codTienda);
      const desc = prod?.descripcionTienda.trim() ?? "";
      const acumulado = totalAcumulado.get(codTienda) ?? 0;
      const nPeriodos = periodosConVenta.get(codTienda)?.size ?? 0;
      const promedioMensual = nPeriodos > 0 ? acumulado / nPeriodos : 0;
      return {
        codTienda,
        etiqueta: desc !== "" ? desc : codTienda,
        totalPeriodo: total,
        promedioMensual,
      };
    })
    .filter((r) => r.totalPeriodo > 0)
    .sort(
      (a, b) =>
        b.totalPeriodo - a.totalPeriodo ||
        a.etiqueta.localeCompare(b.etiqueta, "es") ||
        a.codTienda.localeCompare(b.codTienda, "es")
    )
    .slice(0, topN);
}

/** @deprecated Usar `agregarUnidadesPorEjeY`. */
export function agregarUnidadesPorVariante(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  modoUnidad: EstVtasModoUnidad;
  anios?: readonly number[];
  meses?: readonly number[];
  fechaClave?: string;
}): EstVtasBarraDimension[] {
  return agregarUnidadesPorEjeY({ ...params, ejeY: "variante" });
}

/** Helper: arma filtros de producto desde una dimensión de gráfico (ignora sucursal). */
export function filtroProductoDesdeDimension(
  dimension: EstVtasDimensionGrafico,
  etiqueta: string
): EstVtasFiltroDimension | null {
  if (!esEstVtasEjeY(dimension)) return null;
  return { ejeY: dimension, etiqueta };
}
