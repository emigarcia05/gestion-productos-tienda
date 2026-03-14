/**
 * Servicio lista_precios_proveedores – Capa de datos (Neon / Prisma).
 * Upsert por código externo (cod_ext = [SUFIJO]-[codProdProv]).
 * getListaPreciosConTienda: una sola entrada para la página lista-precios (DRY).
 */

import type { FilaListaPrecio } from "@/lib/parsearImport";
import { prisma } from "@/lib/prisma";
import { buildCodExt } from "@/lib/codigos";
import { clampPercent } from "@/lib/calculos";
import { filtroTexto, matchByMultiTerm } from "@/lib/busqueda";
import type { Prisma } from "@prisma/client";
import { PAGE_SIZE } from "@/lib/pagination";

/** Fila para el cliente (lista-precios / sugeridos): proveedor + descripción tienda si existe. */
export interface FilaListaPrecioParaCliente {
  id: string;
  codExt: string;
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
 * Obtiene lista de precios proveedor unida con descripciones de lista_precios_tienda.
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
      ? { id: f.proveedor.id, prefijo: f.proveedor.prefijo, nombre: f.proveedor.nombre }
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

  const incluirPxSugerido = opciones?.soloPxSugerido === true;
  let result: FilaListaPrecioParaCliente[] = filasRaw.map((f) => ({
    id: f.id,
    codExt: f.codExt,
    descripcionProveedor: f.descripcionProveedor,
    descripcionTienda: descripcionPorCodExt.get(f.codExt) ?? null,
    marca: f.marca ?? null,
    rubro: f.rubro ?? null,
    pxListaProveedor: Number(f.pxListaProveedor),
    ...(incluirPxSugerido && { pxVtaSugerido: f.pxVtaSugerido != null ? Number(f.pxVtaSugerido) : null }),
    dtoProveedor: f.dtoProveedor,
    dtoMarca: f.dtoMarca,
    dtoRubro: f.dtoRubro,
    dtoCantidad: f.dtoCantidad,
    dtoFinanciero: f.dtoFinanciero,
    cxTransporte: f.cxTransporte,
    pxCompraFinal: f.pxCompraFinal != null ? Number(f.pxCompraFinal) : null,
    proveedor: f.proveedor
      ? { id: f.proveedor.id, prefijo: f.proveedor.prefijo, nombre: f.proveedor.nombre }
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
 * Lista ítems de lista_precios_proveedores para el modal "Vincular nuevo producto".
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
    codExt: r.codExt,
    codProdProv: r.codProdProveedor,
    descripcionProveedor: r.descripcionProveedor,
    rubro: r.rubro ?? null,
    proveedor: { prefijo: r.proveedor.prefijo, nombre: r.proveedor.nombre },
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
 * Upsert de filas en lista_precios_proveedores.
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

  for (let i = 0; i < filas.length; i++) {
    if (onProgress && (i % 10 === 0 || i === total - 1)) {
      onProgress(i + 1, total);
    }
    const fila = filas[i];
    const codExt = buildCodExt(prefijo, fila.codProdProv);

    try {
      const existente = await prisma.listaPrecioProveedor.findUnique({
        where: { idProveedor_codProdProveedor: { idProveedor: proveedorId, codProdProveedor: fila.codProdProv } },
        select: { id: true },
      });

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

      if (existente) actualizados++;
      else creados++;
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
    const sql = `UPDATE precios_proveedores SET ${setClauses.join(", ")} WHERE id = ANY($${params.length}::uuid[])`;
    const actualizados = await prisma.$executeRawUnsafe(sql, ...params);
    return { actualizados: Number(actualizados) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { actualizados: 0, error: msg };
  }
}

// ─── Pedido Urgente: ítems con regDux y descripción unificada ─────────────────

export interface PedidoUrgenteItem {
  id: string;
  codExt: string;
  prefijo: string;
  regDux: boolean;
  descripcion: string;
}

/**
 * Ítems de lista precios para la pantalla Pedido Urgente.
 * Solo devuelve datos si sucursal está informada.
 * regDux = existe en lista_tienda (idListaPrecioTienda no nulo).
 * descripcion = descripcionTienda ?? descripcionProveedor.
 */
export async function getListaPreciosParaPedidoUrgente(
  sucursal: string,
  proveedorId: string | undefined,
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
  const andParts: Prisma.ListaPrecioProveedorWhereInput[] = [{ habilitado: true }];
  if (prov) andParts.push({ idProveedor: prov });
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

  const takeSize = pageSize ?? 100;
  const paginaNum = Math.max(1, pagina ?? 1);
  const skip = (paginaNum - 1) * takeSize;

  const [filas, total] = await Promise.all([
    prisma.listaPrecioProveedor.findMany({
      where,
      include: {
        proveedor: { select: { prefijo: true } },
        listaPrecioTienda: { select: { id: true, descripcionTienda: true } },
      },
      orderBy: { codExt: "asc" },
      skip,
      take: takeSize,
    }),
    prisma.listaPrecioProveedor.count({ where }),
  ]);

  const items: PedidoUrgenteItem[] = filas.map((f) => ({
    id: f.id,
    codExt: f.codExt,
    prefijo: f.proveedor?.prefijo ?? "",
    regDux: !!f.listaPrecioTienda,
    descripcion:
      (f.listaPrecioTienda?.descripcionTienda?.trim() && f.listaPrecioTienda.descripcionTienda) ||
      f.descripcionProveedor,
  }));

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
    where: { listaPrecios: { some: { habilitado: true } } },
    select: { id: true, nombre: true, prefijo: true },
    orderBy: { prefijo: "asc" },
  });
  return list;
}
