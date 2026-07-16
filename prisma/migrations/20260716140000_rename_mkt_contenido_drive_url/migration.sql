-- Renombra mkt_contenido_url_drive → mkt_contenido_drive_url (alineado con mkt_contenido_drive_tipo).

ALTER TABLE "mkt_contenido_url_drive" RENAME TO "mkt_contenido_drive_url";

ALTER TABLE "mkt_contenido_drive_url"
  RENAME CONSTRAINT "mkt_contenido_url_drive_pkey" TO "mkt_contenido_drive_url_pkey";

ALTER TABLE "mkt_contenido_drive_url"
  RENAME CONSTRAINT "mkt_contenido_url_drive_tipo_id_fkey" TO "mkt_contenido_drive_url_tipo_id_fkey";

ALTER INDEX "mkt_contenido_url_drive_nombre_idx" RENAME TO "mkt_contenido_drive_url_nombre_idx";
ALTER INDEX "mkt_contenido_url_drive_tipo_idx" RENAME TO "mkt_contenido_drive_url_tipo_idx";
