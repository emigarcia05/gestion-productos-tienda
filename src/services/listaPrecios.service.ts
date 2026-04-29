/**
 * Servicio prod_precios_provee – Capa de datos (Neon / Prisma).
 * Upsert por código externo (cod_ext = [SUFIJO]-[codProdProv]).
 * getListaPreciosConTienda: una sola entrada para la página lista-precios (DRY).
 */

import type { FilaListaPrecio } from "@/lib/parsearImport";
import { prisma } from "@/lib/prisma";
import { buildCodExt } from "@/lib/codigos";
import { calcPxCompraFinal, clampPercent } from "@/lib/calculos";
import { filtroTexto, matchByMultiTerm } from "@/lib/busqueda";
import type { Prisma } from "@prisma/client";
import { PAGE_SIZE } from "@/lib/pagination";

const TIPO_URGENTE_MERC2 = "URGENTE";

function costoCompraFinalProveedorLista(params: {
  pxCompraFinal: Prisma.Decimal | null;
  pxListaProveedor: Prisma.Decimal;
  dtoRubro: number;
  dtoCantidad: number;
  cxTransporte: number;
  dtoProveedor: number;
  dtoMarca: number;
  dtoFinanciero: number;
}): number {
  const {
    pxCompraFinal,
    pxListaProveedor,
    dtoRubro,
    dtoCantidad,
    cxTransporte,
    dtoProveedor,
    dtoMarca,
    dtoFinanciero,
  } = params;
  if (pxCompraFinal != null) return Number(pxCompraFinal);
  return calcPxCompraFinal(
    Number(pxListaProveedor),
    dtoRubro,
    dtoCantidad,
    cxTransporte,
    dtoProveedor,
    dtoMarca,
    dtoFinanciero
  );
}

/** Fila para el cliente (lista-precios / sugeridos): proveedor + descripción tienda si existe. */
export interface FilaListaPrecioParaCliente {
  id: string;
  codExt: string;
  /** Descripción efectiva para UI: primero tienda, fallback proveedor. */
  descripcion: string;
  descripcionProveedor: string;
  descripcionTienda: string | null;
  marca: string | null;
  rubro: string | null;
  pxListaProveedor: number;
  /** Precio venta sugerido; presente cuando se usa soloPxSugerido (p. ej. página Sugeridos). */
  pxVtaSugerido?: number | null;
  dtoProveedor: number;
  dtoMarca: number;
  dtoRubro: number;
  dtoCantidad: number;
  dtoFinanciero: number;
  cxTransporte: number;
  pxCompraFinal: number | null;
  proveedor: { id: string; prefijo: string; nombre: string } | null;
}

export interface ListaPreciosFiltradoOpciones {
  /** Si true, solo devuelve ítems con px_vta_sugerido no nulo (p. ej. página Px Vta. Sugeridos). */
  soloPxSugerido?: boolean;
}

/**
 * Obtiene lista de precios proveedor unida con descripciones de prod_precios_tienda.
 * Una sola función para la página lista-precios: evita repetir la lógica de join.
 */
