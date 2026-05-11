/**
 * Pedidos de mercadería: lectura/escritura en `prod_ped_merc` (urgente, tintométrico, reposición).
 * Resolución de proveedor y textos vía `prod_precios_tienda` / `prod_precios_provee` según tipo.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";
import {
  buildCodExtTintometrico,
  parseCodTiendaFromCodExtTintometrico,
} from "@/lib/pedidosTintometrico";
import { SUCURSAL_LABEL_PEDIDO } from "@/lib/pedidos";

const TIPO_URGENTE = "URGENTE";
const TIPO_REPOSICION = "REPOSICION";
const TIPO_TINTOMETRICO = "TINTOMETRICO";

export type SucursalPedidoEnvio = "guaymallen" | "maipu";

export interface ItemPedidoUrgentePayload {
  id: string;
  cant: number;
}

export interface ItemPedidoTintometricoPayload {
  sucursalCodigo: SucursalPedidoEnvio;
  proveedorId: string;
  codTienda: string;
  /** Código de fórmula (COD. …) — parte de `cod_ext` para no colisionar por misma base. */
  codTintometrico: string;
  cantidad: number;
  descripcion: string;
}

export interface ItemPedidoTintometricoPersistido {
  /** Id en `prod_ped_merc`. */
  id: string;
  sucursalCodigo: SucursalPedidoEnvio;
  proveedorId: string;
  codExt: string;
  codTienda: string;
  cantidad: number;
  descripcion: string;
}

async function getSucursalIdByCodigo(codigo: SucursalPedidoEnvio): Promise<string> {
  const sucursal = await prisma.sucursal.findUnique({
    where: { codigo },
    select: { id: true },
  });
  if (!sucursal) {
    throw new Error(`No se encontró la sucursal '${codigo}'.`);
  }
  return sucursal.id;
}

