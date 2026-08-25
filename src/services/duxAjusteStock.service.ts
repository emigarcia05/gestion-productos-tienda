import {
  getIdDepositoGuaymallen,
  getIdDepositoMaipu,
} from "@/lib/duxApi";
import {
  putAjusteStockItemV2,
  type DuxPutItemResult,
} from "@/lib/duxItemsV2Api";
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

export async function enviarPruebaPutAjusteStockDux(input: {
  sucursal: "guaymallen" | "maipu";
  usuario: number;
  codTienda: string;
  stock: number;
}): Promise<DuxPutItemResult> {
  return putAjusteStockItemV2({
    codItem: input.codTienda,
    stock: input.stock,
    idDeposito: await idDepositoDuxPorSucursal(input.sucursal),
    idPersonal: input.usuario,
  });
}
