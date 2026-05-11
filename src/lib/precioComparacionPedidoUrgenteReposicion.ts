import { IvaProveedor } from "@prisma/client";

/**
 * Precio final con IVA a partir del costo lista sin IVA y la política `Proveedor.iva`.
 * `SIEMPRE` → ×1,21; `NUNCA` y `PREGUNTA` → ×1 (PREGUNTA se trata como NUNCA).
 * Para **ranking** entre proveedores en Pedido Urgente usá `pxComparablePedidoUrgenteReposicion` (incorpora balance IVA).
 */
export function pxFinalCompraConIvaProveedor(pxSinIva: number, ivaProveedor: IvaProveedor): number {
  if (!Number.isFinite(pxSinIva)) return Number.NaN;
  const factor = ivaProveedor === IvaProveedor.SIEMPRE ? 1.21 : 1;
  return pxSinIva * factor;
}

/**
 * Precio comparable para ranking de proveedores en **Pedido Urgente** (Urgente / Cualquier y Reposición):
 * mismo criterio que la sugerencia «proveedor recomendado» y el menor precio en pantalla.
 *
 * Regla (según suma acumulada **IVA SALDO** en Posición IVA, ver `sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido`):
 * - **IVA SALDO ≥ 0**: «menor precio» = **`px_compra_final_sin_iva`** (comparar sin aplicar factor IVA del proveedor).
 * - **IVA SALDO < 0**: «menor precio» = **precio final con IVA** (`pxFinalCompraConIvaProveedor`: `SIEMPRE` × 1,21; `NUNCA` / `PREGUNTA` × 1).
 *
 * No sustituye el costo efectivo sin IVA mostrado al usuario (`sugerenciaProveedorMenorCosto.costo`).
 */
export function pxComparablePedidoUrgenteReposicion(
  pxSinIva: number,
  ivaProveedor: IvaProveedor,
  sumaIvaSaldoAcumulado: number
): number {
  if (!Number.isFinite(pxSinIva)) return Number.NaN;
  if (sumaIvaSaldoAcumulado < 0) {
    return pxFinalCompraConIvaProveedor(pxSinIva, ivaProveedor);
  }
  return pxSinIva;
}