/** Persiste reposición solo en `prod_ped_merc`. */
export async function upsertPedidoMercaderiaReposicionConfig(params: {
  sucursal: SucursalPedidoEnvio;
  codTienda: string;
  formaPedir: "CANT_MAXIMA" | "CANT_FIJA";
  puntoReposicion: number;
  cantConf: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { sucursal, codTienda, formaPedir, puntoReposicion, cantConf } = params;

  const punto = Math.max(0, Math.floor(Number(puntoReposicion) || 0));
  const cant = Math.max(0, Math.floor(Number(cantConf) || 0));
  if (!codTienda.trim()) return { ok: false, error: "Código tienda requerido." };
  if (!formaPedir) return { ok: false, error: "Seleccioná Forma Pedir." };
  if (punto < 0) return { ok: false, error: "Punto reposición inválido." };
  if (cant <= 0) return { ok: false, error: "Cant. reposición inválida." };

  try {
    const sucursalId = await getSucursalIdByCodigo(sucursal);
    const tienda = await prisma.listaPrecioTienda.findFirst({
      where: { codTienda: codTienda.trim() },
      select: {
        codExt: true,
        codTienda: true,
        proveedor: true,
        descripcionTienda: true,
        stockMaipu: true,
        stockGuaymallen: true,
        stockeable: true,
      },
    });
    if (!tienda) {
      return { ok: false, error: "No se encontró el producto en prod_precios_tienda." };
    }
    if (!tienda.stockeable) {
      return {
        ok: false,
        error:
          "Este producto no es stockeable (DUX: ctd_disponible nulo en algún depósito); no se configura reposición por stock.",
      };
    }
    const codExtResuelto = (tienda.codExt ?? "").trim();
    if (!codExtResuelto) {
      return { ok: false, error: "El producto no tiene cod_ext en prod_precios_tienda." };
    }

    const provRows = await prisma.listaPrecioProveedor.findMany({
      where: { codExt: codExtResuelto },
      select: {
        idProveedor: true,
        codProdProveedor: true,
        descripcionProveedor: true,
        proveedor: { select: { prefijo: true, nombre: true } },
      },
      orderBy: [{ idProveedor: "asc" }],
    });
    if (provRows.length === 0) {
      return { ok: false, error: "No se encontró el ítem en prod_precios_provee." };
    }

    const stock =
      sucursal === "maipu"
        ? Number(tienda?.stockMaipu ?? 0)
        : Number(tienda?.stockGuaymallen ?? 0);
    // Regla de negocio:
    // - Solo pedir si stock <= punto de reposición.
    // - CANT_FIJA: pedir la cantidad configurada.
    // - CANT_MAXIMA: pedir faltante hasta la cantidad configurada.
    const cantPedir =
      stock <= punto
        ? formaPedir === "CANT_FIJA"
          ? cant
          : Math.max(0, cant - stock)
        : 0;

    const codT = codTienda.trim();

    await prisma.$transaction(async (tx) => {
      await tx.prodPedMerc2.deleteMany({
        where: {
          sucursalId,
          tipoDePedido: TIPO_REPOSICION,
          reposicionCodTienda: codT,
        },
      });
      await tx.prodPedMerc2.create({
        data: {
          tipoDePedido: TIPO_REPOSICION,
          sucursalId,
          reposicionCodTienda: codT,
          reposicionFormaPedido: formaPedir,
          reposicionPuntoPedido: punto,
          reposicionCantConf: cant,
          reposicionCantPedir: cantPedir,
        },
      });
    });

    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al guardar la configuración.";
    return { ok: false, error: message };
  }
}

/** Persiste URGENTE en `prod_ped_merc`. */
export async function upsertPedidoMercaderiaUrgenteItem(params: {
  sucursal: SucursalPedidoEnvio;
  listaPrecioProveedorId: string;
  cant: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { sucursal, listaPrecioProveedorId, cant } = params;
  const cantNorm = Math.max(0, Math.floor(Number(cant) || 0));

  try {
    const sucursalId = await getSucursalIdByCodigo(sucursal);
    const item = await prisma.listaPrecioProveedor.findUnique({
      where: { id: listaPrecioProveedorId },
      select: {
        idProveedor: true,
        codExt: true,
        codProdProveedor: true,
        descripcionProveedor: true,
        listaPrecioTienda: {
          select: { codTienda: true, descripcionTienda: true },
        },
      },
    });

    if (!item) return { ok: false, error: "Producto no encontrado." };

    await prisma.$transaction(async (tx) => {
      if (cantNorm <= 0) {
        await tx.prodPedMerc2.deleteMany({
          where: {
            tipoDePedido: TIPO_URGENTE,
            sucursalId,
            urgenteCodExt: item.codExt,
          },
        });
        return;
      }

      await tx.prodPedMerc2.deleteMany({
        where: {
          tipoDePedido: TIPO_URGENTE,
          sucursalId,
          urgenteCodExt: item.codExt,
        },
      });
      await tx.prodPedMerc2.create({
        data: {
          tipoDePedido: TIPO_URGENTE,
          sucursalId,
          urgenteCodExt: item.codExt,
          urgenteCantPedir: cantNorm,
        },
      });
    });

    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al guardar el ítem.";
    return { ok: false, error: message };
  }
}

/**
 * Reemplaza todos los ítems de tipo URGENTE para la sucursal dada por el conjunto
 * (id lista precio, cantidad). Persiste en `prod_ped_merc`.
 */
export async function syncPedidoUrgenteEnvio(
  sucursal: SucursalPedidoEnvio,
  items: ItemPedidoUrgentePayload[]
): Promise<{ creados: number; error?: string }> {
  const withCant = items.filter((i) => i.cant > 0);
  const ids = [...new Set(withCant.map((i) => i.id))];
  const cantById = new Map(withCant.map((i) => [i.id, i.cant]));

  let creados = 0;

  const sucursalId = await getSucursalIdByCodigo(sucursal);
  await prisma.$transaction(async (tx) => {
    await tx.prodPedMerc2.deleteMany({
      where: { sucursalId, tipoDePedido: TIPO_URGENTE },
    });

    if (ids.length === 0) {
      return;
    }

    const filas = await tx.listaPrecioProveedor.findMany({
      where: { id: { in: ids } },
      include: {
        proveedor: { select: { id: true } },
        listaPrecioTienda: { select: { codTienda: true, descripcionTienda: true } },
      },
    });

    const toCreate = filas
      .map((f) => {
        const cant = cantById.get(f.id) ?? 0;
        if (cant <= 0) return null;
        return {
          codExt: f.codExt,
          urgenteCantPedir: cant,
        };
      })
      .filter(Boolean) as Array<{
      codExt: string;
      urgenteCantPedir: number;
    }>;

    creados = toCreate.length;
    for (const row of toCreate) {
      await tx.prodPedMerc2.create({
        data: {
          tipoDePedido: TIPO_URGENTE,
          sucursalId,
          urgenteCodExt: row.codExt,
          urgenteCantPedir: row.urgenteCantPedir,
        },
      });
    }
  });

  return { creados };
}

export async function upsertPedidoTintometricoItems(
  sucursal: SucursalPedidoEnvio,
  items: ItemPedidoTintometricoPayload[]
): Promise<{ actualizados: number; error?: string }> {
  if (items.length === 0) return { actualizados: 0 };

  let actualizados = 0;

  try {
    const sucursalId = await getSucursalIdByCodigo(sucursal);
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const codTiendaTrim = item.codTienda.trim();
        const codExt = buildCodExtTintometrico(codTiendaTrim, item.codTintometrico);

        const mercTint = await tx.prodPedMerc2.findFirst({
          where: {
            tipoDePedido: TIPO_TINTOMETRICO,
            sucursalId,
            tintometricoProveedor: item.proveedorId.trim(),
            urgenteCodExt: codExt,
          },
          select: { id: true },
        });
        if (mercTint) {
          await tx.prodPedMerc2.update({
            where: { id: mercTint.id },
            data: {
              tintometricoDescripcion: item.descripcion,
              tintometrioCantPedir: item.cantidad,
            },
          });
        } else {
          await tx.prodPedMerc2.create({
            data: {
              tipoDePedido: TIPO_TINTOMETRICO,
              sucursalId,
              tintometricoProveedor: item.proveedorId.trim(),
              tintometricoDescripcion: item.descripcion,
              tintometrioCantPedir: item.cantidad,
              urgenteCodExt: codExt,
            },
          });
        }

        actualizados += 1;
      }
    });

    return { actualizados };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar ítems tintométricos.";
    return { actualizados: 0, error: msg };
  }
}

