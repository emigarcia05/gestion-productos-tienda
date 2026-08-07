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

/**
 * Agrega Un. vendidas por la dimensión elegida (producto o sucursal).
 * Respeta filtros de producto ya aplicados, sucursal, periodo y modo unidad/suma.
 * `filtroPadre` acota a productos cuya etiqueta en esa dimensión coincide.
 * Si `ejeY === "sucursal"`, requiere `sucursales` para etiquetas; el filtro
 * global de sucursal sigue aplicando.
 */
export function agregarUnidadesPorEjeY(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
  ejeY: EstVtasDimensionGrafico;
  filtroPadre?: EstVtasFiltroDimension | null;
  sucursales?: readonly { id: string; nombre: string }[];
}): EstVtasBarraDimension[] {
  const periodo = parseClavePeriodoEstPorProd(params.fechaClave);
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
    if (v.mes !== periodo.mes || v.anio !== periodo.anio) continue;
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
 * Agrega Un. vendidas por sucursal (desglose del gráfico 1).
 * `filtroPadre` acota a la categoría elegida en el eje Y (ej. RUBRO = LATEX).
 * No aplica el filtro global de sucursal: muestra una barra por cada sucursal con ventas.
 * @deprecated Preferir `agregarUnidadesPorDobleDimension`.
 */
export function agregarUnidadesPorSucursal(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
  filtroPadre: EstVtasFiltroDimension;
  sucursales: readonly { id: string; nombre: string }[];
}): EstVtasBarraDimension[] {
  const periodo = parseClavePeriodoEstPorProd(params.fechaClave);
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
    if (v.mes !== periodo.mes || v.anio !== periodo.anio) continue;
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
 * grupo, barras hijas por `desglose`. No aplica el filtro global de sucursal
 * (para poder ver el cruce completo). `dimension` y `desglose` no deben coincidir.
 */
export function agregarUnidadesPorDobleDimension(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
  dimension: EstVtasDimensionGrafico;
  desglose: EstVtasDimensionGrafico;
  sucursales: readonly { id: string; nombre: string }[];
}): EstVtasGrupoDimension[] {
  const periodo = parseClavePeriodoEstPorProd(params.fechaClave);
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

  /** categoriaId → { etiqueta, hijos: hijoId → { etiqueta, unidades } } */
  const porCategoria = new Map<
    string,
    { etiqueta: string; hijos: Map<string, { etiqueta: string; unidades: number }> }
  >();

  for (const v of params.ventas) {
    if (v.mes !== periodo.mes || v.anio !== periodo.anio) continue;
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
 * Desglose del gráfico 1: categoría del eje Y → sucursales.
 */
export function agregarUnidadesPorEjeYDesgloseSucursal(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
  ejeY: EstVtasEjeY;
  sucursales: readonly { id: string; nombre: string }[];
}): EstVtasGrupoDimension[] {
  return agregarUnidadesPorDobleDimension({
    productosFiltrados: params.productosFiltrados,
    ventas: params.ventas,
    fechaClave: params.fechaClave,
    modoUnidad: params.modoUnidad,
    dimension: params.ejeY,
    desglose: "sucursal",
    sucursales: params.sucursales,
  });
}

/**
 * Serie temporal mensual: siempre 12 puntos (ENE…DIC).
 * `anio`: si es un número, acota a ese año; si es `null`/omitido sin `fechaClave`,
 * agrega **todos** los años (el filtro FECHA no afecta).
 * `fechaClave` (opcional): solo si no se pasa `anio`, toma el año de la clave.
 * `filtros` / `codTienda`: categoría G1 y producto Top 10.
 */
export function agregarUnidadesMensualesAnio(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  modoUnidad: EstVtasModoUnidad;
  /** Año a graficar. `null` = todos los años (ignora FECHA). */
  anio?: number | null;
  /** Si no hay `anio`, se usa el año de esta clave. */
  fechaClave?: string;
  filtros?: EstVtasFiltroDimension[] | null;
  codTienda?: string | null;
}): EstVtasPuntoMensual[] {
  let anioFiltro: number | null | undefined = params.anio;
  if (anioFiltro === undefined && params.fechaClave) {
    anioFiltro = parseClavePeriodoEstPorProd(params.fechaClave)?.anio ?? null;
  }
  if (anioFiltro === undefined) {
    anioFiltro = null;
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
      if (anioFiltro != null && v.anio !== anioFiltro) continue;
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
 * Top N productos (gráfico 2 · tabla): ranking por TOTAL PERIODO (FECHA)
 * + PROMEDIO MENSUAL (total sin FECHA / periodos mes×año con venta).
 */
export function agregarTopProductos(params: {
  productosFiltrados: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursalId: string;
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
  filtros?: EstVtasFiltroDimension[] | null;
  topN?: number;
}): EstVtasBarraProducto[] {
  const periodo = parseClavePeriodoEstPorProd(params.fechaClave);
  if (!periodo) return [];

  const topN = params.topN ?? 10;
  const productos = aplicarFiltrosDimension(
    params.productosFiltrados,
    params.filtros
  );
  const porCod = new Map(productos.map((p) => [p.codTienda, p] as const));
  if (porCod.size === 0) return [];

  const totalPeriodo = new Map<string, number>();
  /** codTienda → suma de todos los periodos (sin FECHA). */
  const totalAcumulado = new Map<string, number>();
  /** codTienda → set de claves `anio-mes` con venta. */
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

    if (v.mes === periodo.mes && v.anio === periodo.anio) {
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
  fechaClave: string;
  modoUnidad: EstVtasModoUnidad;
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
