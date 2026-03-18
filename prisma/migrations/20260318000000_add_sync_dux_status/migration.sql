CREATE TABLE IF NOT EXISTS "sync_dux_status" (
  "id" TEXT NOT NULL,
  "running" BOOLEAN NOT NULL DEFAULT false,
  "phase" TEXT,
  "processed" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "last_completed_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sync_dux_status_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_sync_dux_status_updated_at"
  ON "sync_dux_status" ("updated_at");