export async function getPedidoTintometricoItems(): Promise<ItemPedidoTintometricoPersistido[]> {
  const merc2 = await prisma.prodPedMerc2.findMany({
    where: {
      tipoDePedido: TIPO_TINTOMETRICO,
      tintometrioCantPedir: { gt: 0 },
    },
    orderBy: [{ id: "desc" }],
    select: {
      id: true,
      sucursalId: true,
      sucursal: { select: { codigo: true } },
      tintometricoProveedor: true,
      tintometrioCantPedir: true,
      tintometricoDescripcion: true,
      urgenteCodExt: true,
    },
  });

  const desdeMerc2: ItemPedidoTintometricoPersistido[] = merc2
    .filter((r) => (r.tintometricoProveedor ?? "").trim().length > 0)
    .map((r) => ({
      id: r.id,
      sucursalCodigo: r.sucursal.codigo as SucursalPedidoEnvio,
      proveedorId: r.tintometricoProveedor!.trim(),
      codExt: (r.urgenteCodExt ?? "").trim(),
      codTienda: "",
      cantidad: Math.max(0, Math.floor(Number(r.tintometrioCantPedir ?? 0))),
      descripcion: (r.tintometricoDescripcion ?? "").trim(),
    }));

  return desdeMerc2;
}

export async function deletePedidoTintometricoItem(
  params:
    | { id: string }
    | {
        sucursalCodigo: SucursalPedidoEnvio;
        proveedorId: string;
        /** Valor persistido en `urgente_cod_ext` (tintométrico: base + código fórmula). */
        codExt: string;
      }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if ("id" in params) {
      await prisma.prodPedMerc2.deleteMany({
        where: { id: params.id.trim(), tipoDePedido: TIPO_TINTOMETRICO },
      });
      return { ok: true };
    }
    const codExt = params.codExt.trim();
    const sucursalId = await getSucursalIdByCodigo(params.sucursalCodigo);
    await prisma.prodPedMerc2.deleteMany({
      where: {
        tipoDePedido: TIPO_TINTOMETRICO,
        sucursalId,
        tintometricoProveedor: params.proveedorId.trim(),
        urgenteCodExt: codExt,
      },
    });
    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al borrar ítem tintométrico.";
    return { ok: false, error: message };
  }
}

/** Ítem para PDF de envío (descripción y cantidad). */
export interface ItemPedidoParaPdf {
  codExt: string;
  codProveedor: string;
  descripcion: string;
  cantPedir: number;
}

/** Proveedor con datos para envío por WhatsApp. */
export interface ProveedorParaEnvio {
  id: string;
  nombre: string;
  prefijo: string;
  whatsapp: string | null;
}

/** Fila de la tabla Generar Pedido (cantidad, proveedor y descripción). */
export interface ItemTablaEnviarPedido {
  cantPedir: number;
  descripcion: string;
  tipoPedido: string;
  sucursal: string;
  proveedor: string;
}

function stockTiendaParaSucursalCodigo(
  codigoSucursal: string,
  tienda: { stockMaipu: number; stockGuaymallen: number }
): number {
  return codigoSucursal === "maipu"
    ? Number(tienda.stockMaipu ?? 0)
    : Number(tienda.stockGuaymallen ?? 0);
}

function proveedorEtiquetaDesdeRow(p: {
  prefijo: string | null;
  nombre: string | null;
}): string {
  const pref = (p.prefijo ?? "").trim();
  const nom = (p.nombre ?? "").trim();
  return pref.length > 0 ? `[${pref}] ${nom}`.trim().toUpperCase() : nom.toUpperCase();
}

/**
 * Misma regla que `upsertPedidoMercaderiaReposicionConfig`: pedir solo si `stock <= punto`;
 * `CANT_FIJA` → cantidad configurada; `CANT_MAXIMA` → `max(0, cantConf - stock)`.
 */
export function cantPedirReposicionMerc2(params: {
  forma: string | null | undefined;
  punto: number | null | undefined;
  cantConf: number | null | undefined;
  stock: number;
  stockeable: boolean;
}): number {
  if (!params.stockeable) return 0;
  const forma = params.forma;
  if (forma !== "CANT_FIJA" && forma !== "CANT_MAXIMA") return 0;
  const punto = Math.max(0, Math.floor(Number(params.punto ?? 0)));
  const cant = Math.max(0, Math.floor(Number(params.cantConf ?? 0)));
  if (params.stock > punto) return 0;
  return forma === "CANT_FIJA" ? cant : Math.max(0, cant - params.stock);
}

export type LpRowPick = {
  idProveedor: string;
  descripcionProveedor: string;
  codProdProveedor?: string | null;
  idListaPrecioTienda: string | null;
  listaPrecioTienda?: { codTienda: string } | null;
  proveedor: { prefijo: string | null; nombre: string | null };
};

