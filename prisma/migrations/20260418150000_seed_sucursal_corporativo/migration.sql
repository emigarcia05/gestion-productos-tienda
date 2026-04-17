-- Alta de la sucursal "CORPORATIVO" para gastos sin sucursal física.
-- id fijo para poder referenciarla desde scripts/tests sin query adicional.
-- pedido = false → queda fuera de selectores de pedidos (filtran por pedido = true y codigo IN ('guaymallen','maipu')).
-- id_dux = NULL → no interfiere con syncs DUX (duxCompras, comprobantesProveedorDuxSync filtran por idDux numérico).
-- ON CONFLICT (codigo) DO NOTHING → idempotente; reaplicable sin error.

INSERT INTO "sucursales" (
  "id", "codigo", "nombre",
  "deposito", "whatsapp", "pedido", "id_dux",
  "created_at", "updated_at"
) VALUES (
  'suc_corporativo', 'corporativo', 'CORPORATIVO',
  NULL, NULL, FALSE, NULL,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("codigo") DO NOTHING;
