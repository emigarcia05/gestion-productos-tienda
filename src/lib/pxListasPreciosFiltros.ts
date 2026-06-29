/** Query `actualizar`: margen manual guardado vs margen derivado de precio DUX. */
export const FILTRO_ACTUALIZAR_SI = "si" as const;
export const FILTRO_ACTUALIZAR_NO = "no" as const;

export type FiltroActualizarPxListas =
  | typeof FILTRO_ACTUALIZAR_SI
  | typeof FILTRO_ACTUALIZAR_NO;

const FILTROS_ACTUALIZAR = new Set<string>([
  FILTRO_ACTUALIZAR_SI,
  FILTRO_ACTUALIZAR_NO,
]);

export function esFiltroActualizarPxListas(
  value: string
): value is FiltroActualizarPxListas {
  return FILTROS_ACTUALIZAR.has(value);
}

export function requierePostProcesoActualizarPxListas(params: {
  actualizar: FiltroActualizarPxListas | "";
}): boolean {
  return Boolean(params.actualizar);
}
