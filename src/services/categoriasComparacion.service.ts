/**
 * Servicio Comparación por categorías.
 * Jerarquía: Categoria → Subcategoria → Presentacion.
 * Referente: `prod_precios_competencia` (scrape o Px. Vta. Sugerido; precio vía `resolverPreciosCompetenciaMostrar`, igual `/cx-px-tienda`).
 */

import { calcCostoComparacion, type DatosCostoComparacion } from "@/lib/calculos";
import { prisma } from "@/lib/prisma";
import { matchByMultiTerm } from "@/lib/busqueda";
import {
  buildMapPxVtaSugerido,
  listarCompetenciasConPxSugeridoPorCodTiendas,
  resolverPrecioCompetenciaMostrar,
  resolverPreciosCompetenciaMostrar,
} from "@/services/competenciaPxSugerido.service";
import { ensureVinculoCompetenciaParaReferencia } from "@/services/competenciaVinculo.service";

const normalizeNombreCategoria = (nombre: string): string =>
  nombre.trim().toUpperCase();

export interface ReferenciaCompetenciaPresentacion {
  id: string;
  codTienda: string;
  competenciaId: string;
  competenciaNombre: string;
  /** Abreviatura: `global_proveedores.prefijo` del proveedor del competidor. */
  competenciaAbreviatura: string;
  descripcionTienda: string | null;
  pxMostrar: number | null;
  etiqueta: string;
}

export interface OpcionReferenciaCompetencia {
  codTienda: string;
  competenciaId: string;
  competenciaNombre: string;
  descripcionTienda: string | null;
  pxMostrar: number | null;
  etiqueta: string;
}

const REFERENCIAS_COMPETENCIA_INCLUDE = {
  orderBy: [{ orden: "asc" as const }, { createdAt: "asc" as const }],
  include: {
    referenciaCompetencia: {
      include: {
        competencia: { select: { nombre: true, proveedor: { select: { prefijo: true } } } },
        prodTienda: { select: { descripcionTienda: true } },
      },
    },
  },
};

async function buildReferenciaCompetenciaFromRow(row: {
  id: string;
  refCodTienda: string;
  refCompetenciaId: string;
  referenciaCompetencia: {
    competencia: { nombre: string; proveedor: { prefijo: string | null } | null };
    prodTienda: { descripcionTienda: string | null };
  };
}): Promise<ReferenciaCompetenciaPresentacion> {
  const resuelto = await resolverPrecioCompetenciaMostrar(row.refCodTienda, row.refCompetenciaId);
  const competenciaNombre = row.referenciaCompetencia.competencia.nombre;
  const prefijo = row.referenciaCompetencia.competencia.proveedor?.prefijo?.trim();
  const competenciaAbreviatura = prefijo ? prefijo.toUpperCase() : "—";
  const descripcionTienda = row.referenciaCompetencia.prodTienda.descripcionTienda;
  const etiqueta = `${competenciaNombre} — ${descripcionTienda ?? row.refCodTienda}`;

  return {
    id: row.id,
    codTienda: row.refCodTienda,
    competenciaId: row.refCompetenciaId,
    competenciaNombre,
    competenciaAbreviatura,
    descripcionTienda,
    pxMostrar: resuelto?.pxMostrar ?? null,
    etiqueta,
  };
}

async function buildReferenciasCompetenciaPresentacion(presentacion: {
  referenciasCompetencia: Array<{
    id: string;
    refCodTienda: string;
    refCompetenciaId: string;
    referenciaCompetencia: {
      competencia: { nombre: string; proveedor: { prefijo: string | null } | null };
      prodTienda: { descripcionTienda: string | null };
    };
  }>;
}): Promise<ReferenciaCompetenciaPresentacion[]> {
  if (presentacion.referenciasCompetencia.length === 0) return [];
  return Promise.all(presentacion.referenciasCompetencia.map(buildReferenciaCompetenciaFromRow));
}

