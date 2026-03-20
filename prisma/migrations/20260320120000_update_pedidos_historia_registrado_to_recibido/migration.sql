-- Migración: convertir valores existentes de estado "REGISTRADO" a "RECIBIDO"
-- para alinear el dominio con la nueva nomenclatura.

UPDATE "pedidos_historia"
SET "estado" = 'RECIBIDO'
WHERE "estado" = 'REGISTRADO';

