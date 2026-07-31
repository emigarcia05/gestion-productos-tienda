-- nombre_en: español en UI (nombre), inglés en prompt (nombre_en)

ALTER TABLE "prod_ia_diseno_sup_pintar" ADD COLUMN "nombre_en" TEXT;
ALTER TABLE "prod_ia_diseno_estilos" ADD COLUMN "nombre_en" TEXT;
ALTER TABLE "prod_ia_diseno_combinar" ADD COLUMN "nombre_en" TEXT;
ALTER TABLE "prod_ia_diseno_objetivo" ADD COLUMN "nombre_en" TEXT;
ALTER TABLE "prod_ia_diseno_luz_nat" ADD COLUMN "nombre_en" TEXT;
ALTER TABLE "prod_ia_diseno_luz_art" ADD COLUMN "nombre_en" TEXT;

UPDATE "prod_ia_diseno_sup_pintar" SET "nombre_en" = CASE "nombre"
  WHEN 'CIELO RASO' THEN 'CEILING'
  WHEN 'PARED CENTRO' THEN 'CENTER WALL'
  WHEN 'PARED DERECHA' THEN 'RIGHT WALL'
  WHEN 'PARED IZQUIERDA' THEN 'LEFT WALL'
  WHEN 'PISOS' THEN 'FLOORS'
  WHEN 'PUERTA' THEN 'DOOR'
  WHEN 'VENTANA' THEN 'WINDOW'
  ELSE "nombre"
END;

UPDATE "prod_ia_diseno_objetivo" SET "nombre_en" = CASE "nombre"
  WHEN 'AMPLIAR VISUALMENTE' THEN 'VISUALLY EXPAND'
  WHEN 'DAR LUMINOSIDAD' THEN 'ADD BRIGHTNESS'
  WHEN 'GENERAR CALIDEZ' THEN 'CREATE WARMTH'
  WHEN 'MAYOR ELEGANCIA' THEN 'GREATER ELEGANCE'
  WHEN 'MODERNIZAR' THEN 'MODERNIZE'
  ELSE "nombre"
END;

UPDATE "prod_ia_diseno_estilos" SET "nombre_en" = CASE "nombre"
  WHEN 'CLÁSICO' THEN 'CLASSIC'
  WHEN 'COLONIAL' THEN 'COLONIAL'
  WHEN 'CONTEMPORÁNEO' THEN 'CONTEMPORARY'
  WHEN 'INDUSTRIAL' THEN 'INDUSTRIAL'
  WHEN 'MEDITERRÁNEO' THEN 'MEDITERRANEAN'
  WHEN 'MINIMALISTA' THEN 'MINIMALIST'
  WHEN 'MODERNO' THEN 'MODERN'
  WHEN 'NÓRDICO' THEN 'NORDIC'
  WHEN 'RÚSTICO' THEN 'RUSTIC'
  ELSE "nombre"
END;

UPDATE "prod_ia_diseno_combinar" SET "nombre_en" = CASE "nombre"
  WHEN 'CORTINAS' THEN 'CURTAINS'
  WHEN 'SILLON' THEN 'ARMCHAIR'
  ELSE "nombre"
END;

UPDATE "prod_ia_diseno_luz_nat" SET "nombre_en" = CASE "nombre"
  WHEN 'INTERIOR - NULA' THEN 'INTERIOR - NONE'
  WHEN 'INTERIOR - LEVE' THEN 'INTERIOR - LOW'
  WHEN 'INTERIOR - BUENA' THEN 'INTERIOR - GOOD'
  WHEN 'INTERIOR - MUY BUENA' THEN 'INTERIOR - VERY GOOD'
  WHEN 'EXTERIOR - SOL DIRECTO' THEN 'EXTERIOR - DIRECT SUN'
  WHEN 'EXTERIOR - SOL INDIRECTO' THEN 'EXTERIOR - INDIRECT SUN'
  ELSE "nombre"
END;

UPDATE "prod_ia_diseno_luz_art" SET "nombre_en" = CASE "nombre"
  WHEN 'FRIA - LEVE' THEN 'COOL - LOW'
  WHEN 'FRIA - MEDIA' THEN 'COOL - MEDIUM'
  WHEN 'FRIA - MUCHA' THEN 'COOL - HIGH'
  WHEN 'CÁLIDA - LEVE' THEN 'WARM - LOW'
  WHEN 'CÁLIDA - MEDIA' THEN 'WARM - MEDIUM'
  WHEN 'CÁLIDA - MUCHA' THEN 'WARM - HIGH'
  ELSE "nombre"
END;

UPDATE "prod_ia_diseno_sup_pintar" SET "nombre_en" = "nombre" WHERE "nombre_en" IS NULL OR btrim("nombre_en") = '';
UPDATE "prod_ia_diseno_estilos" SET "nombre_en" = "nombre" WHERE "nombre_en" IS NULL OR btrim("nombre_en") = '';
UPDATE "prod_ia_diseno_combinar" SET "nombre_en" = "nombre" WHERE "nombre_en" IS NULL OR btrim("nombre_en") = '';
UPDATE "prod_ia_diseno_objetivo" SET "nombre_en" = "nombre" WHERE "nombre_en" IS NULL OR btrim("nombre_en") = '';
UPDATE "prod_ia_diseno_luz_nat" SET "nombre_en" = "nombre" WHERE "nombre_en" IS NULL OR btrim("nombre_en") = '';
UPDATE "prod_ia_diseno_luz_art" SET "nombre_en" = "nombre" WHERE "nombre_en" IS NULL OR btrim("nombre_en") = '';

ALTER TABLE "prod_ia_diseno_sup_pintar" ALTER COLUMN "nombre_en" SET NOT NULL;
ALTER TABLE "prod_ia_diseno_estilos" ALTER COLUMN "nombre_en" SET NOT NULL;
ALTER TABLE "prod_ia_diseno_combinar" ALTER COLUMN "nombre_en" SET NOT NULL;
ALTER TABLE "prod_ia_diseno_objetivo" ALTER COLUMN "nombre_en" SET NOT NULL;
ALTER TABLE "prod_ia_diseno_luz_nat" ALTER COLUMN "nombre_en" SET NOT NULL;
ALTER TABLE "prod_ia_diseno_luz_art" ALTER COLUMN "nombre_en" SET NOT NULL;

CREATE UNIQUE INDEX "prod_ia_diseno_sup_pintar_nombre_en_key" ON "prod_ia_diseno_sup_pintar"("nombre_en");
CREATE UNIQUE INDEX "prod_ia_diseno_estilos_nombre_en_key" ON "prod_ia_diseno_estilos"("nombre_en");
CREATE UNIQUE INDEX "prod_ia_diseno_combinar_nombre_en_key" ON "prod_ia_diseno_combinar"("nombre_en");
CREATE UNIQUE INDEX "prod_ia_diseno_objetivo_nombre_en_key" ON "prod_ia_diseno_objetivo"("nombre_en");
CREATE UNIQUE INDEX "prod_ia_diseno_luz_nat_nombre_en_key" ON "prod_ia_diseno_luz_nat"("nombre_en");
CREATE UNIQUE INDEX "prod_ia_diseno_luz_art_nombre_en_key" ON "prod_ia_diseno_luz_art"("nombre_en");