const getObjetivoFromPresentacion = async (p: {
  costoCompraObjetivo: unknown;
  productoReferencia?: { pxCompraFinalSinIva: unknown } | null;
  referenciasCompetencia: Array<{
    id: string;
    refCodTienda: string;
    refCompetenciaId: string;
    referenciaCompetencia: {
      competencia: { nombre: string; proveedor: { prefijo: string | null } | null };
      prodTienda: { descripcionTienda: string | null };
    };
  }>;
}): Promise<number | null> => {
  const refs = await buildReferenciasCompetenciaPresentacion(p);
  if (refs[0]?.pxMostrar != null) return refs[0].pxMostrar;
  if (p.productoReferencia?.pxCompraFinalSinIva != null) {
    return Number(p.productoReferencia.pxCompraFinalSinIva);
  }
  if (p.costoCompraObjetivo != null) {
    return Number(p.costoCompraObjetivo);
  }
  return null;
};

export interface CategoriaComparacionTree {
  id: string;
  nombre: string;
  subcategorias: {
    id: string;
    nombre: string;
    presentaciones: {
      id: string;
      nombre: string;
      costoCompraObjetivo: number | null;
      referenciasCompetencia: ReferenciaCompetenciaPresentacion[];
      labelCompleto: string;
    }[];
  }[];
}

export interface ProductoEnCategoria {
  id: string;
  codExt: string;
  descripcionProveedor: string;
  marca: string | null;
  /** Costo sin IVA en Comp. Categorias (incluye `dto_extra_comparacion` si aplica). */
  pxCompraFinalSinIva: number | null;
  proveedorPrefijo: string | null;
  /** DTO. EXTRA (0-99) persistido para "Comp. Por Cat." por ítem. */
  dtoExtraComparacion: number | null;
  /** Campos de lista proveedor para recalcular costo en cliente al editar DTO. EXTRA. */
  datosCosto: DatosCostoComparacion;
  /** Dif. % vs px referencia competencia (entero) persistido en Comparacion por categorías. */
  difPxRefManualComparacion: number | null;
  costoCompraObjetivo: number | null;
  diferenciaVsObjetivo: number | null; // pxCompraFinalSinIva - objetivo (negativo = bajo objetivo)
}

function mapDatosCostoComparacion(lp: {
  pxListaProveedor: unknown;
  pxDolares: boolean;
  cotizacionDolar: unknown;
  dtoProveedor: unknown;
  dtoMarca: unknown;
  dtoRubro: unknown;
  dtoCantidad: unknown;
  dtoFinanciero: unknown;
  cxTransporte: unknown;
  descEspecial: unknown;
}): DatosCostoComparacion {
  return {
    pxListaProveedor: Number(lp.pxListaProveedor),
    pxDolares: lp.pxDolares,
    cotizacionDolar: Number(lp.cotizacionDolar),
    dtoProveedor: Number(lp.dtoProveedor),
    dtoMarca: Number(lp.dtoMarca),
    dtoRubro: Number(lp.dtoRubro),
    dtoCantidad: Number(lp.dtoCantidad),
    dtoFinanciero: Number(lp.dtoFinanciero),
    cxTransporte: Number(lp.cxTransporte),
    descEspecial: Number(lp.descEspecial),
  };
}

/** Árbol completo Categoria → Subcategoria → Presentacion para la UI. */
export async function getArbolCategorias(): Promise<CategoriaComparacionTree[]> {
  const categorias = await prisma.categoriaComparacion.findMany({
    orderBy: { nombre: "asc" },
    include: {
      subcategorias: {
        orderBy: { nombre: "asc" },
        include: {
          presentaciones: {
            orderBy: { nombre: "asc" },
            include: {
              productoReferencia: { select: { pxCompraFinalSinIva: true } },
              referenciasCompetencia: REFERENCIAS_COMPETENCIA_INCLUDE,
            },
          },
        },
      },
    },
  });

  return Promise.all(
    categorias.map(async (c) => ({
      id: c.id,
      nombre: c.nombre,
      subcategorias: await Promise.all(
        c.subcategorias.map(async (s) => ({
          id: s.id,
          nombre: s.nombre,
          presentaciones: await Promise.all(
            s.presentaciones.map(async (p) => ({
              id: p.id,
              nombre: p.nombre,
              costoCompraObjetivo: await getObjetivoFromPresentacion(p),
              referenciasCompetencia: await buildReferenciasCompetenciaPresentacion(p),
              labelCompleto: `${c.nombre} - ${s.nombre} - ${p.nombre}`,
            }))
          ),
        }))
      ),
    }))
  );
}

