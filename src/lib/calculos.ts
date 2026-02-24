/**
 * Precio de compra final = precioLista
 *   × (1 - descuentoProducto / 100)
 *   × (1 - descuentoCantidad / 100)
 *   × (1 + cxTransporte / 100)
 */
export function calcPxCompraFinal(
  precioLista:       number,
  descuentoProducto: number,
  descuentoCantidad: number,
  cxTransporte:      number
): number {
  return (
    precioLista *
    (1 - descuentoProducto / 100) *
    (1 - descuentoCantidad / 100) *
    (1 + cxTransporte / 100)
  );
}
