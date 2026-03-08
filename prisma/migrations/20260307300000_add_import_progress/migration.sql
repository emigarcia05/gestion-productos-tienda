-- CreateTable
CREATE TABLE "import_progress" (
    "id" TEXT NOT NULL,
    "running" BOOLEAN NOT NULL DEFAULT false,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "result_creados" INTEGER,
    "result_actualizados" INTEGER,
    "result_eliminados" INTEGER,
    "result_errores" JSONB,
    "error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_progress_pkey" PRIMARY KEY ("id")
);
