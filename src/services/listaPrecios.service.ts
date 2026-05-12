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
import { IvaProveedor } from "@prisma/client";
import { PAGE_SIZE } from "@/lib/pagination";
import {
  pxComparablePedidoUrgenteReposicion,
} from "@/lib/precioComparacionPedidoUrgenteReposicion";
import { sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido } from "@/services/finBalPosicionIvaSaldoAcumuladoPedido.service";

const TIPO_URGENTE_MERC2 = "URGENTE";

function costoCompraFinalProveedorLista(params: {
  pxCompraFinalSinIva: Prisma.Decimal | null;
  pxListaProveedor: Prisma.Decimal;
  dtoRubro: number;
  dtoCantidad: number;
  cxTransporte: number;
  dtoProveedor: number;
  dtoMarca: number;
  dtoFinanciero: number;
}): number {
  const {
    pxCompraFinalSinIva,
    pxListaProveedor,
    dtoRubro,
    dtoCantidad,
    cxTransporte,
    dtoProveedor,
    dtoMarca,
    dtoFinanciero,
  } = params;
  if (pxCompraFinalSinIva != null) return Number(pxCompraFinalSinIva);
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

type CamposCostoListaProveedor = {
  pxCompraFinalSinIva: Prisma.Decimal | null;
  pxListaProveedor: Prisma.Decimal;
  dtoRubro: number;
  dtoCantidad: number;
  cxTransporte: number;
  dtoProveedor: number;
  dtoMarca: number;
  dtoFinanciero: number;
};

function ivaProveedorDesdeLista(
  proveedor: { iva?: IvaProveedor | null } | null | undefined
): IvaProveedor {
  return proveedor?.iva ?? IvaProveedor.NUNCA;
}

/** Elige otro proveedor en la misma tienda con menor precio comparable (IVA SALDO acumulado + política `iva`). */
function sugerenciaProveedorMenorCostoComparable(
  sumaIvaSaldoAcumulado: number,
  codExtListaActual: string,
  actual: CamposCostoListaProveedor & { iva: IvaProveedor },
  alternativas: Array<
    CamposCostoListaProveedor & {
      codExt: string;
      iva: IvaProveedor;
      nombreProveedor: string;
    }
  >
): { listaPrecioProveedorId: string; proveedorNombre: string; costo: number } | null {
  const costoSinIvaActual = costoCompraFinalProveedorLista(actual);
  const comparableActual = pxComparablePedidoUrgenteReposicion(
    costoSinIvaActual,
    actual.iva,
    sumaIvaSaldoAcumulado
  );
  const mejor = alternativas
    .filter((alt) => alt.codExt !== codExtListaActual)
    .map((alt) => {
      const costoSinIva = costoCompraFinalProveedorLista(alt);
      return {
        codExt: alt.codExt,
        nombreProveedor: alt.nombreProveedor,
        costoSinIva,
        comparable: pxComparablePedidoUrgenteReposicion(
          costoSinIva,
          alt.iva,
          sumaIvaSaldoAcumulado
        ),
      };
    })
    .filter(
      (x) =>
        x.nombreProveedor.length > 0 &&
        Number.isFinite(x.costoSinIva) &&
        x.costoSinIva > 0 &&
        Number.isFinite(x.comparable) &&
        Number.isFinite(comparableActual) &&
        x.comparable < comparableActual
    )
    .sort((x, y) => x.comparable - y.comparable)[0];

  if (!mejor) return null;
  return {
    listaPrecioProveedorId: mejor.codExt,
    proveedorNombre: mejor.nombreProveedor,
    costo: mejor.costoSinIva,
  };
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
  pxCompraFinalSinIva: number | null;
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
    id: f.codExt,
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
    pxCompraFinalSinIva: f.pxCompraFinalSinIva != null ? Number(f.pxCompraFinalSinIva) : null,
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
    id: f.codExt,
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
    pxCompraFinalSinIva: f.pxCompraFinalSinIva != null ? Number(f.pxCompraFinalSinIva) : null,
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

/** Item mínimo para modal de vinculación: solo prefijo y descripción en tabla; datos completos para onSeleccionar. pxCompraFinalSinIva para selector de costo objetivo. */
export interface ProductoProveedorParaVincular {
  id: string;
  idProveedor: string;
  codExt: string;
  codProdProv: string;
  descripcionProveedor: string;
  rubro: string | null;
  proveedor: { prefijo: string; nombre: string };
  /** Precio final de compra (para usar como costo objetivo al seleccionar desde lista). */
  pxCompraFinalSinIva: number | null;
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
    id: r.codExt,
    idProveedor: r.idProveedor,
    codExt: r.codExt,
    codProdProv: r.codProdProveedor,
    descripcionProveedor: r.descripcionProveedor,
    rubro: r.rubro ?? null,
    proveedor: { prefijo: r.proveedor.prefijo ?? "", nombre: r.proveedor.nombre },
    pxCompraFinalSinIva: r.pxCompraFinalSinIva != null ? Number(r.pxCompraFinalSinIva) : null,
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
    const sql = `UPDATE prod_precios_provee SET ${setClauses.join(", ")} WHERE cod_ext = ANY($${params.length}::text[])`;
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
  /** `px_compra_final_sin_iva` desde prod_precios_provee para lógica de opción de compra. */
  pxCompraFinalSinIva: number | null;
  /** Cantidad pedida (URGENTE): `prod_ped_merc.urgente_cant_pedir`. */
  cantPedidaUrgente: number;
  /** true si hay regla REPOSICIÓN en `prod_ped_merc` para el `cod_tienda`. */
  confReposicion: boolean;
  /** `reposicion_cant_conf` desde `prod_ped_merc` (reposición). */
  cantReposicion: number;
  /** true si el ítem de proveedor está vinculado a un producto en `prod_precios_tienda`. */
  estaVinculadoTienda: boolean;
  /**
   * Si existe otro proveedor (habilitado) para el mismo producto de tienda con menor precio **comparable**
   * (`pxComparablePedidoUrgenteReposicion`: **IVA SALDO ≥ 0** → sin IVA; **< 0** → con IVA según `iva`):
   * sugerencia para desviar el pedido. `costo` sigue siendo compra final **sin IVA** para la UI.
   */
  sugerenciaProveedorMenorCosto: {
    listaPrecioProveedorId: string;
    proveedorNombre: string;
    costo: number;
  } | null;
  /**
   * Varias filas `prod_precios_provee` con el mismo `codTiendaVinculo`: la UI muestra una sola fila;
   * cada miembro conserva su `cod_ext` para persistir cantidades. Ausente en filas no agrupadas.
   */
  miembrosAgrupacion?: Array<{
    codExt: string;
    prefijo: string;
    pxCompraFinalSinIva: number | null;
    cantPedidaUrgente: number;
    estaVinculadoTienda: boolean;
    sugerenciaProveedorMenorCosto: {
      listaPrecioProveedorId: string;
      proveedorNombre: string;
      costo: number;
    } | null;
  }>;
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
 * Pantalla Pedido Urgente (filtros `urgente` o `cualquier`): filas **`prod_precios_provee`** con **`habilitado = true`**.
 * Varias filas con el mismo **`codTiendaVinculo`** se agrupan en **una sola fila** de UI (`id` `agrup-tienda:{cod_tienda}`, `miembrosAgrupacion`);
 * la paginación y el **`total`** cuentan **grupos** (fila vista), no filas crudas. Filas sin vínculo a tienda siguen 1:1 por `cod_ext`.
 * Cantidades / flags de urgente y reposición se leen de **`prod_ped_merc`** según sucursal.
 * Comparación entre proveedores que comparten el mismo **`cod_tienda`** (`codTiendaVinculo`): **precio comparable** vía
 * `pxComparablePedidoUrgenteReposicion`: si **IVA SALDO ≥ 0** compara por `px_compra_final_sin_iva`; si **< 0** por precio final con IVA según `Proveedor.iva`.
 */
async function getListaPedidoUrgenteDesdeListaPrecios(
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

  const listaWhereParts: Prisma.ListaPrecioProveedorWhereInput[] = [{ habilitado: true }];
  if (prov) {
    listaWhereParts.push({ idProveedor: prov });
  }
  if (busqueda.length >= 3) {
    const tokens = busqueda.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      listaWhereParts.push({
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
      });
    }
  }
  const listaWhere: Prisma.ListaPrecioProveedorWhereInput =
    listaWhereParts.length === 1 ? listaWhereParts[0]! : { AND: listaWhereParts };

  const includeListaPedidoUrgente = {
    proveedor: { select: { id: true, nombre: true, prefijo: true, iva: true } },
    listaPrecioTienda: { select: { codTienda: true, descripcionTienda: true } },
  } as const;

  const meta = await prisma.listaPrecioProveedor.findMany({
    where: listaWhere,
    select: { codExt: true, codTiendaVinculo: true },
    orderBy: [{ codTiendaVinculo: "asc" }, { codExt: "asc" }],
  });

  const groupKeyToCodExts = new Map<string, string[]>();
  for (const row of meta) {
    const ct = row.codTiendaVinculo?.trim();
    const key = ct ? `T:${ct}` : `E:${row.codExt}`;
    const arr = groupKeyToCodExts.get(key) ?? [];
    arr.push(row.codExt);
    groupKeyToCodExts.set(key, arr);
  }
  for (const arr of groupKeyToCodExts.values()) {
    arr.sort((a, b) => a.localeCompare(b));
  }

  const sortedKeys = [...groupKeyToCodExts.keys()].sort((ka, kb) => {
    const a0 = groupKeyToCodExts.get(ka)![0]!;
    const b0 = groupKeyToCodExts.get(kb)![0]!;
    return a0.localeCompare(b0);
  });

  const total = sortedKeys.length;
  const totalPaginasLista = total <= 0 ? 1 : Math.ceil(total / pageSize);
  if (total === 0) {
    return { items: [], total: 0, totalPaginas: 1 };
  }

  const skip = (Math.max(1, paginaNum) - 1) * pageSize;
  const pageKeys = sortedKeys.slice(skip, skip + pageSize);
  const codExtSet = new Set<string>();
  for (const k of pageKeys) {
    for (const ce of groupKeyToCodExts.get(k)!) {
      codExtSet.add(ce);
    }
  }

  const filas = await prisma.listaPrecioProveedor.findMany({
    where: { AND: [listaWhere, { codExt: { in: [...codExtSet] } }] },
    include: includeListaPedidoUrgente,
    orderBy: [{ codTiendaVinculo: "asc" }, { codExt: "asc" }],
  });

  if (filas.length === 0) {
    return { items: [], total, totalPaginas: totalPaginasLista };
  }

  const sumaIvaSaldoAcumulado = await sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido();

  const codExtsRes = [...new Set(filas.map((f) => f.codExt))];
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

  const tiendaIdsUniq = [...new Set(filas.map((f) => f.codTiendaVinculo).filter((v): v is string => Boolean(v)))];
  const alternativasPorTienda =
    tiendaIdsUniq.length > 0
      ? await prisma.listaPrecioProveedor.findMany({
          where: {
            habilitado: true,
            codTiendaVinculo: { in: tiendaIdsUniq },
          },
          select: {
            codExt: true,
            codTiendaVinculo: true,
            pxCompraFinalSinIva: true,
            pxListaProveedor: true,
            dtoProveedor: true,
            dtoMarca: true,
            dtoRubro: true,
            dtoCantidad: true,
            dtoFinanciero: true,
            cxTransporte: true,
            proveedor: { select: { nombre: true, prefijo: true, iva: true } },
          },
        })
      : [];
  const alternativasByTienda = new Map<string, (typeof alternativasPorTienda)[number][]>();
  for (const alt of alternativasPorTienda) {
    if (!alt.codTiendaVinculo) continue;
    const list = alternativasByTienda.get(alt.codTiendaVinculo) ?? [];
    list.push(alt);
    alternativasByTienda.set(alt.codTiendaVinculo, list);
  }

  const pairs = filas.map((f) => ({ idProveedor: f.idProveedor, codExt: f.codExt }));
  const { mercaderiaMapUrgente, mercaderiaRepoSet, mercaderiaMapRepo } =
    pairs.length > 0
      ? await mercaderiaMapsDesdeMerc2(
          sucursalTrim,
          pairs,
          filas.map((f) => f.listaPrecioTienda?.codTienda?.trim() ?? "").filter(Boolean)
        )
      : {
          mercaderiaMapUrgente: new Map<string, number>(),
          mercaderiaRepoSet: new Set<string>(),
          mercaderiaMapRepo: new Map<string, number>(),
        };

  const filaByCodExt = new Map(filas.map((f) => [f.codExt, f]));
  type FilaU = (typeof filas)[number];

  function itemDesdeFila(f: FilaU): PedidoUrgenteItem {
    const key = `${f.idProveedor}:${f.codExt}`;
    const descRel = f.listaPrecioTienda?.descripcionTienda?.trim();
    const descTiendaMap = descripcionTiendaPorCodExt.get(f.codExt)?.trim();
    const descTienda = descRel || descTiendaMap || null;
    const cantUrgenteUi = mercaderiaMapUrgente.get(key) ?? 0;
    const tiendaListaId = f.codTiendaVinculo ?? null;
    const alternativas = tiendaListaId ? alternativasByTienda.get(tiendaListaId) ?? [] : [];
    const sugerencia = tiendaListaId
      ? sugerenciaProveedorMenorCostoComparable(
          sumaIvaSaldoAcumulado,
          f.codExt,
          {
            pxCompraFinalSinIva: f.pxCompraFinalSinIva,
            pxListaProveedor: f.pxListaProveedor,
            dtoRubro: f.dtoRubro,
            dtoCantidad: f.dtoCantidad,
            cxTransporte: f.cxTransporte,
            dtoProveedor: f.dtoProveedor,
            dtoMarca: f.dtoMarca,
            dtoFinanciero: f.dtoFinanciero,
            iva: ivaProveedorDesdeLista(f.proveedor),
          },
          alternativas.map((a) => ({
            codExt: a.codExt,
            pxCompraFinalSinIva: a.pxCompraFinalSinIva,
            pxListaProveedor: a.pxListaProveedor,
            dtoRubro: a.dtoRubro,
            dtoCantidad: a.dtoCantidad,
            cxTransporte: a.cxTransporte,
            dtoProveedor: a.dtoProveedor,
            dtoMarca: a.dtoMarca,
            dtoFinanciero: a.dtoFinanciero,
            iva: ivaProveedorDesdeLista(a.proveedor),
            nombreProveedor:
              a.proveedor?.nombre?.trim() || a.proveedor?.prefijo?.trim() || "",
          }))
        )
      : null;

    return {
      id: f.codExt,
      codExt: f.codExt,
      prefijo: f.proveedor?.prefijo ?? "",
      descripcion: (descTienda && descTienda) || f.descripcionProveedor,
      pxCompraFinalSinIva: f.pxCompraFinalSinIva != null ? Number(f.pxCompraFinalSinIva) : null,
      cantPedidaUrgente: Math.max(0, Math.floor(cantUrgenteUi)),
      confReposicion: mercaderiaRepoSet.has(f.listaPrecioTienda?.codTienda?.trim() ?? ""),
      cantReposicion: mercaderiaMapRepo.get(f.listaPrecioTienda?.codTienda?.trim() ?? "") ?? 0,
      estaVinculadoTienda: tiendaListaId != null,
      sugerenciaProveedorMenorCosto: sugerencia,
    };
  }

  const items: PedidoUrgenteItem[] = [];
  for (const key of pageKeys) {
    const codExtsGrupo = groupKeyToCodExts.get(key)!;
    const memberFilas = codExtsGrupo
      .map((ce) => filaByCodExt.get(ce))
      .filter((x): x is FilaU => x != null);
    if (memberFilas.length === 0) continue;
    if (memberFilas.length === 1) {
      items.push(itemDesdeFila(memberFilas[0]!));
      continue;
    }
    const codTienda = memberFilas[0]!.codTiendaVinculo?.trim();
    if (!codTienda) {
      for (const mf of memberFilas) {
        items.push(itemDesdeFila(mf));
      }
      continue;
    }
    const memberItems = memberFilas.map(itemDesdeFila);
    items.push({
      id: `agrup-tienda:${codTienda}`,
      codExt: memberItems[0]!.codExt,
      prefijo: `Varios (${memberItems.length})`,
      descripcion: memberItems[0]!.descripcion,
      pxCompraFinalSinIva: null,
      cantPedidaUrgente: memberItems.reduce((s, x) => s + x.cantPedidaUrgente, 0),
      confReposicion: memberItems[0]!.confReposicion,
      cantReposicion: memberItems[0]!.cantReposicion,
      estaVinculadoTienda: true,
      sugerenciaProveedorMenorCosto: null,
      miembrosAgrupacion: memberItems.map((i) => ({
        codExt: i.codExt,
        prefijo: i.prefijo,
        pxCompraFinalSinIva: i.pxCompraFinalSinIva,
        cantPedidaUrgente: i.cantPedidaUrgente,
        estaVinculadoTienda: i.estaVinculadoTienda,
        sugerenciaProveedorMenorCosto: i.sugerenciaProveedorMenorCosto,
      })),
    });
  }

  return { items, total, totalPaginas: totalPaginasLista };
}

/**
 * Ítems de lista precios para la pantalla Pedido Urgente.
 * Solo devuelve datos si sucursal está informada.
 * descripcion = descripcion_tienda si existe; si no, descripcion_proveedor.
 * incluye pxCompraFinalSinIva para lógica de ranking en opción de compra.
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
    return getListaPedidoUrgenteDesdeListaPrecios(sucursalTrim, prov, busqueda, takeSize, paginaNum);
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
        proveedor: { select: { id: true, nombre: true, prefijo: true, iva: true } },
        listaPrecioTienda: { select: { codTienda: true } },
      },
      orderBy: { codExt: "asc" },
      skip,
      take: takeSize,
    }),
    prisma.listaPrecioProveedor.count({ where }),
  ]);

  const totalPaginasListaGeneral = total <= 0 ? 1 : Math.ceil(total / takeSize);
  if (filas.length === 0) {
    return { items: [], total, totalPaginas: totalPaginasListaGeneral };
  }

  const sumaIvaSaldoAcumulado = await sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido();

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

  const tiendaCodVincPorCodExtLista = new Map<string, string>();
  for (const f of filas) {
    if (f.codTiendaVinculo) {
      tiendaCodVincPorCodExtLista.set(f.codExt, f.codTiendaVinculo);
    }
  }

  const tiendaIds = [...new Set(filas.map((f) => f.codTiendaVinculo).filter((v): v is string => Boolean(v)))];
  const alternativasPorTienda =
    tiendaIds.length > 0
      ? await prisma.listaPrecioProveedor.findMany({
          where: {
            habilitado: true,
            codTiendaVinculo: { in: tiendaIds },
          },
          select: {
            codExt: true,
            codTiendaVinculo: true,
            pxCompraFinalSinIva: true,
            pxListaProveedor: true,
            dtoProveedor: true,
            dtoMarca: true,
            dtoRubro: true,
            dtoCantidad: true,
            dtoFinanciero: true,
            cxTransporte: true,
            proveedor: { select: { nombre: true, prefijo: true, iva: true } },
          },
        })
      : [];
  const alternativasByTienda = new Map<string, typeof alternativasPorTienda>();
  for (const alt of alternativasPorTienda) {
    if (!alt.codTiendaVinculo) continue;
    const list = alternativasByTienda.get(alt.codTiendaVinculo) ?? [];
    list.push(alt);
    alternativasByTienda.set(alt.codTiendaVinculo, list);
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
    const tiendaId = tiendaCodVincPorCodExtLista.get(f.codExt) ?? null;
    const alternativas = tiendaId ? alternativasByTienda.get(tiendaId) ?? [] : [];
    const sugerencia = sugerenciaProveedorMenorCostoComparable(
      sumaIvaSaldoAcumulado,
      f.codExt,
      {
        pxCompraFinalSinIva: f.pxCompraFinalSinIva,
        pxListaProveedor: f.pxListaProveedor,
        dtoRubro: f.dtoRubro,
        dtoCantidad: f.dtoCantidad,
        cxTransporte: f.cxTransporte,
        dtoProveedor: f.dtoProveedor,
        dtoMarca: f.dtoMarca,
        dtoFinanciero: f.dtoFinanciero,
        iva: ivaProveedorDesdeLista(f.proveedor),
      },
      alternativas.map((a) => ({
        codExt: a.codExt,
        pxCompraFinalSinIva: a.pxCompraFinalSinIva,
        pxListaProveedor: a.pxListaProveedor,
        dtoRubro: a.dtoRubro,
        dtoCantidad: a.dtoCantidad,
        cxTransporte: a.cxTransporte,
        dtoProveedor: a.dtoProveedor,
        dtoMarca: a.dtoMarca,
        dtoFinanciero: a.dtoFinanciero,
        iva: ivaProveedorDesdeLista(a.proveedor),
        nombreProveedor:
          a.proveedor?.nombre?.trim() || a.proveedor?.prefijo?.trim() || "",
      }))
    );

    return {
      id: f.codExt,
      codExt: f.codExt,
      prefijo: f.proveedor?.prefijo ?? "",
      descripcion: (descTienda?.trim() && descTienda) || f.descripcionProveedor,
      pxCompraFinalSinIva: f.pxCompraFinalSinIva != null ? Number(f.pxCompraFinalSinIva) : null,
      cantPedidaUrgente: cantUrgente,
      confReposicion: mercaderiaRepoSet.has(f.listaPrecioTienda?.codTienda?.trim() ?? ""),
      cantReposicion: mercaderiaMapRepo.get(f.listaPrecioTienda?.codTienda?.trim() ?? "") ?? 0,
      estaVinculadoTienda: tiendaId != null,
      sugerenciaProveedorMenorCosto: sugerencia,
    };
  });

  return {
    items,
    total,
    totalPaginas: totalPaginasListaGeneral,
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