/** Productos asignados a una presentación con referente de competencia. */
export async function getProductosPorPresentacion(
  presentacionId: string
): Promise<{
  productos: ProductoEnCategoria[];
  costoCompraObjetivo: number | null;
  labelCompleto: string;
  referenciasCompetencia: ReferenciaCompetenciaPresentacion[];
}> {
  const presentacion = await prisma.presentacionComparacion.findUnique({
    where: { id: presentacionId },
    include: {
      subcategoria: { include: { categoria: true } },
      referenciasCompetencia: REFERENCIAS_COMPETENCIA_INCLUDE,
      productoReferencia: { select: { pxCompraFinalSinIva: true } },
      listaPrecios: {
        include: {
          proveedor: { select: { prefijo: true } },
          comparacionItem: {
            select: { dtoExtra: true, difPxRefManual: true },
          },
        },
      },
    },
  });

  if (!presentacion) {
    return {
      productos: [],
      costoCompraObjetivo: null,
      labelCompleto: "",
      referenciasCompetencia: [],
    };
  }

  const labelCompleto = `${presentacion.subcategoria.categoria.nombre} - ${presentacion.subcategoria.nombre} - ${presentacion.nombre}`;
  const referenciasCompetencia = await buildReferenciasCompetenciaPresentacion(presentacion);
  const objetivo = await getObjetivoFromPresentacion(presentacion);

  const productos: ProductoEnCategoria[] = presentacion.listaPrecios
    .map((lp) => {
      const dtoExtraComparacion = lp.comparacionItem?.dtoExtra ?? null;
      const datosCosto = mapDatosCostoComparacion(lp);
      const pxFinal = calcCostoComparacion(datosCosto, dtoExtraComparacion);
      const dif =
        pxFinal != null && objetivo != null ? pxFinal - objetivo : null;
      return {
        id: lp.codExt,
        codExt: lp.codExt,
        descripcionProveedor: lp.descripcionProveedor,
        marca: lp.marca ?? null,
        pxCompraFinalSinIva: pxFinal,
        proveedorPrefijo: lp.proveedor?.prefijo ?? null,
        dtoExtraComparacion,
        datosCosto,
        difPxRefManualComparacion: lp.comparacionItem?.difPxRefManual ?? null,
        costoCompraObjetivo: objetivo,
        diferenciaVsObjetivo: dif,
      };
    })
    .sort((a, b) => {
      const pa = a.pxCompraFinalSinIva;
      const pb = b.pxCompraFinalSinIva;
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return pa - pb;
    });

  return { productos, costoCompraObjetivo: objetivo, labelCompleto, referenciasCompetencia };
}

/** Marcas distintas de lista_tienda (prod_precios_tienda.marca) para filtros. */
export async function getMarcasFromListaTienda(): Promise<string[]> {
  const rows = await prisma.prodTienda.findMany({
    where: { marca: { not: null } },
    select: { marca: true },
    distinct: ["marca"],
    orderBy: { marca: "asc" },
  });
  return rows.map((r) => r.marca as string).filter(Boolean);
}

/** Proveedores distintos de lista_tienda (prod_precios_tienda.proveedor) para filtros. */
export async function getProveedoresFromListaTienda(): Promise<string[]> {
  const rows = await prisma.prodTienda.findMany({
    where: { proveedor: { not: null } },
    select: { proveedor: true },
    distinct: ["proveedor"],
    orderBy: { proveedor: "asc" },
  });
  return rows.map((r) => r.proveedor as string).filter(Boolean);
}

function claveOpcionReferenciaCompetencia(codTienda: string, competenciaId: string): string {
  return `${codTienda}:${competenciaId}`;
}

function tokensBusquedaReferenciaCompetencia(q: string): string[] {
  return q.trim().split(/\s+/).filter(Boolean);
}

type OpcionBaseReferenciaCompetencia = {
  codTienda: string;
  competenciaId: string;
  competenciaNombre: string;
  descripcionTienda: string | null;
};

const MAX_BUSQUEDA_REFERENCIA_DB = 300;
const MAX_PRODUCTOS_BUSQUEDA_REFERENCIA = 40;

