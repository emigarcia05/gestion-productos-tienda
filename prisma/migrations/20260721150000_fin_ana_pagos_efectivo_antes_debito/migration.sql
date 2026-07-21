-- Margen Contribución: EFECTIVO a la izquierda de DÉBITO (mismo catálogo `orden`).
UPDATE "fin_ana_cos_fina_pagos" SET "orden" = 0 WHERE "codigo" = 'EFECTIVO';
UPDATE "fin_ana_cos_fina_pagos" SET "orden" = 1 WHERE "codigo" = 'DEBITO';
UPDATE "fin_ana_cos_fina_pagos" SET "orden" = 2 WHERE "codigo" = 'CUOTA_1';
UPDATE "fin_ana_cos_fina_pagos" SET "orden" = 3 WHERE "codigo" = 'CUOTA_3';
UPDATE "fin_ana_cos_fina_pagos" SET "orden" = 4 WHERE "codigo" = 'CUOTA_6';
UPDATE "fin_ana_cos_fina_pagos" SET "orden" = 5 WHERE "codigo" = 'CUOTA_9';
UPDATE "fin_ana_cos_fina_pagos" SET "orden" = 6 WHERE "codigo" = 'CUOTA_12';
UPDATE "fin_ana_cos_fina_pagos" SET "orden" = 7 WHERE "codigo" = 'CUOTA_18';
