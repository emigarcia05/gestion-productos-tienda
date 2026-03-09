/**
 * Precio de compra final: todos los dto y cx_transporte son porcentajes.
 * Fórmula: precioLista × (1 - dto/100) por cada descuento × (1 + cxTransporte/100).
 * Parámetros opcionales (dtoProveedor, dtoMarca, dtoFinanciero) default 0 para compatibilidad.
 */
export function calcPxCompraFinal(
  precioLista:        number,
  dtoRubro:           number,
  dtoCantidad:        number,
  cxTransporte:       number,
  dtoProveedor:       number = 0,
  dtoMarca:           number = 0,
  dtoFinanciero:      number = 0
): number {
  return (
    precioLista *
    (1 - dtoProveedor / 100) *
    (1 - dtoMarca / 100) *
    (1 - dtoRubro / 100) *
    (1 - dtoCantidad / 100) *
    (1 - dtoFinanciero / 100) *
    (1 + cxTransporte / 100)
  );
}