async function listarCodTiendasComparacionPorTexto(
  q: string,
  maxProductos: number
): Promise<string[]> {
  const tokens = tokensBusquedaReferenciaCompetencia(q);
  if (tokens.length === 0) return [];

  const rows = await prisma.prodTienda.findMany({
    where: {
      compararCompetencia: true,
      AND: tokens.map((token) => ({
        OR: [
          { codTienda: { contains: token, mode: "insensitive" as const } },
          { descripcionTienda: { contains: token, mode: "insensitive" as const } },
        ],
      })),
    },
    take: Math.max(maxProductos, MAX_BUSQUEDA_REFERENCIA_DB),
    orderBy: [{ descripcionTienda: "asc" }, { codTienda: "asc" }],
    select: { codTienda: true, descripcionTienda: true },
  });

  return rows
    .filter((row) => matchByMultiTerm([row.descripcionTienda, row.codTienda], q))
    .slice(0, maxProductos)
    .map((row) => row.codTienda);
}

async function armarOpcionesReferenciaPorCodTiendas(
  codTiendas: string[],
  competenciaId?: string
): Promise<OpcionBaseReferenciaCompetencia[]> {
  if (codTiendas.length === 0) return [];

  const filtroCompetenciaVinculo = competenciaId ? { competenciaId } : {};

  const [preciosRows, sugeridoRows, descripcionesTienda] = await Promise.all([
    prisma.prodPrecioCompetencia.findMany({
      where: {
        codTienda: { in: codTiendas },
        prodTienda: { compararCompetencia: true },
        ...filtroCompetenciaVinculo,
      },
      orderBy: [{ prodTienda: { descripcionTienda: "asc" } }, { competencia: { nombre: "asc" } }],
      select: {
        codTienda: true,
        competenciaId: true,
        competencia: { select: { nombre: true } },
        prodTienda: { select: { descripcionTienda: true } },
      },
    }),
    listarCompetenciasConPxSugeridoPorCodTiendas(codTiendas, competenciaId),
    prisma.prodTienda.findMany({
      where: { codTienda: { in: codTiendas } },
      select: { codTienda: true, descripcionTienda: true },
    }),
  ]);

  const descripcionPorCod = new Map(
    descripcionesTienda.map((row) => [row.codTienda, row.descripcionTienda])
  );

  const opcionesMap = new Map<string, OpcionBaseReferenciaCompetencia>();

  for (const row of preciosRows) {
    opcionesMap.set(claveOpcionReferenciaCompetencia(row.codTienda, row.competenciaId), {
      codTienda: row.codTienda,
      competenciaId: row.competenciaId,
      competenciaNombre: row.competencia.nombre,
      descripcionTienda: row.prodTienda.descripcionTienda,
    });
  }

  for (const row of sugeridoRows) {
    const key = claveOpcionReferenciaCompetencia(row.codTienda, row.competenciaId);
    if (opcionesMap.has(key)) continue;
    opcionesMap.set(key, {
      codTienda: row.codTienda,
      competenciaId: row.competenciaId,
      competenciaNombre: row.competenciaNombre,
      descripcionTienda: descripcionPorCod.get(row.codTienda) ?? null,
    });
  }

  return [...opcionesMap.values()];
}

function ordenarYLimitarOpcionesReferencia(
  opciones: OpcionBaseReferenciaCompetencia[],
  take: number
): OpcionBaseReferenciaCompetencia[] {
  return opciones
    .sort((a, b) => {
      const cmpDesc = (a.descripcionTienda ?? a.codTienda).localeCompare(
        b.descripcionTienda ?? b.codTienda,
        "es"
      );
      if (cmpDesc !== 0) return cmpDesc;
      return a.competenciaNombre.localeCompare(b.competenciaNombre, "es");
    })
    .slice(0, take);
}