export async function getListaPreciosConTienda(): Promise<FilaListaPrecioParaCliente[]> {
  const [filas, tiendaRows] = await Promise.all([
    prisma.listaPrecioProveedor.findMany({
      include: { proveedor: true },
      orderBy: { codExt: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { codExt: true, descripcionTienda: true },
    }),
  ]);

  const descripcionPorCodExt = new Map(
    tiendaRows
      .filter((t) => t.descripcionTienda != null && t.descripcionTienda !== "")
      .map((t) => [t.codExt, t.descripcionTienda as string])
  );

  return filas.map((f) => ({
    id: f.id,
    codExt: f.codExt,
    descripcion: descripcionPorCodExt.get(f.codExt) ?? f.descripcionProveedor,
    descripcionProveedor: f.descripcionProveedor,
    descripcionTienda: descripcionPorCodExt.get(f.codExt) ?? null,
    marca: f.marca ?? null,
    rubro: f.rubro ?? null,
    pxListaProveedor: Number(f.pxListaProveedor),
    dtoProveedor: f.dtoProveedor,
    dtoMarca: f.dtoMarca,
    dtoRubro: f.dtoRubro,
    dtoCantidad: f.dtoCantidad,
    dtoFinanciero: f.dtoFinanciero,
    cxTransporte: f.cxTransporte,
    pxCompraFinal: f.pxCompraFinal != null ? Number(f.pxCompraFinal) : null,
    proveedor: f.proveedor
      ? { id: f.proveedor.id, prefijo: f.proveedor.prefijo ?? "", nombre: f.proveedor.nombre }
      : null,
  }));
}

/**
 * Lista de precios filtrada por proveedor, marca, rubro y/o búsqueda (≥3 caracteres).
 * Usado para carga bajo demanda: no se traen datos hasta que el usuario aplica un filtro.
 * Si no hay filtro activo (ningún selector o búsqueda < 3 chars), devuelve [].
 * opciones.soloPxSugerido: solo ítems con px_vta_sugerido no nulo (p. ej. página Sugeridos).
 * Regla de filtros: ver docs/FILTROS_DINAMICOS.md (simétrico: opciones de cada filtro según los demás).
 */
export interface ListaPreciosFiltradaResult {
  filas: FilaListaPrecioParaCliente[];
  total: number;
  totalPaginas: number;
}

export async function getListaPreciosConTiendaFiltrada(
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  rubroNombre: string | undefined,
  busqueda: string | undefined,
  habilitado: boolean | undefined,
  opciones?: ListaPreciosFiltradoOpciones,
  pagina?: number,
  pageSize: number = PAGE_SIZE
): Promise<ListaPreciosFiltradaResult> {
  const prov = proveedorId?.trim() || undefined;
  const marca = marcaNombre?.trim() || undefined;
  const rubro = rubroNombre?.trim() || undefined;
  const q = busqueda?.trim() || "";
  const tieneFiltro = !!prov || !!marca || !!rubro || habilitado !== undefined || q.length >= 3;
  if (!tieneFiltro) return { filas: [], total: 0, totalPaginas: 0 };

  const andParts: Prisma.ListaPrecioProveedorWhereInput[] = [];
  andParts.push({ proveedor: { proveedorMercaderia: true } });
  if (prov) andParts.push({ idProveedor: prov });
  if (marca) andParts.push({ marca: marca });
  if (rubro) andParts.push({ rubro: rubro });
  if (habilitado !== undefined) andParts.push({ habilitado });
  if (opciones?.soloPxSugerido) andParts.push({ pxVtaSugerido: { not: null } });
  if (q.length >= 3) {
    const tokens = q.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      andParts.push({
        AND: tokens.map((token) => ({
          OR: [
            { descripcionProveedor: { contains: token, mode: "insensitive" as const } },
            { codExt: { contains: token, mode: "insensitive" as const } },
            { marca: { contains: token, mode: "insensitive" as const } },
            { rubro: { contains: token, mode: "insensitive" as const } },
            { listaPrecioTienda: { descripcionTienda: { contains: token, mode: "insensitive" as const } } },
          ],
        })),
      });
    }
  }
  const where: Prisma.ListaPrecioProveedorWhereInput = andParts.length ? { AND: andParts } : {};

  const skip = pagina != null ? (Math.max(1, pagina) - 1) * pageSize : 0;
  const take = pagina != null ? pageSize : undefined;

  const [filasRaw, total] = await Promise.all([
    prisma.listaPrecioProveedor.findMany({
      where,
      include: { proveedor: true },
      orderBy: { codExt: "asc" },
      skip,
      take,
    }),
    prisma.listaPrecioProveedor.count({ where }),
  ]);

  const codExts = [...new Set(filasRaw.map((r) => r.codExt))];
  const tiendaRows =
    codExts.length > 0
      ? await prisma.listaPrecioTienda.findMany({
          where: { codExt: { in: codExts } },
          select: { codExt: true, descripcionTienda: true },
        })
      : [];

  const descripcionPorCodExt = new Map(
    tiendaRows
      .filter((t) => t.descripcionTienda != null && t.descripcionTienda !== "")
      .map((t) => [t.codExt, t.descripcionTienda as string])
  );

  let result: FilaListaPrecioParaCliente[] = filasRaw.map((f) => ({
    id: f.id,
    codExt: f.codExt,
    descripcion: descripcionPorCodExt.get(f.codExt) ?? f.descripcionProveedor,
    descripcionProveedor: f.descripcionProveedor,
    descripcionTienda: descripcionPorCodExt.get(f.codExt) ?? null,
    marca: f.marca ?? null,
    rubro: f.rubro ?? null,
    pxListaProveedor: Number(f.pxListaProveedor),
    // Siempre exponer el campo para que módulos como "Px. Vta. Sugeridos"
    // puedan renderizar la columna aunque no filtren por soloPxSugerido.
    pxVtaSugerido: f.pxVtaSugerido != null ? Number(f.pxVtaSugerido) : null,
    dtoProveedor: f.dtoProveedor,
    dtoMarca: f.dtoMarca,
    dtoRubro: f.dtoRubro,
    dtoCantidad: f.dtoCantidad,
    dtoFinanciero: f.dtoFinanciero,
    cxTransporte: f.cxTransporte,
    pxCompraFinal: f.pxCompraFinal != null ? Number(f.pxCompraFinal) : null,
    proveedor: f.proveedor
      ? { id: f.proveedor.id, prefijo: f.proveedor.prefijo ?? "", nombre: f.proveedor.nombre }
      : null,
  }));

  if (q.length >= 3) {
    result = result.filter((f) =>
      matchByMultiTerm([f.descripcionProveedor, f.descripcionTienda, f.marca ?? "", f.rubro ?? ""], q)
    );
  }

  const totalPaginas = pagina != null && total > 0 ? Math.ceil(total / pageSize) : 1;

  return { filas: result, total, totalPaginas };
}

/** Proveedores con al menos un ítem que cumple (marca, rubro, busqueda, habilitado). Para filtros dinámicos (ver FILTROS_DINAMICOS.md). */
export async function getProveedoresDisponiblesListaPrecios(
  marcaNombre: string | undefined,
  rubroNombre: string | undefined,
  busqueda: string | undefined,
  habilitado: boolean | undefined,
  opciones?: ListaPreciosFiltradoOpciones
): Promise<{ id: string; nombre: string; prefijo: string }[]> {
  const { filas } = await getListaPreciosConTiendaFiltrada(undefined, marcaNombre, rubroNombre, busqueda, habilitado, opciones);
  const seen = new Set<string>();
  const out: { id: string; nombre: string; prefijo: string }[] = [];
  for (const f of filas) {
    const p = f.proveedor;
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ id: p.id, nombre: p.nombre, prefijo: p.prefijo });
  }
  return out;
}

/** Marcas con al menos un ítem que cumple (proveedorId, rubro, busqueda, habilitado). Para filtros dinámicos (ver FILTROS_DINAMICOS.md). */
export async function getMarcasDisponiblesListaPrecios(
  proveedorId: string | undefined,
  rubroNombre: string | undefined,
  busqueda: string | undefined,
  habilitado: boolean | undefined,
  opciones?: ListaPreciosFiltradoOpciones
): Promise<{ id: string; nombre: string }[]> {
  const { filas } = await getListaPreciosConTiendaFiltrada(proveedorId, undefined, rubroNombre, busqueda, habilitado, opciones);
  const seen = new Set<string>();
  const out: { id: string; nombre: string }[] = [];
  for (const f of filas) {
    const m = (f.marca ?? "").trim();
    if (!m || seen.has(m)) continue;
    seen.add(m);
    out.push({ id: m, nombre: m });
  }
  return out;
}

