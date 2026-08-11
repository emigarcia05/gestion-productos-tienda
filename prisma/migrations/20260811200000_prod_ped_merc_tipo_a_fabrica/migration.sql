-- Ampliar CHECK de tipo_de_pedido para incluir pedidos a fábrica.
ALTER TABLE "prod_ped_merc" DROP CONSTRAINT IF EXISTS "prod_ped_merc_tipo_de_pedido_check";
ALTER TABLE "prod_ped_merc" ADD CONSTRAINT "prod_ped_merc_tipo_de_pedido_check"
  CHECK ("tipo_de_pedido" IN ('REPOSICION', 'URGENTE', 'TINTOMETRICO', 'A FÁBRICA'));
