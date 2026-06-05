-- Personal DUX para recepción de compras (selector id_personal en POST v2/compras).

INSERT INTO "global_personal" ("id_personal", "nombre_personal") VALUES
  (14242873, 'FERNANDO PANAIA'),
  (14045740, 'WALTER GARCIA'),
  (1930206, 'EMILIANO GARCIA'),
  (1930207, 'JUAN PABLOCHANTA')
ON CONFLICT ("id_personal") DO UPDATE SET
  "nombre_personal" = EXCLUDED."nombre_personal";