/** Rubros con al menos un ítem que cumple (proveedorId, marcaNombre, busqueda, habilitado). Para filtros dinámicos (ver FILTROS_DINAMICOS.md). */
export async function getRubrosDisponiblesListaPrecios(
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  busqueda: string | undefined,
  habilitado: boolean | undefined,
  opciones?: ListaPreciosFiltradoOpciones
): Promise<{ id: string; nombre: string }[]> {
  const { filas } = await getListaPreciosConTiendaFiltrada(proveedorId, marcaNombre, undefined, busqueda, habilitado, opciones);
  const seen = new Set<string>();
  const out: { id: string; nombre: string }[] = [];
  for (const f of filas) {
    const r = (f.rubro ?? "").trim();
    if (!r || seen.has(r)) continue;
    seen.add(r);
    out.push({ id: r, nombre: r });
  }
  return out;
}

/** Item mínimo para modal de vinculación: solo prefijo y descripción en tabla; datos completos para onSeleccionar. pxCompraFinal para selector de costo objetivo. */
export interface ProductoProveedorParaVincular {
  id: string;
  idProveedor: string;
  codExt: string;
  codProdProv: string;
  descripcionProveedor: string;
  rubro: string | null;
  proveedor: { prefijo: string; nombre: string };
  /** Precio final de compra (para usar como costo objetivo al seleccionar desde lista). */
  pxCompraFinal: number | null;
}

const MAX_PRODUCTOS_VINCULAR = 500;

/**
 * Lista ítems de prod_precios_provee para el modal "Vincular nuevo producto".
 * Filtros: proveedor (opcional), descripción/código (q, multi-término).
 */
