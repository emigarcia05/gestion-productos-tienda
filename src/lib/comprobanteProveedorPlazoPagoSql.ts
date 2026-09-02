/**
 * Expresiones SQL para plazo y fecha de vencimiento de `fin_compras_comprobante`.
 * Alias esperados: `c` = comprobante, `p` = `global_proveedores`.
 *
 * Prioridad: `c.plazo_pago_dias` → primer valor de `p.plazos_pagos` → **30** días.
 */
export const SQL_PLAZO_PAGO_DIAS_COMPROBANTE = `
  COALESCE(
    c.plazo_pago_dias,
    CASE
      WHEN trim(split_part(COALESCE(p.plazos_pagos, ''), ',', 1)) ~ '^[0-9]+$'
      THEN trim(split_part(p.plazos_pagos, ',', 1))::int
      ELSE NULL
    END,
    30
  )
`;

export const SQL_FECHA_VENC_COMPROBANTE = `
  (
    c.fecha_comp::date
    + GREATEST(1, (${SQL_PLAZO_PAGO_DIAS_COMPROBANTE}))
  )::date
`;
