/**
 * Servicio prod_ped_merc: sincroniza ítems de Pedido Urgente.
 * El servidor construye las filas a partir de ids de ListaPrecioProveedor + cantidades (opción B).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";
import { buildCodExtTintometrico } from "@/lib/pedidosTintometrico";
import { SUCURSAL_LABEL_PEDIDO } from "@/lib/pedidos";

const TIPO_URGENTE = "URGENTE";
const TIPO_REPOSICION = "REPOSICION";
const TIPO_TINTOMETRICO = "TINTOMETRICO";
const COD_TIENDA_FALLBACK = "1503";

/**
 * En `REPOSICION` no se persiste el cod_ext comercial de negocio; la clave lógica es `cod_tienda`.
 * El unique de BD `(id_proveedor, tipo, sucursal, cod_ext)` exige un valor distinguible por fila:
 * usamos un surrogado estable (no confundir con `prod_precios_tienda.cod_ext`).
 */
const REPOSICION_COD_EXT_PREFIX = "REPO_TIENDA:";

function codExtSurrogateReposicion(codTienda: string): string {
  return `${REPOSICION_COD_EXT_PREFIX}${codTienda.trim()}`;
}

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
  /** Id canónico (`prod_ped_merc_2` / `prod_ped_merc` misma fila cuando está espejado). */
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

/** Persiste reposición en `prod_ped_merc` y en `prod_ped_merc_2` (mismo `id` que la fila canónica). */
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

    const proveedorTiendaNorm = (tienda.proveedor ?? "").trim().toUpperCase();
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
    const provRow =
      provRows.find((r) => {
        const pref = (r.proveedor.prefijo ?? "").trim().toUpperCase();
        const nom = (r.proveedor.nombre ?? "").trim().toUpperCase();
        return (
          proveedorTiendaNorm.length > 0 &&
          (pref === proveedorTiendaNorm || nom === proveedorTiendaNorm)
        );
      }) ?? provRows[0]!;

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

    const dataBase = {
      codProveedor: (provRow.codProdProveedor ?? "").trim(),
      codTienda: tienda?.codTienda?.trim() || COD_TIENDA_FALLBACK,
      descripcionProveedor: provRow.descripcionProveedor,
      descripcionTienda: tienda?.descripcionTienda?.trim() || null,
      cantPedir,
      reposicionFormaPedido: formaPedir,
      reposicionPuntoPedido: punto,
      reposicionCantConf: cant,
      reposicionCantPedir: cantPedir,
    };

    const codExtFila = codExtSurrogateReposicion(tienda.codTienda);
    const codT = codTienda.trim();

    await prisma.$transaction(async (tx) => {
      const existingByCodTienda = await tx.itemPedidoEnvio.findMany({
        where: {
          tipoPedido: TIPO_REPOSICION,
          sucursalId,
          codTienda: codT,
        },
        select: { id: true, idProveedor: true, codExt: true },
      });
      const existingCurrent = existingByCodTienda[0] ?? null;

      if (existingCurrent) {
        await tx.itemPedidoEnvio.update({
          where: { id: existingCurrent.id },
          data: {
            ...dataBase,
            idProveedor: provRow.idProveedor,
            codExt: codExtFila,
          },
        });
      } else {
        await tx.itemPedidoEnvio.create({
          data: {
            idProveedor: provRow.idProveedor,
            tipoPedido: TIPO_REPOSICION,
            sucursalId,
            codExt: codExtFila,
            ...dataBase,
          },
        });
      }

      const idsLegacy = existingByCodTienda
        .filter((r) => !existingCurrent || r.id !== existingCurrent.id)
        .map((r) => r.id);
      if (idsLegacy.length > 0) {
        await tx.prodPedMerc2.deleteMany({ where: { id: { in: idsLegacy } } });
        await tx.itemPedidoEnvio.deleteMany({
          where: { id: { in: idsLegacy } },
        });
      }

      const persisted = await tx.itemPedidoEnvio.findFirst({
        where: { sucursalId, tipoPedido: TIPO_REPOSICION, codTienda: codT },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      if (!persisted) {
        throw new Error("No se pudo persistir la regla de reposición.");
      }

      // `prod_ped_merc_2`: misma clave lógica que la fila canónica en `prod_ped_merc` (mismo `id`).
      await tx.prodPedMerc2.deleteMany({
        where: {
          sucursalId,
          tipoDePedido: TIPO_REPOSICION,
          reposicionCodTienda: codT,
        },
      });
      await tx.prodPedMerc2.create({
        data: {
          id: persisted.id,
          tipoDePedido: TIPO_REPOSICION,
          sucursalId,
          reposicionCodTienda: codT,
          reposicionFormaPedido: formaPedir,
          reposicionPuntoPedido: punto,
          reposicionCantConf: cant,
        },
      });
    });

    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al guardar la configuración.";
    return { ok: false, error: message };
  }
}

