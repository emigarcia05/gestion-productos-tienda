import { IvaProveedor } from "@prisma/client";

/**
 * Precio usado solo para ordenar/filtrar alternativas de proveedor en Pedido Urgente y Reposición.
 * No sustituye el costo efectivo sin IVA mostrado al usuario (`sugerenciaProveedorMenorCosto.costo`).
 *
 * Regla:
 * - Suma acumulada de IVA SALDO (abr. 2026 → mes actual AR, ver servicio dedicado) **> 0**:
 *   comparar precio final con IVA: `SIEMPRE` × 1,21; `NUNCA` y `PREGUNTA` × 1.
 * - Suma **≤ 0**: comparar precio sin IVA (compra final calculada / columna).
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
