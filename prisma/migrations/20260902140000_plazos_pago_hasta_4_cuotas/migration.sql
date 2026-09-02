-- Plan de pago: hasta 4 plazos en días (1 obligatorio a nivel de lógica app).
-- Migración desde `plazos_pagos` (CSV) y `plazo_pago_dias` (override simple).

ALTER TABLE "global_proveedores"
  ADD COLUMN IF NOT EXISTS "plazo_pago_1_dias" INTEGER,
  ADD COLUMN IF NOT EXISTS "plazo_pago_2_dias" INTEGER,
  ADD COLUMN IF NOT EXISTS "plazo_pago_3_dias" INTEGER,
  ADD COLUMN IF NOT EXISTS "plazo_pago_4_dias" INTEGER;

UPDATE "global_proveedores" p
SET
  "plazo_pago_1_dias" = CASE
    WHEN trim(split_part(COALESCE(p."plazos_pagos", ''), ',', 1)) ~ '^[0-9]+$'
    THEN trim(split_part(p."plazos_pagos", ',', 1))::int
    ELSE NULL
  END,
  "plazo_pago_2_dias" = CASE
    WHEN trim(split_part(COALESCE(p."plazos_pagos", ''), ',', 2)) ~ '^[0-9]+$'
    THEN trim(split_part(p."plazos_pagos", ',', 2))::int
    ELSE NULL
  END,
  "plazo_pago_3_dias" = CASE
    WHEN trim(split_part(COALESCE(p."plazos_pagos", ''), ',', 3)) ~ '^[0-9]+$'
    THEN trim(split_part(p."plazos_pagos", ',', 3))::int
    ELSE NULL
  END,
  "plazo_pago_4_dias" = CASE
    WHEN trim(split_part(COALESCE(p."plazos_pagos", ''), ',', 4)) ~ '^[0-9]+$'
    THEN trim(split_part(p."plazos_pagos", ',', 4))::int
    ELSE NULL
  END
WHERE p."plazos_pagos" IS NOT NULL AND trim(p."plazos_pagos") <> '';

ALTER TABLE "fin_compras_comprobante"
  ADD COLUMN IF NOT EXISTS "plazo_pago_1_dias" INTEGER,
  ADD COLUMN IF NOT EXISTS "plazo_pago_2_dias" INTEGER,
  ADD COLUMN IF NOT EXISTS "plazo_pago_3_dias" INTEGER,
  ADD COLUMN IF NOT EXISTS "plazo_pago_4_dias" INTEGER;

UPDATE "fin_compras_comprobante" c
SET
  "plazo_pago_1_dias" = c."plazo_pago_dias",
  "plazo_pago_2_dias" = NULL,
  "plazo_pago_3_dias" = NULL,
  "plazo_pago_4_dias" = NULL
WHERE c."plazo_pago_dias" IS NOT NULL;

ALTER TABLE "fin_compras_comprobante" DROP COLUMN IF EXISTS "plazo_pago_dias";
ALTER TABLE "global_proveedores" DROP COLUMN IF EXISTS "plazos_pagos";