/** Persiste URGENTE en `prod_ped_merc` y en `prod_ped_merc_2` (solo `tipo_de_pedido`, `sucursal_id`, `urgente_cod_ext`, `urgente_cant_pedir`; `id` merc2 por defecto). */
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
        await tx.itemPedidoEnvio.deleteMany({
          where: {
            idProveedor: item.idProveedor,
            tipoPedido: TIPO_URGENTE,
            sucursalId,
            codExt: item.codExt,
          },
        });
        return;
      }

      const existing = await tx.itemPedidoEnvio.findFirst({
        where: {
          idProveedor: item.idProveedor,
          tipoPedido: TIPO_URGENTE,
          sucursalId,
          codExt: item.codExt,
        },
        select: { id: true },
      });

      const dataBase = {
        codProveedor: (item.codProdProveedor ?? "").trim(),
        codTienda: item.listaPrecioTienda?.codTienda?.trim() || COD_TIENDA_FALLBACK,
        descripcionProveedor: item.descripcionProveedor,
        descripcionTienda: item.listaPrecioTienda?.descripcionTienda?.trim() || null,
        cantPedir: cantNorm,
        urgenteCantPedir: cantNorm,
      };

      if (existing) {
        await tx.itemPedidoEnvio.update({
          where: { id: existing.id },
          data: dataBase,
        });
      } else {
        await tx.itemPedidoEnvio.create({
          data: {
            idProveedor: item.idProveedor,
            tipoPedido: TIPO_URGENTE,
            sucursalId,
            codExt: item.codExt,
            ...dataBase,
          },
        });
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
 * (id lista precio, cantidad). Carga datos desde prod_precios_provee + prod_precios_tienda
 * y escribe en prod_ped_merc.
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
    await tx.itemPedidoEnvio.deleteMany({
      where: { sucursalId, tipoPedido: TIPO_URGENTE },
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
          idProveedor: f.idProveedor,
          tipoPedido: TIPO_URGENTE,
          sucursalId,
          codExt: f.codExt,
          codProveedor: (f.codProdProveedor ?? "").trim(),
          codTienda: f.listaPrecioTienda?.codTienda?.trim() || COD_TIENDA_FALLBACK,
          descripcionProveedor: f.descripcionProveedor,
          descripcionTienda: f.listaPrecioTienda?.descripcionTienda?.trim() || null,
          urgenteCantPedir: cant,
          // Compatibilidad: el flujo de "Generar Pedido" hoy usa cant_pedir.
          cantPedir: cant,
        };
      })
      .filter(Boolean) as Array<{
      idProveedor: string;
      tipoPedido: string;
      sucursalId: string;
      codExt: string;
      codProveedor: string;
      codTienda: string;
      descripcionProveedor: string;
      descripcionTienda: string | null;
      urgenteCantPedir: number;
      cantPedir: number;
    }>;

    creados = toCreate.length;
    for (const row of toCreate) {
      await tx.itemPedidoEnvio.create({ data: row });
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

        const existing = await tx.itemPedidoEnvio.findFirst({
          where: {
            idProveedor: item.proveedorId.trim(),
            tipoPedido: TIPO_TINTOMETRICO,
            sucursalId,
            codExt,
          },
          select: { id: true },
        });

        const dataBase = {
          codExt,
          codProveedor: "",
          codTienda: codTiendaTrim,
          // Para ítems tintométricos no hay descripción de proveedor real;
          // reutilizamos la descripción visible para mantener consistencia.
          descripcionProveedor: item.descripcion,
          descripcionTienda: item.descripcion,
          tintometricoDescripcion: item.descripcion,
          tintometrioCantPedir: item.cantidad,
          cantPedir: item.cantidad,
        };

        if (existing) {
          await tx.itemPedidoEnvio.update({
            where: { id: existing.id },
            data: dataBase,
          });
        } else {
          await tx.itemPedidoEnvio.create({
            data: {
              idProveedor: item.proveedorId.trim(),
              tipoPedido: TIPO_TINTOMETRICO,
              sucursalId,
              ...dataBase,
            },
          });
        }

        // `prod_ped_merc_2`: `id` por defecto en BD. `urgente_cod_ext` solo como correlación con
        // `prod_ped_merc.cod_ext` (fila tintométrica); no aplica a tipo URGENTE.
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

  const claveTintMerc2 = (sucursalId: string, proveedorId: string, codExt: string) =>
    `${sucursalId}|${proveedorId.trim()}|${codExt.trim()}`;

  const keysMerc2 = new Set(
    merc2
      .filter((r) => (r.tintometricoProveedor ?? "").trim() && (r.urgenteCodExt ?? "").trim())
      .map((r) =>
        claveTintMerc2(r.sucursalId, r.tintometricoProveedor!, r.urgenteCodExt!)
      )
  );

  const legacy = await prisma.itemPedidoEnvio.findMany({
    where: {
      tipoPedido: TIPO_TINTOMETRICO,
      cantPedir: { gt: 0 },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      sucursalId: true,
      sucursal: { select: { codigo: true } },
      idProveedor: true,
      codExt: true,
      codTienda: true,
      tintometricoDescripcion: true,
      descripcionTienda: true,
      descripcionProveedor: true,
      tintometrioCantPedir: true,
      cantPedir: true,
    },
  });

  const desdeLegacy: ItemPedidoTintometricoPersistido[] = legacy
    .filter(
      (r) =>
        !keysMerc2.has(claveTintMerc2(r.sucursalId, r.idProveedor, r.codExt))
    )
    .map((r) => ({
      id: r.id,
      sucursalCodigo: r.sucursal.codigo as SucursalPedidoEnvio,
      proveedorId: r.idProveedor,
      codExt: r.codExt,
      codTienda: r.codTienda ?? "",
      cantidad: Number(r.tintometrioCantPedir ?? r.cantPedir ?? 0),
      descripcion:
        r.tintometricoDescripcion ??
        r.descripcionTienda ??
        r.descripcionProveedor ??
        "",
    }));

  return [...desdeMerc2, ...desdeLegacy];
}

