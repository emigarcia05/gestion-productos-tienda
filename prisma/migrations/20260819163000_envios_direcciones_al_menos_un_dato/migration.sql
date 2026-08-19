-- Dirección: departamento opcional; al persistir hace falta al menos un dato.
ALTER TABLE "envios_direcciones" ALTER COLUMN "departamento" DROP NOT NULL;

ALTER TABLE "envios_direcciones"
ADD CONSTRAINT "envios_direcciones_al_menos_un_dato_chk"
CHECK (
  btrim("calle_nombre") <> ''
  OR btrim("numeracion") <> ''
  OR btrim("distrito") <> ''
  OR "departamento" IS NOT NULL
  OR ("url_maps" IS NOT NULL AND btrim("url_maps") <> '')
  OR ("referencia" IS NOT NULL AND btrim("referencia") <> '')
);