export function pickListaPrecioProveedorPorCodExtYTienda(
  lista: LpRowPick[],
  tienda: { proveedor: string | null; id: string }
): LpRowPick | null {
  if (lista.length === 0) return null;
  const proveedorTiendaNorm = (tienda.proveedor ?? "").trim().toUpperCase();
  const porNombre = lista.find((r) => {
    const pref = (r.proveedor.prefijo ?? "").trim().toUpperCase();
    const nom = (r.proveedor.nombre ?? "").trim().toUpperCase();
    return (
      proveedorTiendaNorm.length > 0 &&
      (pref === proveedorTiendaNorm || nom === proveedorTiendaNorm)
    );
  });
  const vinculado = lista.find((r) => r.idListaPrecioTienda === tienda.id);
  return porNombre ?? vinculado ?? lista[0] ?? null;
}

function pickListaPrecioProveedorUrgente(
  lista: LpRowPick[],
  proveedorIdFiltro?: string
): LpRowPick | null {
  if (lista.length === 0) return null;
  if (proveedorIdFiltro?.trim()) {
    const f = lista.filter((r) => r.idProveedor === proveedorIdFiltro.trim());
    if (f.length > 0) return f[0]!;
  }
  return lista[0] ?? null;
}

/**
 * Ítems con cantidad a pedir > 0 para la tabla **Generar Pedido**.
 * Fuente: `prod_ped_merc` (`ProdPedMerc2`). Sin filtros en URL: todos los tipos y sucursales;
 * cada filtro activo reduce el resultado (post-resolución para proveedor y texto `q`).
 */
