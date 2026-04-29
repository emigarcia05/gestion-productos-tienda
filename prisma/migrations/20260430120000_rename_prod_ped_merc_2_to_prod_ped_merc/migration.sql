-- Tabla canónica de ítems de pedido de mercadería: `prod_ped_merc_2` → `prod_ped_merc`.
-- El `DROP` del legado está en `20260430103000_drop_prod_ped_merc_legacy`.

DO $$
BEGIN
  IF to_regclass('public.prod_ped_merc_2') IS NULL THEN
    RETURN;
  END IF;
  IF to_regclass('public.prod_ped_merc') IS NOT NULL THEN
    RAISE EXCEPTION 'rename_prod_ped_merc_2: public.prod_ped_merc ya existe';
  END IF;

  ALTER TABLE "prod_ped_merc_2" RENAME TO "prod_ped_merc";

  ALTER TABLE "prod_ped_merc" RENAME CONSTRAINT "prod_ped_merc_2_pkey" TO "prod_ped_merc_pkey";
  ALTER TABLE "prod_ped_merc" RENAME CONSTRAINT "prod_ped_merc_2_sucursal_id_fkey" TO "prod_ped_merc_sucursal_id_fkey";
  ALTER TABLE "prod_ped_merc" RENAME CONSTRAINT "prod_ped_merc_2_tipo_de_pedido_check" TO "prod_ped_merc_tipo_de_pedido_check";

  ALTER INDEX "prod_ped_merc_2_sucursal_tipo_idx" RENAME TO "prod_ped_merc_sucursal_tipo_idx";
  ALTER INDEX "prod_ped_merc_2_reposicion_cod_tienda_idx" RENAME TO "prod_ped_merc_reposicion_cod_tienda_idx";
END $$;
