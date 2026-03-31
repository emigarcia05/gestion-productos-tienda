-- Plazos de pago por proveedor (días hasta cada vencimiento, ej. 30,60 → 2 cuotas).

ALTER TABLE "proveedores" ADD COLUMN "plazos_pagos" TEXT;