export async function getItemsTablaEnviarPedido(params: {
  sucursalCodigo?: string;
  proveedorId?: string;
  tipos?: string[];
  q?: string;
}): Promise<{ items: ItemTablaEnviarPedido[] }> {
  const { sucursalCodigo, proveedorId, tipos, q } = params;
  const qNorm = q?.trim() ? q.trim().toLowerCase() : "";
  const pidFiltro = proveedorId?.trim() || undefined;

  const whereParts: Prisma.ProdPedMerc2WhereInput[] = [];

  if (sucursalCodigo?.trim()) {
    const sucursalRow = await prisma.sucursal.findUnique({
      where: { codigo: sucursalCodigo.trim() },
      select: { id: true },
    });
    if (!sucursalRow) return { items: [] };
    whereParts.push({ sucursalId: sucursalRow.id });
  }

  if (tipos && tipos.length > 0) {
    whereParts.push({ tipoDePedido: { in: tipos } });
  }

  const whereMerc2: Prisma.ProdPedMerc2WhereInput =
    whereParts.length === 0 ? {} : whereParts.length === 1 ? whereParts[0]! : { AND: whereParts };

  const rows = await prisma.prodPedMerc2.findMany({
    where: whereMerc2,
    orderBy: [{ sucursalId: "asc" }, { tipoDePedido: "asc" }, { id: "asc" }],
    select: {
      id: true,
      tipoDePedido: true,
      sucursalId: true,
      urgenteCodExt: true,
      urgenteCantPedir: true,
      tintometricoDescripcion: true,
      tintometrioCantPedir: true,
      tintometricoProveedor: true,
      reposicionFormaPedido: true,
      reposicionPuntoPedido: true,
      reposicionCantConf: true,
      reposicionCantPedir: true,
      reposicionCodTienda: true,
      sucursal: { select: { codigo: true, nombre: true } },
    },
  });

  const codTiendasRepos = new Set<string>();
  const codTiendasTintometrico = new Set<string>();
  const codExts = new Set<string>();
  const idsTintometricoProveedor = new Set<string>();

  for (const r of rows) {
    if (r.tipoDePedido === TIPO_REPOSICION && r.reposicionCodTienda?.trim()) {
      codTiendasRepos.add(r.reposicionCodTienda.trim());
    }
    if (r.tipoDePedido === TIPO_URGENTE && r.urgenteCodExt?.trim()) {
      codExts.add(r.urgenteCodExt.trim());
    }
    if (r.tipoDePedido === TIPO_TINTOMETRICO && r.urgenteCodExt?.trim()) {
      const codTiendaTint = parseCodTiendaFromCodExtTintometrico(r.urgenteCodExt);
      if (codTiendaTint) codTiendasTintometrico.add(codTiendaTint);
    }
    if (r.tipoDePedido === TIPO_TINTOMETRICO && r.tintometricoProveedor?.trim()) {
      idsTintometricoProveedor.add(r.tintometricoProveedor.trim());
    }
  }

  const codTiendasLookup = new Set<string>([
    ...Array.from(codTiendasRepos),
    ...Array.from(codTiendasTintometrico),
  ]);
  const tiendas =
    codTiendasLookup.size > 0
      ? await prisma.listaPrecioTienda.findMany({
          where: { codTienda: { in: Array.from(codTiendasLookup) } },
          select: {
            id: true,
            codTienda: true,
            codExt: true,
            proveedor: true,
            descripcionTienda: true,
            stockMaipu: true,
            stockGuaymallen: true,
            stockeable: true,
          },
        })
      : [];

  const tiendaByCodTienda = new Map<string, (typeof tiendas)[number]>();
  for (const t of tiendas) {
    const ct = (t.codTienda ?? "").trim();
    if (!ct) continue;
    if (!tiendaByCodTienda.has(ct)) tiendaByCodTienda.set(ct, t);
    const ce = (t.codExt ?? "").trim();
    if (ce) codExts.add(ce);
  }

  const lpRows =
    codExts.size > 0
      ? await prisma.listaPrecioProveedor.findMany({
          where: { codExt: { in: Array.from(codExts) }, habilitado: true },
          select: {
            codExt: true,
            idProveedor: true,
            codProdProveedor: true,
            descripcionProveedor: true,
            idListaPrecioTienda: true,
            listaPrecioTienda: { select: { codTienda: true } },
            proveedor: { select: { prefijo: true, nombre: true } },
          },
          orderBy: [{ idProveedor: "asc" }],
        })
      : [];

  const lpPorCodExt = new Map<string, LpRowPick[]>();
  for (const row of lpRows) {
    const k = (row.codExt ?? "").trim();
    if (!k) continue;
    const arr = lpPorCodExt.get(k) ?? [];
    arr.push(row as LpRowPick);
    lpPorCodExt.set(k, arr);
  }

  const proveedoresTintometrico =
    idsTintometricoProveedor.size > 0
      ? await prisma.proveedor.findMany({
          where: { id: { in: Array.from(idsTintometricoProveedor) } },
          select: { id: true, nombre: true, prefijo: true },
        })
      : [];
  const proveedorPorId = new Map(proveedoresTintometrico.map((p) => [p.id, p]));

  const out: ItemTablaEnviarPedido[] = [];

  for (const r of rows) {
    const codigoSuc = (r.sucursal?.codigo ?? "").trim();
    const sucursalLabel =
      codigoSuc && (SUCURSAL_LABEL_PEDIDO as Partial<Record<string, string>>)[codigoSuc]
        ? (SUCURSAL_LABEL_PEDIDO as Partial<Record<string, string>>)[codigoSuc]!
        : r.sucursal?.nombre?.trim() || "";

    let idProveedorResuelto: string | null = null;
    let proveedorEtiqueta = "";
    let descripcion = "";
    let cantPedir = 0;

    if (r.tipoDePedido === TIPO_REPOSICION) {
      const codTi = (r.reposicionCodTienda ?? "").trim();
      const tienda = codTi ? tiendaByCodTienda.get(codTi) : undefined;
      if (!tienda) {
        continue;
      }
      const codExtT = (tienda.codExt ?? "").trim();
      const listaLp = codExtT ? lpPorCodExt.get(codExtT) ?? [] : [];
      const provRow = pickListaPrecioProveedorPorCodExtYTienda(listaLp, tienda);
      if (!provRow) {
        continue;
      }
      idProveedorResuelto = provRow.idProveedor;
      proveedorEtiqueta = proveedorEtiquetaDesdeRow(provRow.proveedor);
      descripcion = (tienda.descripcionTienda ?? "").trim();
      const stock = stockTiendaParaSucursalCodigo(codigoSuc || "guaymallen", tienda);
      const computedRepos = cantPedirReposicionMerc2({
        forma: r.reposicionFormaPedido,
        punto: r.reposicionPuntoPedido,
        cantConf: r.reposicionCantConf,
        stock,
        stockeable: tienda.stockeable,
      });
      // Reposición debe reflejar siempre stock/regla vigentes.
      // No usar `reposicionCantPedir` persistido porque puede quedar desfasado
      // cuando cambia stock tras sincronización.
      cantPedir = computedRepos;
    } else if (r.tipoDePedido === TIPO_URGENTE) {
      const codExtU = (r.urgenteCodExt ?? "").trim();
      if (!codExtU) continue;
      const listaLp = lpPorCodExt.get(codExtU) ?? [];
      const provRow = pickListaPrecioProveedorUrgente(listaLp, pidFiltro);
      if (!provRow) continue;
      idProveedorResuelto = provRow.idProveedor;
      proveedorEtiqueta = proveedorEtiquetaDesdeRow(provRow.proveedor);
      descripcion = (provRow.descripcionProveedor ?? "").trim();
      cantPedir = Math.max(0, Math.floor(Number(r.urgenteCantPedir) || 0));
    } else if (r.tipoDePedido === TIPO_TINTOMETRICO) {
      const idProv = (r.tintometricoProveedor ?? "").trim();
      if (!idProv) continue;
      const p = proveedorPorId.get(idProv);
      if (!p) continue;
      const codTiendaTint =
        parseCodTiendaFromCodExtTintometrico(r.urgenteCodExt ?? "") ?? "";
      const codTiendaExisteEnTienda =
        codTiendaTint.length > 0 && tiendaByCodTienda.has(codTiendaTint);
      idProveedorResuelto = p.id;
      proveedorEtiqueta = proveedorEtiquetaDesdeRow(p);
      descripcion = (r.tintometricoDescripcion ?? "").trim();
      cantPedir = Math.max(0, Math.floor(Number(r.tintometrioCantPedir) || 0));
      if (!descripcion && codTiendaExisteEnTienda) {
        descripcion =
          (tiendaByCodTienda.get(codTiendaTint)?.descripcionTienda ?? "").trim();
      }
    } else {
      continue;
    }

    if (pidFiltro && idProveedorResuelto !== pidFiltro) {
      continue;
    }

    if (cantPedir <= 0) continue;

    if (qNorm) {
      const blob = `${descripcion} ${proveedorEtiqueta} ${r.tipoDePedido}`.toLowerCase();
      if (!blob.includes(qNorm)) continue;
    }

    out.push({
      cantPedir,
      tipoPedido: r.tipoDePedido,
      sucursal: sucursalLabel,
      proveedor: proveedorEtiqueta,
      descripcion,
    });
  }

  return { items: out };
}

