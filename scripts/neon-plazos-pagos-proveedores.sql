-- Neon SQL Editor — columna plazos_pagos en proveedores
-- Ejecutar una vez si la migración Prisma no se aplicó aún.

ALTER TABLE "proveedores" ADD COLUMN "plazos_pagos" TEXT;
