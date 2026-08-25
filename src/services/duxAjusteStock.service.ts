import { DUX_API_BATCH_INTERVAL_MS } from "@/lib/duxApiBatchPolicy";
import {
  getIdDepositoGuaymallen,
  getIdDepositoMaipu,
} from "@/lib/duxApi";
import {
  armarBodyGuardarItemV2,
  getStockDepositoItemV1,
  putAjusteStockItemV2,
  type DuxStockDepositoLeido,
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

export type PruebaPutAjusteStockDuxDetalle = {
  httpStatus: number;
  ok: boolean;
  respuesta: string;
  enviado: { idDeposito: number; ctdDisponible: number };
  leido: DuxStockDepositoLeido | null;
  impacto: boolean;
};

function cantidadesCoinciden(enviada: number, leida: number | null): boolean {
  if (leida == null || !Number.isFinite(leida)) return false;
  return Math.abs(enviada - leida) < 0.0001;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * PUT DUX v2 desde tablas locales + GET v1 del mismo depósito para verificar impacto.
 */
export async function enviarPruebaPutAjusteStockDux(input: {
  sucursal: "guaymallen" | "maipu";
  usuario: number;
  codTienda: string;
  stock: number;
}): Promise<PruebaPutAjusteStockDuxDetalle> {
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
  const body = armarBodyGuardarItemV2({
    codItem: prod.codTienda,
    item,
    costoCompra,
    idPersonal: personal.idPersonal,
    idDeposito,
    stock: input.stock,
  });

  console.info("[duxAjusteStock] PUT", {
    codItem: body.cod_item,
    idPersonal: body.id_personal,
    nombrePersonal: personal.nombrePersonal,
    sucursal: input.sucursal,
    idDeposito,
    stock: body.stock,
  });

  const put = await putAjusteStockItemV2(body);
  const enviado = { idDeposito, ctdDisponible: input.stock };
  if (!put.ok) {
    return {
      httpStatus: put.httpStatus,
      ok: false,
      respuesta: put.respuesta,
      enviado,
      leido: null,
      impacto: false,
    };
  }

  await sleep(DUX_API_BATCH_INTERVAL_MS);
  const leido = await getStockDepositoItemV1(prod.codTienda, idDeposito);
  const impacto =
    leido != null &&
    (cantidadesCoinciden(input.stock, leido.ctdDisponible) ||
      cantidadesCoinciden(input.stock, leido.stockReal));

  console.info("[duxAjusteStock] GET verificación", {
    codItem: prod.codTienda,
    enviado,
    leido,
    impacto,
  });

  return {
    httpStatus: put.httpStatus,
    ok: true,
    respuesta: put.respuesta,
    enviado,
    leido,
    impacto,
  };
}
