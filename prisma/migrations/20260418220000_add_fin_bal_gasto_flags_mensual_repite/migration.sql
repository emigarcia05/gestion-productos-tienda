-- Agrega dos flags booleanos al catálogo `fin_bal_gasto`:
--
--   * `gasto_mensual`  → el gasto es de frecuencia mensual (recurrente).
--   * `repite_monto`   → el gasto mantiene el mismo monto entre períodos
--                        (ej. alquiler, cuota fija); habilita precarga del último
--                        monto al registrar el movimiento.
--
-- Diseño:
--   * BOOLEAN NOT NULL con DEFAULT FALSE.
--   * Los registros preexistentes quedan en FALSE (opt-in explícito): el usuario
--     levanta el flag desde el modal de edición cuando corresponda. No hay backfill
--     automático posible porque el dato no existía antes.
--   * Sin índices: cardinalidad baja (2 valores), el catálogo completo se lee
--     siempre vía jerarquía rubro→gasto, y no se usan como predicado masivo.

ALTER TABLE "fin_bal_gasto"
    ADD COLUMN "gasto_mensual" BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN "repite_monto"  BOOLEAN NOT NULL DEFAULT FALSE;