async function resolverOpcionesReferenciaConPrecio(
  opciones: OpcionBaseReferenciaCompetencia[]
): Promise<OpcionReferenciaCompetencia[]> {
  if (opciones.length === 0) return [];

  const codTiendas = [...new Set(opciones.map((o) => o.codTienda))];
  const competenciaIds = [...new Set(opciones.map((o) => o.competenciaId))];

  const [competencias, idProveedoresLista, sugeridosDirectos] = await Promise.all([
    prisma.prodCompetencia.findMany({
      where: { id: { in: competenciaIds } },
      select: { id: true, idProveedor: true },
    }),
    prisma.listaPrecioProveedor.findMany({
      where: {
        codTiendaVinculo: { in: codTiendas },
        habilitado: true,
        pxVtaSugerido: { not: null, gt: 0 },
      },
      select: { idProveedor: true },
      distinct: ["idProveedor"],
    }),
    listarCompetenciasConPxSugeridoPorCodTiendas(codTiendas),
  ]);

  const proveedorPorCompetencia = new Map(
    competencias.filter((c) => c.idProveedor).map((c) => [c.id, c.idProveedor as string])
  );
  const pxSugeridoDirectoPorOpcion = new Map(
    sugeridosDirectos.map((row) => [
      claveOpcionReferenciaCompetencia(row.codTienda, row.competenciaId),
      row.px,
    ])
  );
  for (const row of sugeridosDirectos) {
    if (!proveedorPorCompetencia.has(row.competenciaId)) {
      proveedorPorCompetencia.set(row.competenciaId, row.idProveedor);
    }
  }

  const idProveedores = [
    ...new Set([
      ...competencias
        .map((c) => c.idProveedor)
        .filter((id): id is string => Boolean(id)),
      ...idProveedoresLista.map((row) => row.idProveedor),
    ]),
  ];

  const [preciosMap, pxSugeridoMap] = await Promise.all([
    resolverPreciosCompetenciaMostrar(
      opciones.map((o) => ({ codTienda: o.codTienda, competenciaId: o.competenciaId }))
    ),
    buildMapPxVtaSugerido(codTiendas, idProveedores),
  ]);

  return opciones.map((o) => {
    const key = claveOpcionReferenciaCompetencia(o.codTienda, o.competenciaId);
    const resuelto = preciosMap.get(key);
    let pxMostrar = resuelto?.pxMostrar ?? null;
    if (pxMostrar == null) {
      const idProveedor = proveedorPorCompetencia.get(o.competenciaId);
      if (idProveedor) {
        pxMostrar = pxSugeridoMap.get(`${o.codTienda}:${idProveedor}`) ?? null;
      }
    }
    if (pxMostrar == null) {
      pxMostrar = pxSugeridoDirectoPorOpcion.get(key) ?? null;
    }
    return {
      codTienda: o.codTienda,
      competenciaId: o.competenciaId,
      competenciaNombre: o.competenciaNombre,
      descripcionTienda: o.descripcionTienda,
      pxMostrar,
      etiqueta: `${o.competenciaNombre} — ${o.descripcionTienda ?? o.codTienda}`,
    };
  });
}

function ordenarOpcionesReferenciaConPrecio(
  opciones: OpcionReferenciaCompetencia[]
): OpcionReferenciaCompetencia[] {
  return [...opciones].sort((a, b) => {
    const cmpDesc = (a.descripcionTienda ?? a.codTienda).localeCompare(
      b.descripcionTienda ?? b.codTienda,
      "es"
    );
    if (cmpDesc !== 0) return cmpDesc;
    return a.competenciaNombre.localeCompare(b.competenciaNombre, "es");
  });
}

