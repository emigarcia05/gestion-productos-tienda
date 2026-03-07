/**
 * Servicio lista_precios_proveedores – Capa de datos (Neon / Prisma).
 * Upsert por código externo (cod_ext = [SUFIJO]-[codProdProv]).
 * getListaPreciosConTienda: una sola entrada para la página lista-precios (DRY).
 */

import type { FilaListaPrecio } from "@/lib/parsearImport";
import { prisma } from "@/lib/prisma";
import { buildCodExt } from "@/lib/codigos";
import { filtroTexto, matchByMultiTerm } from "@/lib/busqueda";
import type { Prisma } from "@prisma/client";

/** Fila para el cliente (lista-precios): proveedor + descripción tienda si existe. */
export interface FilaListaPrecioParaCliente {
  id: string;
  codExt: string;
  descripcionProveedor: string;
  descripcionTienda: string | null;
  marca: string | null;
  pxListaProveedor: number;
  dtoProveedor: number;
  dtoMarca: number;
  dtoProducto: number;
  dtoCantidad: number;
  dtoFinanciero: number;
  cxTransporte: number;
  pxCompraFinal: number | null;
  proveedor: { id: string; prefijo: string; nombre: string } | null;
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
    pxListaProveedor: Number(f.pxListaProveedor),
    dtoProveedor: f.dtoProveedor,
    dtoMarca: f.dtoMarca,
    dtoProducto: f.dtoProducto,
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
 * Lista de precios filtrada por proveedor, marca y/o búsqueda (≥3 caracteres).
 * Usado para carga bajo demanda: no se traen datos hasta que el usuario aplica un filtro.
 * Si no hay filtro activo (ningún selector o búsqueda < 3 chars), devuelve [].
 */
export async function getListaPreciosConTiendaFiltrada(
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  busqueda: string | undefined
): Promise<FilaListaPrecioParaCliente[]> {
  const prov = proveedorId?.trim() || undefined;
  const marca = marcaNombre?.trim() || undefined;
  const q = busqueda?.trim() || "";
  const tieneFiltro = !!prov || !!marca || q.length >= 3;
  if (!tieneFiltro) return [];

  const andParts: Prisma.ListaPrecioProveedorWhereInput[] = [];
  if (prov) andParts.push({ idProveedor: prov });
  if (marca) andParts.push({ marca: marca });
  if (q.length >= 3) {
    const textFilter = filtroTexto(q, ["descripcionProveedor", "codExt", "marca"]);
    if (textFilter.AND?.length) andParts.push(textFilter);
  }
  const where: Prisma.ListaPrecioProveedorWhereInput = andParts.length ? { AND: andParts } : {};

  const filas = await prisma.listaPrecioProveedor.findMany({
    where,
    include: { proveedor: true },
    orderBy: { codExt: "asc" },
  });

  const codExts = [...new Set(filas.map((r) => r.codExt))];
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

  let result: FilaListaPrecioParaCliente[] = filas.map((f) => ({
    id: f.id,
    codExt: f.codExt,
    descripcionProveedor: f.descripcionProveedor,
    descripcionTienda: descripcionPorCodExt.get(f.codExt) ?? null,
    marca: f.marca ?? null,
    pxListaProveedor: Number(f.pxListaProveedor),
    dtoProveedor: f.dtoProveedor,
    dtoMarca: f.dtoMarca,
    dtoProducto: f.dtoProducto,
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
      matchByMultiTerm([f.descripcionProveedor, f.descripcionTienda, f.marca ?? ""], q)
    );
  }

  return result;
}

/** Proveedores con al menos un ítem que cumple (marcaNombre, busqueda). Para filtros dinámicos. */
export async function getProveedoresDisponiblesListaPrecios(
  marcaNombre: string | undefined,
  busqueda: string | undefined
): Promise<{ id: string; nombre: string; prefijo: string }[]> {
  const filas = await getListaPreciosConTiendaFiltrada(undefined, marcaNombre, busqueda);
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

/** Marcas con al menos un ítem que cumple (proveedorId, busqueda). Para filtros dinámicos. */
export async function getMarcasDisponiblesListaPrecios(
  proveedorId: string | undefined,
  busqueda: string | undefined
): Promise<{ id: string; nombre: string }[]> {
  const filas = await getListaPreciosConTiendaFiltrada(proveedorId, undefined, busqueda);
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

/** Item mínimo para modal de vinculación: solo prefijo y descripción en tabla; datos completos para onSeleccionar. */
export interface ProductoProveedorParaVincular {
  id: string;
  codExt: string;
  codProdProv: string;
  descripcionProveedor: string;
  proveedor: { prefijo: string; nombre: string };
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
    proveedor: { prefijo: r.proveedor.prefijo, nombre: r.proveedor.nombre },
  }));
}

export interface UpsertListaPreciosResult {
  creados: number;
  actualizados: number;
  errores: string[];
}

/**
 * Upsert de filas en lista_precios_proveedores.
 * Clave lógica: cod_ext (único) = [SUFIJO]-[codProdProv].
 * Si existe, actualiza; si no, crea con descuentos y cx_transporte en 0 (defaults BD).
 * precioEnDolares: si true, al existir columna cotizacion_dolar se usará COTIZACION_DOLAR (env) o 1.
 */
export async function upsertListaPrecios(
  proveedorId: string,
  prefijo: string,
  filas: FilaListaPrecio[],
  precioEnDolares: boolean = false
): Promise<UpsertListaPreciosResult> {
  let creados = 0;
  let actualizados = 0;
  const errores: string[] = [];
  void precioEnDolares; // usado cuando el schema tenga cotizacion_dolar

  for (let i = 0; i < filas.length; i++) {
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
          pxVtaSugerido: fila.precioVentaSugerido || null,
          // dto_producto, dto_cantidad, cx_transporte usan defaults (0)
        },
        update: {
          idProveedor: proveedorId,
          codProdProveedor: fila.codProdProv,
          descripcionProveedor: fila.descripcion,
          pxListaProveedor: fila.precioLista,
          pxVtaSugerido: fila.precioVentaSugerido || null,
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
  dtoProveedor?: number;
  dtoMarca?: number;
  dtoProducto?: number;
  dtoCantidad?: number;
  dtoFinanciero?: number;
  cxTransporte?: number;
}

/**
 * Actualiza dto_producto, dto_cantidad y/o cx_transporte en los registros con id en la lista.
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
    dtoProveedor?: number;
    dtoMarca?: number;
    dtoProducto?: number;
    dtoCantidad?: number;
    dtoFinanciero?: number;
    cxTransporte?: number;
  } = {};
  if (data.marca !== undefined) updatePayload.marca = data.marca;
  if (data.dtoProveedor !== undefined)
    updatePayload.dtoProveedor = Math.round(Math.max(0, Math.min(100, data.dtoProveedor)));
  if (data.dtoMarca !== undefined)
    updatePayload.dtoMarca = Math.round(Math.max(0, Math.min(100, data.dtoMarca)));
  if (data.dtoProducto !== undefined)
    updatePayload.dtoProducto = Math.round(Math.max(0, Math.min(100, data.dtoProducto)));
  if (data.dtoCantidad !== undefined)
    updatePayload.dtoCantidad = Math.round(Math.max(0, Math.min(100, data.dtoCantidad)));
  if (data.dtoFinanciero !== undefined)
    updatePayload.dtoFinanciero = Math.round(Math.max(0, Math.min(100, data.dtoFinanciero)));
  if (data.cxTransporte !== undefined)
    updatePayload.cxTransporte = Math.round(Math.max(0, Math.min(100, data.cxTransporte)));

  if (Object.keys(updatePayload).length === 0) return { actualizados: 0 };

  const setClauses: string[] = [];
  const params: (number | string | string[] | null)[] = [];
  if (updatePayload.marca !== undefined) {
    setClauses.push(`marca = $${params.length + 1}`);
    params.push(updatePayload.marca ?? null);
  }
  if (updatePayload.dtoProveedor !== undefined) {
    setClauses.push(`dto_proveedor = $${params.length + 1}`);
    params.push(updatePayload.dtoProveedor);
  }
  if (updatePayload.dtoMarca !== undefined) {
    setClauses.push(`dto_marca = $${params.length + 1}`);
    params.push(updatePayload.dtoMarca);
  }
  if (updatePayload.dtoProducto !== undefined) {
    setClauses.push(`dto_producto = $${params.length + 1}`);
    params.push(updatePayload.dtoProducto);
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
  params.push(ids);

  try {
    const sql = `UPDATE lista_precios_proveedores SET ${setClauses.join(", ")} WHERE id = ANY($${params.length}::uuid[])`;
    const actualizados = await prisma.$executeRawUnsafe(sql, ...params);
    return { actualizados: Number(actualizados) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { actualizados: 0, error: msg };
  }
}
