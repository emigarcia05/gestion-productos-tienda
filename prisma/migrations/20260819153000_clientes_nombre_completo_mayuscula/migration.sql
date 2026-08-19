-- Persistencia: clientes.nombre_completo en mayúsculas (locale de Postgres).
UPDATE "clientes"
SET "nombre_completo" = upper(btrim(regexp_replace("nombre_completo", '\s+', ' ', 'g')));
