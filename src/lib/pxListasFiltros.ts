/** Query `ordenMarcacion`: ordenar filas por la columna MARCACION calculada. */
export const ORDEN_MARCACION_DESC = "marcacion-desc" as const;
export const ORDEN_MARCACION_ASC = "marcacion-asc" as const;

export type OrdenMarcacionPxListas =
  | typeof ORDEN_MARCACION_DESC
  | typeof ORDEN_MARCACION_ASC
  | "";

export const OPCIONES_ORDEN_MARCACION_PX_LISTAS = [
  { value: ORDEN_MARCACION_DESC, label: "ORDENAR DE MAYOR A MENOR" },
  { value: ORDEN_MARCACION_ASC, label: "ORDENAR DE MENOR A MAYOR" },
] as const;

export function esOrdenMarcacionPxListas(
  value: string | undefined
): value is typeof ORDEN_MARCACION_DESC | typeof ORDEN_MARCACION_ASC {
  return value === ORDEN_MARCACION_DESC || value === ORDEN_MARCACION_ASC;
}
