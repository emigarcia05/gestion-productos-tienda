-- Una fila de ventas por sucursal y periodo (upsert desde balance mensual / balance · ventas).
DELETE FROM "fin_bal_vtas"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "sucursal_id", "mes", "anio"
        ORDER BY "updated_at" DESC, "id" DESC
      ) AS "rn"
    FROM "fin_bal_vtas"
  ) "d"
  WHERE "d"."rn" > 1
);

CREATE UNIQUE INDEX "fin_bal_vtas_sucursal_mes_anio_ux" ON "fin_bal_vtas" ("sucursal_id", "mes", "anio");
