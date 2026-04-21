-- Neon SQL Editor — columna plazos_pagos en global_proveedores
-- Ejecutar una vez si la migración Prisma no se aplicó aún.

ALTER TABLE "global_proveedores" ADD COLUMN "plazos_pagos" TEXT;
