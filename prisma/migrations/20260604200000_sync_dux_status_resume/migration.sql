-- Estado reanudable para sync DUX en serverless (varias invocaciones bajo límite de tiempo).
ALTER TABLE "sync_dux_status"
  ADD COLUMN IF NOT EXISTS "fetch_offset" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "api_fetch_complete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "meta" JSONB;
