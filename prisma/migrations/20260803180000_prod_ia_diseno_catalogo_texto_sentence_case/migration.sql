-- Catálogos GESTION DISEÑO: columna `texto` en sentence case
-- (primera letra mayúscula, resto minúsculas). Idempotente.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'prod_ia_diseno_modo_diseno',
    'prod_ia_diseno_objetivo',
    'prod_ia_diseno_estilos',
    'prod_ia_diseno_luz_nat',
    'prod_ia_diseno_luz_art',
    'prod_ia_diseno_combinar',
    'prod_ia_diseno_sup_pintar'
  ]
  LOOP
    EXECUTE format(
      'UPDATE %I
       SET texto = upper(left(texto, 1)) || lower(substring(texto from 2)),
           updated_at = CURRENT_TIMESTAMP
       WHERE length(trim(texto)) > 0
         AND texto IS DISTINCT FROM (upper(left(texto, 1)) || lower(substring(texto from 2)))',
      t
    );
  END LOOP;
END $$;
