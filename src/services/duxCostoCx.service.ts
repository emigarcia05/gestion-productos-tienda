import { DUX_API_BATCH_INTERVAL_MS } from "@/lib/duxApiBatchPolicy";
import {
  armarBodyGuardarItemV2CostoCx,
  getCostoItemV1,
  putItemV2,
} from "@/lib/duxItemsV2Api";
import { prisma } from "@/lib/prisma";
import {
  costosCompraDifieren,
  obtenerItemCostoCxDiff,
} from "@/services/exportCostoCxDiff.service";

export type PruebaPutCostoCxDuxDetalle = {
  httpStatus: number;
  ok: boolean;
  respuesta: string;
  enviado: { costoCompra: number };
  leido: { costo: number } | null;
  impacto: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * PUT DUX v2: `costo_compra` = CX PROD. (`px_compra_final_sin_iva`).
 * Sin `stock[]`. Tras el PUT, GET v1 para verificar el costo en DUX.
 */
export async function enviarPruebaPutCostoCxDux(input: {
  usuario: number;
  codTienda: string;
}): Promise<PruebaPutCostoCxDuxDetalle> {
  const personal = await prisma.globalPersonal.findUnique({
    where: { idPersonal: input.usuario },
    select: { idPersonal: true, nombrePersonal: true },
  });
  if (!personal) {
    throw new Error(
      "El usuario del slidenav no está en el catálogo de personal (global_personal)."
    );
  }

  const item = await obtenerItemCostoCxDiff(input.codTienda);
  if (!item) {
    throw new Error(
      `El ítem ${input.codTienda} no tiene diferencia de Cx. para enviar a DUX.`
    );
  }

  const descripcion = item.descripcion.trim();
  if (!descripcion) {
    throw new Error(
      `El ítem ${input.codTienda} no tiene descripción_tienda; no se puede armar el PUT.`
    );
  }

  const body = armarBodyGuardarItemV2CostoCx({
    codItem: item.codTienda,
    item: descripcion,
    costoCompra: item.costoNuevo,
    idPersonal: personal.idPersonal,
  });

  console.info("[duxCostoCx] PUT", {
    codItem: body.cod_item,
    idPersonal: body.id_personal,
    nombrePersonal: personal.nombrePersonal,
    costoViejo: item.costoViejo,
    costoNuevo: body.costo_compra,
  });

  const put = await putItemV2(body.cod_item, body);
  const enviado = { costoCompra: item.costoNuevo };
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
  const costoLeido = await getCostoItemV1(item.codTienda);
  const leido = costoLeido == null ? null : { costo: costoLeido };
  const impacto =
    leido != null && !costosCompraDifieren(item.costoNuevo, leido.costo);

  console.info("[duxCostoCx] GET verificación", {
    codItem: item.codTienda,
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