export async function deletePedidoTintometricoItem(
  params:
    | { id: string }
    | {
        sucursalCodigo: SucursalPedidoEnvio;
        proveedorId: string;
        /** Valor persistido en `prod_ped_merc.cod_ext` (incluye base + código fórmula). */
        codExt: string;
      }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if ("id" in params) {
      const row = await prisma.prodPedMerc2.findFirst({
        where: { id: params.id.trim(), tipoDePedido: TIPO_TINTOMETRICO },
        select: {
          sucursalId: true,
          tintometricoProveedor: true,
          urgenteCodExt: true,
        },
      });
      await prisma.$transaction(async (tx) => {
        if (
          row?.tintometricoProveedor?.trim() &&
          (row.urgenteCodExt ?? "").trim()
        ) {
          await tx.itemPedidoEnvio.deleteMany({
            where: {
              sucursalId: row.sucursalId,
              idProveedor: row.tintometricoProveedor.trim(),
              tipoPedido: TIPO_TINTOMETRICO,
              codExt: row.urgenteCodExt!.trim(),
            },
          });
        }
        await tx.prodPedMerc2.deleteMany({
          where: { id: params.id.trim(), tipoDePedido: TIPO_TINTOMETRICO },
        });
      });
      return { ok: true };
    }
    const codExt = params.codExt.trim();
    const sucursalId = await getSucursalIdByCodigo(params.sucursalCodigo);
    const aBorrar = await prisma.itemPedidoEnvio.findMany({
      where: {
        sucursalId,
        idProveedor: params.proveedorId.trim(),
        tipoPedido: TIPO_TINTOMETRICO,
        codExt,
      },
      select: { id: true },
    });
    const ids = aBorrar.map((r) => r.id).filter(Boolean);
    if (ids.length > 0) {
      await prisma.$transaction([
        prisma.prodPedMerc2.deleteMany({
          where: {
            tipoDePedido: TIPO_TINTOMETRICO,
            sucursalId,
            tintometricoProveedor: params.proveedorId.trim(),
            urgenteCodExt: codExt,
          },
        }),
        prisma.itemPedidoEnvio.deleteMany({
          where: { id: { in: ids }, tipoPedido: TIPO_TINTOMETRICO },
        }),
      ]);
    }
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

type LpRowPick = {
  idProveedor: string;
  descripcionProveedor: string;
  idListaPrecioTienda: string | null;
  proveedor: { prefijo: string | null; nombre: string | null };
};

function pickListaPrecioProveedorPorCodExtYTienda(
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
 * Fuente: `prod_ped_merc_2` (`ProdPedMerc2`). Sin filtros en URL: todos los tipos y sucursales;
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
      reposicionCodTienda: true,
      sucursal: { select: { codigo: true, nombre: true } },
    },
  });

  const codTiendasRepos = new Set<string>();
  const codExts = new Set<string>();
  const idsTintometricoProveedor = new Set<string>();

  for (const r of rows) {
    if (r.tipoDePedido === TIPO_REPOSICION && r.reposicionCodTienda?.trim()) {
      codTiendasRepos.add(r.reposicionCodTienda.trim());
    }
    if (r.tipoDePedido === TIPO_URGENTE && r.urgenteCodExt?.trim()) {
      codExts.add(r.urgenteCodExt.trim());
    }
    if (r.tipoDePedido === TIPO_TINTOMETRICO && r.tintometricoProveedor?.trim()) {
      idsTintometricoProveedor.add(r.tintometricoProveedor.trim());
    }
  }

  const tiendas =
    codTiendasRepos.size > 0
      ? await prisma.listaPrecioTienda.findMany({
          where: { codTienda: { in: Array.from(codTiendasRepos) } },
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
            descripcionProveedor: true,
            idListaPrecioTienda: true,
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
    arr.push(row);
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
      cantPedir = cantPedirReposicionMerc2({
        forma: r.reposicionFormaPedido,
        punto: r.reposicionPuntoPedido,
        cantConf: r.reposicionCantConf,
        stock,
        stockeable: tienda.stockeable,
      });
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
      idProveedorResuelto = p.id;
      proveedorEtiqueta = proveedorEtiquetaDesdeRow(p);
      descripcion = (r.tintometricoDescripcion ?? "").trim();
      cantPedir = Math.max(0, Math.floor(Number(r.tintometrioCantPedir) || 0));
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
 * Fila cruda de `prod_ped_merc` para generar PDF y validar sobrestock (misma query, sin desalineación).
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
 * Obtiene ítems de pedidos_envio para el proveedor, sucursal y tipos dados,
 * y los datos del proveedor (para PDF y WhatsApp).
 * Incluye `rows` para reutilizar en `getSobreStockOtraSucursalParaPedidoEnviar` (mismas filas que el PDF).
 */
export async function getItemsYProveedorParaEnviar(
  proveedorId: string,
  sucursal: string,
  tipos: string[],
  q?: string
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
    select: { id: true },
  });
  if (!sucursalRow) return { rows: [], items: [], proveedor: null };

  const qNorm = q?.trim() ? q.trim() : "";

  const [rawRows, proveedor] = await Promise.all([
    prisma.itemPedidoEnvio.findMany({
      where: {
        sucursalId: sucursalRow.id,
        tipoPedido: { in: tipos },
        cantPedir: { gt: 0 },
        ...(qNorm
          ? {
              OR: [
                { descripcionTienda: { contains: qNorm, mode: "insensitive" } },
                { descripcionProveedor: { contains: qNorm, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ codExt: "asc" }],
      select: {
        id: true,
        idProveedor: true,
        tipoPedido: true,
        codExt: true,
        codProveedor: true,
        tintometricoDescripcion: true,
        descripcionProveedor: true,
        descripcionTienda: true,
        cantPedir: true,
        codTienda: true,
        reposicionCantConf: true,
      },
    }),
    prisma.proveedor.findUnique({
      where: { id: pid },
      select: { id: true, nombre: true, prefijo: true, whatsapp: true },
    }),
  ]);

  const reposicionRows = rawRows.filter((r) => r.tipoPedido === TIPO_REPOSICION);
  const codTiendasReposicion = Array.from(
    new Set(
      reposicionRows
        .map((r) => (r.codTienda ?? "").trim())
        .filter((v) => v.length > 0)
    )
  );

  const reposicionResolucionByCodTienda = new Map<
    string,
    {
      idProveedor: string;
      codExt: string;
      codProveedor: string;
      descripcionProveedor: string;
      descripcionTienda: string | null;
    }
  >();

  if (codTiendasReposicion.length > 0) {
    const tiendas = await prisma.listaPrecioTienda.findMany({
      where: { codTienda: { in: codTiendasReposicion } },
      select: {
        codTienda: true,
        codExt: true,
        proveedor: true,
        descripcionTienda: true,
      },
    });
    const tiendaByCodTienda = new Map<string, (typeof tiendas)[number]>();
    const codExts = new Set<string>();
    for (const t of tiendas) {
      const codTienda = (t.codTienda ?? "").trim();
      const codExt = (t.codExt ?? "").trim();
      if (!codTienda || !codExt) continue;
      if (!tiendaByCodTienda.has(codTienda)) tiendaByCodTienda.set(codTienda, t);
      codExts.add(codExt);
    }

    const proveedorRows =
      codExts.size > 0
        ? await prisma.listaPrecioProveedor.findMany({
            where: { codExt: { in: Array.from(codExts) } },
            select: {
              codExt: true,
              idProveedor: true,
              codProdProveedor: true,
              descripcionProveedor: true,
              proveedor: { select: { prefijo: true, nombre: true } },
            },
            orderBy: [{ codExt: "asc" }, { idProveedor: "asc" }],
          })
        : [];
    const proveedorRowsByCodExt = new Map<string, typeof proveedorRows>();
    for (const row of proveedorRows) {
      const codExt = (row.codExt ?? "").trim();
      if (!codExt) continue;
      const list = proveedorRowsByCodExt.get(codExt) ?? [];
      list.push(row);
      proveedorRowsByCodExt.set(codExt, list);
    }

    for (const codTienda of codTiendasReposicion) {
      const tienda = tiendaByCodTienda.get(codTienda);
      if (!tienda) continue;
      const proveedorTiendaNorm = (tienda.proveedor ?? "").trim().toUpperCase();
      const codExt = (tienda.codExt ?? "").trim();
      const candidates = proveedorRowsByCodExt.get(codExt) ?? [];
      if (candidates.length === 0) continue;
      const selected =
        candidates.find((r) => {
          const pref = (r.proveedor.prefijo ?? "").trim().toUpperCase();
          const nom = (r.proveedor.nombre ?? "").trim().toUpperCase();
          return (
            proveedorTiendaNorm.length > 0 &&
            (pref === proveedorTiendaNorm || nom === proveedorTiendaNorm)
          );
        }) ?? candidates[0]!;
      reposicionResolucionByCodTienda.set(codTienda, {
        idProveedor: selected.idProveedor.trim(),
        codExt,
        codProveedor: (selected.codProdProveedor ?? "").trim(),
        descripcionProveedor: (selected.descripcionProveedor ?? "").trim(),
        descripcionTienda: tienda.descripcionTienda?.trim() || null,
      });
    }
  }

  const rows: ItemPedidoEnvioRowParaEnviar[] = rawRows
    .flatMap((i) => {
      if (i.tipoPedido === TIPO_REPOSICION) {
        const codTienda = (i.codTienda ?? "").trim();
        if (!codTienda) return [];
        const resolved = reposicionResolucionByCodTienda.get(codTienda);
        if (!resolved || resolved.idProveedor !== pid) return [];
        return [
          {
            id: i.id,
            tipoPedido: i.tipoPedido,
            codExt: resolved.codExt,
            codProveedor: resolved.codProveedor,
            tintometricoDescripcion: i.tintometricoDescripcion,
            descripcionProveedor: resolved.descripcionProveedor || i.descripcionProveedor,
            descripcionTienda: resolved.descripcionTienda ?? i.descripcionTienda,
            cantPedir: i.cantPedir,
            codTienda,
            reposicionCantConf: i.reposicionCantConf,
          },
        ];
      }
      if (i.idProveedor !== pid) return [];
      return [
        {
          id: i.id,
          tipoPedido: i.tipoPedido,
          codExt: (i.codExt ?? "").trim(),
          codProveedor: i.codProveedor,
          tintometricoDescripcion: i.tintometricoDescripcion,
          descripcionProveedor: i.descripcionProveedor,
          descripcionTienda: i.descripcionTienda,
          cantPedir: i.cantPedir,
          codTienda: i.codTienda?.trim() ?? null,
          reposicionCantConf: i.reposicionCantConf,
        },
      ];
    })
    .sort((a, b) => a.codExt.localeCompare(b.codExt));

  const itemsPdf: ItemPedidoParaPdf[] = rows.map((i) => ({
    codExt: i.codExt,
    codProveedor: (i.codProveedor ?? "").trim(),
    descripcion:
      (i.descripcionProveedor ?? "").trim() ||
      (i.tintometricoDescripcion ?? "").trim() ||
      (i.descripcionTienda ?? "").trim(),
    cantPedir: i.cantPedir,
  }));

  const prov: ProveedorParaEnvio | null = proveedor
    ? {
        id: proveedor.id,
        nombre: proveedor.nombre,
        prefijo: proveedor.prefijo ?? "",
        whatsapp: proveedor.whatsapp ?? null,
      }
    : null;

  return { rows, items: itemsPdf, proveedor: prov };
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
    const sucursalId = await getSucursalIdByCodigo(params.sucursalCodigo);
    const ids = ajustes.map((a) => a.idItemPedidoEnvio);
    const cantById = new Map(ajustes.map((a) => [a.idItemPedidoEnvio, a.cantPedir]));

    const rows = await prisma.itemPedidoEnvio.findMany({
      where: {
        id: { in: ids },
        idProveedor: proveedorId,
        sucursalId,
        tipoPedido: { in: tipos },
      },
      select: { id: true, tipoPedido: true },
    });

    if (rows.length !== ids.length) {
      return {
        success: false,
        error:
          "No se pudieron validar todos los ítems de sobrestock para aplicar ajustes.",
      };
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const cant = cantById.get(row.id);
        if (cant == null) continue;

        await tx.itemPedidoEnvio.update({
          where: { id: row.id },
          data: {
            cantPedir: cant,
            ...(row.tipoPedido === TIPO_URGENTE ? { urgenteCantPedir: cant } : {}),
            ...(row.tipoPedido === TIPO_TINTOMETRICO
              ? { tintometrioCantPedir: cant }
              : {}),
            ...(row.tipoPedido === TIPO_REPOSICION
              ? { reposicionCantPedir: cant }
              : {}),
          },
        });
      }
    });

    return { success: true, data: { actualizados: rows.length } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al ajustar cantidades del pedido.";
    return { success: false, error: msg };
  }
}
