-- Unicidad por ítem de pedidos_mercaderia:
-- (id_proveedor, tipo_de_pedido, sucursal, cod_ext)
CREATE UNIQUE INDEX IF NOT EXISTS "pedidos_mercaderia_item_unique"
  ON "pedidos_mercaderia"("id_proveedor", "tipo_de_pedido", "sucursal", "cod_ext");

