import { IvaProveedor } from "@prisma/client";

/**
 * Precio final con IVA a partir del costo lista sin IVA y la política `Proveedor.iva`.
 * `SIEMPRE` → ×1,21; `NUNCA` y `PREGUNTA` → ×1 (PREGUNTA se trata como NUNCA en ranking).
 *
 * En **Pedido Urgente** (`urgente` / `cualquier`), las filas que comparten vínculo **`cod_tienda`** (`codTiendaVinculo`) se comparan con esta base (p. ej. REX-20 vs Mer-50 sobre el mismo código tienda). */
export function pxFinalCompraConIvaProveedor(pxSinIva: number, ivaProveedor: IvaProveedor): number {
  if (!Number.isFinite(pxSinIva)) return Number.NaN;
  const factor = ivaProveedor === IvaProveedor.SIEMPRE ? 1.21 : 1;
  return pxSinIva * factor;
}

/**
 * Precio usado solo para ordenar/filtrar alternativas de proveedor en el filtro **Reposición** de la pantalla Pedido Urgente (`getListaPreciosParaPedidoUrgente`, rama `reposicion`).
 * No sustituye el costo efectivo sin IVA mostrado al usuario (`sugerenciaProveedorMenorCosto.costo`). *
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