/**
 * Fila desde `prod_ped_merc` para PDF y sobrestock (`id` = PK de la fila).
 */
export interface ItemPedidoEnvioRowParaEnviar {
  id: string;
  tipoPedido: string;
  codExt: string;
  codProveedor: string | null;
  tintometricoDescripcion: string | null;
  descripcionProveedor: string | null;
  descripcionTienda: string | null;
  cantPedir: number;
  codTienda: string | null;
  reposicionCantConf: number | null;
}

export interface AjusteCantPedirSobreStockInput {
  idItemPedidoEnvio: string;
  cantPedir: number;
}

/**
 * Obtiene ítems de `prod_ped_merc` para el proveedor, sucursal y tipos dados,
 * y los datos del proveedor (para PDF y WhatsApp).
 * Incluye `rows` para reutilizar en `getSobreStockOtraSucursalParaPedidoEnviar` (mismas filas que el PDF).
 */
export async function getItemsYProveedorParaEnviar(
  proveedorId: string,
  sucursal: string,
  tipos: string[],
  q?: string,
  opts?: { incluirFilasConCantCero?: boolean }
): Promise<{
  rows: ItemPedidoEnvioRowParaEnviar[];
  items: ItemPedidoParaPdf[];
  proveedor: ProveedorParaEnvio | null;
}> {
  const pid = proveedorId.trim();
  if (!pid || !sucursal.trim() || tipos.length === 0) {
    return { rows: [], items: [], proveedor: null };
  }

  const sucursalRow = await prisma.sucursal.findUnique({
    where: { codigo: sucursal.trim() },
    select: { id: true, codigo: true },
  });
  if (!sucursalRow?.codigo) return { rows: [], items: [], proveedor: null };

  const qNorm = q?.trim() ? q.trim().toLowerCase() : "";

  const [mercRows, proveedor] = await Promise.all([
    prisma.prodPedMerc2.findMany({
      where: {
        sucursalId: sucursalRow.id,
        tipoDePedido: { in: tipos },
      },
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        tipoDePedido: true,
        sucursalId: true,
        urgenteCodExt: true,
        urgenteCantPedir: true,
        tintometricoDescripcion: true,
        tintometrioCantPedir: true,
        tintometricoProveedor: true,
        reposicionFormaPedido: true,
        reposicionPuntoPedido: true,
        reposicionCantConf: true,
        reposicionCantPedir: true,
        reposicionCodTienda: true,
        sucursal: { select: { codigo: true } },
      },
    }),
    prisma.proveedor.findUnique({
      where: { id: pid },
      select: { id: true, nombre: true, prefijo: true, whatsapp: true },
    }),
  ]);

  const codigoSucursal = (sucursalRow.codigo ?? "").trim();

  const codTiendasRepos = new Set<string>();
  const codTiendasTintometrico = new Set<string>();
  const codExts = new Set<string>();
  const idsTintometricoProveedor = new Set<string>();

  for (const r of mercRows) {
    if (r.tipoDePedido === TIPO_REPOSICION && r.reposicionCodTienda?.trim()) {
      codTiendasRepos.add(r.reposicionCodTienda.trim());
    }
    if (r.tipoDePedido === TIPO_URGENTE && r.urgenteCodExt?.trim()) {
      codExts.add(r.urgenteCodExt.trim());
    }
    if (r.tipoDePedido === TIPO_TINTOMETRICO && r.urgenteCodExt?.trim()) {
      const codTiendaTint = parseCodTiendaFromCodExtTintometrico(r.urgenteCodExt);
      if (codTiendaTint) codTiendasTintometrico.add(codTiendaTint);
    }
    if (r.tipoDePedido === TIPO_TINTOMETRICO && r.tintometricoProveedor?.trim()) {
      idsTintometricoProveedor.add(r.tintometricoProveedor.trim());
    }
  }

  const codTiendasLookup = new Set<string>([
    ...Array.from(codTiendasRepos),
    ...Array.from(codTiendasTintometrico),
  ]);
  const tiendas =
    codTiendasLookup.size > 0
      ? await prisma.listaPrecioTienda.findMany({
          where: { codTienda: { in: Array.from(codTiendasLookup) } },
          select: {
            id: true,
            codTienda: true,
            codExt: true,
            proveedor: true,
            descripcionTienda: true,
            stockMaipu: true,
            stockGuaymallen: true,
            stockeable: true,
          },
        })
      : [];

  const tiendaByCodTienda = new Map<string, (typeof tiendas)[number]>();
  for (const t of tiendas) {
    const ct = (t.codTienda ?? "").trim();
    if (!ct) continue;
    if (!tiendaByCodTienda.has(ct)) tiendaByCodTienda.set(ct, t);
    const ce = (t.codExt ?? "").trim();
    if (ce) codExts.add(ce);
  }

  const lpRows =
    codExts.size > 0
      ? await prisma.listaPrecioProveedor.findMany({
          where: { codExt: { in: Array.from(codExts) }, habilitado: true },
          select: {
            codExt: true,
            idProveedor: true,
            codProdProveedor: true,
            descripcionProveedor: true,
            idListaPrecioTienda: true,
            listaPrecioTienda: { select: { codTienda: true } },
            proveedor: { select: { prefijo: true, nombre: true } },
          },
          orderBy: [{ idProveedor: "asc" }],
        })
      : [];

  const lpPorCodExt = new Map<string, LpRowPick[]>();
  for (const row of lpRows) {
    const k = (row.codExt ?? "").trim();
    if (!k) continue;
    const arr = lpPorCodExt.get(k) ?? [];
    arr.push(row as LpRowPick);
    lpPorCodExt.set(k, arr);
  }

  const proveedoresTintometrico =
    idsTintometricoProveedor.size > 0
      ? await prisma.proveedor.findMany({
          where: { id: { in: Array.from(idsTintometricoProveedor) } },
          select: { id: true, nombre: true, prefijo: true },
        })
      : [];
  const proveedorPorId = new Map(proveedoresTintometrico.map((p) => [p.id, p]));

  const rowsOut: ItemPedidoEnvioRowParaEnviar[] = [];

  for (const r of mercRows) {
    let codExtOut = "";
    let codProveedor: string | null = null;
    let tintometricoDescripcion: string | null = null;
    let descripcionProveedor: string | null = null;
    let descripcionTienda: string | null = null;
    let cantPedir = 0;
    let codTienda: string | null = null;

    if (r.tipoDePedido === TIPO_REPOSICION) {
      const codTi = (r.reposicionCodTienda ?? "").trim();
      const tienda = codTi ? tiendaByCodTienda.get(codTi) : undefined;
      if (!tienda) continue;
      const codExtT = (tienda.codExt ?? "").trim();
      const listaLp = codExtT ? lpPorCodExt.get(codExtT) ?? [] : [];
      const provRow = pickListaPrecioProveedorPorCodExtYTienda(listaLp, tienda);
      if (!provRow || provRow.idProveedor !== pid) continue;
      codExtOut = codExtT;
      codProveedor = (provRow.codProdProveedor ?? "").trim() || null;
      tintometricoDescripcion = null;
      descripcionProveedor = (provRow.descripcionProveedor ?? "").trim() || null;
      descripcionTienda = (tienda.descripcionTienda ?? "").trim() || null;
      codTienda = codTi;
      const stock = stockTiendaParaSucursalCodigo(codigoSucursal || "guaymallen", tienda);
      const computedRepos = cantPedirReposicionMerc2({
        forma: r.reposicionFormaPedido,
        punto: r.reposicionPuntoPedido,
        cantConf: r.reposicionCantConf,
        stock,
        stockeable: tienda.stockeable,
      });
      // Reposición debe reflejar siempre stock/regla vigentes.
      // No usar `reposicionCantPedir` persistido porque puede quedar desfasado
      // cuando cambia stock tras sincronización.
      cantPedir = computedRepos;
    } else if (r.tipoDePedido === TIPO_URGENTE) {
      const codExtU = (r.urgenteCodExt ?? "").trim();
      if (!codExtU) continue;
      const listaLp = lpPorCodExt.get(codExtU) ?? [];
      const provRow = pickListaPrecioProveedorUrgente(listaLp, pid);
      if (!provRow || provRow.idProveedor !== pid) continue;
      codExtOut = codExtU;
      codProveedor = (provRow.codProdProveedor ?? "").trim() || null;
      tintometricoDescripcion = null;
      descripcionProveedor = (provRow.descripcionProveedor ?? "").trim() || null;
      descripcionTienda = null;
      codTienda = (provRow.listaPrecioTienda?.codTienda ?? "").trim() || null;
      cantPedir = Math.max(0, Math.floor(Number(r.urgenteCantPedir) || 0));
    } else if (r.tipoDePedido === TIPO_TINTOMETRICO) {
      const idProv = (r.tintometricoProveedor ?? "").trim();
      if (!idProv || idProv !== pid) continue;
      const pRow = proveedorPorId.get(idProv);
      if (!pRow) continue;
      const codTiendaTint =
        parseCodTiendaFromCodExtTintometrico(r.urgenteCodExt ?? "") ?? "";
      const codTiendaExisteEnTienda =
        codTiendaTint.length > 0 && tiendaByCodTienda.has(codTiendaTint);
      codExtOut = (r.urgenteCodExt ?? "").trim();
      codProveedor = "";
      tintometricoDescripcion = r.tintometricoDescripcion;
      descripcionProveedor = (r.tintometricoDescripcion ?? "").trim() || null;
      descripcionTienda = codTiendaExisteEnTienda
        ? (tiendaByCodTienda.get(codTiendaTint)?.descripcionTienda ?? "").trim() || null
        : null;
      codTienda = codTiendaExisteEnTienda ? codTiendaTint : null;
      cantPedir = Math.max(0, Math.floor(Number(r.tintometrioCantPedir) || 0));
    } else {
      continue;
    }

    if (!opts?.incluirFilasConCantCero && cantPedir <= 0) continue;

    if (qNorm) {
      const blob = (
        (descripcionProveedor ?? "") +
        " " +
        (descripcionTienda ?? "") +
        " " +
        codExtOut +
        " " +
        r.tipoDePedido
      ).toLowerCase();
      if (!blob.includes(qNorm)) continue;
    }

    rowsOut.push({
      id: r.id,
      tipoPedido: r.tipoDePedido,
      codExt: codExtOut,
      codProveedor,
      tintometricoDescripcion,
      descripcionProveedor,
      descripcionTienda,
      cantPedir,
      codTienda,
      reposicionCantConf: r.reposicionCantConf,
    });
  }

  rowsOut.sort((a, b) => a.codExt.localeCompare(b.codExt));

  const itemsPdf = rowsOut.map((i) => ({
    codExt: i.codExt,
    codProveedor: (i.codProveedor ?? "").trim(),
    descripcion:
      (i.descripcionProveedor ?? "").trim() ||
      (i.tintometricoDescripcion ?? "").trim() ||
      (i.descripcionTienda ?? "").trim(),
    cantPedir: i.cantPedir,
  }));

  const prov = proveedor
    ? {
        id: proveedor.id,
        nombre: proveedor.nombre,
        prefijo: proveedor.prefijo ?? "",
        whatsapp: proveedor.whatsapp ?? null,
      }
    : null;

  return { rows: rowsOut, items: itemsPdf, proveedor: prov };
}