async function buscarOpcionesReferenciaCompetenciaBrowse(
  take: number,
  competenciaId?: string
): Promise<OpcionBaseReferenciaCompetencia[]> {
  const filtroCompetenciaVinculo = competenciaId ? { competenciaId } : {};
  const filtroCompetenciaSugerido = competenciaId
    ? { proveedor: { competenciasPrecios: { some: { id: competenciaId } } } }
    : { proveedor: { competenciasPrecios: { some: {} } } };

  const [preciosRows, sugeridoRows] = await Promise.all([
    prisma.prodPrecioCompetencia.findMany({
      where: {
        prodTienda: { compararCompetencia: true },
        ...filtroCompetenciaVinculo,
      },
      take: take * 2,
      orderBy: [{ prodTienda: { descripcionTienda: "asc" } }, { competencia: { nombre: "asc" } }],
      select: {
        codTienda: true,
        competenciaId: true,
        competencia: { select: { nombre: true } },
        prodTienda: { select: { descripcionTienda: true } },
      },
    }),
    prisma.listaPrecioProveedor.findMany({
      where: {
        habilitado: true,
        pxVtaSugerido: { not: null, gt: 0 },
        codTiendaVinculo: { not: null },
        prodTienda: { compararCompetencia: true },
        ...filtroCompetenciaSugerido,
      },
      take: take * 2,
      orderBy: { prodTienda: { descripcionTienda: "asc" } },
      select: {
        codTiendaVinculo: true,
        prodTienda: { select: { descripcionTienda: true } },
        proveedor: {
          select: {
            competenciasPrecios: {
              where: competenciaId ? { id: competenciaId } : undefined,
              select: { id: true, nombre: true },
              orderBy: { nombre: "asc" },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  const opcionesMap = new Map<string, OpcionBaseReferenciaCompetencia>();

  for (const row of preciosRows) {
    opcionesMap.set(claveOpcionReferenciaCompetencia(row.codTienda, row.competenciaId), {
      codTienda: row.codTienda,
      competenciaId: row.competenciaId,
      competenciaNombre: row.competencia.nombre,
      descripcionTienda: row.prodTienda.descripcionTienda,
    });
  }

  for (const row of sugeridoRows) {
    const codTienda = row.codTiendaVinculo;
    const competencia = row.proveedor.competenciasPrecios[0];
    if (!codTienda || !competencia) continue;
    const key = claveOpcionReferenciaCompetencia(codTienda, competencia.id);
    if (opcionesMap.has(key)) continue;
    opcionesMap.set(key, {
      codTienda,
      competenciaId: competencia.id,
      competenciaNombre: competencia.nombre,
      descripcionTienda: row.prodTienda?.descripcionTienda ?? null,
    });
  }

  return [...opcionesMap.values()];
}

/** Opciones para elegir referente: catálogo Px Competencia (scrape + Px. Vta. Sugerido, igual `/cx-px-tienda`). */
export async function buscarOpcionesReferenciaCompetencia(params: {
  q?: string;
  take?: number;
  presentacionId?: string;
  competenciaId?: string;
}): Promise<OpcionReferenciaCompetencia[]> {
  const q = params.q?.trim() ?? "";
  const take = params.take ?? 100;
  const competenciaId = params.competenciaId?.trim() || undefined;

  const excluirKeys = new Set<string>();
  if (params.presentacionId) {
    const asignadas = await prisma.comparacionPresentacionRefComp.findMany({
      where: { presentacionId: params.presentacionId },
      select: { refCodTienda: true, refCompetenciaId: true },
    });
    for (const row of asignadas) {
      excluirKeys.add(claveOpcionReferenciaCompetencia(row.refCodTienda, row.refCompetenciaId));
    }
  }

  let opciones: OpcionBaseReferenciaCompetencia[];

  if (q) {
    const maxProductos = Math.min(
      MAX_PRODUCTOS_BUSQUEDA_REFERENCIA,
      Math.max(Math.ceil(take / 4), 1)
    );
    const codTiendas = await listarCodTiendasComparacionPorTexto(q, maxProductos);
    opciones = await armarOpcionesReferenciaPorCodTiendas(codTiendas, competenciaId);
    opciones = opciones.filter((o) =>
      matchByMultiTerm([o.descripcionTienda, o.codTienda], q)
    );
  } else {
    opciones = await buscarOpcionesReferenciaCompetenciaBrowse(take, competenciaId);
    opciones = ordenarYLimitarOpcionesReferencia(opciones, take);
  }

  opciones = opciones.filter(
    (o) => !excluirKeys.has(claveOpcionReferenciaCompetencia(o.codTienda, o.competenciaId))
  );

  const resueltas = await resolverOpcionesReferenciaConPrecio(opciones);
  const asignables = resueltas.filter((o) => o.pxMostrar != null && o.pxMostrar > 0);

  return ordenarOpcionesReferenciaConPrecio(asignables).slice(0, take);
}

export interface CompetidorParaReferenciaModal {
  id: string;
  nombre: string;
  prefijoProveedor: string | null;
}

/** Lista competidores para el select del modal Agregar Referencia De Competencia. */
export async function listarCompetidoresParaReferencia(): Promise<CompetidorParaReferenciaModal[]> {
  const rows = await prisma.prodCompetencia.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      proveedor: { select: { prefijo: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    prefijoProveedor: r.proveedor?.prefijo ?? null,
  }));
}

export async function asignarReferenciaCompetenciaPresentacion(
  presentacionId: string,
  codTienda: string,
  competenciaId: string
): Promise<void> {
  const prodTienda = await prisma.prodTienda.findUnique({
    where: { codTienda },
    select: { compararCompetencia: true },
  });
  if (!prodTienda?.compararCompetencia) {
    throw new Error("El producto no está en el catálogo de Px Competencia.");
  }

  await ensureVinculoCompetenciaParaReferencia(codTienda, competenciaId);

  const resuelto = await resolverPrecioCompetenciaMostrar(codTienda, competenciaId);
  if (resuelto?.pxMostrar == null || resuelto.pxMostrar <= 0) {
    throw new Error("No hay precio de competencia disponible para esta referencia.");
  }

  const existente = await prisma.comparacionPresentacionRefComp.findUnique({
    where: {
      presentacionId_refCodTienda_refCompetenciaId: {
        presentacionId,
        refCodTienda: codTienda,
        refCompetenciaId: competenciaId,
      },
    },
    select: { id: true },
  });
  if (existente) {
    throw new Error("Esta referencia ya está asignada a la presentación.");
  }

  const refsPrevias = await prisma.comparacionPresentacionRefComp.count({
    where: { presentacionId },
  });

  const maxOrden = await prisma.comparacionPresentacionRefComp.aggregate({
    where: { presentacionId },
    _max: { orden: true },
  });

  await prisma.comparacionPresentacionRefComp.create({
    data: {
      presentacionId,
      refCodTienda: codTienda,
      refCompetenciaId: competenciaId,
      orden: (maxOrden._max.orden ?? -1) + 1,
    },
  });

  if (refsPrevias === 0) {
    await prisma.presentacionComparacion.update({
      where: { id: presentacionId },
      data: {
        productoReferenciaCodExt: null,
        costoCompraObjetivo: null,
      },
    });
  }
}

export async function quitarReferenciaCompetenciaItem(refCompId: string): Promise<void> {
  await prisma.comparacionPresentacionRefComp.delete({
    where: { id: refCompId },
  });
}

// ─── CRUD Categorias ────────────────────────────────────────────────────────
export async function createCategoria(nombre: string) {
  return prisma.categoriaComparacion.create({
    data: { nombre: normalizeNombreCategoria(nombre) },
  });
}

export async function updateCategoria(id: string, data: { nombre?: string }) {
  const payload: { nombre?: string } = {};
  if (data.nombre !== undefined) {
    payload.nombre = normalizeNombreCategoria(data.nombre);
  }
  return prisma.categoriaComparacion.update({ where: { id }, data: payload });
}

export async function deleteCategoria(id: string) {
  return prisma.categoriaComparacion.delete({ where: { id } });
}

// ─── CRUD Subcategorias ─────────────────────────────────────────────────────
export async function createSubcategoria(categoriaId: string, nombre: string) {
  return prisma.subcategoriaComparacion.create({
    data: { categoriaId, nombre: normalizeNombreCategoria(nombre) },
  });
}

export async function updateSubcategoria(
  id: string,
  data: { nombre?: string; categoriaId?: string }
) {
  const payload: { nombre?: string; categoriaId?: string } = {};
  if (data.nombre !== undefined) {
    payload.nombre = normalizeNombreCategoria(data.nombre);
  }
  if (data.categoriaId !== undefined) {
    payload.categoriaId = data.categoriaId;
  }
  return prisma.subcategoriaComparacion.update({ where: { id }, data: payload });
}

export async function deleteSubcategoria(id: string) {
  return prisma.subcategoriaComparacion.delete({ where: { id } });
}

// ─── CRUD Presentaciones ────────────────────────────────────────────────────
export async function createPresentacion(
  subcategoriaId: string,
  nombre: string,
  costoCompraObjetivo?: number | null
) {
  return prisma.presentacionComparacion.create({
    data: {
      subcategoriaId,
      nombre: normalizeNombreCategoria(nombre),
      costoCompraObjetivo: costoCompraObjetivo ?? null,
    },
  });
}

export type UpdatePresentacionData = {
  nombre?: string;
  subcategoriaId?: string;
  costoCompraObjetivo?: number | null;
  /** @deprecated Legacy prod_precios_provee */
  productoReferenciaCodExt?: string | null;
};

export async function updatePresentacion(id: string, data: UpdatePresentacionData) {
  const payload: UpdatePresentacionData = {};
  if (data.nombre !== undefined) {
    payload.nombre = normalizeNombreCategoria(data.nombre);
  }
  if (data.subcategoriaId !== undefined) payload.subcategoriaId = data.subcategoriaId;
  if (data.costoCompraObjetivo !== undefined) payload.costoCompraObjetivo = data.costoCompraObjetivo;
  if (data.productoReferenciaCodExt !== undefined)
    payload.productoReferenciaCodExt = data.productoReferenciaCodExt;

  return prisma.presentacionComparacion.update({ where: { id }, data: payload });
}

export async function deletePresentacion(id: string) {
  return prisma.presentacionComparacion.delete({ where: { id } });
}

/** Asignar productos (`cod_ext` de prod_precios_provee) a una presentación. */
export async function asignarProductosAPresentacion(
  presentacionId: string,
  codigosExtProductos: string[]
): Promise<{ count: number }> {
  if (codigosExtProductos.length === 0) return { count: 0 };
  const result = await prisma.listaPrecioProveedor.updateMany({
    where: { codExt: { in: codigosExtProductos } },
    data: { idPresentacion: presentacionId },
  });
  return { count: result.count };
}

/** Quitar asignación de presentación de productos (poner id_presentacion en null). */
export async function quitarAsignacionPresentacion(codigosExtProductos: string[]): Promise<{ count: number }> {
  if (codigosExtProductos.length === 0) return { count: 0 };
  const result = await prisma.listaPrecioProveedor.updateMany({
    where: { codExt: { in: codigosExtProductos } },
    data: { idPresentacion: null },
  });
  return { count: result.count };
}

type ComparacionItemPatch = {
  dtoExtra?: number | null;
  difPxRefManual?: number | null;
};

/** Upsert parcial de ajustes Comp. Categorías por ítem (`prod_comp_cat`). Borra la fila si ambos campos quedan null. */
async function upsertComparacionItemParcial(
  listaPrecioProveedorCodExt: string,
  patch: ComparacionItemPatch
): Promise<void> {
  const existing = await prisma.comparacionItem.findUnique({
    where: { listaPrecioProveedorCodExt },
    select: { dtoExtra: true, difPxRefManual: true },
  });

  const dtoExtra =
    patch.dtoExtra !== undefined ? patch.dtoExtra : (existing?.dtoExtra ?? null);
  const difPxRefManual =
    patch.difPxRefManual !== undefined
      ? patch.difPxRefManual
      : (existing?.difPxRefManual ?? null);

  if (dtoExtra === null && difPxRefManual === null) {
    if (existing) {
      await prisma.comparacionItem.delete({
        where: { listaPrecioProveedorCodExt },
      });
    }
    return;
  }

  await prisma.comparacionItem.upsert({
    where: { listaPrecioProveedorCodExt },
    create: { listaPrecioProveedorCodExt, dtoExtra, difPxRefManual },
    update: { dtoExtra, difPxRefManual },
  });
}

/** Persistir DTO. EXTRA para "Comp. Por Cat." por ítem (ListaPrecioProveedor). */
export async function actualizarDtoExtraComparacionItem(
  listaPrecioProveedorCodExt: string,
  dtoExtra: number | null
): Promise<void> {
  await upsertComparacionItemParcial(listaPrecioProveedorCodExt, { dtoExtra });
}

/** Persistir dif. % vs px referencia (entero con signo) por ítem en Comparacion. */
export async function actualizarDifPxRefManualComparacionItem(
  listaPrecioProveedorCodExt: string,
  difPxRefManual: number | null
): Promise<void> {
  await upsertComparacionItemParcial(listaPrecioProveedorCodExt, { difPxRefManual });
}
