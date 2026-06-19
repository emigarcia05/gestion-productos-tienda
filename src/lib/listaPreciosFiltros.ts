/** Valor interno del filtro «sin MARCA / RUBRO» (UI muestra «-»). */
export const LISTA_PRECIOS_FILTRO_SIN_VALOR = "__sin_valor__";

export const LISTA_PRECIOS_FILTRO_SIN_VALOR_LABEL = "-";

export function esFiltroListaPreciosSinValor(
  value: string | null | undefined
): value is typeof LISTA_PRECIOS_FILTRO_SIN_VALOR {
  return value === LISTA_PRECIOS_FILTRO_SIN_VALOR;
}