export async function listarProductosProveedoresParaVincular(
  proveedorId?: string,
  q?: string
): Promise<ProductoProveedorParaVincular[]> {
  const andParts: Prisma.ListaPrecioProveedorWhereInput[] = [];
  if (proveedorId) andParts.push({ idProveedor: proveedorId });
  const textFilter = filtroTexto(q ?? "", ["descripcionProveedor", "codExt"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  const where: Prisma.ListaPrecioProveedorWhereInput = andParts.length ? { AND: andParts } : {};

  const rows = await prisma.listaPrecioProveedor.findMany({
    where,
    include: { proveedor: { select: { prefijo: true, nombre: true } } },
    orderBy: { codExt: "asc" },
    take: MAX_PRODUCTOS_VINCULAR,
  });

  return rows.map((r) => ({
    id: r.id,
    idProveedor: r.idProveedor,
    codExt: r.codExt,
    codProdProv: r.codProdProveedor,
    descripcionProveedor: r.descripcionProveedor,
    rubro: r.rubro ?? null,
    proveedor: { prefijo: r.proveedor.prefijo ?? "", nombre: r.proveedor.nombre },
    pxCompraFinal: r.pxCompraFinal != null ? Number(r.pxCompraFinal) : null,
  }));
}

export interface UpsertListaPreciosResult {
  creados: number;
  actualizados: number;
  errores: string[];
}

export interface UpsertListaPreciosOptions {
  /** Llamado periódicamente con (procesados, total) para indicar avance (ej. sidebar). */
  onProgress?(processed: number, total: number): void;
}

/**
 * Upsert de filas en prod_precios_provee.
 * Clave lógica: cod_ext (único) = [SUFIJO]-[codProdProv].
 * Si existe, actualiza; si no, crea con descuentos y cx_transporte en 0 (defaults BD).
 * precioEnDolares: mapea al switch SÍ/NO del modal; se persiste en px_dolares. Si true, cotizacion_dolar = COTIZACION_DOLAR (env) o 1.
 * habilitado: mapea opción Habilitado SÍ/NO del modal importar; por defecto true.
 */
export async function upsertListaPrecios(
  proveedorId: string,
  prefijo: string,
  filas: FilaListaPrecio[],
  precioEnDolares: boolean = false,
  habilitado: boolean = true,
  options?: UpsertListaPreciosOptions
): Promise<UpsertListaPreciosResult> {
  let creados = 0;
  let actualizados = 0;
  const errores: string[] = [];
  const cotizacionDolar = precioEnDolares ? Number(process.env.COTIZACION_DOLAR ?? 1) : 1;
  const onProgress = options?.onProgress;
  const total = filas.length;

  // Prefetch: evita el `findUnique()` por fila (N+1).
  // Solo usamos esto para el conteo (creados/actualizados); el estado final lo define el `upsert`.
  const uniqueCodProdProvs = [...new Set(filas.map((f) => f.codProdProv))];
  const existentesCodProdSet = new Set<string>();
  const CHUNK_PREFETCH = 500;
  for (let i = 0; i < uniqueCodProdProvs.length; i += CHUNK_PREFETCH) {
    const chunk = uniqueCodProdProvs.slice(i, i + CHUNK_PREFETCH);
    const existentes = await prisma.listaPrecioProveedor.findMany({
      where: {
        idProveedor: proveedorId,
        codProdProveedor: { in: chunk },
      },
      select: { codProdProveedor: true },
    });
    for (const row of existentes) existentesCodProdSet.add(row.codProdProveedor);
  }

  for (let i = 0; i < filas.length; i++) {
    if (onProgress && (i % 10 === 0 || i === total - 1)) {
      onProgress(i + 1, total);
    }
    const fila = filas[i];
    const codExt = buildCodExt(prefijo, fila.codProdProv);

    try {
      const existia = existentesCodProdSet.has(fila.codProdProv);

      await prisma.listaPrecioProveedor.upsert({
        where: { idProveedor_codProdProveedor: { idProveedor: proveedorId, codProdProveedor: fila.codProdProv } },
        create: {
          idProveedor: proveedorId,
          codProdProveedor: fila.codProdProv,
          descripcionProveedor: fila.descripcion,
          codExt,
          pxListaProveedor: fila.precioLista,
          pxDolares: precioEnDolares,
          cotizacionDolar,
          pxVtaSugerido: fila.precioVentaSugerido || null,
          habilitado,
        },
        update: {
          idProveedor: proveedorId,
          codProdProveedor: fila.codProdProv,
          descripcionProveedor: fila.descripcion,
          pxListaProveedor: fila.precioLista,
          pxDolares: precioEnDolares,
          cotizacionDolar,
          pxVtaSugerido: fila.precioVentaSugerido || null,
          habilitado,
        },
      });

      if (existia) actualizados++;
      else creados++;
      // Para duplicados en el input: si lo creamos en esta corrida, luego debe contarse como "update".
      existentesCodProdSet.add(fila.codProdProv);
    } catch (e) {
      errores.push(`Fila ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { creados, actualizados, errores };
}

export interface ActualizacionMasivaListaPrecios {
  marca?: string | null;
  rubro?: string | null;
  dtoProveedor?: number;
  dtoMarca?: number;
  dtoRubro?: number;
  dtoCantidad?: number;
  dtoFinanciero?: number;
  cxTransporte?: number;
  cotizacionDolar?: number;
}

/**
 * Actualiza dto_rubro, dto_cantidad y/o cx_transporte en los registros con id en la lista.
 * Valores en porcentaje (0-100). Solo actualiza los campos presentes en data.
 * Usa SQL crudo para evitar fallos con Prisma 7 + adapter-pg ("column not available").
 * Un solo UPDATE en BD; eficiente para 100–10.000 filas.
 */
export async function actualizarListaPreciosMasivo(
  ids: string[],
  data: ActualizacionMasivaListaPrecios
): Promise<{ actualizados: number; error?: string }> {
  if (ids.length === 0) return { actualizados: 0 };

  const updatePayload: {
    marca?: string | null;
    rubro?: string | null;
    dtoProveedor?: number;
    dtoMarca?: number;
    dtoRubro?: number;
    dtoCantidad?: number;
    dtoFinanciero?: number;
    cxTransporte?: number;
    cotizacionDolar?: number;
  } = {};
  if (data.marca !== undefined) updatePayload.marca = data.marca;
  if (data.rubro !== undefined) updatePayload.rubro = data.rubro;
  if (data.dtoProveedor !== undefined) updatePayload.dtoProveedor = clampPercent(data.dtoProveedor);
  if (data.dtoMarca !== undefined) updatePayload.dtoMarca = clampPercent(data.dtoMarca);
  if (data.dtoRubro !== undefined) updatePayload.dtoRubro = clampPercent(data.dtoRubro);
  if (data.dtoCantidad !== undefined) updatePayload.dtoCantidad = clampPercent(data.dtoCantidad);
  if (data.dtoFinanciero !== undefined) updatePayload.dtoFinanciero = clampPercent(data.dtoFinanciero);
  if (data.cxTransporte !== undefined) updatePayload.cxTransporte = clampPercent(data.cxTransporte);
  if (data.cotizacionDolar !== undefined && data.cotizacionDolar > 0)
    updatePayload.cotizacionDolar = data.cotizacionDolar;

  if (Object.keys(updatePayload).length === 0) return { actualizados: 0 };

  const setClauses: string[] = [];
  const params: (number | string | string[] | null)[] = [];
  if (updatePayload.marca !== undefined) {
    setClauses.push(`marca = $${params.length + 1}`);
    params.push(updatePayload.marca ?? null);
  }
  if (updatePayload.rubro !== undefined) {
    setClauses.push(`rubro = $${params.length + 1}`);
    params.push(updatePayload.rubro ?? null);
  }
  if (updatePayload.dtoProveedor !== undefined) {
    setClauses.push(`dto_proveedor = $${params.length + 1}`);
    params.push(updatePayload.dtoProveedor);
  }
  if (updatePayload.dtoMarca !== undefined) {
    setClauses.push(`dto_marca = $${params.length + 1}`);
    params.push(updatePayload.dtoMarca);
  }
  if (updatePayload.dtoRubro !== undefined) {
    setClauses.push(`dto_rubro = $${params.length + 1}`);
    params.push(updatePayload.dtoRubro);
  }
  if (updatePayload.dtoCantidad !== undefined) {
    setClauses.push(`dto_cantidad = $${params.length + 1}`);
    params.push(updatePayload.dtoCantidad);
  }
  if (updatePayload.dtoFinanciero !== undefined) {
    setClauses.push(`dto_financiero = $${params.length + 1}`);
    params.push(updatePayload.dtoFinanciero);
  }
  if (updatePayload.cxTransporte !== undefined) {
    setClauses.push(`cx_transporte = $${params.length + 1}`);
    params.push(updatePayload.cxTransporte);
  }
  if (updatePayload.cotizacionDolar !== undefined) {
    setClauses.push(`cotizacion_dolar = $${params.length + 1}`);
    params.push(updatePayload.cotizacionDolar);
  }
  params.push(ids);

  try {
    const sql = `UPDATE prod_precios_provee SET ${setClauses.join(", ")} WHERE id = ANY($${params.length}::uuid[])`;
    const actualizados = await prisma.$executeRawUnsafe(sql, ...params);
    return { actualizados: Number(actualizados) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { actualizados: 0, error: msg };
  }
}

// ─── Pedido Urgente: ítems con descripción unificada ─────────────────

export interface PedidoUrgenteItem {
  id: string;
  codExt: string;
  prefijo: string;
  descripcion: string;
  /** px_compra_final desde prod_precios_provee para lógica de opción de compra. */
  pxCompraFinal: number | null;
  /** Cantidad pedida (URGENTE): `prod_ped_merc.urgente_cant_pedir`. */
  cantPedidaUrgente: number;
  /** true si hay regla REPOSICIÓN en `prod_ped_merc` para el `cod_tienda`. */
  confReposicion: boolean;
  /** `reposicion_cant_conf` desde `prod_ped_merc` (reposición). */
  cantReposicion: number;
  /** true si el ítem de proveedor está vinculado a un producto en `prod_precios_tienda`. */
  estaVinculadoTienda: boolean;
  /**
   * Si existe otro proveedor (habilitado) para el mismo producto de tienda con costo menor:
   * sugerencia para desviar el pedido al proveedor más barato.
   */
  sugerenciaProveedorMenorCosto: {
    listaPrecioProveedorId: string;
    proveedorNombre: string;
    costo: number;
  } | null;
}

async function mercaderiaMapsDesdeMerc2(
  sucursalTrim: string,
  pairs: Array<{ idProveedor: string; codExt: string }>,
  codTiendasDesdeFilas: string[]
): Promise<{
  mercaderiaMapUrgente: Map<string, number>;
  mercaderiaRepoSet: Set<string>;
  mercaderiaMapRepo: Map<string, number>;
}> {
  const mercaderiaMapUrgente = new Map<string, number>();
  const mercaderiaRepoSet = new Set<string>();
  const mercaderiaMapRepo = new Map<string, number>();

  const suc = await prisma.sucursal.findUnique({
    where: { codigo: sucursalTrim },
    select: { id: true },
  });
  if (!suc) {
    return { mercaderiaMapUrgente, mercaderiaRepoSet, mercaderiaMapRepo };
  }

  const codExts = [...new Set(pairs.map((p) => (p.codExt ?? "").trim()).filter(Boolean))];
  const codTiendas = [...new Set(codTiendasDesdeFilas.map((c) => c.trim()).filter(Boolean))];

  const orParts: Prisma.ProdPedMerc2WhereInput[] = [];
  if (codExts.length > 0) {
    orParts.push({
      tipoDePedido: TIPO_URGENTE_MERC2,
      urgenteCodExt: { in: codExts },
    });
  }
  if (codTiendas.length > 0) {
    orParts.push({
      tipoDePedido: "REPOSICION",
      reposicionCodTienda: { in: codTiendas },
    });
  }

  if (orParts.length === 0) {
    return { mercaderiaMapUrgente, mercaderiaRepoSet, mercaderiaMapRepo };
  }

  const rows = await prisma.prodPedMerc2.findMany({
    where: {
      sucursalId: suc.id,
      OR: orParts,
    },
    select: {
      tipoDePedido: true,
      urgenteCodExt: true,
      urgenteCantPedir: true,
      reposicionCodTienda: true,
      reposicionCantConf: true,
    },
  });

  const cantUrgentePorCodExt = new Map<string, number>();
  for (const r of rows) {
    if (r.tipoDePedido === TIPO_URGENTE_MERC2 && r.urgenteCodExt?.trim()) {
      cantUrgentePorCodExt.set(
        r.urgenteCodExt.trim(),
        Math.max(0, Number(r.urgenteCantPedir ?? 0))
      );
    }
    if (r.tipoDePedido === "REPOSICION") {
      const k = (r.reposicionCodTienda ?? "").trim();
      if (!k) continue;
      mercaderiaRepoSet.add(k);
      mercaderiaMapRepo.set(k, Math.max(0, Number(r.reposicionCantConf ?? 0)));
    }
  }

  for (const p of pairs) {
    const ce = (p.codExt ?? "").trim();
    const u = cantUrgentePorCodExt.get(ce);
    if (u != null) {
      mercaderiaMapUrgente.set(`${p.idProveedor}:${p.codExt}`, u);
    }
  }

  return { mercaderiaMapUrgente, mercaderiaRepoSet, mercaderiaMapRepo };
}

/**
 * Filas URGENTE desde `prod_ped_merc` (`urgente_cod_ext`, `urgente_cant_pedir`).
 * Proveedor y precios vía `prod_precios_provee` por `cod_ext`; descripción: tienda o proveedor.
 */
async function getListaPedidoUrgenteDesdeMerc2(
  sucursalTrim: string,
  prov: string | undefined,
  busqueda: string,
  pageSize: number,
  paginaNum: number
): Promise<{
  items: PedidoUrgenteItem[];
  total: number;
  totalPaginas: number;
}> {
  const sucursalRow = await prisma.sucursal.findUnique({
    where: { codigo: sucursalTrim },
    select: { id: true },
  });
  if (!sucursalRow) {
    return { items: [], total: 0, totalPaginas: 1 };
  }

  const mercParts: Prisma.ProdPedMerc2WhereInput[] = [
    { tipoDePedido: TIPO_URGENTE_MERC2 },
    { sucursalId: sucursalRow.id },
    { urgenteCantPedir: { gt: 0 } },
    { urgenteCodExt: { not: null } },
  ];
  if (prov) {
    const codsDeProv = await prisma.listaPrecioProveedor.findMany({
      where: { idProveedor: prov, habilitado: true },
      select: { codExt: true },
      distinct: ["codExt"],
      take: 8000,
    });
    const codList = [
      ...new Set(codsDeProv.map((r) => (r.codExt ?? "").trim()).filter((c) => c.length > 0)),
    ];
    if (codList.length === 0) {
      return { items: [], total: 0, totalPaginas: 1 };
    }
    mercParts.push({ urgenteCodExt: { in: codList } });
  }

  if (busqueda.length >= 3) {
    const tokens = busqueda.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      const lpMatch = await prisma.listaPrecioProveedor.findMany({
        where: {
          habilitado: true,
          ...(prov ? { idProveedor: prov } : {}),
          AND: tokens.map((token) => ({
            OR: [
              { descripcionProveedor: { contains: token, mode: "insensitive" as const } },
              { codExt: { contains: token, mode: "insensitive" as const } },
              {
                listaPrecioTienda: {
                  descripcionTienda: { contains: token, mode: "insensitive" as const },
                },
              },
            ],
          })),
        },
        select: { idProveedor: true, codExt: true },
      });
      if (lpMatch.length === 0) {
        return { items: [], total: 0, totalPaginas: 1 };
      }
      const codExtBusq = [
        ...new Set(lpMatch.map((p) => (p.codExt ?? "").trim()).filter((c) => c.length > 0)),
      ];
      mercParts.push({ urgenteCodExt: { in: codExtBusq } });
    }
  }

  const mercWhere: Prisma.ProdPedMerc2WhereInput =
    mercParts.length === 1 ? mercParts[0]! : { AND: mercParts };

  const skip = (Math.max(1, paginaNum) - 1) * pageSize;

  const [mercRows, total] = await Promise.all([
    prisma.prodPedMerc2.findMany({
      where: mercWhere,
      orderBy: { urgenteCodExt: "asc" },
      skip,
      take: pageSize,
      select: {
        urgenteCodExt: true,
        urgenteCantPedir: true,
      },
    }),
    prisma.prodPedMerc2.count({ where: mercWhere }),
  ]);

  const codExts = [
    ...new Set(
      mercRows
        .map((m) => (m.urgenteCodExt ?? "").trim())
        .filter((c) => c.length > 0)
    ),
  ];
  const lpWhere: Prisma.ListaPrecioProveedorWhereInput = {
    habilitado: true,
    ...(codExts.length > 0 ? { codExt: { in: codExts } } : { id: { in: [] } }),
    ...(prov ? { idProveedor: prov } : {}),
  };

  const lpRows =
    codExts.length > 0
      ? await prisma.listaPrecioProveedor.findMany({
          where: lpWhere,
          include: {
            proveedor: { select: { id: true, nombre: true, prefijo: true } },
            listaPrecioTienda: { select: { codTienda: true } },
          },
        })
      : [];

  function resolveLp(m: (typeof mercRows)[number]): (typeof lpRows)[number] | null {
    const ce = (m.urgenteCodExt ?? "").trim();
    if (!ce) return null;
    const cand = lpRows.filter((l) => l.codExt === ce && (!prov || l.idProveedor === prov));
    return cand[0] ?? null;
  }

  const filasResueltas: { f: (typeof lpRows)[number]; cantUrgente: number }[] = [];
  for (const m of mercRows) {
    const lp = resolveLp(m);
    if (!lp) continue;
    filasResueltas.push({
      f: lp,
      cantUrgente: Math.max(0, Math.floor(Number(m.urgenteCantPedir ?? 0))),
    });
  }

  const codExtsRes = [...new Set(filasResueltas.map((x) => x.f.codExt))];
  const tiendaRows =
    codExtsRes.length > 0
      ? await prisma.listaPrecioTienda.findMany({
          where: { codExt: { in: codExtsRes } },
          select: { codExt: true, descripcionTienda: true },
        })
      : [];

  const descripcionTiendaPorCodExt = new Map(
    tiendaRows
      .filter((t) => t.descripcionTienda != null && t.descripcionTienda.trim() !== "")
      .map((t) => [t.codExt, t.descripcionTienda as string])
  );

  const tiendaIdPorListaPrecioProveedorId = new Map<string, string>();
  for (const { f } of filasResueltas) {
    if (f.idListaPrecioTienda) {
      tiendaIdPorListaPrecioProveedorId.set(f.id, f.idListaPrecioTienda);
    }
  }

  const tiendaIds = [
    ...new Set(filasResueltas.map((x) => x.f.idListaPrecioTienda).filter((v): v is string => Boolean(v))),
  ];
  const alternativasPorTienda =
    tiendaIds.length > 0
      ? await prisma.listaPrecioProveedor.findMany({
          where: {
            habilitado: true,
            idListaPrecioTienda: { in: tiendaIds },
          },
          select: {
            id: true,
            idListaPrecioTienda: true,
            pxCompraFinal: true,
            pxListaProveedor: true,
            dtoProveedor: true,
            dtoMarca: true,
            dtoRubro: true,
            dtoCantidad: true,
            dtoFinanciero: true,
            cxTransporte: true,
            proveedor: { select: { nombre: true, prefijo: true } },
          },
        })
      : [];
  const alternativasByTienda = new Map<string, typeof alternativasPorTienda>();
  for (const alt of alternativasPorTienda) {
    if (!alt.idListaPrecioTienda) continue;
    const list = alternativasByTienda.get(alt.idListaPrecioTienda) ?? [];
    list.push(alt);
    alternativasByTienda.set(alt.idListaPrecioTienda, list);
  }

  const pairs = filasResueltas.map((x) => ({
    idProveedor: x.f.idProveedor,
    codExt: x.f.codExt,
  }));
  const { mercaderiaMapUrgente, mercaderiaRepoSet, mercaderiaMapRepo } =
    pairs.length > 0
      ? await mercaderiaMapsDesdeMerc2(
          sucursalTrim,
          pairs,
          filasResueltas
            .map((x) => x.f.listaPrecioTienda?.codTienda?.trim() ?? "")
            .filter(Boolean)
        )
      : {
          mercaderiaMapUrgente: new Map<string, number>(),
          mercaderiaRepoSet: new Set<string>(),
          mercaderiaMapRepo: new Map<string, number>(),
        };

  const items: PedidoUrgenteItem[] = filasResueltas.map(({ f, cantUrgente }) => {
    const key = `${f.idProveedor}:${f.codExt}`;
    const descTienda = descripcionTiendaPorCodExt.get(f.codExt) ?? null;
    const cantUrgenteUi = cantUrgente;
    const tiendaId = tiendaIdPorListaPrecioProveedorId.get(f.id) ?? null;
    const costoActual = costoCompraFinalProveedorLista({
      pxCompraFinal: f.pxCompraFinal,
      pxListaProveedor: f.pxListaProveedor,
      dtoRubro: f.dtoRubro,
      dtoCantidad: f.dtoCantidad,
      cxTransporte: f.cxTransporte,
      dtoProveedor: f.dtoProveedor,
      dtoMarca: f.dtoMarca,
      dtoFinanciero: f.dtoFinanciero,
    });
    const alternativas = tiendaId ? alternativasByTienda.get(tiendaId) ?? [] : [];
    const mejorAlternativa = alternativas
      .filter((a) => a.id !== f.id)
      .map((a) => ({
        ...a,
        costo: costoCompraFinalProveedorLista({
          pxCompraFinal: a.pxCompraFinal,
          pxListaProveedor: a.pxListaProveedor,
          dtoRubro: a.dtoRubro,
          dtoCantidad: a.dtoCantidad,
          cxTransporte: a.cxTransporte,
          dtoProveedor: a.dtoProveedor,
          dtoMarca: a.dtoMarca,
          dtoFinanciero: a.dtoFinanciero,
        }),
      }))
      .filter((a) => Number.isFinite(a.costo) && a.costo > 0 && a.costo < costoActual)
      .sort((a, b) => a.costo - b.costo)[0];
    const nombreProveedorAlt =
      mejorAlternativa?.proveedor?.nombre?.trim() ||
      mejorAlternativa?.proveedor?.prefijo?.trim() ||
      "";

    return {
      id: f.id,
      codExt: f.codExt,
      prefijo: f.proveedor?.prefijo ?? "",
      descripcion:
        (descTienda?.trim() && descTienda) || f.descripcionProveedor,
      pxCompraFinal: f.pxCompraFinal != null ? Number(f.pxCompraFinal) : null,
      cantPedidaUrgente: cantUrgenteUi,
      confReposicion: mercaderiaRepoSet.has(f.listaPrecioTienda?.codTienda?.trim() ?? ""),
      cantReposicion: mercaderiaMapRepo.get(f.listaPrecioTienda?.codTienda?.trim() ?? "") ?? 0,
      estaVinculadoTienda: tiendaId != null,
      sugerenciaProveedorMenorCosto:
        mejorAlternativa && nombreProveedorAlt
          ? {
              listaPrecioProveedorId: mejorAlternativa.id,
              proveedorNombre: nombreProveedorAlt,
              costo: mejorAlternativa.costo,
            }
          : null,
    };
  });

  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / pageSize);
  return { items, total, totalPaginas };
}

/**
 * Ítems de lista precios para la pantalla Pedido Urgente.
 * Solo devuelve datos si sucursal está informada.
 * descripcion = descripcion_tienda si existe; si no, descripcion_proveedor.
 * incluye pxCompraFinal para lógica de ranking en opción de compra.
 */
export async function getListaPreciosParaPedidoUrgente(
  sucursal: string,
  proveedorId: string | undefined,
  pedidoTipo: "cualquier" | "urgente" | "reposicion" | undefined,
  q: string | undefined,
  pagina: number | undefined,
  pageSize: number | undefined
): Promise<{
  items: PedidoUrgenteItem[];
  total: number;
  totalPaginas: number;
}> {
  const sucursalTrim = sucursal?.trim() ?? "";
  if (!sucursalTrim) {
    return { items: [], total: 0, totalPaginas: 0 };
  }

  const prov = proveedorId?.trim() || undefined;
  const busqueda = q?.trim() ?? "";
  const takeSize = pageSize ?? 100;
  const paginaNum = Math.max(1, pagina ?? 1);

  if (pedidoTipo === "urgente" || pedidoTipo === "cualquier") {
    return getListaPedidoUrgenteDesdeMerc2(sucursalTrim, prov, busqueda, takeSize, paginaNum);
  }

  const andParts: Prisma.ListaPrecioProveedorWhereInput[] = [{ habilitado: true }];
  if (prov) andParts.push({ idProveedor: prov });

  if (pedidoTipo) {
    if (pedidoTipo === "reposicion") {
      const filasRepo = await prisma.prodPedMerc2.findMany({
        where: {
          sucursal: { codigo: sucursalTrim },
          tipoDePedido: "REPOSICION",
          OR: [
            { reposicionCantPedir: { gt: 0 } },
            {
              AND: [
                { reposicionCantPedir: null },
                { reposicionCantConf: { gt: 0 } },
              ],
            },
          ],
        },
        select: { reposicionCodTienda: true },
      });
      const codTiendas = Array.from(
        new Set(
          filasRepo
            .map((r) => (r.reposicionCodTienda ?? "").trim())
            .filter((v) => v.length > 0)
        )
      );
      if (codTiendas.length === 0) {
        return { items: [], total: 0, totalPaginas: 0 };
      }
      andParts.push({ listaPrecioTienda: { codTienda: { in: codTiendas } } });
    }
  }

  if (busqueda.length >= 3) {
    const tokens = busqueda.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      andParts.push({
        AND: tokens.map((token) => ({
          OR: [
            { descripcionProveedor: { contains: token, mode: "insensitive" as const } },
            { codExt: { contains: token, mode: "insensitive" as const } },
            { listaPrecioTienda: { descripcionTienda: { contains: token, mode: "insensitive" as const } } },
          ],
        })),
      });
    }
  }
  const where: Prisma.ListaPrecioProveedorWhereInput =
    andParts.length > 0 ? { AND: andParts } : {};

  const skip = (paginaNum - 1) * takeSize;

  const [filas, total] = await Promise.all([
    prisma.listaPrecioProveedor.findMany({
      where,
      include: {
        proveedor: { select: { id: true, nombre: true, prefijo: true } },
        listaPrecioTienda: { select: { codTienda: true } },
      },
      orderBy: { codExt: "asc" },
      skip,
      take: takeSize,
    }),
    prisma.listaPrecioProveedor.count({ where }),
  ]);

  const codExts = [...new Set(filas.map((f) => f.codExt))];
  const tiendaRows =
    codExts.length > 0
      ? await prisma.listaPrecioTienda.findMany({
          where: { codExt: { in: codExts } },
          select: { codExt: true, descripcionTienda: true },
        })
      : [];

  const descripcionTiendaPorCodExt = new Map(
    tiendaRows
      .filter((t) => t.descripcionTienda != null && t.descripcionTienda.trim() !== "")
      .map((t) => [t.codExt, t.descripcionTienda as string])
  );

  const tiendaIdPorListaPrecioProveedorId = new Map<string, string>();
  for (const f of filas) {
    if (f.idListaPrecioTienda) {
      tiendaIdPorListaPrecioProveedorId.set(f.id, f.idListaPrecioTienda);
    }
  }

  const tiendaIds = [...new Set(filas.map((f) => f.idListaPrecioTienda).filter((v): v is string => Boolean(v)))];
  const alternativasPorTienda =
    tiendaIds.length > 0
      ? await prisma.listaPrecioProveedor.findMany({
          where: {
            habilitado: true,
            idListaPrecioTienda: { in: tiendaIds },
          },
          select: {
            id: true,
            idListaPrecioTienda: true,
            pxCompraFinal: true,
            pxListaProveedor: true,
            dtoProveedor: true,
            dtoMarca: true,
            dtoRubro: true,
            dtoCantidad: true,
            dtoFinanciero: true,
            cxTransporte: true,
            proveedor: { select: { nombre: true, prefijo: true } },
          },
        })
      : [];
  const alternativasByTienda = new Map<string, typeof alternativasPorTienda>();
  for (const alt of alternativasPorTienda) {
    if (!alt.idListaPrecioTienda) continue;
    const list = alternativasByTienda.get(alt.idListaPrecioTienda) ?? [];
    list.push(alt);
    alternativasByTienda.set(alt.idListaPrecioTienda, list);
  }

  const pairs = filas.map((f) => ({ idProveedor: f.idProveedor, codExt: f.codExt }));
  const { mercaderiaMapUrgente, mercaderiaRepoSet, mercaderiaMapRepo } =
    pairs.length > 0
      ? await mercaderiaMapsDesdeMerc2(
          sucursalTrim,
          pairs,
          filas
            .map((f) => f.listaPrecioTienda?.codTienda?.trim() ?? "")
            .filter(Boolean)
        )
      : {
          mercaderiaMapUrgente: new Map<string, number>(),
          mercaderiaRepoSet: new Set<string>(),
          mercaderiaMapRepo: new Map<string, number>(),
        };

  const items: PedidoUrgenteItem[] = filas.map((f) => {
    const key = `${f.idProveedor}:${f.codExt}`;
    const descTienda = descripcionTiendaPorCodExt.get(f.codExt) ?? null;
    const cantUrgente = mercaderiaMapUrgente.get(key) ?? 0;
    const tiendaId = tiendaIdPorListaPrecioProveedorId.get(f.id) ?? null;
    const costoActual = costoCompraFinalProveedorLista({
      pxCompraFinal: f.pxCompraFinal,
      pxListaProveedor: f.pxListaProveedor,
      dtoRubro: f.dtoRubro,
      dtoCantidad: f.dtoCantidad,
      cxTransporte: f.cxTransporte,
      dtoProveedor: f.dtoProveedor,
      dtoMarca: f.dtoMarca,
      dtoFinanciero: f.dtoFinanciero,
    });
    const alternativas = tiendaId ? alternativasByTienda.get(tiendaId) ?? [] : [];
    const mejorAlternativa = alternativas
      .filter((a) => a.id !== f.id)
      .map((a) => ({
        ...a,
        costo: costoCompraFinalProveedorLista({
          pxCompraFinal: a.pxCompraFinal,
          pxListaProveedor: a.pxListaProveedor,
          dtoRubro: a.dtoRubro,
          dtoCantidad: a.dtoCantidad,
          cxTransporte: a.cxTransporte,
          dtoProveedor: a.dtoProveedor,
          dtoMarca: a.dtoMarca,
          dtoFinanciero: a.dtoFinanciero,
        }),
      }))
      .filter((a) => Number.isFinite(a.costo) && a.costo > 0 && a.costo < costoActual)
      .sort((a, b) => a.costo - b.costo)[0];
    const nombreProveedorAlt =
      mejorAlternativa?.proveedor?.nombre?.trim() ||
      mejorAlternativa?.proveedor?.prefijo?.trim() ||
      "";

    return {
      id: f.id,
      codExt: f.codExt,
      prefijo: f.proveedor?.prefijo ?? "",
      descripcion: (descTienda?.trim() && descTienda) || f.descripcionProveedor,
      pxCompraFinal: f.pxCompraFinal != null ? Number(f.pxCompraFinal) : null,
      cantPedidaUrgente: cantUrgente,
      confReposicion: mercaderiaRepoSet.has(f.listaPrecioTienda?.codTienda?.trim() ?? ""),
      cantReposicion: mercaderiaMapRepo.get(f.listaPrecioTienda?.codTienda?.trim() ?? "") ?? 0,
      estaVinculadoTienda: tiendaId != null,
      sugerenciaProveedorMenorCosto:
        mejorAlternativa && nombreProveedorAlt
          ? {
              listaPrecioProveedorId: mejorAlternativa.id,
              proveedorNombre: nombreProveedorAlt,
              costo: mejorAlternativa.costo,
            }
          : null,
    };
  });

  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / takeSize);

  return {
    items,
    total,
    totalPaginas,
  };
}

/** Proveedores con al menos un ítem en lista de precios (para filtro Pedido Urgente). */
export async function getProveedoresParaPedidoUrgente(): Promise<
  { id: string; nombre: string; prefijo: string }[]
> {
  const list = await prisma.proveedor.findMany({
    where: {
      proveedorMercaderia: true,
      listaPrecios: { some: { habilitado: true } },
    },
    select: { id: true, nombre: true, prefijo: true },
    orderBy: { prefijo: "asc" },
  });
  return list.map((p) => ({ ...p, prefijo: p.prefijo ?? "" }));
}