/**
 * Ajusta `cant_pedir` para un subconjunto de ítems del pedido antes de generar snapshot/PDF.
 * Solo permite actualizar filas que pertenezcan al mismo proveedor + sucursal + tipos solicitados.
 */
export async function ajustarCantidadesParaGenerarPedido(params: {
  proveedorId: string;
  sucursalCodigo: SucursalPedidoEnvio;
  tipos: string[];
  ajustes: AjusteCantPedirSobreStockInput[];
}): Promise<ServiceResult<{ actualizados: number }>> {
  const proveedorId = params.proveedorId.trim();
  const tipos = Array.from(new Set(params.tipos.map((t) => t.trim()).filter(Boolean)));
  const ajustes = params.ajustes
    .map((a) => ({
      idItemPedidoEnvio: a.idItemPedidoEnvio.trim(),
      cantPedir: Math.max(0, Math.floor(Number(a.cantPedir) || 0)),
    }))
    .filter((a) => a.idItemPedidoEnvio.length > 0);

  if (!proveedorId) return { success: false, error: "Proveedor inválido." };
  if (!params.sucursalCodigo.trim()) return { success: false, error: "Sucursal inválida." };
  if (tipos.length === 0) return { success: false, error: "Tipos inválidos." };
  if (ajustes.length === 0) return { success: true, data: { actualizados: 0 } };

  try {
    const ids = [...new Set(ajustes.map((a) => a.idItemPedidoEnvio))];
    const cantById = new Map(ajustes.map((a) => [a.idItemPedidoEnvio, a.cantPedir]));

    const { rows: filasPermitidas } = await getItemsYProveedorParaEnviar(
      proveedorId,
      params.sucursalCodigo,
      tipos,
      undefined,
      { incluirFilasConCantCero: true }
    );
    const permitido = new Set(filasPermitidas.map((r) => r.id));
    for (const id of ids) {
      if (!permitido.has(id)) {
        return {
          success: false,
          error:
            "No se pudieron validar todos los ítems de sobrestock para aplicar ajustes.",
        };
      }
    }

    const tipoById = new Map(filasPermitidas.map((r) => [r.id, r.tipoPedido]));

    await prisma.$transaction(async (tx) => {
      for (const id of ids) {
        const cant = cantById.get(id);
        if (cant == null) continue;
        const tipo = tipoById.get(id);
        if (!tipo) continue;

        await tx.prodPedMerc2.update({
          where: { id },
          data: {
            ...(tipo === TIPO_URGENTE ? { urgenteCantPedir: cant } : {}),
            ...(tipo === TIPO_TINTOMETRICO ? { tintometrioCantPedir: cant } : {}),
            ...(tipo === TIPO_REPOSICION ? { reposicionCantPedir: cant } : {}),
          },
        });
      }
    });

    return { success: true, data: { actualizados: ids.length } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al ajustar cantidades del pedido.";
    return { success: false, error: msg };
  }
}
