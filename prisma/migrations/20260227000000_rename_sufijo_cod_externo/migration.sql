-- Rename columns: proveedores.sufijo -> prefijo, lista_precios_tienda.cod_externo -> cod_ext
-- Idempotente: solo renombra si la columna origen existe (evita error si ya está prefijo/cod_ext).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proveedores' AND column_name = 'sufijo') THEN
    ALTER TABLE "proveedores" RENAME COLUMN "sufijo" TO "prefijo";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_tienda' AND column_name = 'cod_externo') THEN
    ALTER TABLE "lista_precios_tienda" RENAME COLUMN "cod_externo" TO "cod_ext";
  END IF;
END $$;
