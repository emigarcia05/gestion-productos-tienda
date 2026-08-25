import type { Prisma } from "@prisma/client";
import {
  getIdDepositoGuaymallen,
  getIdDepositoMaipu,
} from "@/lib/duxApi";
import {
  armarBodyGuardarItemV2,
  putAjusteStockItemV2,
  type DuxPutItemResult,
} from "@/lib/duxItemsV2Api";
import { prisma } from "@/lib/prisma";
import { obtenerIdDepositoPorCodigoSucursal } from "@/services/prodTiendaStock.service";

export async function idDepositoDuxPorSucursal(
  sucursal: "guaymallen" | "maipu"
): Promise<number> {
  const fromDb = await obtenerIdDepositoPorCodigoSucursal(sucursal);
  if (fromDb != null) return fromDb;
  return sucursal === "guaymallen"
    ? getIdDepositoGuaymallen()
    : getIdDepositoMaipu();
}

function cantidadDisponibleLocal(row: {
  ctdDisponible: Prisma.Decimal | null;
  stockReal: number;
}): number {
  if (row.ctdDisponible != null) {
    const n = Number(row.ctdDisponible);
    if (Number.isFinite(n)) return n;
  }
  return row.stockReal;
}

/**
 * PUT DUX v2 desde tablas locales: `id_personal` (slidenav), depósito de la sucursal,
 * `cod_item` + `ctd_disponible` del depósito = cantidad contada; el resto de depósitos
 * y ficha (`item`, `costo_compra`) salen de `prod_tienda` / `prod_tienda_stock`.
 */
export async function enviarPruebaPutAjusteStockDux(input: {
  sucursal: "guaymallen" | "maipu";
  usuario: number;
  codTienda: string;
  stock: number;
}): Promise<DuxPutItemResult> {
  const personal = await prisma.globalPersonal.findUnique({
    where: { idPersonal: input.usuario },
    select: { idPersonal: true, nombrePersonal: true },
  });
  if (!personal) {
    throw new Error(
      "El usuario del slidenav no está en el catálogo de personal (global_personal)."
    );
  }

  const prod = await prisma.prodTienda.findUnique({
    where: { codTienda: input.codTienda },
    select: {
      codTienda: true,
      descripcionTienda: true,
      costoCompra: true,
      stocks: {
        select: {
          idDeposito: true,
          stockReal: true,
          ctdDisponible: true,
        },
      },
    },
  });
  if (!prod) {
    throw new Error(`No hay ítem ${input.codTienda} en prod_tienda.`);
  }

  const item = prod.descripcionTienda?.trim() ?? "";
  if (!item) {
    throw new Error(
      `El ítem ${input.codTienda} no tiene descripción_tienda; no se puede armar el PUT.`
    );
  }

  const costoCompra = Number(prod.costoCompra);
  if (!Number.isFinite(costoCompra)) {
    throw new Error(`El ítem ${input.codTienda} tiene costo_compra inválido.`);
  }

  const idDeposito = await idDepositoDuxPorSucursal(input.sucursal);
  const stocksDepositos = prod.stocks.map((row) => ({
    idDeposito: row.idDeposito,
    ctdDisponible: cantidadDisponibleLocal(row),
  }));

  const body = armarBodyGuardarItemV2({
    codItem: prod.codTienda,
    item,
    costoCompra,
    idPersonal: personal.idPersonal,
    idDeposito,
    stock: input.stock,
    stocksDepositos,
  });

  console.info("[duxAjusteStock] PUT", {
    codItem: body.cod_item,
    idPersonal: body.id_personal,
    nombrePersonal: personal.nombrePersonal,
    sucursal: input.sucursal,
    idDeposito,
    stock: body.stock,
  });

  return putAjusteStockItemV2(body);
}
