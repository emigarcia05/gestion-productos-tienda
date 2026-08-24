import {
  getIdDepositoGuaymallen,
  getIdDepositoMaipu,
} from "@/lib/duxApi";
import {
  putAjusteStockItemV2,
  type DuxPutItemResult,
} from "@/lib/duxItemsV2Api";

export function idDepositoDuxPorSucursal(
  sucursal: "guaymallen" | "maipu"
): number {
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
    cod_tienda: input.codTienda,
    stock: input.stock,
    deposito: idDepositoDuxPorSucursal(input.sucursal),
    usuario: input.usuario,
  });
}
