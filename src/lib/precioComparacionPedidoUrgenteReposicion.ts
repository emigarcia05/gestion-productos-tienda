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
 * Precio comparable para ranking de proveedores en **Pedido Urgente** (filtros Urgente / Cualquier y Reposición):
 * mismo criterio que la sugerencia «menor costo» en pantalla.
 *
 * Regla:
 * - Suma acumulada de IVA SALDO (abr. 2026 → mes actual AR, ver `sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido`) **> 0**:
 *   comparar precio final con IVA: `SIEMPRE` × 1,21; `NUNCA` y `PREGUNTA` × 1.
 * - Suma **≤ 0**: comparar precio sin IVA (compra final calculada / columna).
 *
 * No sustituye el costo efectivo sin IVA mostrado al usuario (`sugerenciaProveedorMenorCosto.costo`).
 */
export function pxComparablePedidoUrgenteReposicion(
  pxSinIva: number,
  ivaProveedor: IvaProveedor,
  sumaIvaSaldoAcumulado: number
): number {
  if (!Number.isFinite(pxSinIva)) return Number.NaN;
  if (sumaIvaSaldoAcumulado > 0) {
    const factor = ivaProveedor === IvaProveedor.SIEMPRE ? 1.21 : 1;
    return pxSinIva * factor;
  }
  return pxSinIva;
}
